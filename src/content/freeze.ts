// ページ内の position:fixed / sticky な要素を一時的に隠す（visibility: hidden）
// 戻り値の関数を呼ぶと、元の状態に復元される。
// keep: 撮影対象の要素。この要素自身と、その祖先は隠さない。
//   visibility: hidden は子孫に継承されるため、祖先が position: fixed のときに隠すと撮影対象ごと消えて真っ白になる。
//   （SPAでは、メッセージ一覧の外側のラッパーが fixed のことがある）
//   keepの内側にあるsticky要素（日付の区切りなど）は、タイルごとに繰り返し写り込むのを防ぐため、従来どおり隠す。
export function freezeFixedElements(keep?: Element): () => void {
  const restore: Array<() => void> = [];

  document.querySelectorAll('*').forEach((el) => {
    const he = el as HTMLElement;
    if (keep && he.contains(keep)) return;
    const cs = getComputedStyle(he);

    if ( cs.position === "fixed" || cs.position === "sticky") {
      const memo = he.style.visibility;
      he.style.setProperty("visibility", "hidden", "important");
      restore.push(() => {
        he.style.visibility = memo;
      })
    }
  });

  return () => restore.forEach((f) => f());
}
