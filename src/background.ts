// --- Service Workerという形態で動く DOMにアクセスできない（構造的にDOMを持っていない）---
// content.js というファイルを、このactiveTabの中で実行して とChromeに頼んでいるだけ
// Chrome拡張機能の立ち上げ方を二通り記載

import { isRestrictedUrl } from './shared/restricted-url';

// activeTabへ、動的にscriptを注入=ユーザーが明示的にアイコンをクリックした、そのタブだけに処理の実行を限定できる
// → 訪問する全サイトの中身を読み書きできる状態にしない（ストアの審査やユーザーへの警告表示で、重い権限として扱われるため）
// 操作対象にしたいタブの一意の数値IDを引数として受け取る
async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId }, // どのタブに
    // ページの中に入って実際の作業をする本体がcontent.js
    files: [ 'content.js'], // 何を（どのJSファイルを）実行するのか
  })
}

const MIN_INTERVAL = 550; // 1秒間に2回までという公式の上限に対し、余裕を見て550ms間隔にする
let lastCapture = 0; // 最後に撮影した時刻(ミリ秒)

// chrome.tabs.captureVisibleTab（画面をキャプチャするAPI）
// 「どのウィンドウか」だけを指定し、そのウィンドウの中で今見えているタブが自動的に対象になる→そのため、引数はwindowId
// 撮影結果を画像データそのもの（バイナリ）ではなく、それを文字列にエンコードしたもの（dataURL）として返す、という仕様
async function throttledCapture(windowId: number): Promise<string> {
  // 1秒間に2回まで → 理論上のギリギリの間隔は 1000ms ÷ 2 = 500ms
  // でも 550ms にして、50msの余裕を持たせている（waitが0、またはマイナスになった場合は待つ必要無し=撮影してOK）
  const wait = Math.max(0, MIN_INTERVAL - (Date.now() - lastCapture)); 
  if (wait > 0) {
    // waitミリ秒後に、resloveを呼び出す
    // → waitミリ秒後に、resolve（呼ばれると、そのPromiseを成功（fulfilled）状態にする関数）が実行される
    // setTimeoutという、Promiseを返さない古い仕組みを、awaitで使えるPromiseの形に変換（ラップ）している
    // setTimeout(実行したい処理, 待機時間ミリ秒)
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  // 試行回数を0から始めて、３回未満の間繰り返す
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // 今から撮影開始するため、その時刻（ミリ秒）を記録
      lastCapture = Date.now();
      return await chrome.tabs.captureVisibleTab(windowId, { format: "png"});
    } catch (e) {
      // 撮影が失敗したら、1回目は600ms、2回目は1200ms... と待ち、リトライする（指数バックオフ）
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  // ループを3回とも失敗して抜けてきた場合、ここでエラーを投げる
  throw new Error("CAPTURE_FAILED");
}

// popup.html でモードが選ばれた時の起動処理
// mode: 'select'（範囲選択） / 'fullpage'（ページ全体を自動撮影）
async function activate(tab: chrome.tabs.Tab, mode: 'select' | 'fullpage'): Promise<void> {
  if (tab.id === undefined) return;

  if (isRestrictedUrl(tab.url)) {
    // 注入できないページ。バッジでユーザーに知らせる（新しい権限は不要）
    chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#e53e3e' });
    chrome.action.setTitle({ tabId: tab.id, title: 'Koko Soko: Not available on this page' });
    return;
  }

  // 注入できるページなので、以前このタブに残っていたかもしれないバッジをクリアする
  chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  chrome.action.setTitle({ tabId: tab.id, title: '' });

  try {
    await injectContentScript(tab.id);
    if (mode === 'fullpage') {
      await chrome.tabs.sendMessage(tab.id, { type: 'RUN_FULL_PAGE' });
    }
  } catch (error) {
    console.error('スクリプト注入に失敗しました', error);
  }
}

// アイコンクリックは popup.html（action.default_popup）が受け持つため、
// ここでは拾わない（default_popup 設定中は chrome.action.onClicked が発火しない仕様のため）

// APIの仕様として、~.onMessage関数の引数は...
// 1番目：送られてきたメッセージの中身 2番目：誰から送られてきたか 3番目：返事をするための関数 と決まっている
// 1番目は明示的に書く必要があり、2番目・3番目はChromeが自動的に引数に入れてくれる
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE") {
    throttledCapture(sender.tab!.windowId)
      // .then(...) は、「そのPromiseが成功（fulfilled）した時に、渡された値を引数として受け取って実行する」という仕組み
      // 返ってきたものがPromiseかどうかだけを見ている
      .then((dataUrl) => sendResponse({ ok: true, dataUrl}))
      .catch((e) => sendResponse({ ok: false, error: String(e)}));
    return true;
  }

  if (msg.type === "ACTIVATE") {
    // popup.ts から、選ばれたモードとタブIDを渡されて呼ばれる
    chrome.tabs.get(msg.tabId).then((tab) => activate(tab, msg.mode));
  }
})
