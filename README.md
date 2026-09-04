# ココソコ - Koko Soko

ここからそこまで、範囲を指定してスクロールごとスクショできるChrome拡張機能です。

🇯🇵 [日本語](#日本語) | 🇺🇸 [English](#english)

---

## 日本語

### これは何？

「ココソコ」は、Webページ上の好きな範囲をドラッグで選択すると、その範囲をスクロールしながら継ぎ目なく1枚のスクリーンショットに合成してくれるChrome拡張機能です。ページ全体をまるごと1枚で撮影する「Full Page」モードも使えます。

- 撮影はすべて**ブラウザ内で完結**します。画像が外部サーバーに送信されることはありません
- 追従ヘッダーなどの固定要素は撮影時に自動で一時的に非表示にします
- 権限は`activeTab`と`scripting`のみ。ページの中身を常時読み書きできる強い権限は要求しません

### 使い方

1. 拡張機能のアイコンをクリックする
2. 出てきたポップアップで「Full Page」（ページ全体）か「Select Area」（範囲を選ぶ）を選ぶ
   - **Full Page**: そのままページの先頭から末尾まで自動でスクロールしながら撮影します
   - **Select Area**: ドラッグで撮影したい範囲を選択し、指を離すと撮影が始まります（範囲外まで自動スクロールにも対応）
3. 撮影が終わるとPNGファイルとして自動的にダウンロードされます

### インストール（現在Chromeウェブストア未公開・ソースからビルド）

```bash
git clone <このリポジトリのURL>
cd kokosoko
pnpm install
pnpm build
```

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」を選択
4. `dist` フォルダを選択する

### 構成

- `src/background.ts` — Service Worker。`chrome.tabs.captureVisibleTab`の呼び出し・スロットリング・リトライのみを担当
- `src/popup.ts` / `popup.html` — アイコンクリックで開くモード選択ポップアップ
- `src/content/` — 実際のロジック（範囲選択オーバーレイ、座標変換、タイル撮影・Canvas合成、固定要素の一時退避）
- `src/shared/` — background/popupで共有するユーティリティ
- ビルドには Vite を使用。`content.js`のみ再注入時の二重宣言エラーを避けるためIIFE形式で個別ビルドしています（`vite.content.config.ts`）

### ライセンス

[MIT License](./LICENSE)

---

## English

### What is this?

**Koko Soko** is a Chrome extension that lets you drag-select any area of a web page and captures it as one seamless screenshot, scrolling as needed. It also has a "Full Page" mode that captures the entire page in one shot, from top to bottom.

- Capturing happens **entirely inside the browser**. No image is ever sent to any server
- Fixed/sticky elements (like sticky headers) are automatically hidden during capture so they don't appear duplicated
- Uses only the `activeTab` and `scripting` permissions — no broad, always-on access to page content

### Usage

1. Click the extension's icon
2. In the popup, choose **Full Page** or **Select Area**
   - **Full Page**: automatically scrolls from the top of the page to the bottom and captures everything
   - **Select Area**: drag to select the area you want, and release to start capturing (auto-scrolls near the edges while dragging)
3. Once done, a PNG file is downloaded automatically

### Installation (not yet on the Chrome Web Store — build from source)

```bash
git clone <this repository URL>
cd kokosoko
pnpm install
pnpm build
```

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

### Architecture

- `src/background.ts` — the service worker; only handles calling `chrome.tabs.captureVisibleTab`, throttling, and retries
- `src/popup.ts` / `popup.html` — the mode-selection popup shown when the icon is clicked
- `src/content/` — the actual logic (selection overlay, coordinate conversion, tiled capture + canvas stitching, temporarily hiding fixed elements)
- `src/shared/` — utilities shared between background and popup
- Built with Vite. `content.js` is built separately as an IIFE (`vite.content.config.ts`) to avoid a top-level redeclaration error that occurs when the same content script is injected into a page more than once

### License

[MIT License](./LICENSE)
