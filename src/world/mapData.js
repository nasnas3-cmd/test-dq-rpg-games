// mapData.js - 6マップのタイル定義、当たり判定、マップ間移動、NPC/イベント配置
// タイル記号:
//  . grass / , road / ~ water(不可) / ^ mountain(不可) / T forest(可) / # wall(不可)
//  _ floor / B brick / = bridge / s swamp(可) / D door(可) / > 下り階段 / < 上り階段
//  W 玉座(不可) / C 宝箱(不可・しらべる) / I 看板(不可) / G 竜王トリガ(可)
export const TILE_DEF = {
  '.': { kind: 'grass',   pass: true },
  ',': { kind: 'road',    pass: true },
  '~': { kind: 'water',   pass: false },
  '^': { kind: 'mountain',pass: false },
  'T': { kind: 'forest',  pass: true },
  '#': { kind: 'wall',    pass: false },
  '_': { kind: 'floor',   pass: true },
  'B': { kind: 'brick',   pass: true },
  '=': { kind: 'bridge',  pass: true },
  's': { kind: 'swamp',   pass: true },
  'D': { kind: 'door',    pass: true },
  '>': { kind: 'stairsDown', pass: true },
  '<': { kind: 'stairsUp',   pass: true },
  'W': { kind: 'throne',  pass: false },
  'C': { kind: 'chest',   pass: false },
  'I': { kind: 'sign',    pass: false },
  'G': { kind: 'floor',   pass: true },
};

function grid(rows) { return rows.map(r => r.split('')); }

const castle = grid([
  '###############',
  '#____#WWW#____#',
  '#____#WWW#____#',
  '#____DBBBD____#',
  '#____BBBBB____#',
  '#BBBBBBBBBBBBB#',
  '#B_________B_B#',
  '#B_#####_#_B_B#',
  '#B_#___#_#_B_B#',
  '#B_#___#___B_B#',
  '#BBBBB_BBBBBB_#',
  '#____B_B____B_#',
  '######_########',
  '######_########',
]);

const town = grid([
  '#####,#########',
  '#TT..,.....TT.#',
  '#.DD.,.DD..T..#',
  '#.__.,.__....,#',
  '#....,.......,#',
  '#,,,,,,,,,,,,,#',
  '#.,..DD..,..T.#',
  '#.,..__..,..T.#',
  '#.,......,....#',
  '#T,......,DD..#',
  '#T,......,__..#',
  '#.,...........#',
  '#.,...DD......#',
  '#.,...__......#',
  '#####,########.',
]);

const field = grid([
  '^^^^^^^^^^^^^^^^^^^^^^',
  '^..T..~~~....^^...TT.^',
  '^.....~~.....^...T...^',
  '^..TT........=.......^',
  '^.........T..=...TT..^',
  '^....C....~~~~.......^',
  '^.........~~..T......^',
  '^..TT........T...^^..^',
  '^.....D.........D...^^',
  '^.....,....T........T^',
  '^.....,....T..TT.....^',
  '^.....,....T....D....^',
  '^.....,........T,....^',
  '^.....,.TT......,...T^',
  '^.....,...TT....,...^^',
  '^.....,........,....^^',
  '^.....,........,....^^',
  '^..T..D.T......D.TT..^',
  '^.....~~~~~~~........^',
  '^^^^^^^^^^^^^^^^^^^^^^',
]);

const cave = grid([
  '################',
  '#<_____#______>#',
  '#_####_#_####_##',
  '#_#__#_#_#__#__#',
  '#_#C_#___#__#_##',
  '#_#__####____#_#',
  '#_#_______##_#_#',
  '#_#####_##_#_#_#',
  '#_____#__#_#_#_#',
  '###_#_##_#_#_#_#',
  '#___#____#___#_#',
  '#_###_####_##_##',
  '#_#______D_____#',
  '#_#_####_#####_#',
  '#___#C_______#_#',
  '################',
]);

const caveInner = grid([
  '###########',
  '#____<____#',
  '#_#######_#',
  '#_#WWWWW#_#',
  '#_#_____#_#',
  '#___#_____#',
  '#_#_____#_#',
  '#_#######_#',
  '#_________#',
  '###########',
]);

