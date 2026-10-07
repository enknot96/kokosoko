import { ElementScrollTarget, WindowScrollTarget, type ScrollTarget } from './scroll-target';

// 要素が「中身をスクロールできる要素」かどうかを判定する
// getComputedStyleは重いので、先に高さの条件を確認し、満たしたものだけ呼ぶ
export function isScrollableElement(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  // documentElement / scrollingElement はwindowとして扱うため対象外
  if (el === document.documentElement || el === document.scrollingElement) return false;
  if (el.clientHeight <= 0) return false;
  if (el.scrollHeight - el.clientHeight <= 1) return false;

  const overflowY = getComputedStyle(el).overflowY;
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
}

// Select Areaでドラッグを始めた地点から、スクロール対象を探す
// isOwnElement: 拡張機能自身のオーバーレイ（画面全体を覆っている）を除外するための判定関数
export function findScrollTargetAt(
  clientX: number,
  clientY: number,
  isOwnElement: (el: Element) => boolean,
): ScrollTarget {
  const elements = document.elementsFromPoint(clientX, clientY);
  const start = elements.find((el) => !isOwnElement(el));
  if (!start) return new WindowScrollTarget();

  // startから親へたどり、最初にスクロール可能な要素が見つかったらそれを対象にする
  // parentElementがnullになったら、ShadowRootのhostへ移って続ける（Shadow DOMを跨ぐため）
  let el: Element | null = start;
  while (el) {
    if (isScrollableElement(el)) {
      return new ElementScrollTarget(el);
    }
    const parent: Element | null = el.parentElement;
    if (parent) {
      el = parent;
    } else {
      const root = el.getRootNode();
      el = root instanceof ShadowRoot ? root.host : null;
    }
  }

  return new WindowScrollTarget();
}

// Full Pageで撮る対象を選ぶ
export function findFullPageTarget(): ScrollTarget {
  const windowTarget = new WindowScrollTarget();
  // ページ自体がスクロールするなら、従来どおりwindowを対象にする
  if (windowTarget.getMaxScrollY() > 0) return windowTarget;

  // ページ自体はスクロールしないので、ビューポートに最も大きく重なるスクロール可能要素を探す
  let bestEl: HTMLElement | null = null;
  let bestArea = 0;
  const vpWidth = document.documentElement.clientWidth;
  const vpHeight = document.documentElement.clientHeight;

  document.querySelectorAll('*').forEach((el) => {
    if (!isScrollableElement(el)) return;

    const r = el.getBoundingClientRect();
    const width = Math.max(0, Math.min(r.right, vpWidth) - Math.max(r.left, 0));
    const height = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
    const area = width * height;

    if (area > bestArea) {
      bestArea = area;
      bestEl = el;
    }
  });

  if (!bestEl || bestArea === 0) return windowTarget;
  return new ElementScrollTarget(bestEl);
}
