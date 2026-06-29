// items.js - 武器/防具/盾/道具の定義
// type: weapon, armor, shield, useItem, key
export const ITEMS = {
  // --- 武器 (str加算) ---
  branch:   { id: 'branch',   name: 'こんぼう',     type: 'weapon', atk: 4,  price: 30,   desc: 'ちからを 4 あげる' },
  copper:   { id: 'copper',   name: 'どうのつるぎ', type: 'weapon', atk: 10, price: 220,  desc: 'ちからを 10 あげる' },
  iron:     { id: 'iron',     name: 'はがねのつるぎ', type: 'weapon', atk: 20, price: 900,  desc: 'ちからを 20 あげる' },
  flame:    { id: 'flame',    name: 'ほのおの剣',   type: 'weapon', atk: 34, price: 3000, desc: 'ちからを 34 あげる' },

  // --- 防具 (def加算) ---
  cloth:    { id: 'cloth',    name: 'たびのふく',   type: 'armor', def: 4,  price: 50,   desc: 'みを 4 まもる' },
  leather:  { id: 'leather',  name: 'かわのよろい', type: 'armor', def: 10, price: 280,  desc: 'みを 10 まもる' },
  chain:    { id: 'chain',    name: 'くさりかたびら', type: 'armor', def: 18, price: 850,  desc: 'みを 18 まもる' },
  plate:    { id: 'plate',    name: 'はがねのよろい', type: 'armor', def: 28, price: 2600, desc: 'みを 28 まもる' },

  // --- 盾 (def加算) ---
  woodShield:{ id: 'woodShield', name: 'きのたて',   type: 'shield', def: 4,  price: 90,  desc: 'みを 4 まもる' },
  ironShield:{ id: 'ironShield', name: 'てつのたて', type: 'shield', def: 12, price: 800, desc: 'みを 12 まもる' },

  // --- 道具 ---
  herb:     { id: 'herb',     name: 'やくそう',     type: 'useItem', heal: 30,  price: 12, desc: 'HPを 30 かいふく', consumable: true },
  potion:   { id: 'potion',   name: 'いやしの水',   type: 'useItem', heal: 90,  price: 60, desc: 'HPを 90 かいふく', consumable: true },
  mpHerb:   { id: 'mpHerb',   name: 'まりょくの実', type: 'useItem', healMp: 20, price: 80, desc: 'MPを 20 かいふく', consumable: true },

  // --- 鍵アイテム ---
  swirlKey: { id: 'swirlKey', name: 'うずまきの鍵', type: 'key', price: 0, desc: '西の洞の おくの とびらを ひらく' },
};

export function getItem(id) { return ITEMS[id]; }

// 店の品揃え
export const SHOP_STOCK = {
  townWeapon: ['branch', 'copper', 'iron'],
  townArmor:  ['cloth', 'leather', 'woodShield', 'ironShield'],
  townItem:   ['herb', 'potion', 'mpHerb'],
  swampWeapon:['iron', 'flame'],
  swampArmor: ['chain', 'plate'],
  swampItem:  ['herb', 'potion', 'mpHerb'],
};

export const INN_PRICE = { town: 6, swamp: 20 };
