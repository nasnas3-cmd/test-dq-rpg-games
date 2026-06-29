// messageWindow.js - 「　」枠の文字送りメッセージウィンドウ
// ウィンドウ描画レイアウト定数（draw内と折り返し計算で共有）
const MSG_FONT = '20px "MS Gothic", monospace';
const MSG_PAD_X = 18;   // 左右パディング（枠線にかからない）
const MSG_PAD_Y = 16;   // 上下パディング
const MSG_LINE_H = 26;  // 行送り
const MSG_WIN_H = 134;  // ウィンドウ高さ
const MSG_WIN_BOTTOM = 150; // 下端からのオフセット

export class MessageWindow {
  constructor() {
    this.queue = [];        // 表示待ちメッセージ（ページ単位に展開済み）
    this.current = '';      // 現在表示中のページ全文（折り返し済み・\n含む）
    this.shown = 0;         // 表示済み文字数
    this.timer = 0;
    this.speed = 1.6;       // 文字/フレーム
    this.active = false;
    this.onComplete = null; // 全メッセージ終了時コールバック
    this.choices = null;    // {options:[], index, onSelect}
    this._wrapCache = {};   // measureText結果のキャッシュ用ctx
  }

  // 1文字ずつmeasureText幅で詰め、内幅を超えたら改行。
  // 元の手動\nは尊重しつつ、各行をさらに自動折り返しする。
  _wrapText(ctx, text, maxWidth) {
    ctx.font = MSG_FONT;
    const out = [];
    const paragraphs = String(text).split('\n');
    for (const para of paragraphs) {
      let line = '';
      let lineW = 0;
      for (const chFromText of para) {
        const cw = ctx.measureText(chFromText).width;
        if (lineW + cw > maxWidth && line.length > 0) {
          out.push(line);
          line = chFromText; lineW = cw;
        } else {
          line += chFromText; lineW += cw;
        }
      }
      out.push(line); // 空行も保持
    }
    return out;
  }

  // 折り返し済み行配列を、ウィンドウ高さに収まる行数ごとのページ（\n結合文字列）に分割。
  _paginate(ctx, text, maxWidth, maxLines) {
    const lines = this._wrapText(ctx, text, maxWidth);
    const pages = [];
    for (let i = 0; i < lines.length; i += maxLines) {
      pages.push(lines.slice(i, i + maxLines).join('\n'));
    }
    return pages.length ? pages : [''];
  }

  // 描画コンテキストを使って queue 内の生メッセージをページ展開する。
  // draw時に一度だけ呼ばれ、未展開なら展開する。
  _ensurePaged(ctx, W) {
    if (this._paged || !this._rawQueue) return;
    const innerW = (W - 16 * 2) - MSG_PAD_X * 2;
    const innerH = MSG_WIN_H - MSG_PAD_Y * 2;
    const maxLines = Math.max(1, Math.floor(innerH / MSG_LINE_H));
    const pages = [];
    for (const raw of this._rawQueue) {
      for (const pg of this._paginate(ctx, raw, innerW, maxLines)) pages.push(pg);
    }
    this.queue = pages;
    this._paged = true;
    this._rawQueue = null;
    // 最初のページをロード
    this.current = ''; this.shown = 0;
    this._next();
  }

  // 1つ以上のメッセージを表示。\nで改行可。
  // 実際の折り返し/ページ分割は最初のdraw時（ctx/W判明後）に行う。
  show(messages, onComplete = null) {
    const arr = Array.isArray(messages) ? messages : [messages];
    this._rawQueue = arr.slice();
    this._paged = false;
    this.queue = [];
    this.current = '';
    this.shown = 0;
    this.onComplete = onComplete;
    this.active = true;
    this.choices = null;
  }

  // 選択肢付きメッセージ
  showChoice(message, options, onSelect) {
    this.queue = [];
    this._rawQueue = null; this._paged = true;
    this._choiceRaw = message;   // 折り返しはdraw時に適用
    this.current = message;
    this.shown = message.length;
    this.active = true;
    this.choices = { options, index: 0, onSelect };
  }

