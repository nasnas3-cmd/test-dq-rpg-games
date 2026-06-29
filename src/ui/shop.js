// shop.js - 買い物UI（武器/防具/道具店）と宿屋。かう／うる切替・購入後の装備確認つき。
import { STR } from '../data/strings.js';
import { getItem, SHOP_STOCK, INN_PRICE } from '../data/items.js';
import { drawWindow } from './messageWindow.js';

const SHOP_TYPE = {
  weapon: 'townWeapon', armor: 'townArmor', item: 'townItem',
  swampWeapon: 'swampWeapon', swampArmor: 'swampArmor', swampItem: 'swampItem',
};

// 売却価格は購入価格の半額（鍵など売れない物は除外）
function sellPrice(def) { return Math.floor((def.price || 0) / 2); }

export class Shop {
  constructor(game, type) {
    this.game = game;
    this.type = type;
    this.stock = SHOP_STOCK[SHOP_TYPE[type]] || [];
    this.mode = 'buy';     // 'buy' | 'sell'
    this.index = 0;
    this.open = true;
    this.busy = false;     // メッセージ/選択ダイアログ表示中は入力を止める
    this.message = STR.shop.welcome;
    this.msgTimer = 0;
  }

  setMessage(m) { this.message = m; this.msgTimer = 120; }

  // 売却可能な所持品リスト（消耗品・装備で price>0 のもの）
  _sellList() {
    return this.game.player.items
      .map(s => ({ ...s, def: getItem(s.id) }))
      .filter(s => s.def && s.def.type !== 'key' && (s.def.price || 0) > 0);
  }

  _rows() {
    // モードごとの行数（リスト + 「うる/かう 切替」 + 「でる」）
    const list = this.mode === 'buy' ? this.stock : this._sellList();
    return list.length;
  }

  handleInput(buttons, pointer) {
    if (this.busy) return; // ダイアログ中は game 側が msg を処理
    if (buttons.includes('cancel')) { this.open = false; return; }

    const listLen = this._rows();
    const toggleIdx = listLen;          // かう/うる 切替
    const leaveIdx = listLen + 1;       // でる
    const n = listLen + 2;

    if (buttons.includes('up')) this.index = (this.index - 1 + n) % n;
    if (buttons.includes('down')) this.index = (this.index + 1) % n;
    if (buttons.includes('left') || buttons.includes('right')) this._toggleMode();

    // クリック/タップ：行のヒットテスト（draw と同じレイアウト）。
    if (pointer) {
      const W = this.game.W;
      const w = 380, x = (W - w) / 2, y = 50;
      const idx = Math.floor((pointer.y - (y + 16) + 6) / 30);
      if (pointer.x >= x && pointer.x <= x + w && idx >= 0 && idx < n) {
        this.index = idx;
        this._activate(toggleIdx, leaveIdx);
      }
      // ウィンドウ外クリックは無視（誤操作で店を閉じない）
      return;
    }

    if (buttons.includes('confirm')) this._activate(toggleIdx, leaveIdx);
  }

  _activate(toggleIdx, leaveIdx) {
    if (this.index === toggleIdx) { this._toggleMode(); return; }
    if (this.index === leaveIdx) { this.open = false; return; }
    if (this.mode === 'buy') this._buy(this.stock[this.index]);
    else this._sell(this._sellList()[this.index]);
  }

  _toggleMode() {
    this.mode = this.mode === 'buy' ? 'sell' : 'buy';
    this.index = 0;
    this.setMessage(this.mode === 'buy' ? STR.shop.whatBuy : STR.shop.sellPrompt);
  }

  _buy(id) {
    const p = this.game.player, def = getItem(id);
    if (!def) return;
    if (p.gold < def.price) { this.setMessage(STR.shop.notEnough); return; }
    p.gold -= def.price;
    p.addItem(id, 1);
    // 装備品なら「そうびするか？」確認
    if (['weapon', 'armor', 'shield'].includes(def.type)) {
      this.busy = true;
      this.game.msg.showChoice(`${def.name}を かいました！\nそうびしますか？`, [STR.common.yes, STR.common.no], (sel) => {
        if (sel === 0) { p.equip(def.id); this.setMessage(STR.menu.equipped(def.name)); }
        else this.setMessage(STR.shop.bought(def.name));
        this.busy = false;
      });
      return;
    }
    this.setMessage(STR.shop.bought(def.name));
  }

