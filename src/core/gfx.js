// gfx.js - プレースホルダ描画（色付き矩形＋簡易ピクセル）。
// PNGがあれば AssetManager 経由で差し替わる。なければここで描く。
import { AssetManager } from './assets.js';

// タイル種別 -> 描画。tはサイズ(px)。
export function drawTile(ctx, kind, px, py, t) {
  if (AssetManager.hasImage(kind)) {
    ctx.drawImage(AssetManager.images[kind], px, py, t, t);
    return;
  }
  switch (kind) {
    case 'grass':   base(ctx, px, py, t, '#3a7d3a'); dots(ctx, px, py, t, '#2f6a2f'); break;
    case 'road':    base(ctx, px, py, t, '#b89a5e'); break;
    case 'water':   base(ctx, px, py, t, '#2b6fd6'); waves(ctx, px, py, t); break;
    case 'swamp':   base(ctx, px, py, t, '#5a6b3a'); dots(ctx, px, py, t, '#454f28'); break;
    case 'mountain':base(ctx, px, py, t, '#7a6a52'); tri(ctx, px, py, t, '#5c4f3c'); break;
    case 'forest':  base(ctx, px, py, t, '#2f6a2f'); tree(ctx, px, py, t); break;
    case 'wall':    base(ctx, px, py, t, '#555a66'); brickLines(ctx, px, py, t, '#3d414b'); break;
    case 'brick':   base(ctx, px, py, t, '#6b6f7a'); brickLines(ctx, px, py, t, '#54585f'); break;
    case 'floor':   base(ctx, px, py, t, '#8a8170'); grid(ctx, px, py, t, '#766e5e'); break;
    case 'bridge':  base(ctx, px, py, t, '#9a7b46'); plank(ctx, px, py, t); break;
    case 'door':    base(ctx, px, py, t, '#6b6f7a'); door(ctx, px, py, t); break;
    case 'stairsDown': base(ctx, px, py, t, '#8a8170'); stairs(ctx, px, py, t, true); break;
    case 'stairsUp':   base(ctx, px, py, t, '#8a8170'); stairs(ctx, px, py, t, false); break;
    case 'throne':  base(ctx, px, py, t, '#8a8170'); throne(ctx, px, py, t); break;
    case 'chest':   base(ctx, px, py, t, '#8a8170'); chest(ctx, px, py, t); break;
    case 'sign':    base(ctx, px, py, t, '#3a7d3a'); sign(ctx, px, py, t); break;
    default:        base(ctx, px, py, t, '#222');
  }
}

function base(ctx, x, y, t, c) { ctx.fillStyle = c; ctx.fillRect(x, y, t, t); }
function dots(ctx, x, y, t, c) {
  ctx.fillStyle = c; const s = Math.max(2, t / 12);
  ctx.fillRect(x + t * 0.2, y + t * 0.3, s, s);
  ctx.fillRect(x + t * 0.6, y + t * 0.55, s, s);
  ctx.fillRect(x + t * 0.4, y + t * 0.78, s, s);
}
function waves(ctx, x, y, t) {
  ctx.strokeStyle = '#5b9bf0'; ctx.lineWidth = Math.max(1, t / 16);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const yy = y + t * (0.35 + i * 0.35);
    ctx.moveTo(x + 2, yy);
    ctx.quadraticCurveTo(x + t / 2, yy - t * 0.12, x + t - 2, yy);
  }
  ctx.stroke();
}
function tri(ctx, x, y, t, c) {
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x + t * 0.5, y + t * 0.2);
  ctx.lineTo(x + t * 0.85, y + t * 0.8);
  ctx.lineTo(x + t * 0.15, y + t * 0.8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.moveTo(x + t * 0.5, y + t * 0.2);
  ctx.lineTo(x + t * 0.62, y + t * 0.42);
  ctx.lineTo(x + t * 0.38, y + t * 0.42);
  ctx.closePath(); ctx.fill();
}
function tree(ctx, x, y, t) {
  ctx.fillStyle = '#1f4d1f';
  ctx.beginPath(); ctx.arc(x + t / 2, y + t * 0.45, t * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a23'; ctx.fillRect(x + t * 0.45, y + t * 0.55, t * 0.1, t * 0.3);
}
function brickLines(ctx, x, y, t, c) {
  ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + t / 2); ctx.lineTo(x + t, y + t / 2);
  ctx.moveTo(x + t / 2, y); ctx.lineTo(x + t / 2, y + t / 2);
  ctx.moveTo(x + t * 0.25, y + t / 2); ctx.lineTo(x + t * 0.25, y + t);
  ctx.moveTo(x + t * 0.75, y + t / 2); ctx.lineTo(x + t * 0.75, y + t);
  ctx.stroke();
}
function grid(ctx, x, y, t, c) {
  ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);
}
function plank(ctx, x, y, t) {
  ctx.strokeStyle = '#6b5430'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + t * i / 4); ctx.lineTo(x + t, y + t * i / 4); ctx.stroke(); }
}
function door(ctx, x, y, t) {
  ctx.fillStyle = '#7a5a2a'; ctx.fillRect(x + t * 0.2, y + t * 0.1, t * 0.6, t * 0.9);
  ctx.fillStyle = '#d8c060'; ctx.fillRect(x + t * 0.66, y + t * 0.5, t * 0.08, t * 0.08);
}
function stairs(ctx, x, y, t, down) {
  ctx.fillStyle = down ? '#33373f' : '#c9c3ad';
  for (let i = 0; i < 4; i++) {
    const w = t * (0.25 + i * 0.18);
    ctx.fillRect(x + (t - w) / 2, y + t * (0.15 + i * 0.2), w, t * 0.12);
  }
}
function throne(ctx, x, y, t) {
  ctx.fillStyle = '#c9a227'; ctx.fillRect(x + t * 0.25, y + t * 0.2, t * 0.5, t * 0.6);
  ctx.fillStyle = '#8a2be2'; ctx.fillRect(x + t * 0.32, y + t * 0.3, t * 0.36, t * 0.3);
}
function chest(ctx, x, y, t) {
  ctx.fillStyle = '#8a5a20'; ctx.fillRect(x + t * 0.2, y + t * 0.35, t * 0.6, t * 0.45);
  ctx.fillStyle = '#d8c060'; ctx.fillRect(x + t * 0.2, y + t * 0.45, t * 0.6, t * 0.08);
}
function sign(ctx, x, y, t) {
  ctx.fillStyle = '#6b4a23'; ctx.fillRect(x + t * 0.44, y + t * 0.4, t * 0.12, t * 0.5);
  ctx.fillStyle = '#c9a96a'; ctx.fillRect(x + t * 0.25, y + t * 0.2, t * 0.5, t * 0.3);
}

