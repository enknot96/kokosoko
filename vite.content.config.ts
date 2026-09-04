import { defineConfig } from 'vite';
import { resolve } from 'path';

// content script 専用のビルド設定。
// IIFE（自己実行関数）でまとめることで、chrome.scripting.executeScript による
// 再注入のたびに新しい関数スコープが作られるようにする。
// これにより、トップレベルの class/const（例: WindowScrollTarget, MAX_DIM）が
// 再注入時に「Identifier has already been declared」で衝突する問題を根本的に防ぐ。
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
      },
    },
    outDir: 'dist',
    // vite.config.ts（background/popup）のビルド成果物を消さないようにする
    emptyOutDir: false,
    target: 'chrome116',
  },
});
