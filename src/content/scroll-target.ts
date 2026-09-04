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
}
