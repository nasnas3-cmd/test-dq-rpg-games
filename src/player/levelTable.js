// levelTable.js - EXPテーブルと成長
// Lv1〜30。後半は緩やか。各Lvの必要累積EXPと、そのLvでのステータス。
export const LEVELS = [];
(function build() {
  // 累積EXPカーブ: 緩やかな指数
  let exp = 0;
  for (let lv = 1; lv <= 30; lv++) {
    if (lv === 1) exp = 0;
    else {
      // 増分: lvに応じて増加（後半は伸び率を抑える）
      const inc = Math.floor(7 * Math.pow(lv - 1, 1.85)) + (lv - 1) * 4;
      exp += inc;
    }
    // ステータス成長
    const maxHp = 18 + Math.floor((lv - 1) * 7.2) + Math.floor(Math.pow(lv, 1.4));
    const maxMp = lv < 3 ? 0 : 4 + Math.floor((lv - 3) * 4.0);
    const str = 4 + Math.floor((lv - 1) * 3.4);
    const agi = 4 + Math.floor((lv - 1) * 2.6);
    LEVELS.push({ lv, exp, maxHp, maxMp: Math.max(0, maxMp), str, agi });
  }
})();

export function levelForExp(totalExp) {
  let lv = 1;
  for (const e of LEVELS) {
    if (totalExp >= e.exp) lv = e.lv;
    else break;
  }
  return lv;
}

export function statsForLevel(lv) {
  return LEVELS[Math.min(lv, 30) - 1];
}

export function expToNext(totalExp) {
  const lv = levelForExp(totalExp);
  if (lv >= 30) return 0;
  return LEVELS[lv].exp - totalExp; // 次レベル(配列index lv)の累積 - 現在
}
