import type { Rect, ScrollTarget } from './scroll-target';

// dataURL（base64文字列）を、バイト列に変換してBlobを作る
function dataUrlToBlob(dataUrl: string): Blob {
// data:image/png;base64,iVBORw0KGgoAAAANSU...
// └────────┬────────┘ └────────┬─────────┘
//       header                  b64
  const [header, b64] = dataUrl.split(',') as [string, string];
  const mime = header.match(/:(.*?);/)![1]; // image/pngという部分だけ取り出す（画像の種類/MIMEタイプ）
  const bin = atob(b64); // base64というエンコード方式で圧縮された文字列を、元のバイナリデータ（1文字1バイト）に戻す
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// background.ts に「今すぐ撮影して」と頼み、結果をImageBitmap（Canvasが直接扱える画像）として受け取る
export async function capture(): Promise<ImageBitmap> {
  // resには、{ ok: true, dataUrl: "data:image/png;..." } のような形が入ってくる
  const res = await chrome.runtime.sendMessage({ type: 'CAPTURE' });
  if (!res.ok) throw new Error(res.error);
  return createImageBitmap(dataUrlToBlob(res.dataUrl));
}

// 撮影中にスクロール位置が変わったとき、同じタイルを撮り直す最大回数
const MAX_RETRIES = 2;

// Canvasサイズの上限チェック
const MAX_DIM = 65535;
const MAX_AREA = 268_435_456;

function validateCanvasSize(width: number, height: number): boolean {
  if (width < MAX_DIM && height < MAX_DIM && (width * height) < MAX_AREA) {
    return true;
  } else {
    return false;
  }
}

// 最終的に作るCanvasの本当のピクセル数を決めるための関数
// 1: 実際に一枚試し撮りを行い、
// 2: 取れた画像の「実際の幅（ピクセル数）」を確認する
// 3: それを「見た目のビューポート幅（innerWidth）」で割る
// 4: 出てきた数字が本当の倍率（scale）
async function calibrateScale(): Promise<number> {
  const bitmapResult = await capture();
  const scale = bitmapResult.width / innerWidth;
  bitmapResult.close();
  return scale;
}

// 2フレーム待って、スクロール後の再描画が確定するのを待つ
// → 具体的には、スクロールを指示した直後から、それが画面に確実に反映されるまでの、ごく短い時間差を待っている
async function waitForRender(): Promise<void> {
  // requestAnimationFrame(関数) = 「次にブラウザが画面を描き直すタイミングで、その関数を1回だけ呼んでください」とブラウザに頼む関数
  await new Promise<void>((resolve) => requestAnimationFrame(
    () => requestAnimationFrame(
      () => resolve()
    )
  ));
}

// 選択範囲(content座標のrect)を、少しずつスクロールしながら撮影し、1枚のCanvasに継ぎ目なく合成する
// 引数rect = ユーザーが選択した、全体の範囲
export async function captureRegion(rect: Rect, target: ScrollTarget): Promise<HTMLCanvasElement> {
  // 1: もしscaleを無視して、Canvasを「見た目の800px」のサイズで作ってしまうと、実際には1600px分のデータを持っていた場合、それを無理やり800pxに縮めて詰め込むことになる
  // → 結果、「Retinaのシャープな画質」がもったいなく失われる（＝相対的にぼやけて見える）ということが起こり得る
  // 2: 座標の計算を間違えてしまうケース
  // → もし選択範囲の座標（CSSピクセル）を、そのまま（scaleを掛けずに）drawImageに渡してしまうと、「切り出したい場所」自体が完全にズレる
  const scale = await calibrateScale();

  // 撮影しようとしている範囲が制限を超えていなかチェック
  if (!validateCanvasSize(rect.width * scale, rect.height * scale)) {
    throw new Error('CANVAS_TOO_LARGE');
  }

  // Canvasタグを作り、選択範囲全体を1枚に収められる、本当に必要なピクセルサイズを確定させている
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  // <canvas>タグ自体は、「何も描かれていない、ただの四角い板」のため、描画ツールが必要 = 2d
  const ctx = canvas.getContext('2d')!;
  // 切り出す位置と大きさはすべて整数のピクセルに揃えるので、補間（にじみ）は不要。
  // 補間が効くと、切り出し範囲の外側の色（隣の要素の枠線など）が混ざることがあるため、オフにする
  ctx.imageSmoothingEnabled = false;

  // これ以上スクロールできない限界値 / 撮影窓の下端が中身の一番下にぴったり合った時のスクロール量
  const maxScroll = target.getMaxScrollY();
  // 「Canvasの何行目（実際のピクセル）まで埋め終わったか」　最初は0行目
  // CSSピクセル（小数になりうる）で進めると、丸めの誤差で継ぎ目に1ピクセルの隙間や重なりが出るため、
  // 進み具合は実際のピクセル（整数）で管理する
  let filledPx = 0;
  // 撮影中にスクロール位置が変わってしまったタイルを、続けて撮り直した回数
  let retries = 0;

  // Canvasの一番下の行まで、まだ埋め終わっていない間は、繰り返し続ける という条件
  while (filledPx < canvas.height) {
    // タブが非アクティブ（他タブに切り替えた等）だと captureVisibleTab が失敗するため、
    // 無駄なリトライをする前にここで検知して中断する
    if (document.visibilityState === 'hidden') {
      throw new Error('TAB_HIDDEN');
    }
    // スクロール対象の要素が撮影中にDOMから消えた場合、座標が計算できないため中断する
    if (!target.isConnected()) throw new Error('TARGET_LOST');

    // 「次に、撮影窓の上端に持ってきたいcontent座標のY」= 埋め終わった行のすぐ下
    const contentY = rect.top + filledPx / scale;
    // 頼んだ位置が maxScroll を超えないようにクランプしてからスクロール
    target.scrollToShowContentAt(Math.min(contentY, maxScroll));
    await waitForRender();

    // 撮影の直前と直後で、スクロール位置を記録する
    const before = target.getScroll();
    const win = target.getWindowRect();
    const bitmap = await capture();
    const after = target.getScroll();

    // capture() は撮影回数の上限のために最大0.5秒ほど待つことがあり、その間にユーザーのホイール操作や
    // ページ自身の処理でスクロールすると、記録した位置と実際に写った画面が食い違う（重複・抜け・ずれの原因）。
    // 位置が変わっていたら、このタイルは捨てて同じ位置から撮り直す
    if (before.x !== after.x || before.y !== after.y) {
      bitmap.close();
      retries++;
      if (retries > MAX_RETRIES) throw new Error('SCROLL_INTERRUPTED');
      continue;
    }
    retries = 0;

    // chrome.tabs.captureVisibleTabは画面全体を撮るため、ユーザーが欲しい部分を別途コードで切り出す必要がある
    // 撮影窓の上端・下端を、内側に向けて実際のピクセルの境目に揃える（上端は切り上げ、下端は切り捨て）
    // 境目が小数のままだと、窓のすぐ外にある枠線などが1ピクセル分写り込んでしまうため
    const winTopPx = Math.ceil(win.top * scale);
    const winBottomPx = Math.floor((win.top + win.height) * scale);
    // 撮影窓の上端が、content座標でいうとどこにいるか
    // 要素の上端が画面外にはみ出していると、撮影窓の上端とscrollTopは一致しない。
    // そのため toContent() に撮影窓の上端（client座標）を渡して求める
    const windowTopContent = target.toContent(win.left, winTopPx / scale).y;
    // 撮影窓の上端が、Canvasでいうと何行目に当たるか
    const windowTopRow = Math.round((windowTopContent - rect.top) * scale);
    // tileTop: 「まだ埋めていない最初の行」と「撮影窓の上端の行」、大きい方
    const tileTop = Math.max(filledPx, windowTopRow);
    // tileBottom: 「Canvasの一番下」と「撮影窓の下端の行」、小さい方
    const tileBottom = Math.min(canvas.height, windowTopRow + (winBottomPx - winTopPx));
    const tileHeight = tileBottom - tileTop;

    // 基本的にtileHeightはプラスの値になるが、想定外の状況になった場合、無理にdrawImageを呼ばずループを終了させる
    if (tileHeight <= 0) {
      bitmap.close();
      break;
    }

    // 切り出し元の左端を、スクリーンショット上の位置（client座標）に変換する
    // content座標の rect.left をそのまま使うと、撮影窓の左端がビューポートの左端と
    // 一致しない要素や、横スクロール中のページでずれてしまうため
    const srcX = Math.round(target.toClient(rect.left, contentY).x * scale);
    // 切り出し元の上端 = 撮影窓の上端の行から、tileTopまでの差分だけ下
    const srcY = winTopPx + (tileTop - windowTopRow);

    ctx.drawImage(
      bitmap,
      // src: 撮影された画像(bitmap)の、どこから切り出すか（実際のピクセル単位）
      srcX,
      srcY,
      canvas.width,
      tileHeight,
      // dest: Canvas上の、どこに貼るか
      0, // x方向
      tileTop, // y方向（埋め終わった行のすぐ下から）
      canvas.width,
      tileHeight,
    );

    bitmap.close(); // メモリ解放 忘れると数十枚で落ちる

    filledPx = tileBottom;
    if (before.y >= maxScroll) break; // これ以上スクロールできない
  }

  return canvas;
}