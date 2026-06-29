// mapRenderer.js - タイル描画とカメラ
import { MAPS, TILE_DEF } from './mapData.js';
import { drawTile, drawSprite } from '../core/gfx.js';
import { npcsOnMap } from './npc.js';

export const TILE = 32; // 1タイルのピクセル

export function renderMap(ctx, mapKey, camX, camY, viewW, viewH, player, frame) {
  const m = MAPS[mapKey];
  if (!m) return;
  const cols = m.tiles[0].length, rows = m.tiles.length;

  const startCol = Math.max(0, Math.floor(camX / TILE));
  const endCol = Math.min(cols - 1, Math.floor((camX + viewW) / TILE));
  const startRow = Math.max(0, Math.floor(camY / TILE));
  const endRow = Math.min(rows - 1, Math.floor((camY + viewH) / TILE));

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const ch = m.tiles[r][c];
      const def = TILE_DEF[ch] || { kind: 'grass' };
      const px = c * TILE - camX, py = r * TILE - camY;
      // 床/特殊タイルの下地を先に
      if (['stairsDown','stairsUp','door','chest','sign','throne'].includes(def.kind)) {
        const baseKind = (mapKey === 'cave' || mapKey === 'caveInner' || mapKey === 'castle' || mapKey === 'darkCastle') ? 'floor' : 'grass';
        drawTile(ctx, baseKind, px, py, TILE);
      }
      drawTile(ctx, def.kind, px, py, TILE);
    }
  }

  // NPC描画（救出済みの姫は隠す）
  for (const npc of npcsOnMap(mapKey)) {
    if (npc.sprite === 'princess' && player.flags.savedPrincess) continue;
    const px = npc.x * TILE - camX, py = npc.y * TILE - camY;
    if (px < -TILE || px > viewW || py < -TILE || py > viewH) continue;
    drawSprite(ctx, npc.sprite, npc.dir, px, py, TILE);
  }
}

// カメラ位置をプレイヤー中心で計算（マップ端でクランプ）
export function computeCamera(mapKey, playerX, playerY, viewW, viewH) {
  const m = MAPS[mapKey];
  const mapW = m.tiles[0].length * TILE, mapH = m.tiles.length * TILE;
  let camX = playerX * TILE + TILE / 2 - viewW / 2;
  let camY = playerY * TILE + TILE / 2 - viewH / 2;
  camX = Math.max(0, Math.min(camX, Math.max(0, mapW - viewW)));
  camY = Math.max(0, Math.min(camY, Math.max(0, mapH - viewH)));
  // マップが画面より小さい場合は中央寄せ
  if (mapW < viewW) camX = (mapW - viewW) / 2;
  if (mapH < viewH) camY = (mapH - viewH) / 2;
  return { camX, camY };
}
