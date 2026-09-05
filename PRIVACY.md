# プライバシーポリシー / Privacy Policy

**ココソコ - Koko Soko**

最終更新日 / Last updated: 2026-09-05

🇯🇵 [日本語](#日本語) | 🇺🇸 [English](#english)

---

## 日本語

### 結論

**ココソコは、いかなるデータも収集・保存・送信しません。**

この拡張機能には外部サーバーとの通信を行うコードが一切含まれていません。撮影した画像も、閲覧しているページの内容も、ユーザーの識別情報も、開発者を含む第三者に渡ることはありません。

### 収集しないもの

以下のいずれも収集・保存・送信していません。

- 個人を特定できる情報（氏名、メールアドレス、住所、年齢など）
- 健康情報、金融情報、認証情報（パスワード、Cookie、トークンなど）
- 位置情報
- 閲覧履歴、開いているページのURLやその内容
- 撮影したスクリーンショットの画像
- クリック、キー入力などの操作履歴
- 利用状況の統計・アナリティクス・クラッシュレポート

### 撮影した画像の扱い

1. ユーザーがツールバーのアイコンをクリックし、モードを選ぶと撮影が始まります
2. 撮影はブラウザのAPI（`chrome.tabs.captureVisibleTab`）で行われ、画像データはブラウザのメモリ上にとどまります
3. 複数回に分けて撮影した画像は、ページ内の Canvas 上で1枚に合成されます
4. 合成結果はPNGファイルとして、お使いのブラウザのダウンロード先フォルダに直接保存されます

この一連の処理はすべてお使いのコンピュータ内で完結します。画像がネットワークに送出されることはありません。保存されたPNGファイルの管理は、通常のダウンロードファイルと同様にユーザーご自身の管理下にあります。

### ブラウザ内への保存について

この拡張機能は `chrome.storage`、`localStorage`、Cookie、IndexedDB のいずれも使用しません。設定値や履歴を含め、ブラウザ内に何も保存しません。

### 要求する権限とその理由

| 権限 | 用途 |
| --- | --- |
| `activeTab` | ユーザーがツールバーのアイコンをクリックした、**そのタブのみ**を撮影・操作するために必要です。この権限はアイコンをクリックした瞬間にのみ付与され、他のタブや、クリックしていないときのページにはアクセスできません |
| `scripting` | 範囲選択のオーバーレイ表示と画像の合成処理を行うスクリプトを、上記のタブに読み込むために必要です |

この拡張機能は、すべてのサイトを常時読み書きできる `host_permissions`（`<all_urls>` など）を**要求していません**。

### 第三者への提供・販売

収集しているデータがないため、第三者への提供・販売・移転は一切行いません。広告ネットワークやアナリティクスサービスも一切組み込んでいません。

### Chrome ウェブストアの Limited Use 要件への準拠

ココソコによるユーザーデータの取り扱いは、[Chrome ウェブストアの Limited Use ポリシー](https://developer.chrome.com/docs/webstore/program-policies/limited-use)に準拠しています。具体的には、以下のいずれも行いません。

- パーソナライズド広告のためのデータの譲渡・使用・販売
- 広告プラットフォーム、データブローカー、その他の情報再販業者などの第三者へのユーザーデータの譲渡・販売
- 信用力の判断または融資目的でのユーザーデータの譲渡・使用・販売

### 検証について

この拡張機能はMITライセンスのオープンソースです。上記の内容はソースコードで検証できます。

https://github.com/enknot96/kokosoko

### ポリシーの変更

内容を変更する場合は、このファイルを更新し、最終更新日を改めます。

### お問い合わせ

https://github.com/enknot96/kokosoko/issues

---

## English

### Summary

**Koko Soko does not collect, store, or transmit any data.**

The extension contains no code that communicates with any external server. Neither the captured images, nor the content of the pages you visit, nor any information identifying you is ever shared with anyone, including the developer.

### What we do not collect

None of the following is collected, stored, or transmitted:

- Personally identifiable information (name, email address, address, age, etc.)
- Health information, financial information, or authentication information (passwords, cookies, tokens, etc.)
- Location data
- Browsing history, or the URL or content of the pages you have open
- The screenshots you capture
- Activity such as clicks or keystrokes
- Usage statistics, analytics, or crash reports

### How captured images are handled

1. Capturing starts only after you click the toolbar icon and choose a mode
2. Capturing is performed by a browser API (`chrome.tabs.captureVisibleTab`), and the image data stays in the browser's memory
3. The separately captured tiles are stitched into a single image on a canvas inside the page
4. The result is saved directly to your browser's download folder as a PNG file

All of this happens on your own computer. No image is ever sent over the network. Once saved, the PNG file is yours to manage, like any other downloaded file.

### Storage inside the browser

The extension uses none of `chrome.storage`, `localStorage`, cookies, or IndexedDB. Nothing — including settings or history — is stored in your browser.

### Permissions and why they are needed

| Permission | Purpose |
| --- | --- |
| `activeTab` | Needed to capture and operate on **only the tab whose toolbar icon you clicked**. The permission is granted only at the moment you click the icon; the extension cannot reach other tabs, or that page at any other time |
| `scripting` | Needed to load the script that draws the selection overlay and stitches the image into that tab |

The extension does **not** request `host_permissions` (such as `<all_urls>`) that would grant always-on read and write access to every site.

### Sharing and selling data

Since no data is collected, none is shared, sold, or transferred to third parties. No advertising network or analytics service is bundled with the extension.

### Compliance with the Chrome Web Store Limited Use policy

Koko Soko's handling of user data complies with the [Chrome Web Store Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use). Specifically, the extension does none of the following:

- Transferring, using, or selling data for personalized advertisements
- Transferring or selling user data to third parties such as advertising platforms, data brokers, or other information resellers
- Transferring, using, or selling user data to determine credit-worthiness or for lending purposes

### Verifying these claims

Koko Soko is open source under the MIT License, so everything stated above can be verified in the source code.

https://github.com/enknot96/kokosoko

### Changes to this policy

If this policy changes, this file will be updated and the "Last updated" date revised.

### Contact

https://github.com/enknot96/kokosoko/issues
