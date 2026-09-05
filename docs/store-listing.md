# Chrome ウェブストア 申請用メモ

ダッシュボード（[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)）に入力する文面と、必要な画像素材の仕様をまとめたもの。

> **注意**: 各テキスト欄の文字数上限は公式ドキュメントに明記がないため、実際のダッシュボードの表示を優先すること。以下の文面はダッシュボードで一般的に案内される上限（アイテム名75文字／概要132文字）を目安に作成している。

---

## 1. ストアの掲載情報（Store listing タブ）

### アイテム名

```
ココソコ - Koko Soko
```

### 概要（Summary）

`manifest.json` の `description` と同一。

```
ココからソコまで、範囲を指定してスクロールごとスクショ / Capture anything from here to there — select a range and shoot the whole scroll.
```

（110文字）

### カテゴリ

**ツール（Tools）** を推奨。「仕事効率化（Productivity）」でも可。

### 言語

**日本語** を主言語として登録。英語圏にも配信する場合は、公開後に英語のロケールを追加し、下記の英語版説明文を登録する。

---

### 詳細な説明 — 日本語

```
「ココソコ」は、Webページ上の好きな範囲をドラッグで選択すると、その範囲をスクロールしながら継ぎ目なく1枚のスクリーンショットに合成してくれる拡張機能です。

画面に収まりきらない長い表、記事の全文、チャットのやり取りなどを、何枚もスクショを撮って後からつなぎ合わせる手間なしに、1枚のPNGとして保存できます。

■ 2つの撮影モード

・Select Area（範囲を選ぶ）
  ドラッグで撮影したい範囲を選択するだけ。選んだ範囲が画面の外まで続いていても、自動でスクロールしながら撮影して1枚に合成します。

・Full Page（ページ全体）
  ページの先頭から末尾まで、まるごと1枚で撮影します。

■ 特徴

・追従ヘッダーを自動で退避
  固定表示のヘッダーやサイドバーは撮影中だけ一時的に非表示にするので、合成画像に同じヘッダーが何度も写り込みません。

・完全にローカルで完結
  撮影も画像の合成もブラウザ内で行います。画像やページの内容が外部サーバーに送信されることは一切ありません。

・最小限の権限
  要求するのは activeTab と scripting のみ。訪問するすべてのサイトを常時読み書きできるような強い権限は要求しません。

■ 使い方

1. ツールバーのアイコンをクリック
2. 「Full Page」か「Select Area」を選ぶ
3. 撮影が終わるとPNGファイルが自動的にダウンロードされます

範囲選択中に Esc キーを押すとキャンセルできます。

■ ご利用にあたって

・chrome:// で始まるページ、Chrome ウェブストア、拡張機能の管理画面では動作しません（Chromeがこれらのページでの拡張機能の実行を禁じているためです）
・Chatwork、Slack、Notion など、ページ全体ではなく特定のコンテナの中身がスクロールするタイプのWebアプリには、現在対応していません（対応を予定しています）
・非常に長いページでは、合成後の画像がブラウザのCanvasサイズ上限を超えてエラーになることがあります（画質を落として続行できるようにする予定です）

■ オープンソース

MITライセンスで公開しています。
https://github.com/enknot96/kokosoko
```

### 詳細な説明 — English

```
Koko Soko lets you drag-select any area of a web page and captures it as one seamless screenshot, scrolling as needed.

Long tables, full articles, chat logs — anything that doesn't fit on one screen — can be saved as a single PNG, without taking several screenshots and stitching them together by hand.

■ Two capture modes

・Select Area
  Just drag to select the region you want. Even if it extends beyond the viewport, the extension scrolls automatically and stitches everything into one image.

・Full Page
  Captures the entire page in one shot, from top to bottom.

■ Features

・Sticky elements are hidden automatically
  Fixed headers and sidebars are temporarily hidden during capture, so they don't appear repeated throughout the stitched image.

・Fully local
  Capturing and stitching both happen inside your browser. No image, and no page content, is ever sent to any server.

・Minimal permissions
  Only activeTab and scripting. No broad, always-on access to every site you visit.

■ How to use

1. Click the toolbar icon
2. Choose "Full Page" or "Select Area"
3. When capturing finishes, a PNG file is downloaded automatically

Press Esc while selecting to cancel.

■ Before you install

・It does not work on chrome:// pages, the Chrome Web Store, or the extensions management page (Chrome forbids extensions from running there)
・Web apps such as Chatwork, Slack, and Notion scroll the contents of a specific container rather than the page itself, and are not supported yet (support is planned)
・On very long pages, the stitched image may exceed the browser's maximum canvas size and fail with an error (an option to continue at a reduced resolution is planned)

■ Open source

Released under the MIT License.
https://github.com/enknot96/kokosoko
```

---