// ============ スプライト（キャラ） ============
// 種別 + 向き で色違いの簡易ピクセルキャラを描く。
const SPRITE_COLORS = {
  hero: { body: '#2e64c8', skin: '#f0c090', hair: '#5a3a1a', accent: '#e0d040' },
  king: { body: '#a01010', skin: '#f0c090', hair: '#dddddd', accent: '#e0d040' },
  princess: { body: '#d86aa8', skin: '#f0c090', hair: '#e0c040', accent: '#fff' },
  soldier: { body: '#6a7a8a', skin: '#f0c090', hair: '#333', accent: '#bbb' },
  priest: { body: '#e8e8e8', skin: '#f0c090', hair: '#888', accent: '#c9a227' },
  townsman: { body: '#3a8a4a', skin: '#f0c090', hair: '#5a3a1a', accent: '#7a5a2a' },
  elder: { body: '#8a7a5a', skin: '#f0c090', hair: '#ddd', accent: '#aaa' },
  shop: { body: '#9a6a2a', skin: '#f0c090', hair: '#3a2a1a', accent: '#d8c060' },
  bridge: { body: '#5a5a7a', skin: '#f0c090', hair: '#444', accent: '#888' },
};

export function drawSprite(ctx, kind, dir, px, py, t) {
  const c = SPRITE_COLORS[kind] || SPRITE_COLORS.townsman;
  const u = t / 16; // ピクセル単位
  const P = (cx, cy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(px + cx * u, py + cy * u, w * u, h * u); };
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(px + t / 2, py + t * 0.92, t * 0.32, t * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // 体
  P(5, 8, 6, 6, c.body);
  // 頭
  P(5, 3, 6, 5, c.skin);
  // 髪
  P(5, 2, 6, 2, c.hair);
  // アクセント（肩/帯）
  P(5, 11, 6, 1, c.accent);
  // 目（向きで位置を変える）
  ctx.fillStyle = '#222';
  if (dir === 'down' || !dir) { P(6, 5, 1, 1, '#222'); P(9, 5, 1, 1, '#222'); }
  else if (dir === 'up') { /* 後頭部：目なし、髪多め */ P(5, 4, 6, 1, c.hair); }
  else if (dir === 'left') { P(6, 5, 1, 1, '#222'); }
  else if (dir === 'right') { P(9, 5, 1, 1, '#222'); }
  // 足
  P(5, 14, 2, 2, '#333'); P(9, 14, 2, 2, '#333');
}

// 敵スプライト（色指定で簡易モンスター）。battle画面で大きく描く。
export function drawEnemy(ctx, color, cx, cy, size) {
  const u = size / 16;
  const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(cx - size / 2 + x * u, cy - size / 2 + y * u, w * u, h * u); };
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.46, size * 0.4, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // 体（丸み）
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.42, size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(cx - size * 0.12, cy - size * 0.14, size * 0.16, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // 目
  P(4.5, 6, 2, 2.5, '#fff'); P(9.5, 6, 2, 2.5, '#fff');
  P(5, 7, 1, 1.5, '#111'); P(10, 7, 1, 1.5, '#111');
  // 口
  ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1, u);
  ctx.beginPath(); ctx.moveTo(cx - size * 0.12, cy + size * 0.16); ctx.lineTo(cx + size * 0.12, cy + size * 0.16); ctx.stroke();
}