  _sell(slot) {
    if (!slot) return;
    const p = this.game.player, def = slot.def;
    const gain = sellPrice(def);
    this.busy = true;
    this.game.msg.showChoice(`${def.name}を ${gain}ゴールドで うりますか？`, [STR.common.yes, STR.common.no], (sel) => {
      if (sel === 0) {
        // 装備中なら外す
        if (p.weapon === def.id) p.weapon = null;
        if (p.armor === def.id) p.armor = null;
        if (p.shield === def.id) p.shield = null;
        p.removeItem(def.id, 1);
        p.gold += gain;
        this.setMessage(STR.shop.sold(def.name, gain));
        if (this.index >= this._rows() && this.index > 0) this.index--;
      } else {
        this.setMessage(STR.shop.sellPrompt);
      }
      this.busy = false;
    });
  }

  update() { if (this.msgTimer > 0) this.msgTimer--; }

  draw(ctx, W, H) {
    if (!this.open) return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H);

    const list = this.mode === 'buy' ? this.stock : this._sellList();
    const w = 380, x = (W - w) / 2, y = 50;
    const rows = list.length + 2; // +切替 +でる
    const h = rows * 30 + 30;
    drawWindow(ctx, x, y, w, h);
    ctx.font = '18px "MS Gothic", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    list.forEach((entry, i) => {
      const def = this.mode === 'buy' ? getItem(entry) : entry.def;
      const oy = y + 16 + i * 30;
      if (i === this.index) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', x + 10, oy); }
      ctx.fillStyle = '#fff';
      const name = this.mode === 'sell' && entry.def.consumable ? `${def.name} x${entry.qty}` : def.name;
      ctx.fillText(name, x + 36, oy);
      const price = this.mode === 'buy' ? def.price : sellPrice(def);
      ctx.textAlign = 'right'; ctx.fillText(`${price} G`, x + w - 16, oy); ctx.textAlign = 'left';
    });

    // 切替行
    const tIdx = list.length;
    const tOy = y + 16 + tIdx * 30;
    if (this.index === tIdx) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', x + 10, tOy); }
    ctx.fillStyle = '#9cf';
    ctx.fillText(this.mode === 'buy' ? `▷ ${STR.shop.sell}に きりかえ` : `▷ ${STR.shop.buy}に きりかえ`, x + 36, tOy);

    // でる行
    const lIdx = list.length + 1;
    const lOy = y + 16 + lIdx * 30;
    if (this.index === lIdx) { ctx.fillStyle = '#e0d040'; ctx.fillText('▶', x + 10, lOy); }
    ctx.fillStyle = '#fff'; ctx.fillText(STR.shop.leave, x + 36, lOy);

    // 所持ゴールド & メッセージ
    drawWindow(ctx, x, y + h + 8, w, 88);
    ctx.fillStyle = '#fff';
    ctx.fillText(`しょじ ${this.game.player.gold} G`, x + 16, y + h + 18);
    const lines = this.message.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, x + 16, y + h + 44 + i * 22));

    // 選択中アイテムの説明（買い物時）
    if (this.mode === 'buy' && this.index < this.stock.length) {
      const def = getItem(this.stock[this.index]);
      ctx.fillStyle = '#aac'; ctx.font = '15px "MS Gothic", monospace';
      ctx.fillText(def.desc || '', x + 180, y + h + 18);
    }
  }
}

// 宿屋
export class Inn {
  constructor(game, place) {
    this.game = game;
    this.price = INN_PRICE[place] || 6;
    this.open = true;
    this.done = false;
  }
  start() {
    const g = this.game;
    g.msg.showChoice(STR.shop.innPrompt(this.price), [STR.common.yes, STR.common.no], (sel) => {
      if (sel === 0) {
        if (g.player.gold < this.price) { g.msg.show([STR.shop.innNoGold]); this.open = false; return; }
        g.player.gold -= this.price;
        g.msg.show([STR.shop.innRest], () => { g.player.fullHeal(); this.open = false; });
      } else { this.open = false; }
    });
  }
}
