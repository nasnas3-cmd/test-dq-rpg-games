// chests.js - 宝箱の中身（しらべるで開封・1回限り）
// key "map,x,y" -> {gold?, item?, once:true}
export const CHESTS = {
  'field,5,5':    { gold: 60 },
  'cave,3,4':     { item: 'leather' },
  'cave,5,14':    { gold: 150 },
  // 右上 >(14,1) の先の宝物部屋
  'caveTreasure,2,2': { gold: 200 },
  'caveTreasure,4,2': { item: 'potion' },
  // 竜王城の玉座前に最強回復をいくつか（任意探索ではなくマップ進行で拾える位置）
};

// 開封済み管理はplayer.flagsとは別にゲーム側のSetで保持
