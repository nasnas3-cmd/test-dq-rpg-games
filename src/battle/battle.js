// battle.js - 1対1ターン制コマンド戦闘
import { STR } from '../data/strings.js';
import { getEnemy } from './enemies.js';
import { getSpell, SPELLS } from '../player/spells.js';
import { getItem } from '../data/items.js';
import * as F from './formulas.js';
import { drawWindow, hpColor } from '../ui/messageWindow.js';
import { drawEnemy } from '../core/gfx.js';

// 戦闘状態: 'intro','command','submenu','anim','message','result','done'
export class Battle {
  constructor(game, enemyId, opts = {}) {
    this.game = game;
    this.player = game.player;
    this.enemy = getEnemy(enemyId);
    this.enemyMaxHp = this.enemy.hp;
    this.isBoss = !!this.enemy.boss;
    this.fleeable = this.enemy.fleeable !== false && !this.isBoss ? true : (this.enemy.fleeable === true);
    this.opts = opts; // {onWin, onLose, onFlee, isGaldis2}

    this.phase = 'intro';
    this.commandIndex = 0;
    this.commands = ['たたかう', 'じゅもん', 'どうぐ', 'にげる'];
    this.submenu = null;   // {type:'spell'|'item', items:[], index}
    this.msgQueue = [];
    this.shakeTimer = 0;
    this.enemyHurtTimer = 0;
    this.flashTimer = 0;
    this.battleOver = false;
    this.result = null; // 'win','lose','flee'

    const grp = this.isBoss ? this.enemy.name : this.enemy.name;
    this.pushMsg(STR.battle.appear(grp));
    this.phase = 'message';
    // 先攻判定（agi×乱数）。敵が先攻なら最初に敵の一手を挟む。ボスは常にプレイヤー先攻。
    const enemyFirst = !this.isBoss && !F.playerFirst(this.player.agi, this.enemy.agi);
    this.afterMessage = enemyFirst
      ? () => { this.pushMsg('てきに せんせいを とられた！'); this.phase = 'message'; this.afterMessage = () => this._enemyTurn(); }
      : () => { this.phase = 'command'; };
  }

  pushMsg(text) { this.msgQueue.push(text); }

  // ===== 入力処理 =====
  handleInput(buttons, pointer) {
    if (this.phase === 'message') {
      if (buttons.includes('confirm') || buttons.includes('cancel') || pointer) {
        this._advanceMessage();
      }
      return;
    }
    if (this.phase === 'command') {
      // 2x2配置（index: 0=左上,1=右上,2=左下,3=右下）
      // up/down は縦移動(±2)、left/right は横移動(±1)。全4項目を巡回。
      if (buttons.includes('up')) this.commandIndex = (this.commandIndex + 2) % 4;
      if (buttons.includes('down')) this.commandIndex = (this.commandIndex + 2) % 4;
      if (buttons.includes('left')) this.commandIndex = this.commandIndex % 2 === 1 ? this.commandIndex - 1 : this.commandIndex + 1;
      if (buttons.includes('right')) this.commandIndex = this.commandIndex % 2 === 0 ? this.commandIndex + 1 : this.commandIndex - 1;
      if (buttons.includes('confirm')) this._chooseCommand(this.commandIndex);
      return;
    }
    if (this.phase === 'submenu') {
      const n = this.submenu.list.length;
      if (buttons.includes('up')) this.submenu.index = (this.submenu.index - 1 + n) % n;
      if (buttons.includes('down')) this.submenu.index = (this.submenu.index + 1) % n;
      if (buttons.includes('cancel')) { this.phase = 'command'; this.submenu = null; }
      if (buttons.includes('confirm')) this._chooseSub();
      return;
    }
  }

  _advanceMessage() {
    this.msgQueue.shift();
    if (this.msgQueue.length === 0) {
      const cb = this.afterMessage; this.afterMessage = null;
      this.phase = 'command';
      if (cb) cb();
    }
  }

