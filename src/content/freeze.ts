// ページ内の position:fixed / sticky な要素を一時的に隠す（visibility: hidden）
// 戻り値の関数を呼ぶと、元の状態に復元される。
export function freezeFixedElements(): () => void {
  const restore: Array<() => void> = [];

  document.querySelectorAll('*').forEach((el) => {
    const he = el as HTMLElement;
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