  _next() {
    if (this.queue.length === 0) {
      this.active = false;
      const cb = this.onComplete; this.onComplete = null;
      if (cb) cb();
      return;
    }
    this.current = this.queue.shift();
    this.shown = 0;
    this.timer = 0;
  }

  isTyping() { return this.shown < this.current.length; }

  // confirm入力時：文字送り中なら全表示、完了済みなら次へ
  advance() {
    if (!this.active) return;
    // まだページ展開前（最初のdraw未到達）は何もしない
    if (this._rawQueue && !this._paged) return;
    if (this.choices) {
      const ch = this.choices;
      const cb = ch.onSelect; const sel = ch.index;
      this.choices = null; this.active = false;
      if (cb) cb(sel, ch.options[sel]);
      return;
    }
    if (this.isTyping()) { this.shown = this.current.length; }
    else { this._next(); }
  }

  moveChoice(dir) {
    if (!this.choices) return;
    const n = this.choices.options.length;
    if (dir === 'up') this.choices.index = (this.choices.index - 1 + n) % n;
    if (dir === 'down') this.choices.index = (this.choices.index + 1) % n;
  }

  update() {
    if (!this.active || this.choices) return;
    if (this._rawQueue && !this._paged) return; // 展開前はタイプ送りしない
    if (this.isTyping()) {
      this.timer += this.speed;
      while (this.timer >= 1 && this.shown < this.current.length) {
        this.timer -= 1; this.shown++;
      }
    }
  }

  draw(ctx, W, H) {
    if (!this.active) return;
    const pad = 16;
    const wx = pad, wy = H - MSG_WIN_BOTTOM, ww = W - pad * 2, wh = MSG_WIN_H;
    const innerW = ww - MSG_PAD_X * 2;

    // 初回draw時にctx幅が判明するのでここでページ展開
    this._ensurePaged(ctx, W);
    if (!this.active) return; // 展開後に空で終了した場合

    drawWindow(ctx, wx, wy, ww, wh);

    ctx.fillStyle = '#fff';
    ctx.font = MSG_FONT;
    ctx.textBaseline = 'top';

    let drawText;
    if (this.choices) {
      // 選択肢メッセージも内幅で折り返す
      drawText = this._wrapText(ctx, this._choiceRaw != null ? this._choiceRaw : this.current, innerW).join('\n');
    } else {
      drawText = this.current.slice(0, this.shown);
    }
    const lines = drawText.split('\n');
    let yy = wy + MSG_PAD_Y;
    for (const line of lines) {
      ctx.fillText(line, wx + MSG_PAD_X, yy);
      yy += MSG_LINE_H;
    }

    if (this.choices) {
      // 選択肢を右下に小窓で表示
      const cw = 130, ch = this.choices.options.length * 28 + 16;
      const cx = wx + ww - cw - 10, cy = wy - ch - 6;
      drawWindow(ctx, cx, cy, cw, ch);
      ctx.font = '18px "MS Gothic", monospace';
      this.choices.options.forEach((op, i) => {
        const oy = cy + 10 + i * 28;
        if (i === this.choices.index) {
          ctx.fillStyle = '#e0d040';
          ctx.fillText('▶', cx + 8, oy);
          ctx.fillStyle = '#fff';
        } else { ctx.fillStyle = '#fff'; }
        ctx.fillText(op, cx + 30, oy);
      });
    } else if (!this.isTyping()) {
      // 続き▼インジケータ点滅
      if (Math.floor(Date.now() / 400) % 2 === 0) {
        ctx.fillStyle = '#e0d040';
        ctx.fillText('▼', wx + ww - 36, wy + wh - 30);
      }
    }
  }
}

// HP値に応じた表示色を返す共通ヘルパー
//  hp === 0           → 赤
//  hp/maxHp < 0.25    → 黄土色（darkgoldenrod系）
//  それ以外           → 通常色
export function hpColor(hp, maxHp, normal = '#fff') {
  if (hp <= 0) return '#FF0000';
  if (maxHp > 0 && hp / maxHp < 0.25) return '#C8A000';
  return normal;
}

// 共通ウィンドウ枠
export function drawWindow(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,8,24,0.95)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#88a'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}