  _chooseCommand(idx) {
    if (idx === 0) { this._playerAttack(); }
    else if (idx === 1) { this._openSpells(); }
    else if (idx === 2) { this._openItems(); }
    else if (idx === 3) { this._playerFlee(); }
  }

  _openSpells() {
    const usable = this.player.spells
      .map(id => getSpell(id))
      .filter(s => s.battleOnly || s.kind === 'heal'); // 戦闘で使える呪文
    if (usable.length === 0) {
      this.msgQueue = [STR.menu.emptySpells]; this.phase = 'message';
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    this.submenu = { type: 'spell', list: usable, index: 0 };
    this.phase = 'submenu';
  }

  _openItems() {
    const usable = this.player.items
      .map(s => ({ ...s, def: getItem(s.id) }))
      .filter(s => s.def && s.def.type === 'useItem');
    if (usable.length === 0) {
      this.msgQueue = [STR.menu.emptyItems]; this.phase = 'message';
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    this.submenu = { type: 'item', list: usable, index: 0 };
    this.phase = 'submenu';
  }

  _chooseSub() {
    const sel = this.submenu.list[this.submenu.index];
    if (this.submenu.type === 'spell') { this._castSpell(sel); }
    else { this._useItem(sel); }
  }

  // ===== プレイヤー行動 → 敵行動 のターン処理 =====
  _playerAttack() {
    const p = this.player, e = this.enemy;
    const msgs = [STR.battle.attack(p.name)];
    if (F.isHit(p.agi, e.agi)) {
      const dmg = F.physicalDamage(p.atk, e.def);
      e.hp = Math.max(0, e.hp - dmg);
      msgs.push(STR.battle.damage(e.name, dmg));
      this.enemyHurtTimer = 18; this.shakeTimer = 12;
    } else {
      msgs.push(STR.battle.miss(e.name));
    }
    this._runTurn(msgs);
  }

  _castSpell(spell) {
    const p = this.player;
    if (p.mp < spell.mp) {
      this.submenu = null; this.phase = 'message';
      this.msgQueue = [STR.battle.noMp];
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    p.spendMp(spell.mp);
    this.submenu = null;
    const msgs = [STR.battle.castSpell(p.name, spell.name)];
    if (spell.kind === 'attack') {
      const dmg = F.spellDamage(spell.power, spell.variance);
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      msgs.push(STR.battle.spellDamage(this.enemy.name, dmg));
      this.enemyHurtTimer = 18; this.shakeTimer = 12; this.flashTimer = 10;
    } else if (spell.kind === 'heal') {
      const amt = F.healAmount(spell.power, spell.variance);
      const healed = p.heal(amt);
      msgs.push(STR.battle.healSpell(healed));
    }
    this._runTurn(msgs);
  }

  _useItem(slot) {
    const p = this.player;
    const def = slot.def;
    this.submenu = null;
    // HP/MP満タン時は消費せずコマンドへ戻す（フィールドメニューと挙動統一）
    if (def.heal && p.hp >= p.maxHp) {
      this.msgQueue = ['HPは まんたんだ。']; this.phase = 'message';
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    if (def.healMp && p.mp >= p.maxMp) {
      this.msgQueue = ['MPは まんたんだ。']; this.phase = 'message';
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    const msgs = [STR.battle.useItem(p.name, def.name)];
    if (def.heal) { const h = p.heal(def.heal); msgs.push(STR.battle.itemHeal(h)); }
    else if (def.healMp) { const m = p.healMp(def.healMp); msgs.push(`MPが ${m} かいふくした！`); }
    if (def.consumable) p.removeItem(def.id, 1);
    this._runTurn(msgs);
  }

  _playerFlee() {
    if (!this.fleeable) {
      this.msgQueue = ['にげられない！']; this.phase = 'message';
      this.afterMessage = () => { this.phase = 'command'; };
      return;
    }
    if (F.canFlee(this.player.agi, this.enemy.agi)) {
      this.msgQueue = [STR.battle.fledOK]; this.phase = 'message';
      this.result = 'flee'; this.battleOver = true;
      this.afterMessage = () => this._end();
    } else {
      // 逃走失敗 → 敵のターンへ
      this._runTurn([STR.battle.fledNG]);
    }
  }

  // ターン進行：プレイヤーメッセージ → 敵生存チェック → 敵行動
  _runTurn(playerMsgs) {
    this.msgQueue = playerMsgs.slice();
    this.phase = 'message';
    this.afterMessage = () => {
      if (this.enemy.hp <= 0) { this._enemyDefeated(); return; }
      this._enemyTurn();
    };
  }

  _enemyTurn() {
    const e = this.enemy, p = this.player;
    const msgs = [];
    // 敵が呪文を使うか（攻撃呪文持ちで一定確率）
    let usedSpell = false;
    if (e.spells && e.spells.length > 0 && Math.random() < 0.35) {
      const sid = e.spells[Math.floor(Math.random() * e.spells.length)];
      const sp = getSpell(sid);
      if (sp && sp.kind === 'attack') {
        const dmg = F.spellDamage(sp.power, sp.variance);
        p.takeDamage(dmg);
        msgs.push(STR.battle.castSpell(e.name, sp.name));
        msgs.push(STR.battle.playerHurt(dmg));
        this.shakeTimer = 14; this.flashTimer = 10;
        usedSpell = true;
      }
    }
    if (!usedSpell) {
      msgs.push(STR.battle.enemyTurn(e.name));
      if (F.isHit(e.agi, p.agi)) {
        const dmg = Math.max(1, F.physicalDamage(e.atk, p.def));
        p.takeDamage(dmg);
        msgs.push(STR.battle.playerHurt(dmg));
        this.shakeTimer = 14;
      } else {
        msgs.push('しかし こうげきを かわした！');
      }
    }
    this.msgQueue = msgs;
    this.phase = 'message';
    this.afterMessage = () => {
      if (p.hp <= 0) { this._playerDefeated(); return; }
      this.phase = 'command';
    };
  }

  _enemyDefeated() {
    const e = this.enemy, p = this.player;
    // 竜王1段階目 → 2段階目へ変身
    if (e.id === 'galdis1') {
      this.msgQueue = [STR.battle.win(e.name), STR.battle.bossPhase];
      this.phase = 'message';
      this.afterMessage = () => {
        this.enemy = getEnemy('galdis2');
        this.enemyMaxHp = this.enemy.hp;
        this.phase = 'command';
      };
      return;
    }
    // 通常勝利
    const msgs = [STR.battle.win(e.name)];
    const ups = p.addExp(e.exp);
    p.gold += e.gold;
    msgs.push(STR.battle.expGold(e.exp, e.gold));
    for (const u of ups) {
      msgs.push(STR.battle.levelUp(u.lv));
      if (u.learned) msgs.push(STR.battle.learnSpell(getSpell(u.learned).name));
    }
    this.result = 'win'; this.battleOver = true;
    this.msgQueue = msgs; this.phase = 'message';
    this.afterMessage = () => this._end();
  }

  _playerDefeated() {
    this.msgQueue = [STR.battle.death];
    this.phase = 'message';
    this.result = 'lose'; this.battleOver = true;
    this.afterMessage = () => this._end();
  }

  _end() {
    this.phase = 'done';
    if (this.result === 'win' && this.opts.onWin) this.opts.onWin(this.enemy);
    else if (this.result === 'lose' && this.opts.onLose) this.opts.onLose();
    else if (this.result === 'flee' && this.opts.onFlee) this.opts.onFlee();
  }

  update() {
    if (this.shakeTimer > 0) this.shakeTimer--;
    if (this.enemyHurtTimer > 0) this.enemyHurtTimer--;
    if (this.flashTimer > 0) this.flashTimer--;
  }

  // ===== 描画 =====
  draw(ctx, W, H) {
    // 背景（暗いグラデ）
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, this.isBoss ? '#200008' : '#101028');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // フラッシュ
    if (this.flashTimer > 0) { ctx.fillStyle = `rgba(255,80,80,${this.flashTimer / 30})`; ctx.fillRect(0, 0, W, H); }

    // 敵描画（揺れ）
    let ex = W / 2, ey = H * 0.36;
    if (this.shakeTimer > 0) ex += Math.sin(this.shakeTimer * 1.5) * 6;
    const size = this.isBoss ? 200 : 130;
    ctx.save();
    if (this.enemyHurtTimer > 0 && Math.floor(this.enemyHurtTimer / 3) % 2 === 0) ctx.globalAlpha = 0.4;
    drawEnemy(ctx, this.enemy.color, ex, ey, size);
    ctx.restore();

    // 敵名 + HPバー
    ctx.fillStyle = '#fff'; ctx.font = '20px "MS Gothic", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(this.enemy.name, W / 2, 20);
    ctx.textAlign = 'left';
    const barW = 220, barX = W / 2 - barW / 2, barY = 48;
    ctx.fillStyle = '#400'; ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = '#e33'; ctx.fillRect(barX, barY, barW * Math.max(0, this.enemy.hp) / this.enemyMaxHp, 10);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, 10);

    // プレイヤーステータス窓（左上）
    this._drawStatus(ctx);

    // メッセージ or コマンド
    if (this.phase === 'message') {
      this._drawMessage(ctx, W, H, this.msgQueue[0] || '');
    } else if (this.phase === 'command') {
      this._drawCommands(ctx, W, H);
    } else if (this.phase === 'submenu') {
      this._drawSubmenu(ctx, W, H);
    }
  }

  _drawStatus(ctx) {
    const x = 12, y = 12, w = 180, h = 92;
    drawWindow(ctx, x, y, w, h);
    const p = this.player;
    ctx.fillStyle = '#fff'; ctx.font = '16px "MS Gothic", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(p.name, x + 12, y + 10);
    ctx.fillStyle = hpColor(p.hp, p.maxHp);
    ctx.fillText(`HP ${p.hp}/${p.maxHp}`, x + 12, y + 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(`MP ${p.mp}/${p.maxMp}`, x + 12, y + 56);
    ctx.fillText(`Lv ${p.lv}`, x + 120, y + 10);
  }

  _drawMessage(ctx, W, H, text) {
    const x = 16, y = H - 130, w = W - 32, h = 114;
    const padX = 16, innerW = w - padX * 2;
    drawWindow(ctx, x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.font = '20px "MS Gothic", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    // 内幅を超える行は1文字ずつmeasureTextで折り返す
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = '', lw = 0;
      for (const c of para) {
        const cw = ctx.measureText(c).width;
        if (lw + cw > innerW && line.length > 0) { lines.push(line); line = c; lw = cw; }
        else { line += c; lw += cw; }
      }
      lines.push(line);
    }
    let yy = y + 16;
    for (const l of lines) { ctx.fillText(l, x + padX, yy); yy += 26; }
    if (Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#e0d040'; ctx.fillText('▼', x + w - 32, y + h - 28);
    }
  }

  _drawCommands(ctx, W, H) {
    const x = 16, y = H - 130, w = 260, h = 114;
    drawWindow(ctx, x, y, w, h);
    ctx.font = '20px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    // 2x2配置
    const positions = [[0,0],[1,0],[0,1],[1,1]];
    this.commands.forEach((cmd, i) => {
      const [cx, cy] = positions[i];
      const ox = x + 20 + cx * 120, oy = y + 22 + cy * 42;
      if (i === this.commandIndex) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', ox - 18, oy); }
      ctx.fillStyle = '#fff'; ctx.fillText(cmd, ox, oy);
    });
  }

  _drawSubmenu(ctx, W, H) {
    const list = this.submenu.list;
    const x = 16, y = H - 130 - (list.length * 26 + 20), w = 300, h = list.length * 26 + 20;
    drawWindow(ctx, x, y, Math.max(w, 240), h + 8);
    ctx.font = '18px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    list.forEach((it, i) => {
      const oy = y + 12 + i * 26;
      const label = this.submenu.type === 'spell'
        ? `${it.name}  MP${it.mp}`
        : `${it.def.name}  x${it.qty}`;
      if (i === this.submenu.index) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 30, oy);
    });
  }
}
