// vite の publicDir(=public) 自動コピーではカバーできない、
// リポジトリ直下の manifest.json だけを dist にコピーするビルド後処理。
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
copyFileSync(resolve(root, 'manifest.json'), resolve(root, 'dist/manifest.json'));
