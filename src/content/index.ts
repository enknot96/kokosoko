// --- scriptが注入された瞬間から、そのページの中で自律的に動き出す本体 ---
// background.tsが動き出すきっかけを作っている

import { createOverlay } from './overlay';
import { ElementScrollTarget, WindowScrollTarget, type Point, type Rect, type ScrollTarget } from './scroll-target';
import { findScrollTargetAt } from './find-target';
import { captureRegion } from './capture';
import { freezeFixedElements } from './freeze';

// 拡張機能が今どんな状態にあるか
type State =
  | { kind: 'idle' } // 何もしていない、待機中
  | { kind: 'selecting'; target: ScrollTarget; start: Point; current: Point; unlock: () => void }
  | { kind: 'capturing' }; // タイル撮影・合成の最中

// 自動スクロールの調整値（画面端から何px以内で反応するか／最大スクロール速度）
const EDGE = 60;
const MAX_SPEED = 25;

// windowの__kokosoko__という引き出しが無ければ（=trueでなければ）
if (!window.__kokosoko__) {
  // windowに__kokosoko__という引き出しを新しく作り、その中にtrueを格納する
  window.__kokosoko__ = true;
  console.log("フラグが立ちました")

  let state: State = { kind: 'idle' };
  const overlay = createOverlay();

  // pointermove が来るたびに更新される、直近のマウス位置（client座標）
  // ドラッグ中にマウスを止めたままでも自動スクロールを続けるために必要。
  let lastClient: Point = { x: 0, y: 0 };

  // 選択範囲の点を、対象要素の「今見えている撮影窓」の内側に収める（content座標のまま返す）
  // 要素の外までドラッグしても、矩形が要素からはみ出さないようにするため。
  // 自動スクロールで見える範囲が動けば、収める範囲も一緒に広がるので、長い範囲も選べる。
  // 対象がwindowのときは従来の挙動を変えないよう、そのまま返す。
  function clampToTarget(target: ScrollTarget, p: Point): Point {
    if (!(target instanceof ElementScrollTarget)) return p;

    const win = target.getWindowRect();
    const topLeft = target.toContent(win.left, win.top);
    const bottomRight = target.toContent(win.left + win.width, win.top + win.height);
    return {
      x: Math.min(Math.max(p.x, topLeft.x), bottomRight.x),
      y: Math.min(Math.max(p.y, topLeft.y), bottomRight.y),
    };
  }

  // 今のstateをもとに、オーバーレイの矩形を実際に描画する
  function render(): void {
    if (state.kind !== 'selecting') return;

    // 対象が要素のときだけ、その見えている範囲に枠線を出す（windowのときは出さない）
    overlay.setTargetFrame(
      state.target instanceof ElementScrollTarget ? state.target.getWindowRect() : null,
    );

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
    if (state.kind !== 'selecting') return;
    const { unlock } = state;
    state = { kind: 'idle' };
    overlay.setRect(null);
    overlay.setTargetFrame(null);
    unlock();
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
      state.current = clampToTarget(state.target, state.target.toContent(lastClient.x, lastClient.y));
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
    // ドラッグを始めた地点にスクロール可能な要素があればそれが対象、無ければwindowが対象になる
    // （拡張機能自身のオーバーレイは判定から除外する）
    const target = findScrollTargetAt(event.clientX, event.clientY, (el) => overlay.isOwnElement(el));

    // toContent = ページ全体基準の位置（content座標）を返す
    // start = ドラッグを始めた場所
    const start = clampToTarget(target, target.toContent(event.clientX, event.clientY));
    const unlock = target.lock();
    // ここからドラッグ開始
    // スクロールしても崩れないよう、start/currentをcontent座標で保持しておく
    state = { kind: 'selecting', target, start, current: start, unlock };

    // 開始直後にも一度描画して、対象要素の枠線をすぐ表示する
    render();

    requestAnimationFrame(autoScrollLoop);
  }

  // pointermove = 「マウスが動いている間ずっと」発火するイベント
  function onPointerMove(event: PointerEvent): void {
    lastClient = { x: event.clientX, y: event.clientY };

    // pointermove自体はドラッグと無関係にいつでも発火してしまう
    // その為、state が selecting（＝ドラッグ中）の時だけ、実際に処理をする、という手動のフィルター
    if (state.kind !== "selecting") return;

    // current = 今、マウスがどこにあるか　マウスが動くたびに変わり続ける点
    state.current = clampToTarget(state.target, state.target.toContent(event.clientX, event.clientY));
    render();
  }

  // 撮影失敗時、原因に応じてユーザーに見せる文言を決める
  function describeCaptureError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('CANVAS_TOO_LARGE')) {
      return 'The page is too large to capture.';
    }
    if (message.includes('TAB_HIDDEN')) {
      return 'Capture was stopped because the tab became hidden.';
    }
    if (message.includes('TARGET_LOST')) {
      return 'Capture was stopped because the scroll area disappeared.';
    }
    if (message.includes('SCROLL_INTERRUPTED')) {
      return 'Capture was stopped because the page kept scrolling. Please avoid scrolling while capturing.';
    }
    return 'Capture failed. Please try again in a moment.';
  }

  // 撮影中だけ、ユーザーのスクロール操作（ホイール・タッチ・スクロール用のキー）を無効にする
  // 撮影はスクロール位置を前提に切り出すため、途中で動かされると重複・抜け・ずれが出る。
  // オーバーレイは撮影中は隠しているので、操作がそのままページに届いてしまう。
  // 戻り値の関数を呼ぶと、元どおり操作できるようになる
  const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);

  function blockUserScroll(): () => void {
    const preventScroll = (event: Event): void => event.preventDefault();
    const preventScrollKey = (event: KeyboardEvent): void => {
      if (SCROLL_KEYS.has(event.key)) event.preventDefault();
    };
    // passive: false にしないと preventDefault() が無視される（Chrome は wheel / touchmove を既定で passive 扱いにするため）
    // capture: true で、ページ側のリスナーより先に受け取る
    const options: AddEventListenerOptions = { passive: false, capture: true };
    window.addEventListener('wheel', preventScroll, options);
    window.addEventListener('touchmove', preventScroll, options);
    window.addEventListener('keydown', preventScrollKey, options);
    return () => {
      window.removeEventListener('wheel', preventScroll, options);
      window.removeEventListener('touchmove', preventScroll, options);
      window.removeEventListener('keydown', preventScrollKey, options);
    };
  }

  // 撮影結果のCanvasをPNGとして保存する
  function savePng(canvas: HTMLCanvasElement): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kokosoko-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, 'image/png');
  }

  // pointerup = 「マウスのボタンが押されてから、指が離れたその瞬間」発火するイベント
  async function onPointerUp(): Promise<void> {
    if (state.kind !== "selecting") return;

    const { target, start, current, unlock } = state;
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
    // 対象が要素のときは、その要素（と祖先）は隠さない。隠すと撮影対象ごと消えて真っ白になるため
    const keep = target instanceof ElementScrollTarget ? target.element : undefined;
    const unfreeze = freezeFixedElements(keep);
    const unblock = blockUserScroll();

    let failure: unknown;
    try {
      const canvas = await captureRegion(rect, target);
      savePng(canvas);
    } catch (error) {
      console.error('撮影に失敗しました', error);
      failure = error;
    } finally {
      // 成功しても失敗しても、必ずページを元の状態に戻す
      unblock();
      unfreeze();
      unlock();
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
      // スクロールバーを含まないページ幅（clientWidth）を使う
      width: document.documentElement.clientWidth,
      height: target.getMaxScrollY() + win.height,
    };

    state = { kind: 'capturing' };
    overlay.hide();
    const unlock = target.lock();
    const unfreeze = freezeFixedElements();
    const unblock = blockUserScroll();

    let failure: unknown;
    try {
      const canvas = await captureRegion(rect, target);
      savePng(canvas);
    } catch (error) {
      console.error('撮影に失敗しました', error);
      failure = error;
    } finally {
      unblock();
      unfreeze();
      unlock();
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

  // フラグとイベントリスナーを解放する
  function detachListeners(): void {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("keydown", onKeyDown);
    // 外したままだと、この後もこのクロージャのリスナーがメッセージを拾い続け、
    // 破棄済みのoverlayを操作しようとしてしまうため必ず外す
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    // フラグを戻し、次にアイコンをクリックした時にもう一度最初から起動できるようにする
    window.__kokosoko__ = undefined;
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
