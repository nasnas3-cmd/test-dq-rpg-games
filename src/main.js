// main.js - エントリ。Canvas取得 → Game生成 → Engineループ起動。
import { Engine } from './core/engine.js';
import { Game } from './game.js';
import { AssetManager } from './core/assets.js';
import { STATE } from './core/stateMachine.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game');
  // PNGがあればロード（無くてもプレースホルダで動く）
  await AssetManager.preload();

  const game = new Game(canvas);

  // 名前入力：NAME状態のときだけ生のキー入力を文字列に反映
  window.addEventListener('keydown', (e) => {
    if (game.sm.state !== STATE.NAME) return;
    if (e.key === 'Backspace') { game.nameInput = game.nameInput.slice(0, -1); e.preventDefault(); }
    else if (e.key === 'Enter') { /* engine側でconfirm処理 */ }
    else if (e.key.length === 1 && game.nameInput.length < 6 && !['z','x'].includes(e.key)) {
      // 1文字（英数・かな等）追加
      game.nameInput += e.key;
    }
  });

  // タイトル画面：E=書き出し / I=読み込み（再開のためのファイル導線）
  window.addEventListener('keydown', (e) => {
    if (game.sm.state !== STATE.TITLE) return;
    if (e.code === 'KeyE') { e.preventDefault(); game.exportSave(); }
    else if (e.code === 'KeyI') { e.preventDefault(); game.importSave(); }
  });

  const engine = new Engine(
    (dt, frame) => game.update(dt, frame),
    () => game.render()
  );
  engine.start();

  // デバッグ用にグローバル公開
  window.__game = game;
});