## 2. プライバシー（Privacy タブ）

### 単一用途の説明（Single purpose description）

```
この拡張機能の単一の目的は、ユーザーが現在表示しているWebページのスクリーンショットを撮影することです。ユーザーがドラッグで指定した範囲、またはページ全体を、必要に応じて自動スクロールしながら複数回に分けて撮影し、1枚のPNG画像に合成してローカルに保存します。それ以外の機能は持ちません。
```

```
The single purpose of this extension is to take screenshots of the web page the user is currently viewing. It captures either a region the user selects by dragging, or the entire page, scrolling automatically and capturing in multiple passes as needed, then stitches the result into a single PNG image saved locally. It does nothing else.
```

### 権限の正当性（Permission justification）

**`activeTab`**

```
ユーザーがツールバーのアイコンをクリックしたタブの表示内容を撮影するために必要です。この権限により、対象をユーザーが明示的に操作したタブのみに限定でき、他のタブや、アイコンをクリックしていないときのページにはアクセスしません。
```

```
Required to capture the visible contents of the tab whose toolbar icon the user clicked. This permission limits the extension to the tab the user explicitly acted on; it does not access other tabs, or that page at any other time.
```

**`scripting`**

```
範囲選択のオーバーレイを表示し、複数回に分けて撮影した画像をCanvas上で1枚に合成する処理を行うため、コンテンツスクリプトを対象のタブに読み込む必要があります。スクリプトはユーザーがアイコンをクリックしてモードを選んだときにのみ、そのタブに対して読み込まれます。
```

```
Required to inject the content script that draws the selection overlay and stitches the separately captured tiles into a single image on a canvas. The script is injected into the tab only when the user clicks the icon and chooses a mode.
```

### ホスト権限（Host permission justification）

`host_permissions` は宣言していないため、入力欄は表示されない想定。表示された場合は「宣言していない」旨を記載する。

### リモートコード（Remote code）

**「いいえ、リモートコードは使用していません」** を選択。

すべてのJavaScriptは拡張機能のパッケージに同梱されており、外部からのコード取得・`eval` の使用はない。

### データ使用（Data usage）

**収集するデータ: なし。** ダッシュボードに表示されるすべてのカテゴリのチェックを **外したまま** 送信する。

参考として、ダッシュボードで提示されるカテゴリと本拡張機能の該当状況は以下のとおり（実際の表記はダッシュボードを優先）。

| カテゴリ | 該当 |
| --- | --- |
| 個人を特定できる情報（Personally identifiable information） | なし |
| 健康情報（Health information） | なし |
| 財務情報・支払い情報（Financial and payment information） | なし |
| 認証情報（Authentication information） | なし |
| 個人的なやり取り（Personal communications） | なし |
| 位置情報（Location） | なし |
| ウェブ閲覧履歴（Web history） | なし |
| ユーザー行動（User activity） | なし |
| ウェブサイトのコンテンツ（Website content） | なし |

> 「ウェブサイトのコンテンツ」については、撮影した画像がユーザーのローカル環境から外に出ず、開発者を含む誰にも送信・保存されないため、「収集」には該当しない。

**認証チェックボックス（3項目）はすべてチェックする。** いずれも本拡張機能に当てはまる（データを収集していないため）。

- ユーザーデータを第三者に販売・譲渡していない
- ユーザーデータを単一の目的と無関係な用途に使用・譲渡していない
- ユーザーデータを信用力の判断や融資目的で使用・譲渡していない

### プライバシーポリシーURL

```
https://github.com/enknot96/kokosoko/blob/main/PRIVACY.md
```

> GitHub リポジトリを公開してから登録すること。非公開リポジトリのURLは審査時に開けないため差し戻される。

### サポートURL

```
https://github.com/enknot96/kokosoko/issues
```

---

## 3. 画像素材

### 必要な素材一覧

| 用途 | 規格 | 状態 |
| --- | --- | --- |
| 拡張機能アイコン | 128×128 PNG（96×96 の絵柄＋周囲16pxの透過余白） | ✅ `public/icon/icon-128.png`（絵柄96×92・余白16px以上に調整済み） |
| スクリーンショット | 1280×800（推奨）または 640×400、角丸なし・余白なし、1〜5枚 | 🔶 1枚目のみ用意済み（`assets/screenshots/screenshot-01.png`）。2枚目以降を `assets/screenshots/` へ |
| 小プロモタイル | 440×280 | ✅ `assets/promo/promo-440x280.png`（1280×800版を縮小して作成） |
| マーキープロモタイル | 1400×560（任意） | ⬜ 未作成 |