const swampTown = grid([
  '#####ssssss####',
  '#sT..s....sT..#',
  '#s.DD.s.DD..s.#',
  '#s.__.s.__..s.#',
  '#s....s......s#',
  '#sssssssssss.s#',
  '#s..s..DD..s..#',
  '#s..s..__..s..#',
  '#s..s......s..#',
  '#sssssss.sss.s#',
  '#sT....,s....s#',
  '#s.....sssss.s#',
  '#sssss,ssssss##',
]);

// 洞窟右上 >(14,1) の先の小さな宝物部屋
// C(2,2),C(4,2) / 着地(3,2) / もどり階段 <(3,3)
const caveTreasure = grid([
  '#######',
  '#_____#',
  '#_C_C_#',
  '#__<__#',
  '#######',
]);

const darkCastle = grid([
  '###############',
  '#<___________##',
  '##_#########_##',
  '#__#WWWWWWW#_##',
  '#_##_______#_##',
  '#_#__#####_#_##',
  '#_#_##___#_#_##',
  '#_#__#_#_#_#_##',
  '#_##_#_#_#_#_##',
  '#__#_#_#_#_#_##',
  '##_#_#_#_#_#_##',
  '#__#_#_#_#_#_##',
  '#_##_#___#_#_##',
  '#__########_###',
  '#G___________##',
  '###############',
]);

export const MAPS = {
  castle:     { name: 'castle',     tiles: castle,     encounter: null,         music: 'castle' },
  town:       { name: 'town',       tiles: town,       encounter: null,         music: 'town' },
  field:      { name: 'field',      tiles: field,      encounter: 'field',      music: 'field' },
  cave:       { name: 'cave',       tiles: cave,       encounter: 'cave',       music: 'cave' },
  caveInner:  { name: 'caveInner',  tiles: caveInner,  encounter: 'cave',       music: 'cave' },
  swampTown:  { name: 'swampTown',  tiles: swampTown,  encounter: null,         music: 'town' },
  caveTreasure:{ name: 'caveTreasure', tiles: caveTreasure, encounter: null,    music: 'cave' },
  darkCastle: { name: 'darkCastle', tiles: darkCastle, encounter: 'darkCastle', music: 'boss' },
};

// マップ間移動: "map,x,y" -> {map,x,y,dir,requireKey?,requireFlag?}
export const WARPS = {
  'castle,6,13':   { map: 'field', x: 6, y: 9, dir: 'down' },
  'field,6,8':     { map: 'castle', x: 6, y: 11, dir: 'up' },
  'field,16,11':   { map: 'town', x: 5, y: 1, dir: 'down' },
  'town,5,0':      { map: 'field', x: 16, y: 10, dir: 'up' },
  'town,5,14':     { map: 'field', x: 16, y: 13, dir: 'down' },
  'field,5,17':    { map: 'cave', x: 1, y: 2, dir: 'down' },
  'cave,1,1':      { map: 'field', x: 5, y: 16, dir: 'up' },
  'cave,9,12':     { map: 'caveInner', x: 5, y: 8, dir: 'up', requireKey: 'swirlKey' },
  'caveInner,5,1': { map: 'cave', x: 10, y: 12, dir: 'down' },
  'field,6,17':    { map: 'swampTown', x: 6, y: 1, dir: 'down' },
  'swampTown,6,0': { map: 'field', x: 6, y: 16, dir: 'up' },
  'cave,14,1':     { map: 'caveTreasure', x: 3, y: 2, dir: 'down' },
  'caveTreasure,3,3':{ map: 'cave', x: 13, y: 1, dir: 'down' },
  'field,15,8':    { map: 'darkCastle', x: 2, y: 1, dir: 'down', requireFlag: 'savedPrincess' },
  'darkCastle,1,1':{ map: 'field', x: 15, y: 9, dir: 'down' },
};

export function getMap(key) { return MAPS[key]; }
export function tileAt(mapKey, x, y) {
  const m = MAPS[mapKey];
  if (!m) return null;
  if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return '#';
  return m.tiles[y][x];
}
export function isPassable(mapKey, x, y) {
  const ch = tileAt(mapKey, x, y);
  const d = TILE_DEF[ch];
  return d ? d.pass : false;
}
