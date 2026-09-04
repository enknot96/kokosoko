import { defineConfig } from 'vite';
import { resolve } from 'path';

// background（Service Worker）と popup はどちらもESモジュールとして読み込まれるため、
// import文を使ったままビルドできる（共有チャンク restricted-url.js もこちらでのみ発生する）。
// content script は別ビルド（vite.content.config.ts）でIIFEにまとめる。
// 理由: chrome.scripting.executeScript は content.js を「通常のスクリプト」として注入するため、
// ESモジュール形式のままだとトップレベルの class/const が再注入のたびに
// 「Identifier has already been declared」で衝突してしまう。
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome116',
  },
});
