// content script を注入できない特別なページ（chrome://、Web Storeなど）かどうかを判定する
const RESTRICTED_URL = /^(chrome|chrome-extension|edge|about):\/\/|^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/;

export function isRestrictedUrl(url: string | undefined): boolean {
  // URLが取得できない場合も、安全側に倒して「使えない」扱いにする
  if (!url) return true;
  return RESTRICTED_URL.test(url);
}
