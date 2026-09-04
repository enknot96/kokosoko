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

  // これ以上スクロールできない限界値 / ビューポートの下端がページの一番下にぴったり合った時のscrollYの値
  const maxScroll = target.getMaxScrollY();
  // 「次に、撮影窓の上端に持ってきたいcontent座標のY」　最初は選択範囲の一番上
  let contentY = rect.top;

  // 選択範囲の終わりに、まだ到達していない間は、繰り返し続ける という条件
  while (contentY < rect.top + rect.height) {
    // タブが非アクティブ（他タブに切り替えた等）だと captureVisibleTab が失敗するため、
    // 無駄なリトライをする前にここで検知して中断する
    if (document.visibilityState === 'hidden') {
      throw new Error('TAB_HIDDEN');
    }

    // 頼んだ位置が maxScroll を超えないようにクランプしてからスクロール
    target.scrollToShowContentAt(Math.min(contentY, maxScroll));
    await waitForRender();

    // 実際に到達した位置を読み直す（ページ末尾では頼んだ通りに動けないことがあるため）
    const actual = target.getScroll().y;
    const win = target.getWindowRect();
    const bitmap = await capture();

    // chrome.tabs.captureVisibleTabは画面全体を撮るため、ユーザーが欲しい部分を別途コードで切り出す必要がある
    // 撮影窓の上端が、content座標でいうとどこにいるか
    const windowTopContent = actual;
    // sliceTop: 「次に埋めたい位置」と「実際に撮影窓の上端が来た位置」、大きい方
    const sliceTop = Math.max(contentY, windowTopContent);
    // sliceBottom: 「選択範囲の終わり」と「このタイルで見えている範囲の終わり」、小さい方
    const sliceBottom = Math.min(rect.top + rect.height, windowTopContent + win.height);
    const sliceHeight = sliceBottom - sliceTop;

    // 基本的にsliceHeightはプラスの値になるが、想定外の状況になった場合、無理にdrawImageを呼ばずループを終了させる
    if (sliceHeight <= 0) {
      bitmap.close();
      break;
    }

    ctx.drawImage(
      bitmap,
      // src: 撮影された画像(bitmap)の、どこから切り出すか（実際のピクセル単位 = × scale）
      rect.left * scale,
      (win.top + (sliceTop - windowTopContent)) * scale,
      rect.width * scale,
      sliceHeight * scale,
      // dest: Canvas上の、どこに貼るか
      0, // x方向
      // rect.top = 選択範囲全体の、一番上の位置 / ループが何周しようと絶対に変わらない値
      // sliceTop = 今回のタイルで、使える範囲の始まり / ループが進むたびに更新される
      (sliceTop - rect.top) * scale, // y方向
      rect.width * scale,
      sliceHeight * scale,
    );

    bitmap.close(); // メモリ解放 忘れると数十枚で落ちる

    contentY = sliceBottom;
    if (actual >= maxScroll) break; // これ以上スクロールできない
  }

  return canvas;
}