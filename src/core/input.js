// input.js - キーボード/クリック入力の抽象化
// 論理ボタン: up,down,left,right,confirm,cancel,menu
import { BGM } from './audio.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = {};        // 押しっぱなし
    this.pressed = {};     // このフレームで押された（edge）
    this._queue = [];      // 確定エッジのキュー
    this.pointer = null;   // クリック位置 {x,y}（キャンバス座標）

    const map = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
      Escape: 'cancel', KeyX: 'cancel', Backspace: 'cancel',
      KeyM: 'menu', ShiftLeft: 'menu',
    };

    window.addEventListener('keydown', (e) => {
      // 初回キー入力で AudioContext を起こし、その場面のBGMを開始（自動再生ポリシー対応）
      BGM.resume();
      // BGMミュート切替（B）
      if (e.code === 'KeyB') { BGM.toggleMute(); e.preventDefault(); return; }
      const b = map[e.code];
      if (b) {
        if (!this.held[b]) { this.pressed[b] = true; this._queue.push(b); }
        this.held[b] = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const b = map[e.code];
      if (b) { this.held[b] = false; e.preventDefault(); }
    });

    // クリック/タップ → confirm + ポインタ座標
    const handleClick = (clientX, clientY) => {
      BGM.resume(); // 初回クリック/タップでも AudioContext を起動
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      this.pointer = { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    };
    canvas.addEventListener('mousedown', (e) => { handleClick(e.clientX, e.clientY); });
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches[0]) { handleClick(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
    }, { passive: false });
  }

  // フレーム消費後に呼ぶ
  endFrame() {
    this.pressed = {};
    this._queue = [];
    this.pointer = null;
  }

  // 状態遷移時に呼び、貯まったエッジ入力を破棄して決定キーの二重消費を防ぐ
  flush() { this._queue = []; this.pressed = {}; this.pointer = null; }

  consume() { const q = this._queue.slice(); return q; }
  isPressed(b) { return !!this.pressed[b]; }
  isHeld(b) { return !!this.held[b]; }
  takePointer() { const p = this.pointer; this.pointer = null; return p; }
}
