import type { Rect } from './scroll-target';

export interface Overlay {
  // 選択矩形を描画する　nullなら矩形を消す（暗幕だけの状態に戻す）
  setRect(rect: Rect | null): void;
  // オーバーレイをページから完全に取り除く
  destroy(): void;
  // 撮影中など、一時的にオーバーレイ自身を非表示にする（destroyと違い後で復元できる）
  hide(): void;
  show(): void;
  // スクロール対象の要素の範囲（client座標）に枠線を出す。nullなら消す
  setTargetFrame(rect: Rect | null): void;
  // 渡された要素が、このオーバーレイ自身（またはその中身）かどうか
  isOwnElement(el: Element): boolean;
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

  const dimmer = document.createElement('div');
  dimmer.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
  `;
  shadow.appendChild(dimmer);

  // スクロール対象の要素の範囲を示す枠線　選択矩形（border）より下に描画されるよう、
  // dimmerの直後・borderより前に追加する
  const frame = document.createElement('div');
  frame.style.cssText = `
    position: absolute;
    box-sizing: border-box;
    border: 2px dashed #ffb020;
    display: none;
    pointer-events: none;
  `;
  shadow.appendChild(frame);

  const border = document.createElement('div');
  border.style.cssText = `
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #4da3ff;
    display: none;
  `;
  shadow.appendChild(border);

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
  shadow.appendChild(label);

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

  function setTargetFrame(rect: Rect | null): void {
    if (!rect) {
      frame.style.display = 'none';
      return;
    }

    const { top, left, width, height } = rect;
    frame.style.display = 'block';
    frame.style.top = `${top}px`;
    frame.style.left = `${left}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
  }

  function isOwnElement(el: Element): boolean {
    return el === host || host.contains(el);
  }

  function destroy(): void {
    host.remove();
  }

  // display:none にする（visibilityだと透明でも撮影に影響する場合があるため）
  function hide(): void {
    host.style.display = 'none';
  }

  function show(): void {
    host.style.display = '';
  }

  return { setRect, destroy, hide, show, setTargetFrame, isOwnElement };
}
