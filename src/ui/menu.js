// menu.js - フィールドコマンドメニュー（はなす/つよさ/どうぐ/じゅもん/そうび/しらべる/きろく/かきだす/よみこむ）
import { STR } from '../data/strings.js';
import { getItem } from '../data/items.js';
import { getSpell } from '../player/spells.js';
import { drawWindow, hpColor } from './messageWindow.js';

export class FieldMenu {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.index = 0;
    this.commands = [
      STR.menu.talk, STR.menu.status, STR.menu.items,
      STR.menu.spells, STR.menu.equip, STR.menu.search,
      STR.menu.save, STR.menu.fileOut, STR.menu.fileIn, STR.menu.close,
    ];
    this.sub = null; // {mode:'status'|'items'|'spells'|'equip', ...}
  }

  show() { this.open = true; this.index = 0; this.sub = null; }
  close() { this.open = false; this.sub = null; }

  // メインコマンドの描画レイアウト（draw と一致させる）
  _mainLayout(W) {
    const mw = 150, mh = this.commands.length * 28 + 20;
    const mx = W - mw - 12, my = 12;
    return { mx, my, mw, mh, itemH: 28, top: my + 12 };
  }
  // リストサブの描画レイアウト
  _listLayout(W, H, n) {
    const w = 320, h = n * 24 + 30, x = (W - w) / 2, y = (H - h) / 2;
    return { x, y, w, h, itemH: 24, top: y + 14 };
  }

  handleInput(buttons, pointer) {
    if (this.sub) { this._subInput(buttons, pointer); return; }
    if (buttons.includes('up')) this.index = (this.index - 1 + this.commands.length) % this.commands.length;
    if (buttons.includes('down')) this.index = (this.index + 1) % this.commands.length;
    if (buttons.includes('cancel') || buttons.includes('menu')) { this.close(); return; }
    // クリック/タップ：コマンド列のヒットテスト
    if (pointer) {
      const W = this.game.W, H = this.game.H;
      const L = this._mainLayout(W);
      if (pointer.x >= L.mx && pointer.x <= L.mx + L.mw) {
        const idx = Math.floor((pointer.y - L.top + 6) / L.itemH);
        if (idx >= 0 && idx < this.commands.length) { this.index = idx; this._choose(idx); return; }
      }
      // ウィンドウ外クリックはキャンセル相当
      this.close(); return;
    }
    if (buttons.includes('confirm')) this._choose(this.index);
  }

  _choose(i) {
    const g = this.game;
    switch (i) {
      case 0: this.close(); g.tryTalk(); break;
      case 1: this.sub = { mode: 'status' }; break;
      case 2: this._openItems(); break;
      case 3: this._openSpells(); break;
      case 4: this._openEquip(); break;
      case 5: this.close(); g.trySearch(); break;
      case 6: this.close(); g.trySaveAtMenu(); break;
      case 7: this.close(); g.exportSave(); break;
      case 8: this.close(); g.importSave(); break;
      case 9: this.close(); break;
    }
  }

  _openItems() {
    const list = this.game.player.items.map(s => ({ ...s, def: getItem(s.id) })).filter(s => s.def);
    if (list.length === 0) { this.game.msg.show([STR.menu.emptyItems]); this.close(); return; }
    this.sub = { mode: 'items', list, index: 0 };
  }
  _openSpells() {
    const list = this.game.player.spells.map(id => getSpell(id)).filter(Boolean);
    if (list.length === 0) { this.game.msg.show([STR.menu.emptySpells]); this.close(); return; }
    this.sub = { mode: 'spells', list, index: 0 };
  }
  _openEquip() {
    const list = this.game.player.items.map(s => ({ ...s, def: getItem(s.id) }))
      .filter(s => s.def && ['weapon','armor','shield'].includes(s.def.type));
    if (list.length === 0) { this.game.msg.show(['そうびできる ものが ない。']); this.close(); return; }
    this.sub = { mode: 'equip', list, index: 0 };
  }

  _subInput(buttons, pointer) {
    const s = this.sub;
    if (s.mode === 'status') {
      if (buttons.includes('cancel') || buttons.includes('confirm') || pointer) this.sub = null;
      return;
    }
    const n = s.list.length;
    if (buttons.includes('up')) s.index = (s.index - 1 + n) % n;
    if (buttons.includes('down')) s.index = (s.index + 1) % n;
    if (buttons.includes('cancel')) { this.sub = null; return; }
    // クリック/タップ：リスト項目のヒットテスト
    if (pointer) {
      const L = this._listLayout(this.game.W, this.game.H, n);
      if (pointer.x >= L.x && pointer.x <= L.x + L.w && pointer.y >= L.y && pointer.y <= L.y + L.h) {
        const idx = Math.floor((pointer.y - L.top + 4) / L.itemH);
        if (idx >= 0 && idx < n) { s.index = idx; this._subChoose(); return; }
      }
      this.sub = null; return; // ウィンドウ外はキャンセル
    }
    if (buttons.includes('confirm')) this._subChoose();
  }

  _subChoose() {
    const g = this.game, p = g.player, s = this.sub;
    const sel = s.list[s.index];
    if (s.mode === 'items') {
      const def = sel.def;
      if (def.type === 'useItem') {
        if (def.heal) {
          if (p.hp >= p.maxHp) { g.msg.show(['HPは まんたんだ。']); }
          else { const h = p.heal(def.heal); if (def.consumable) p.removeItem(def.id, 1); g.msg.show([STR.menu.usedItem(def.name, h)]); }
        } else if (def.healMp) {
          if (p.mp >= p.maxMp) { g.msg.show(['MPは まんたんだ。']); }
          else { p.healMp(def.healMp); if (def.consumable) p.removeItem(def.id, 1); g.msg.show([`${def.name}を つかった。\nMPが ${def.healMp} かいふくした！`]); }
        }
        this.close();
      } else if (['weapon','armor','shield'].includes(def.type)) {
        // 装備中ならトグルで外す、未装備なら装備
        if (p.isEquipped(def.id)) { p.unequip(def.id); g.msg.show([STR.menu.unequipped(def.name)]); }
        else { p.equip(def.id); g.msg.show([STR.menu.equipped(def.name)]); }
        this.close();
      } else {
        g.msg.show([`${def.name}：${def.desc || ''}`]);
        this.close();
      }
    } else if (s.mode === 'equip') {
      // 装備中ならトグルで外す、未装備なら装備（→マークの表示/消去に連動）
      if (p.isEquipped(sel.def.id)) { p.unequip(sel.def.id); g.msg.show([STR.menu.unequipped(sel.def.name)]); }
      else { p.equip(sel.def.id); g.msg.show([STR.menu.equipped(sel.def.name)]); }
      this.close();
    } else if (s.mode === 'spells') {
      // フィールドで使える呪文
      const sp = sel;
      g.castFieldSpell(sp);
      this.close();
    }
  }

  draw(ctx, W, H) {
    if (!this.open) return;
    // メインメニュー（右側縦並び）
    const mw = 150, mh = this.commands.length * 28 + 20;
    const mx = W - mw - 12, my = 12;
    drawWindow(ctx, mx, my, mw, mh);
    ctx.font = '18px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    this.commands.forEach((c, i) => {
      const oy = my + 12 + i * 28;
      if (i === this.index && !this.sub) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', mx + 8, oy); }
      ctx.fillStyle = '#fff'; ctx.fillText(c, mx + 30, oy);
    });

    if (this.sub) this._drawSub(ctx, W, H);
  }

  _drawSub(ctx, W, H) {
    const s = this.sub, p = this.game.player;
    if (s.mode === 'status') {
      const w = 300, h = 250, x = (W - w) / 2, y = (H - h) / 2;
      drawWindow(ctx, x, y, w, h);
      ctx.fillStyle = '#fff'; ctx.font = '18px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const lines = [
        `なまえ  ${p.name}`,
        `レベル  ${p.lv}`,
        `HP     ${p.hp}/${p.maxHp}`,
        `MP     ${p.mp}/${p.maxMp}`,
        `ちから  ${p.str}  (こうげき ${p.atk})`,
        `すばやさ ${p.agi}  (しゅび ${p.def})`,
        `ゴールド ${p.gold} G`,
        `けいけんち ${p.exp}`,
        `つぎのLvまで ${p.expToNext()}`,
        `ぶき  ${p.weapon ? getItem(p.weapon).name : 'なし'}`,
        `よろい ${p.armor ? getItem(p.armor).name : 'なし'}`,
        `たて  ${p.shield ? getItem(p.shield).name : 'なし'}`,
      ];
      lines.forEach((l, i) => {
        // HP行はHP残量に応じて色付け
        if (l.startsWith('HP')) ctx.fillStyle = hpColor(p.hp, p.maxHp);
        else ctx.fillStyle = '#fff';
        ctx.fillText(l, x + 16, y + 14 + i * 19);
      });
      ctx.fillStyle = '#fff';
      return;
    }
    // リスト系
    const w = 320, h = s.list.length * 24 + 30, x = (W - w) / 2, y = (H - h) / 2;
    drawWindow(ctx, x, y, w, h);
    ctx.font = '17px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    s.list.forEach((it, i) => {
      const oy = y + 14 + i * 24;
      let label;
      if (s.mode === 'spells') label = `${it.name}  MP${it.mp}`;
      else label = `${it.def.name}${it.def.consumable ? '  x' + it.qty : ''}`;
      if (i === s.index) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 30, oy);
      // 装備中アイテムに「→」マーク（カーソル▶と重ならないラベル右側に緑系で）
      if (s.mode !== 'spells' && it.def && p.isEquipped(it.def.id)) {
        const lw = ctx.measureText(label).width;
        ctx.fillStyle = '#4ad04a'; ctx.fillText('→', x + 30 + lw + 8, oy);
      }
    });
  }
}
