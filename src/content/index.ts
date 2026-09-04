// --- scriptが注入された瞬間から、そのページの中で自律的に動き出す本体 ---
// background.tsが動き出すきっかけを作っている

import { createOverlay } from './overlay';
import { WindowScrollTarget, type Point, type Rect, type ScrollTarget } from './scroll-target';
import { captureRegion } from './capture';
import { freezeFixedElements } from './freeze';

// 拡張機能が今どんな状態にあるか
type State =
  | { kind: 'idle' } // 何もしていない、待機中
  | { kind: 'selecting'; target: ScrollTarget; start: Point; current: Point }
  | { kind: 'capturing' }; // タイル撮影・合成の最中

// 自動スクロールの調整値（画面端から何px以内で反応するか／最大スクロール速度）
const EDGE = 60;
const MAX_SPEED = 25;

// windowの__kokokara__という引き出しが無ければ（=trueでなければ）
if (!window.__kokokara__) {
  // windowに__kokokara__という引き出しを新しく作り、その中にtrueを格納する
  window.__kokokara__ = true;
  console.log("フラグが立ちました")

  let state: State = { kind: 'idle' };
  const overlay = createOverlay();

  // pointermove が来るたびに更新される、直近のマウス位置（client座標）
  // ドラッグ中にマウスを止めたままでも自動スクロールを続けるために必要。
  let lastClient: Point = { x: 0, y: 0 };

  // サイト側の scroll-behavior / overflow-anchor を一時的に上書きし、終了時に元へ戻す
  const htmlStyle = document.documentElement.style;
  let prevScrollBehavior = '';
  let prevOverflowAnchor = '';

  function lockSmoothScroll(): void {
    prevScrollBehavior = htmlStyle.scrollBehavior;
    prevOverflowAnchor = htmlStyle.overflowAnchor;
    // サイト側の smooth scroll を消す（これが無いとカクつく）
    htmlStyle.scrollBehavior = 'auto';
    // Chrome のスクロールアンカリングで中身が勝手にズレるのを防ぐ
    htmlStyle.overflowAnchor = 'none';
  }

  function unlockSmoothScroll(): void {
    htmlStyle.scrollBehavior = prevScrollBehavior;
    htmlStyle.overflowAnchor = prevOverflowAnchor;
  }

  // 今のstateをもとに、オーバーレイの矩形を実際に描画する
  function render(): void {
    if (state.kind !== 'selecting') return;

    const startClient = state.target.toClient(state.start.x, state.start.y);
    const currentClient = state.target.toClient(state.current.x, state.current.y);

    overlay.setRect({
      top: Math.min(startClient.y, currentClient.y),
      left: Math.min(startClient.x, currentClient.x),
      width: Math.abs(startClient.x - currentClient.x),
      height: Math.abs(startClient.y - currentClient.y),
    });
  }

  // ドラッグ中の選択を取り消し、idleに戻す（矩形を消し、スクロール設定も元に戻す）
  function cancelSelection(): void {
    state = { kind: 'idle' };
    overlay.setRect(null);
    unlockSmoothScroll();
  }

  // 毎フレーム呼ばれるループ　マウスが画面端に近ければ自動スクロールする
  function autoScrollLoop(): void {
    if (state.kind !== 'selecting') return;

    const w = state.target.getWindowRect();
    const topEdge = w.top;
    const bottomEdge = w.top + w.height;
    const distanceTop = lastClient.y - topEdge;
    const distanceBottom = bottomEdge - lastClient.y;

    // 端に近いほど速く: 比率(0〜1)を1から引いて反転し、MAX_SPEEDを掛ける
    // Math.max(0, ...) は、マウスが端を越えた場合に速度がMAX_SPEEDを超えないようにするガード
    let v = 0;
    if (distanceBottom < EDGE) {
      v = MAX_SPEED * (1 - Math.max(0, distanceBottom) / EDGE);
    } else if (distanceTop < EDGE) {
      v = -MAX_SPEED * (1 - Math.max(0, distanceTop) / EDGE);
    }

    if (v !== 0) {
      // vの値分、今のスクロール位置から下にずらす
      state.target.scrollBy(v);
      // 実際にスクロールされた後の位置で、current を再計算する
      state.current = state.target.toContent(lastClient.x, lastClient.y);
      // スクロールに追従して、画面上のどこに矩形を描くべきかを計算する（呼ばなかったら矩形の見た目だけが古い位置に取り残される）
      render();
    }

    // requestAnimationFrame = 次に画面が描き替わるタイミングで、指定した関数を呼んで とブラウザに頼む仕組み
    // だいたい1秒間に60回のペースで発生している
    requestAnimationFrame(autoScrollLoop);
  }

  // pointerdown = 「マウスのボタンが押された、その瞬間」に発火するイベント
  function onPointerDown(event: PointerEvent): void {
    if (state.kind !== "idle") return;
    event.preventDefault();
    event.stopPropagation();

    // client座標は"今実際に見えている範囲"（ビューポート）の中で、左上を（0, 0）としたと時の位置
    // その為、スクロールした場合の、"そのページ全体での位置"をcontent座標で求める
    const target = new WindowScrollTarget();

    // toContent = ページ全体基準の位置（content座標）を返す
    // start = ドラッグを始めた場所
    const start = target.toContent(event.clientX, event.clientY);
    // ここからドラッグ開始
    // スクロールしても崩れないよう、start/currentをcontent座標で保持しておく
    state = { kind: 'selecting', target, start, current: start };

    lockSmoothScroll();
    requestAnimationFrame(autoScrollLoop);
  }

  // pointermove = 「マウスが動いている間ずっと」発火するイベント
  function onPointerMove(event: PointerEvent): void {
    lastClient = { x: event.clientX, y: event.clientY };

    // pointermove自体はドラッグと無関係にいつでも発火してしまう
    // その為、state が selecting（＝ドラッグ中）の時だけ、実際に処理をする、という手動のフィルター
    if (state.kind !== "selecting") return;

    // current = 今、マウスがどこにあるか　マウスが動くたびに変わり続ける点
    state.current = state.target.toContent(event.clientX, event.clientY);
    render();
  }

  // 撮影失敗時、原因に応じてユーザーに見せる文言を決める
  function describeCaptureError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('CANVAS_TOO_LARGE')) {
      return 'ページが大きすぎて画像を作成できませんでした。';
    }
    if (message.includes('TAB_HIDDEN')) {
      return 'タブが非表示になったため、撮影を中断しました。';
    }
    return '撮影に失敗しました。時間を置いて再度お試しください。';
  }

  // 撮影結果のCanvasをPNGとして保存する
  function savePng(canvas: HTMLCanvasElement): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kokokara-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, 'image/png');
  }

  // pointerup = 「マウスのボタンが押されてから、指が離れたその瞬間」発火するイベント
  async function onPointerUp(): Promise<void> {
    if (state.kind !== "selecting") return;

    const { target, start, current } = state;
    const rect: Rect = {
      top: Math.min(start.y, current.y),
      left: Math.min(start.x, current.x),
      width: Math.abs(start.x - current.x),
      height: Math.abs(start.y - current.y),
    };

    // 選択範囲が極小（誤クリックなど）なら、撮影せずキャンセル扱いにする
    if (rect.width < 10 || rect.height < 10) {
      cancelSelection();
      return;
    }

    state = { kind: 'capturing' };
    // オーバーレイ自身が撮影結果に写り込まないよう、完全に隠す
    overlay.hide();
    // 追従するnav/headerなどが、タイルごとに写り込まないよう一時的に隠す
    const unfreeze = freezeFixedElements();

    let failure: unknown;
    try {
      const canvas = await captureRegion(rect, target);
      savePng(canvas);
    } catch (error) {
      console.error('撮影に失敗しました', error);
      failure = error;
    } finally {
      // 成功しても失敗しても、必ずページを元の状態に戻す
      unfreeze();
      unlockSmoothScroll();
      state = { kind: 'idle' };
    }

    // 撮影が終わったら選択待ち（暗幕表示）には戻さず、拡張機能自体を完全に終了する。
    // ダウンロード完了はブラウザ標準の表示に任せるため、独自の完了表示は出さない。
    // もう一度使うにはアイコンから起動し直す。
    exit();
    // ページを元の状態に戻してから、失敗時のみユーザーに知らせる
    if (failure) alert(describeCaptureError(failure));
  }

  // popup の「Full Page」から呼ばれる。ドラッグ不要で、window全体を撮影する
  async function runFullPage(): Promise<void> {
    if (state.kind !== 'idle') return;

    const target = new WindowScrollTarget();
    const win = target.getWindowRect();
    const rect: Rect = {
      top: 0,
      left: 0,
      // win.width(=innerWidth)はスクロールバー分を含んでしまうため、
      // スクロールバーを含まないページ幅（clientWidth）を使う
      width: document.documentElement.clientWidth,
      height: target.getMaxScrollY() + win.height,
    };

    state = { kind: 'capturing' };
    overlay.hide();
    lockSmoothScroll();
    const unfreeze = freezeFixedElements();

    let failure: unknown;
    try {
      const canvas = await captureRegion(rect, target);
      savePng(canvas);
    } catch (error) {
      console.error('撮影に失敗しました', error);
      failure = error;
    } finally {
      unfreeze();
      unlockSmoothScroll();
      state = { kind: 'idle' };
    }

    // Full Pageは単発の操作なので、Select Areaのように選択待ち（暗幕表示）には戻さず
    // 拡張機能自体を完全に終了する
    exit();
    if (failure) alert(describeCaptureError(failure));
  }

  // background.ts の activate(mode: 'fullpage') から送られてくる
  function onRuntimeMessage(msg: { type?: string }): void {
    if (msg.type === 'RUN_FULL_PAGE') {
      void runFullPage();
    }
  }

  // keydown = 「どれかキーが押された時」発火するイベント
  function onKeyDown(event: KeyboardEvent): void {
    // Escキー以外なら、ここで処理を終える
    if (event.key !== "Escape") return;

    // 撮影中はEscを無視する（非同期のcaptureRegion実行中に途中終了させると、
    // オーバーレイ/フリーズ解除などの復元処理と競合し、不整合が起きるため）
    if (state.kind === "capturing") return;

    if (state.kind === "selecting") {
      // ドラッグ中のEsc = そのドラッグだけキャンセルする（オーバーレイ自体はまだ残す）
      cancelSelection();
      return;
    }

    // ドラッグしていない時のEsc = 拡張機能そのものを完全に終了する
    exit();
  }

  // フラグとイベントリスナーを即座に解放する。
  // 「見た目の後片付け（オーバーレイのDOM削除）」とは分離してあり、
  // Doneトースト表示中でも、これさえ済んでいれば次の起動をすぐ受け付けられる。
  function detachListeners(): void {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("keydown", onKeyDown);
    // 外したままだと、この後もこのクロージャのリスナーがメッセージを拾い続け、
    // 破棄済みのoverlayを操作しようとしてしまうため必ず外す
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    // フラグを戻し、次にアイコンをクリックした時にもう一度最初から起動できるようにする
    window.__kokokara__ = undefined;
  }

  // 拡張機能を完全に終了し、ページを元の状態に戻す
  function exit(): void {
    detachListeners();
    overlay.destroy();
  }

  // 最初にcontent.jsがページに注入される
  // ファイルが上から実行され、ここで初めて「クリックやキー入力を監視する」状態になる
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("keydown", onKeyDown);
  chrome.runtime.onMessage.addListener(onRuntimeMessage);
}
