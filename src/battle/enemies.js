// enemies.js - 敵データ（オリジナル名）。難易度カーブ：平原→洞窟→竜王城→竜王。
export const ENEMIES = {
  // --- エルゼン平原 ---
  slimeA: { id: 'slimeA', name: 'アオドロ',   hp: 8,   atk: 7,   def: 3,  agi: 4,  exp: 2,   gold: 3,   spells: [], color: '#4aa3ff' },
  ratA:   { id: 'ratA',   name: 'のねずみ',   hp: 10,  atk: 9,   def: 4,  agi: 8,  exp: 3,   gold: 4,   spells: [], color: '#9b7a4a' },
  birdA:  { id: 'birdA',  name: 'つつきどり', hp: 13,  atk: 12,  def: 5,  agi: 12, exp: 4,   gold: 6,   spells: [], color: '#e0c040' },
  wolfA:  { id: 'wolfA',  name: 'のらオオカミ', hp: 28, atk: 18, def: 7,  agi: 11, exp: 7,   gold: 9,   spells: [], color: '#888' },

  // --- 西のうずまき洞 ---
  batC:   { id: 'batC',   name: 'どうくつコウモリ', hp: 22, atk: 16, def: 6, agi: 14, exp: 6, gold: 7, spells: [], color: '#7a4aaa' },
  ghostC: { id: 'ghostC', name: 'まよいびと', hp: 34, atk: 22,  def: 9,  agi: 9,  exp: 10,  gold: 14,  spells: ['firaLow'], color: '#cfe' },
  skelC:  { id: 'skelC',  name: 'がいこつ兵', hp: 52, atk: 28,  def: 14, agi: 8,  exp: 16,  gold: 20,  spells: [], color: '#eee' },
  golemMini:{ id:'golemMini', name:'いわのみはり', hp: 70, atk: 35, def: 22, agi: 5, exp: 30, gold: 40, spells: [], color: '#a86' },
  // 洞窟中ボス
  caveBoss:{ id:'caveBoss', name:'どくのぬし', hp: 110, atk: 42, def: 18, agi: 12, exp: 70, gold: 120, spells: ['firaLow'], color: '#5b3', boss: true },

  // --- 竜王城周辺 / 内部 ---
  knightD:{ id: 'knightD', name: 'やみの騎士', hp: 95, atk: 49, def: 26, agi: 14, exp: 40, gold: 55, spells: [], color: '#446' },
  mageD:  { id: 'mageD',  name: 'あんこく魔導士', hp: 78, atk: 35, def: 18, agi: 16, exp: 44, gold: 60, spells: ['firaMid'], color: '#a2f' },
  golemD: { id: 'golemD', name: 'てつゴーレム', hp: 150, atk: 58, def: 38, agi: 6, exp: 65, gold: 90, spells: [], color: '#778' },
  dragonD:{ id: 'dragonD', name: 'こりゅう',  hp: 140, atk: 56, def: 30, agi: 18, exp: 80, gold: 100, spells: ['firaMid'], color: '#3a6' },

  // --- ラスボス竜王（2段階） ---
  galdis1:{ id:'galdis1', name:'竜王ガルディス', hp: 230, atk: 64, def: 34, agi: 16, exp: 0, gold: 0, spells: ['firaMid'], color: '#c33', boss: true, fleeable: false },
  galdis2:{ id:'galdis2', name:'真・竜王ガルディス', hp: 340, atk: 84, def: 42, agi: 20, exp: 1000, gold: 2000, spells: ['firaMid'], color: '#900', boss: true, fleeable: false, phase2: true },
};

export function getEnemy(id) { return { ...ENEMIES[id] }; }

// マップごとのエンカウントテーブル（重みつき）
export const ENCOUNTER_TABLE = {
  field: [
    { id: 'slimeA', w: 30 },
    { id: 'ratA',   w: 28 },
    { id: 'birdA',  w: 24 },
    { id: 'wolfA',  w: 18 },
  ],
  cave: [
    { id: 'batC',   w: 28 },
    { id: 'ghostC', w: 26 },
    { id: 'skelC',  w: 24 },
    { id: 'golemMini', w: 14 },
  ],
  darkCastle: [
    { id: 'knightD', w: 26 },
    { id: 'mageD',   w: 24 },
    { id: 'golemD',  w: 22 },
    { id: 'dragonD', w: 28 },
  ],
};

export function rollEncounter(mapKey) {
  const table = ENCOUNTER_TABLE[mapKey];
  if (!table) return null;
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e.id; }
  return table[0].id;
}
