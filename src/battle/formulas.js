// formulas.js - ダメージ/命中/逃走/呪文成功の計算式（設計書 第3章準拠）
export function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 物理ダメージ: (攻撃力/2 - 守備力/4) を基準に乱数±約25%。最低1。
export function physicalDamage(atk, def) {
  const base = atk / 2 - def / 4;
  const min = Math.floor(base * 0.78);
  const max = Math.ceil(base * 1.05);
  let dmg = rint(Math.min(min, max), Math.max(min, max));
  if (dmg < 1) dmg = base > 0 ? 1 : 0;
  // 守備が高すぎても会心の余地: 1/32で会心(守備無視のatk/2前後)
  if (Math.random() < 1 / 32) dmg = Math.max(dmg, Math.floor(atk / 2 * rint(9, 11) / 10));
  return Math.max(0, dmg);
}

// 呪文ダメージ: power基準に乱数。守備は無視。
export function spellDamage(power, variance) {
  return Math.max(1, power + rint(-variance, variance));
}

// 回復量
export function healAmount(power, variance) {
  return Math.max(1, power + rint(-variance, variance));
}

// 命中判定: 基本96%。相手のagiが攻撃側より高いと回避が増える。
export function isHit(attackerAgi, defenderAgi) {
  let evade = 0.04;
  if (defenderAgi > attackerAgi) {
    evade += Math.min(0.18, (defenderAgi - attackerAgi) / attackerAgi * 0.25);
  }
  return Math.random() > evade;
}

// 逃走判定: 自分のagiと敵agi比較。基本50%、agi差で増減。
export function canFlee(playerAgi, enemyAgi) {
  let chance = 0.5 + (playerAgi - enemyAgi) / (playerAgi + enemyAgi + 1) * 0.5;
  chance = Math.max(0.12, Math.min(0.95, chance));
  return Math.random() < chance;
}

// 行動順: agiに乱数を乗じて高い方が先攻
export function playerFirst(playerAgi, enemyAgi) {
  const p = playerAgi * (0.8 + Math.random() * 0.4);
  const e = enemyAgi * (0.8 + Math.random() * 0.4);
  return p >= e;
}