出典: [Image guidelines - Chrome for Developers](https://developer.chrome.com/docs/webstore/images)

### スクリーンショット構成案（5枚）

ストアのポリシーは「スクリーンショットは実際のユーザー体験を示し、コア機能とコンテンツに焦点を当てること」を求めている。したがって**キービジュアルだけを並べるのは避け、実際の画面を中心に構成する**。

| # | 内容 | 状態 | 撮影のポイント |
| --- | --- | --- | --- |
| 1 | タイトルカード（キービジュアル横長版） | ✅ `screenshot-01.png` | 1280×800・full bleed で規格適合済み。一覧のサムネイルにもなる |
| 2 | ポップアップを開いた状態 | ⬜ 未 | ツールバーのアイコンとポップアップ（Full Page / Select Area）が両方写るように。長いページの上で撮ると用途が伝わりやすい |
| 3 | 範囲選択中のオーバーレイ | ⬜ 未 | ドラッグ中の選択矩形が見えている状態。「ココ」から「ソコ」までが伝わる構図に |
| 4 | 撮影結果 | ⬜ 未 | 保存されたPNGを開いた状態。**画面に収まらない長さが1枚になっている**ことが伝わるよう、縮小表示して全体を見せる |
| 5 | Before / After 比較 | ⬜ 任意 | 「通常のスクショだと3枚に分かれる」→「ココソコなら1枚」のような対比 |

> **1枚目だけで申請しないこと。** 1枚目はタイトルカードであり実画面ではないため、これ単独ではポリシーの「実際のユーザー体験を示す」要件を満たさない。最低でも #2〜#4 のうち1〜2枚は追加する。

撮影時の注意:

- **1280×800 ちょうどで撮る**。macOS なら、ブラウザウィンドウを 1280×800 相当にしてから撮影するか、撮影後に `sips` で調整する
- 個人情報・業務情報が写り込まないよう、撮影対象は Wikipedia など公開ページを使う
- 余白・角丸は付けない（full bleed が要件）

規格に合わせる `sips` コマンドの例:

```bash
# 現在のサイズを確認
sips -g pixelWidth -g pixelHeight input.png

# 幅1280に合わせて縮小してから、高さ800で中央クロップする
sips -Z 1280 input.png --out tmp.png
sips -c 800 1280 tmp.png --out assets/screenshots/screenshot-01.png
```

### キービジュアル横長版（作成済み）

`assets/screenshots/screenshot-01.png` として 1280×800 で作成済み。白背景で全面が埋まっており（full bleed）、規格に適合している。

なお元の `assets/thumbnail/keyvisual.png` は 1223×1286 のほぼ正方形のため、そのままでは横長枠に使えない（1280×800 に縮小すると左右に259pxずつ余白が出て「余白なし」要件に反し、440×280 に中央クロップすると「Koko」「Soko」の文字が両方消える）。横長版が必要な場面では上記の作成済みファイルを使うこと。

**440×280 小プロモタイル（作成済み）**

`assets/promo/promo-440x280.png` として作成済み。1280×800（比率1.600）と 440×280（比率1.571）はほぼ同じ比率のため、高さ280に縮小（448×280）してから左右を4pxずつ削るだけで規格に収まり、構図も文字も損なわれていない。

再作成が必要な場合のコマンド:

```bash
python3 -c "
from PIL import Image
src = Image.open('assets/screenshots/screenshot-01.png').convert('RGB')
r = src.resize((round(src.width * 280 / src.height), 280), Image.LANCZOS)
left = (r.width - 440) // 2
r.crop((left, 0, left + 440, 280)).save('assets/promo/promo-440x280.png')
"
```

作業は Canva、Figma、Photoshop などの画像編集ツールで行う（`sips` では文字入れや再配置ができない）。

### デモGIF（README用・ストアには不要）

置き場所: `assets/demo/demo.gif`

| 項目 | 目安 |
| --- | --- |
| 尺 | 10〜15秒 |
| 内容 | アイコンクリック → Select Area を選択 → ドラッグで範囲指定（自動スクロールが動く様子を含める）→ 撮影 → PNGがダウンロードされる、までを一連で |
| 解像度 | 幅 720〜1000px 程度（README で `width="720"` で表示する想定） |
| フレームレート | 10〜15fps（GitHubで再生する分には十分） |
| ファイルサイズ | **5MB以下**。10MBを超えるとGitHub上での表示が重くなるため、色数を減らすかフレームを間引く |

macOS なら、画面収録（`⌘⇧5`）で .mov を撮ってから GIF に変換する。ffmpeg がある場合の例:

```bash
ffmpeg -i demo.mov -vf "fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 assets/demo/demo.gif
```

---

## 4. 公開後にやること

1. 発行された拡張機能IDを控える
2. `README.md` のバッジとインストールリンクの `EXTENSION_ID` を実際のIDに差し替える
3. `README.md` のデモGIF・スクリーンショットのコメントアウトを解除する
4. リポジトリの About 欄にストアURLを設定する
