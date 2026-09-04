import type { Rect } from './scroll-target';

export interface Overlay {
  // 選択矩形を描画する　nullなら矩形を消す（暗幕だけの状態に戻す）
  setRect(rect: Rect | null): void;
  // オーバーレイをページから完全に取り除く
  destroy(): void;
  // 撮影中など、一時的にオーバーレイ自身を非表示にする（destroyと違い後で復元できる）
  hide(): void;
  show(): void;
  // 画面上部に短いメッセージを一瞬表示する（撮影完了の合図など）
  showToast(text: string): void;
}

export function createOverlay(): Overlay {
  const host = document.createElement('div');
  host.style.cssText = `
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
  `;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // 暗幕・矩形枠・サイズラベルをまとめたレイヤー
  // hide()/show() はこのレイヤーだけを対象にする（トーストは別枠で常に出せるようにするため）
  const selectionLayer = document.createElement('div');
  selectionLayer.style.cssText = `
    position: absolute;
    inset: 0;
  `;
  shadow.appendChild(selectionLayer);

  const dimmer = document.createElement('div');
  dimmer.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
  `;
  selectionLayer.appendChild(dimmer);

  const border = document.createElement('div');
  border.style.cssText = `
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #4da3ff;
    display: none;
  `;
  selectionLayer.appendChild(border);

  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    background: #4da3ff;
    color: white;
    font: 12px sans-serif;
    padding: 2px 6px;
    display: none;
    transform: translateY(-100%);
  `;
  selectionLayer.appendChild(label);

  function setRect(rect: Rect | null): void {
    if (!rect) {
      dimmer.style.clipPath = '';
      border.style.display = 'none';
      label.style.display = 'none';
      return;
    }

    const { top, left, width, height } = rect;
    const right = left + width;
    const bottom = top + height;

    // 暗幕に矩形の「穴」を開ける　外周をぐるっと回った後、
    // 矩形の周りも逆回りでなぞることで、内側だけ透明にする
    dimmer.style.clipPath = `polygon(
      0 0, 100% 0, 100% 100%, 0 100%, 0 0,
      ${left}px ${top}px, ${left}px ${bottom}px,
      ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px
    )`;

    border.style.display = 'block';
    border.style.top = `${top}px`;
    border.style.left = `${left}px`;
    border.style.width = `${width}px`;
    border.style.height = `${height}px`;

    label.style.display = 'block';
    label.style.top = `${top}px`;
    label.style.left = `${left}px`;
    label.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: white;
    font: 14px sans-serif;
    padding: 8px 16px;
    border-radius: 6px;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  `;
  // selectionLayer の外に置き、hide()/show() の影響を受けないようにする
  shadow.appendChild(toast);

  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  // 一瞬だけメッセージを表示し、自動的にフェードアウトする
  function showToast(text: string): void {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.style.opacity = '1';
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 1200);
  }

  function destroy(): void {
    clearTimeout(toastTimer);
    host.remove();
  }

  // display:none にする（visibilityだと透明でも撮影に影響する場合があるため）
  // トースト（toast）は対象外。撮影完了後にオーバーレイを再表示しない場合でも
  // Doneメッセージだけは見せたいため
  function hide(): void {
    selectionLayer.style.display = 'none';
  }

  function show(): void {
    selectionLayer.style.display = '';
  }

  return { setRect, destroy, hide, show, showToast };
}
