export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * window スクロールと要素スクロールを同じ形で扱うための抽象
 * 選択矩形は必ず content座標で保持し、描画時に toClient() で client座標に変換する
 */
export interface ScrollTarget {
  // 現在のスクロール量（content座標系）
  // getScrollという名前の、Pointを返す関数を持て という約束
  getScroll(): Point;
  // スクロール位置を設定
  scrollTo(y: number): void;
  // 相対スクロール
  scrollBy(dy: number): void;
  // スクロール可能な最大値
  getMaxScrollY(): number;

  /**
   * この対象の「撮影窓」= ビューポート上で実際に中身が見えている矩形（client座標）
   * window の場合はビューポート全体。
   */
  getWindowRect(): Rect;
  // client座標 → content座標
  toContent(clientX: number, clientY: number): Point;
  // content座標 → client座標
  toClient(x: number, y: number): Point;
  // 指定したcontent座標のY位置が、撮影窓の上端に来るようスクロールする
  // 1: 長い選択範囲（例えば3画面分の高さ）を撮影する時、1回のスクリーンショットでは全部映らない
  // 2: ビューポートに収まる分だけを、何回かに分けて撮影し、後で貼り合わせる必要がある
  // → 毎回、"次に撮りたいcontent座標の位置"を、画面の一番上に持ってくる必要がある
  scrollToShowContentAt(y: number): void;

  // ドラッグ中・撮影中だけスクロール挙動を固定する（サイト側のsmooth scrollと
  // スクロールアンカリングを無効化する）。戻り値の関数を呼ぶと元に戻る
  lock(): () => void;
  // スクロール対象がまだDOMに存在するか（撮影中に要素が消えたことを検知するため）
  isConnected(): boolean;
}

export class WindowScrollTarget implements ScrollTarget {
  getScroll(): Point {
    return { x: scrollX, y: scrollY};
  }
  // 絶対位置：Yがこの値になる場所まで行け
  scrollTo(y: number): void {
    window.scrollTo(scrollX,y);
  }
  // 相対移動：今の位置から、これだけ追加で動け
  // 今のスクロール量（scrollYと同じもの）を自動的に参照し、そこに dy を足す、という処理をブラウザが勝手にやってくれる
  scrollBy(dy: number): void {
    window.scrollBy(0,dy);
  }
  // ページを一番下までスクロールした時の、scrollYの値を求める関数
  getMaxScrollY(): number {
    return document.documentElement.scrollHeight - innerHeight;
  }
  // ビューポート上で実際に中身が見えている矩形
  // client座標は「ビューポートの左上を原点(0,0)とする」という定義
  getWindowRect(): Rect {
    return { top:0, left: 0, width: innerWidth, height: innerHeight};
  }
  // 今画面に見えている位置（client座標）を引数で受け取り、
  // それと同じ場所を指す、ページ全体基準の位置（content座標）を返す
  toContent(clientX: number, clientY: number): Point {
    return { x: clientX + scrollX, y: clientY + scrollY}
  }
  // ページ全体基準の位置（content座標）を引数で受け取り、
  // それと同じ場所を指す、今画面のどこに見えるか（client座標）を返す
  toClient(x: number, y: number): Point {
    return { x: x - scrollX, y: y - scrollY}
  }
  // 指定したcontent座標のY位置が、撮影窓の上端に来るようスクロールする
  scrollToShowContentAt(y: number): void {
    this.scrollTo(y);
  }

  // サイト側のscroll-behavior/overflow-anchorを一時的に上書きし、戻す関数を返す
  lock(): () => void {
    const htmlStyle = document.documentElement.style;
    const prevScrollBehavior = htmlStyle.scrollBehavior;
    const prevOverflowAnchor = htmlStyle.overflowAnchor;
    // サイト側の smooth scroll を消す（これが無いとカクつく）
    htmlStyle.scrollBehavior = 'auto';
    // Chrome のスクロールアンカリングで中身が勝手にズレるのを防ぐ
    htmlStyle.overflowAnchor = 'none';
    return () => {
      htmlStyle.scrollBehavior = prevScrollBehavior;
      htmlStyle.overflowAnchor = prevOverflowAnchor;
    };
  }
  // windowは常にDOMに存在する
  isConnected(): boolean {
    return true;
  }
}

// 要素の中身がスクロールする対象（Slack/Chatworkのようなアプリ向け）
export class ElementScrollTarget implements ScrollTarget {
  constructor(readonly element: HTMLElement) {}

  // 要素のpadding box（枠線とスクロールバーを除いた内側）の左上を、client座標で返す
  private paddingOrigin(): { left: number; top: number } {
    const r = this.element.getBoundingClientRect();
    return { left: r.left + this.element.clientLeft, top: r.top + this.element.clientTop };
  }

  getScroll(): Point {
    return { x: this.element.scrollLeft, y: this.element.scrollTop };
  }
  scrollTo(y: number): void {
    this.element.scrollTop = y;
  }
  scrollBy(dy: number): void {
    this.element.scrollTop += dy;
  }
  getMaxScrollY(): number {
    return this.element.scrollHeight - this.element.clientHeight;
  }
  // 要素のpadding boxと、ビューポートが重なる部分の矩形（client座標）を返す
  getWindowRect(): Rect {
    const o = this.paddingOrigin();
    const elLeft = o.left;
    const elTop = o.top;
    const elRight = elLeft + this.element.clientWidth;
    const elBottom = elTop + this.element.clientHeight;

    const vpRight = document.documentElement.clientWidth;
    const vpBottom = document.documentElement.clientHeight;

    const left = Math.max(elLeft, 0);
    const top = Math.max(elTop, 0);
    const right = Math.min(elRight, vpRight);
    const bottom = Math.min(elBottom, vpBottom);

    return {
      left,
      top,
      // 重ならない場合に負の値にならないよう、下限を0にクランプする
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }
  // client座標 → content座標（切り詰める前のpadding boxを原点にする）
  toContent(clientX: number, clientY: number): Point {
    const o = this.paddingOrigin();
    return { x: clientX - o.left + this.element.scrollLeft, y: clientY - o.top + this.element.scrollTop };
  }
  // content座標 → client座標
  toClient(x: number, y: number): Point {
    const o = this.paddingOrigin();
    return { x: x + o.left - this.element.scrollLeft, y: y + o.top - this.element.scrollTop };
  }
  // 撮影窓の上端にcontent座標のyが来るようスクロールする
  scrollToShowContentAt(y: number): void {
    // 要素の上端が画面外にはみ出していると、撮影窓の上端とpadding boxの上端がずれるため補正する
    const offset = this.getWindowRect().top - this.paddingOrigin().top;
    this.scrollTo(y - offset);
  }

  lock(): () => void {
    const scrollTop = this.element.scrollTop;
    const prevScrollBehavior = this.element.style.scrollBehavior;
    const prevOverflowAnchor = this.element.style.overflowAnchor;
    this.element.style.scrollBehavior = 'auto';
    this.element.style.overflowAnchor = 'none';
    return () => {
      // 先にscrollTopを戻す。先にスタイルを戻すと、smooth scrollのアニメーションで
      // 元の位置まで戻ってしまうため、順番を入れ替えてはいけない
      this.element.scrollTop = scrollTop;
      this.element.style.scrollBehavior = prevScrollBehavior;
      this.element.style.overflowAnchor = prevOverflowAnchor;
    };
  }
  isConnected(): boolean {
    return this.element.isConnected;
  }
}
