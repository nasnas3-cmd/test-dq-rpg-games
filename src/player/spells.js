// spells.js - 呪文定義（オリジナル名）
// kind: attack（攻撃）, heal（回復）, healMp, escape（脱出/ダンジョン）, teleport（街へ）
export const SPELLS = {
  firaLow:  { id: 'firaLow',  name: 'ヒノコ',   kind: 'attack', mp: 3,  power: 14, variance: 4, learnLv: 3,  battleOnly: true,  desc: '小さな ほのおで こうげき' },
  firaMid:  { id: 'firaMid',  name: 'ヒバシラ', kind: 'attack', mp: 7,  power: 34, variance: 8, learnLv: 9,  battleOnly: true,  desc: '大きな ほのおで こうげき' },
  curaLow:  { id: 'curaLow',  name: 'イヤシ',   kind: 'heal',   mp: 3,  power: 32, variance: 6, learnLv: 4,  battleOnly: false, desc: 'HPを かいふくする' },
  curaMid:  { id: 'curaMid',  name: 'イヤシナ', kind: 'heal',   mp: 7,  power: 90, variance: 10, learnLv: 11, battleOnly: false, desc: 'HPを 大きく かいふく' },
  warp:     { id: 'warp',     name: 'マチカエシ', kind: 'teleport', mp: 8, learnLv: 7,  battleOnly: false, desc: '城下町へ もどる' },
  exit:     { id: 'exit',     name: 'ダッシュ', kind: 'escape',  mp: 6, learnLv: 13, battleOnly: false, desc: 'ダンジョンの 入口へ' },
};

export function getSpell(id) { return SPELLS[id]; }

// 各レベルで習得する呪文
export const SPELL_LEARN = {
  3: 'firaLow',
  4: 'curaLow',
  7: 'warp',
  9: 'firaMid',
  11: 'curaMid',
  13: 'exit',
};
