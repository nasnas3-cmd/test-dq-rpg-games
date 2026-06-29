// player.js - プレイヤー状態管理
import { LEVELS, levelForExp, statsForLevel, expToNext } from './levelTable.js';
import { SPELL_LEARN } from './spells.js';
import { getItem } from '../data/items.js';

export class Player {
  constructor(name = 'ユウシャ') {
    this.name = name;
    this.lv = 1;
    this.exp = 0;
    const s = statsForLevel(1);
    this.maxHp = s.maxHp; this.hp = s.maxHp;
    this.maxMp = s.maxMp; this.mp = s.maxMp;
    this.str = s.str; this.agi = s.agi;
    this.gold = 0;
    this.weapon = null; this.armor = null; this.shield = null;
    this.items = []; // [{id, qty}]
    this.spells = [];
    this.pos = { map: 'castle', x: 7, y: 11, dir: 'up' };
    // ストーリーフラグ
    this.flags = {
      metKing: false,
      gotKey: false,
      savedPrincess: false,
      galdisDefeated: false,
      bridgeSolved: false,
    };
  }

  // 装備込みの攻撃力・守備力
  get atk() { return this.str + (this.weapon ? getItem(this.weapon).atk : 0); }
  get def() {
    // すばやさの守備寄与を 1/2 → 1/3 に見直し（終盤の被ダメ過小＝簡単すぎを是正）
    let d = Math.floor(this.agi / 3);
    if (this.armor) d += getItem(this.armor).def;
    if (this.shield) d += getItem(this.shield).def;
    return d;
  }

  addExp(amount) {
    this.exp += amount;
    const newLv = levelForExp(this.exp);
    const ups = [];
    while (this.lv < newLv) {
      this.lv++;
      const s = statsForLevel(this.lv);
      const dHp = s.maxHp - this.maxHp;
      const dMp = s.maxMp - this.maxMp;
      this.maxHp = s.maxHp; this.maxMp = s.maxMp;
      this.str = s.str; this.agi = s.agi;
      this.hp = Math.min(this.maxHp, this.hp + dHp); // 上昇分だけ回復
      this.mp = Math.min(this.maxMp, this.mp + dMp);
      const learned = SPELL_LEARN[this.lv];
      if (learned && !this.spells.includes(learned)) this.spells.push(learned);
      ups.push({ lv: this.lv, learned });
    }
    return ups; // 配列（複数Lvアップ対応）
  }

  expToNext() { return expToNext(this.exp); }

  addItem(id, qty = 1) {
    const it = getItem(id);
    if (!it) return false;
    if (it.consumable) {
      const slot = this.items.find(s => s.id === id);
      if (slot) slot.qty += qty;
      else this.items.push({ id, qty });
    } else {
      // 装備・鍵は重複させず1つ
      if (!this.items.find(s => s.id === id)) this.items.push({ id, qty: 1 });
    }
    return true;
  }

  removeItem(id, qty = 1) {
    const idx = this.items.findIndex(s => s.id === id);
    if (idx < 0) return false;
    this.items[idx].qty -= qty;
    if (this.items[idx].qty <= 0) this.items.splice(idx, 1);
    return true;
  }

  hasItem(id) { return this.items.some(s => s.id === id); }

  equip(id) {
    const it = getItem(id);
    if (!it) return false;
    if (it.type === 'weapon') this.weapon = id;
    else if (it.type === 'armor') this.armor = id;
    else if (it.type === 'shield') this.shield = id;
    else return false;
    return true;
  }

  // 現在 weapon/armor/shield のいずれかに装備中か
  isEquipped(id) {
    return this.weapon === id || this.armor === id || this.shield === id;
  }

  // 装備解除：該当スロットを null に（武器→素手 / 防具・盾→なし）。atk/defは再計算される。
  unequip(id) {
    let changed = false;
    if (this.weapon === id) { this.weapon = null; changed = true; }
    if (this.armor === id) { this.armor = null; changed = true; }
    if (this.shield === id) { this.shield = null; changed = true; }
    return changed;
  }

  heal(n) { const before = this.hp; this.hp = Math.max(0, Math.min(this.maxHp, this.hp + n)); return this.hp - before; }
  healMp(n) { const before = this.mp; this.mp = Math.max(0, Math.min(this.maxMp, this.mp + n)); return this.mp - before; }
  fullHeal() { this.hp = this.maxHp; this.mp = this.maxMp; }

  // ダメージ適用：HPは0未満にならないようクランプ。実際に減った量を返す。
  takeDamage(n) { const before = this.hp; this.hp = Math.max(0, this.hp - Math.max(0, n)); return before - this.hp; }
  spendMp(n) { const before = this.mp; this.mp = Math.max(0, this.mp - Math.max(0, n)); return before - this.mp; }

  isDead() { return this.hp <= 0; }

  // セーブ用シリアライズ
  toJSON() {
    return {
      name: this.name, lv: this.lv, exp: this.exp,
      maxHp: this.maxHp, hp: this.hp, maxMp: this.maxMp, mp: this.mp,
      str: this.str, agi: this.agi, gold: this.gold,
      weapon: this.weapon, armor: this.armor, shield: this.shield,
      items: this.items, spells: this.spells, pos: this.pos, flags: this.flags,
    };
  }

  static fromJSON(d) {
    const p = new Player(d.name);
    Object.assign(p, d);
    // pos/flagsの欠損補完
    p.pos = Object.assign({ map: 'castle', x: 7, y: 11, dir: 'up' }, d.pos || {});
    p.flags = Object.assign({ metKing: false, gotKey: false, savedPrincess: false, galdisDefeated: false, bridgeSolved: false }, d.flags || {});
    p.items = Array.isArray(d.items) ? d.items : [];
    p.spells = Array.isArray(d.spells) ? d.spells : [];

    // === セーブマイグレーション / ステータス再計算 ===
    // レベルとEXPの整合を取り直し、最大HP/MP・力・素早さを現在のlevelTableから再計算する。
    // これにより今後バランス調整しても旧セーブが古い数値に固定されない。
    p.exp = Number.isFinite(d.exp) ? d.exp : 0;
    p.lv = Math.max(1, Math.min(30, levelForExp(p.exp)));
    const s = statsForLevel(p.lv);
    // 現在HP/MPはセーブ値を尊重しつつ、新しい最大値でクランプ（満タン時の維持も考慮）
    const prevMaxHp = Number.isFinite(d.maxHp) ? d.maxHp : s.maxHp;
    const prevMaxMp = Number.isFinite(d.maxMp) ? d.maxMp : s.maxMp;
    const wasFullHp = Number.isFinite(d.hp) && d.hp >= prevMaxHp;
    const wasFullMp = Number.isFinite(d.mp) && d.mp >= prevMaxMp;
    p.maxHp = s.maxHp; p.maxMp = s.maxMp;
    p.str = s.str; p.agi = s.agi;
    p.hp = wasFullHp ? p.maxHp : Math.max(1, Math.min(p.maxHp, Number.isFinite(d.hp) ? d.hp : p.maxHp));
    p.mp = wasFullMp ? p.maxMp : Math.max(0, Math.min(p.maxMp, Number.isFinite(d.mp) ? d.mp : p.maxMp));
    // 習得呪文もレベルから補完（取りこぼし防止）
    for (let lv = 1; lv <= p.lv; lv++) {
      const learned = SPELL_LEARN[lv];
      if (learned && !p.spells.includes(learned)) p.spells.push(learned);
    }
    return p;
  }
}
