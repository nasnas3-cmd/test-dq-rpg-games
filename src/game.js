// game.js - メインのゲームオーケストレータ（状態機械の中身）
import { STATE, StateMachine } from './core/stateMachine.js';
import { Input } from './core/input.js';
import { AssetManager } from './core/assets.js';
import { drawSprite } from './core/gfx.js';
import { Player } from './player/player.js';
import { MAPS, WARPS, isPassable, tileAt, getMap } from './world/mapData.js';
import { renderMap, computeCamera, TILE } from './world/mapRenderer.js';
import { npcAt } from './world/npc.js';
import { CHESTS } from './world/chests.js';
import { rollEncounter } from './battle/enemies.js';
import { Battle } from './battle/battle.js';
import { MessageWindow, drawWindow, hpColor } from './ui/messageWindow.js';
import { FieldMenu } from './ui/menu.js';
import { Shop, Inn } from './ui/shop.js';
import { SaveManager } from './save/saveManager.js';
import { STR } from './data/strings.js';
import { getSpell } from './player/spells.js';
import { getItem } from './data/items.js';
import { BGM } from './core/audio.js';

const MOVE_FRAMES = 9; // 1マス移動にかかるフレーム

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.W = canvas.width; this.H = canvas.height;
    this.input = new Input(canvas);
    this.sm = new StateMachine(STATE.TITLE);
    this.msg = new MessageWindow();
    this.menu = new FieldMenu(this);
    this.player = null;
    this.openedChests = new Set();
    this.battle = null;
    this.shop = null;
    this.inn = null;

    // 移動アニメ
    this.move = null; // {fromX,fromY,toX,toY,progress}
    this.stepCount = 0;
    this.encounterCooldown = 0;

    // タイトル
    this.titleIndex = 0;
    this.nameInput = '';
    this.frame = 0;

    // エンディング演出
    this.endingTimer = 0;
    this.endingPage = 0;

    this.flashFx = 0; // マップ遷移フラッシュ
    this._savedTipShown = false; // 記録時バックアップ案内を初回のみ
  }

  // ===== 状態遷移ヘルパ =====
  startNewGame() {
    this.player = new Player('ユウシャ');
    this.openedChests = new Set();
    this.player.pos = { map: 'castle', x: 6, y: 11, dir: 'up' };
    this.sm.set(STATE.NAME);
    this.nameInput = '';
  }

  finishNaming(name) {
    if (name) this.player.name = name;
    this.sm.set(STATE.FIELD);
    this.msg.show([STR.title.welcome(this.player.name)]);
  }

  continueGame() {
    const data = SaveManager.load();
    if (!data) { this.msg.show([STR.title.noSave]); return; }
    this.player = data.player;
    this.openedChests = data.openedChests;
    this.sm.set(STATE.FIELD);
    this.msg.show([`${this.player.name}の\n ぼうけんを さいかいする！`]);
  }

  saveGame() {
    SaveManager.save(this.player, this.openedChests);
  }

  trySaveAtMenu() {
    // 城外でも記録できる簡易仕様（神官以外でも記録可、ただし回復なし）
    this.msg.showChoice(STR.priest.save, [STR.common.yes, STR.common.no], (sel) => {
      if (sel === 0) {
        this.saveGame();
        // 初回記録時のみ 3日有効＆バックアップ推奨の案内を1行添える
        const pages = [STR.priest.saved];
        if (!this._savedTipShown) { pages.push(STR.priest.savedTip); this._savedTipShown = true; }
        this.msg.show(pages);
      }
    });
  }

  // ===== 「ぼうけんのしょ」ファイル書き出し(エクスポート) =====
  // 現在のプレイ状態(セーブが無くても可)をJSONにしてBlobダウンロード。
  exportSave() {
    // タイトルなどプレイ中でない場合は、保存済みのセーブから書き出す
    let player = this.player, chests = this.openedChests;
    if (!player) {
      const data = SaveManager.load();
      if (data) { player = data.player; chests = data.openedChests; }
    }
    const onTitle = this.sm.state === STATE.TITLE;
    if (!player) {
      // タイトルでセーブ無し：世界を描けないため安全に握りつぶす
      return false;
    }
    // タイトルから書き出した場合は、復帰先としてプレイ状態にしてEVENT→FIELDで案内を見せる
    if (onTitle) {
      this.player = player; this.openedChests = chests || new Set();
      this.sm.set(STATE.EVENT);
    }
    try {
      const json = SaveManager.exportToJSON(player, chests);
      if (!json) throw new Error('export build failed');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ryuou-bouken.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.msg.show([STR.title.exported]);
      return true;
    } catch (e) {
      console.error('export failed', e);
      this.msg.show([STR.title.corrupt]);
      return false;
    }
  }

  // ===== 「ぼうけんのしょ」ファイル読み込み(インポート) =====
  // 隠しfile inputを起動し、選択ファイルをFileReaderで読んでロード再開。
  importSave() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) { if (input.parentNode) document.body.removeChild(input); return; }
        const reader = new FileReader();
        reader.onload = () => {
          this._applyImportedText(String(reader.result || ''));
          if (input.parentNode) document.body.removeChild(input);
        };
        reader.onerror = () => {
          this._showCorrupt();
          if (input.parentNode) document.body.removeChild(input);
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
    } catch (e) {
      console.error('import failed', e);
      this._showCorrupt();
    }
  }

  // インポートしたテキストをsaveManager経由で復元しゲーム再開。不正なら安全に失敗。
  _applyImportedText(text) {
    const data = SaveManager.importFromJSON(text);
    if (!data) { this._showCorrupt(); return false; }
    this.player = data.player;
    this.openedChests = data.openedChests;
    this.sm.set(STATE.FIELD);
    this.msg.show([STR.title.importedTitle(this.player.name)]);
    return true;
  }

  // 壊れたファイルの安全な失敗表示。プレイ中ならEVENTで、タイトルではタイトルへ戻す。
  _showCorrupt() {
    if (this.player) {
      this.sm.set(STATE.EVENT);
      this.msg.show([STR.title.corrupt]);
    } else {
      // タイトルでは世界を描けないため状態は変えず、alertで簡易通知(file://でも確実)
      this.sm.set(STATE.TITLE);
      this.titleIndex = 0;
      try { if (typeof alert === 'function') alert('ぼうけんのしょが こわれています'); } catch (e) {}
    }
  }

  // ===== 移動 =====
  facingTile() {
    const p = this.player.pos;
    let dx = 0, dy = 0;
    if (p.dir === 'up') dy = -1; else if (p.dir === 'down') dy = 1;
    else if (p.dir === 'left') dx = -1; else dx = 1;
    return { x: p.x + dx, y: p.y + dy };
  }

  tryMove(dir) {
    if (this.move) return;
    const p = this.player.pos;
    p.dir = dir;
    let dx = 0, dy = 0;
    if (dir === 'up') dy = -1; else if (dir === 'down') dy = 1;
    else if (dir === 'left') dx = -1; else dx = 1;
    const nx = p.x + dx, ny = p.y + dy;
    // NPCがいたら進めない
    if (npcAt(p.map, nx, ny, this.player)) return;
    if (!isPassable(p.map, nx, ny)) return;
    this.move = { fromX: p.x, fromY: p.y, toX: nx, toY: ny, progress: 0 };
  }

  finishMove() {
    const p = this.player.pos;
    p.x = this.move.toX; p.y = this.move.toY;
    this.move = null;
    this.stepCount++;

    // ワープ判定
    const key = `${p.map},${p.x},${p.y}`;
    const warp = WARPS[key];
    if (warp) { this._handleWarp(warp); return; }

    // エンカウント判定
    const m = getMap(p.map);
    if (m.encounter && this.encounterCooldown <= 0) {
      // 沼/草/平原での歩数ベース確率
      const ch = tileAt(p.map, p.x, p.y);
      let rate = 0.10;
      if (m.encounter === 'cave') rate = 0.13;
      if (m.encounter === 'darkCastle') rate = 0.16;
      if (ch === 's' || ch === 'T') rate += 0.03;
      if (Math.random() < rate) { this._startEncounter(); }
    }
    if (this.encounterCooldown > 0) this.encounterCooldown--;
  }

  _handleWarp(warp) {
    // 鍵チェック：未所持なら入口隣接へ押し戻す
    if (warp.requireKey && !this.player.hasItem(warp.requireKey)) {
      this.msg.show([STR.common.needKey]);
      this._pushBackFromWarp();
      this.sm.set(STATE.EVENT);
      return;
    }
    // フラグチェック：未達なら同様に押し戻す
    if (warp.requireFlag && !this.player.flags[warp.requireFlag]) {
      this.msg.show(['まだ ここへは すすめない。\n姫を すくわねば…']);
      this._pushBackFromWarp();
      this.sm.set(STATE.EVENT);
      return;
    }
    // 鍵で解錠：初回のみ解錠メッセージを出してからワープ
    if (warp.requireKey && this.player.hasItem(warp.requireKey)) {
      const flagName = '_unlocked_' + warp.requireKey;
      if (!this.player.flags[flagName]) {
        this.player.flags[flagName] = true;
        this.sm.set(STATE.EVENT);
        this.msg.show([STR.common.unlock], () => {
          this.warpTo(warp.map, warp.x, warp.y, warp.dir);
          this.encounterCooldown = 3;
        });
        return;
      }
    }
    this.warpTo(warp.map, warp.x, warp.y, warp.dir);
    this.encounterCooldown = 3; // 遷移直後の即エンカウント防止
  }

  // 奥扉に乗ったが進めないとき、入口側（直前の位置）へ1マス押し戻す
  _pushBackFromWarp() {
    const p = this.player.pos;
    if (this.move) {
      // 移動元へ戻す
      p.x = this.move.fromX; p.y = this.move.fromY;
    } else {
      // 向いている方向の逆へ1マス
      let dx = 0, dy = 0;
      if (p.dir === 'up') dy = 1; else if (p.dir === 'down') dy = -1;
      else if (p.dir === 'left') dx = 1; else dx = -1;
      const bx = p.x + dx, by = p.y + dy;
      if (isPassable(p.map, bx, by) && !npcAt(p.map, bx, by, this.player)) { p.x = bx; p.y = by; }
    }
    this.move = null;
  }

  warpTo(map, x, y, dir) {
    this.player.pos = { map, x, y, dir: dir || this.player.pos.dir };
    this.flashFx = 12;
  }

  // ===== 調べる/話す =====
  tryTalk() {
    const t = this.facingTile();
    const npc = npcAt(this.player.pos.map, t.x, t.y, this.player);
    if (npc) { this.sm.set(STATE.EVENT); npc.action(this); }
    else this.msg.show([STR.menu.nothing]);
  }

  trySearch() {
    const p = this.player.pos;
    const key = `${p.map},${p.x},${p.y}`;
    // 足元 or 正面の宝箱
    const t = this.facingTile();
    const fkey = `${p.map},${t.x},${t.y}`;
    let chestKey = null;
    if (CHESTS[key] && !this.openedChests.has(key)) chestKey = key;
    else if (CHESTS[fkey] && !this.openedChests.has(fkey)) chestKey = fkey;
    if (!chestKey && tileAt(p.map, t.x, t.y) === 'C') {
      // 宝箱タイルだが中身未定義→空
    }
    if (chestKey) {
      const c = CHESTS[chestKey];
      this.openedChests.add(chestKey);
      if (c.gold) { this.player.gold += c.gold; this.msg.show([STR.menu.foundGold(c.gold)]); }
      else if (c.item) { this.player.addItem(c.item); this.msg.show([STR.menu.foundItem(getItem(c.item).name)]); }
      return;
    }
    this.msg.show([STR.menu.nothingHere]);
  }

  // ===== 店 =====
  openShop(type) {
    this.shop = new Shop(this, type);
    this.sm.set(STATE.SHOP);
  }
  openInn(place) {
    this.inn = new Inn(this, place);
    this.sm.set(STATE.EVENT);
    this.inn.start();
  }

  // ===== フィールド呪文 =====
  castFieldSpell(sp) {
    const p = this.player;
    if (p.mp < sp.mp) { this.msg.show([STR.battle.noMp]); return; }
    if (sp.kind === 'heal') {
      if (p.hp >= p.maxHp) { this.msg.show(['HPは まんたんだ。']); return; }
      p.mp -= sp.mp;
      const amt = p.heal(sp.power);
      this.msg.show([STR.battle.castSpell(p.name, sp.name), STR.battle.healSpell(amt)]);
    } else if (sp.kind === 'teleport') {
      p.mp -= sp.mp;
      this.msg.show([STR.battle.castSpell(p.name, sp.name)], () => this.warpTo('town', 7, 5, 'down'));
    } else if (sp.kind === 'escape') {
      p.mp -= sp.mp;
      const map = p.pos.map;
      const exits = { cave: ['field', 5, 16], caveInner: ['cave', 1, 1], darkCastle: ['field', 16, 9] };
      const ex = exits[map];
      if (ex) this.msg.show([STR.battle.castSpell(p.name, sp.name)], () => this.warpTo(ex[0], ex[1], ex[2], 'down'));
      else this.msg.show([STR.menu.cantUseHere]);
    } else {
      this.msg.show([STR.menu.cantUseHere]);
    }
  }

  // ===== 戦闘 =====
  _startEncounter() {
    const eid = rollEncounter(getMap(this.player.pos.map).encounter);
    if (!eid) return;
    this._beginBattle(eid);
  }

  _beginBattle(eid, isGaldis = false) {
    this.flashFx = 16;
    this.battle = new Battle(this, eid, {
      onWin: (enemy) => this._onBattleWin(enemy),
      onLose: () => this._onBattleLose(),
      onFlee: () => { this.sm.set(STATE.FIELD); this.encounterCooldown = 4; this.battle = null; },
    });
    this.sm.set(STATE.BATTLE);
  }

  _onBattleWin(enemy) {
    if (enemy.id === 'galdis2') {
      this.player.flags.galdisDefeated = true;
      this.battle = null;
      this._startEnding();
      return;
    }
    this.battle = null;
    this.sm.set(STATE.FIELD);
    this.encounterCooldown = 3;
  }

  _onBattleLose() {
    this.battle = null;
    this.sm.set(STATE.GAMEOVER);
  }

  // 竜王城内のGタイルに踏み込むとボス戦
  _checkBossTrigger() {
    const p = this.player.pos;
    if (p.map === 'darkCastle' && tileAt(p.map, p.x, p.y) === 'G') {
      if (!this.player.flags.galdisDefeated) {
        this.sm.set(STATE.EVENT);
        this.msg.show(['竜王ガルディスが\n たちふさがった！'], () => this._beginBattle('galdis1', true));
      }
    }
  }

  // ===== ゲームオーバー =====
  reviveAfterGameOver() {
    const p = this.player;
    p.gold = Math.floor(p.gold / 2);
    p.hp = p.maxHp; p.mp = p.maxMp;
    p.pos = { map: 'castle', x: 6, y: 11, dir: 'up' };
    this.sm.set(STATE.EVENT);
    this.msg.show([STR.priest.revive(p.name)], () => this.sm.set(STATE.FIELD));
  }

  // ===== エンディング =====
  _startEnding() {
    this.sm.set(STATE.ENDING);
    this.endingPage = 0;
    this.endingTimer = 0;
    this.endingMsgs = [
      STR.common.ending1, STR.common.ending2(this.player.name),
      STR.common.ending3, STR.common.endingThanks,
    ];
  }

  // ============ UPDATE ============
  update(dt, frame) {
    this.frame = frame;
    const buttons = this.input.consume();
    const pointer = this.input.pointer;
    const stateBefore = this.sm.state;
    const msgBefore = this.msg.active;
    this.msg.update();

    switch (this.sm.state) {
      case STATE.TITLE: this._updateTitle(buttons, pointer); break;
      case STATE.NAME: this._updateName(buttons); break;
      case STATE.FIELD: this._updateField(buttons, pointer); break;
      case STATE.EVENT: this._updateEvent(buttons, pointer); break;
      case STATE.MENU: this._updateMenu(buttons, pointer); break;
      case STATE.SHOP: this._updateShop(buttons, pointer); break;
      case STATE.BATTLE: this._updateBattle(buttons, pointer); break;
      case STATE.GAMEOVER: this._updateGameOver(buttons, pointer); break;
      case STATE.ENDING: this._updateEnding(buttons, pointer); break;
    }
    if (this.sm.state !== stateBefore || this.msg.active !== msgBefore) {
      this.input.flush();
    }
    if (this.flashFx > 0) this.flashFx--;
    this._updateBGM();
    this.input.endFrame();
  }

  _updateBGM() {
    let track = null;
    switch (this.sm.state) {
      case STATE.TITLE:
      case STATE.NAME:
        track = 'title'; break;
      case STATE.ENDING:
        track = 'ending'; break;
      case STATE.GAMEOVER:
        track = null; break;
      case STATE.BATTLE:
        track = (this.battle && this.battle.isBoss) ? 'boss' : 'battle';
        break;
      default: {
        const map = this.player && this.player.pos ? getMap(this.player.pos.map) : null;
        track = (map && map.music) ? map.music : 'field';
        break;
      }
    }
    if (track === null) { BGM.stop(); return; }
    BGM.play(track);
  }

  _updateTitle(buttons, pointer) {
    const options = 2;
    if (buttons.includes('up')) this.titleIndex = (this.titleIndex - 1 + options) % options;
    if (buttons.includes('down')) this.titleIndex = (this.titleIndex + 1) % options;
    if (buttons.includes('confirm') || pointer) {
      if (pointer) {
        this.titleIndex = pointer.y < this.H * 0.74 ? 0 : 1;
      }
      if (this.titleIndex === 0) this.startNewGame();
      else this.continueGame();
    }
  }

  _updateName(buttons) {
    if (buttons.includes('confirm')) {
      this.finishNaming(this.nameInput || 'ユウシャ');
    }
  }

  _updateField(buttons, pointer) {
    if (this.msg.active) { this._updateEvent(buttons, pointer); return; }

    if (buttons.includes('menu')) { this.menu.show(); this.sm.set(STATE.MENU); return; }
    if (buttons.includes('confirm')) { this.tryTalk(); return; }

    if (this.move) {
      this.move.progress += 1 / MOVE_FRAMES;
      if (this.move.progress >= 1) {
        this.finishMove();
        this._checkBossTrigger();
      }
      return;
    }
    let dir = null;
    if (this.input.isHeld('up')) dir = 'up';
    else if (this.input.isHeld('down')) dir = 'down';
    else if (this.input.isHeld('left')) dir = 'left';
    else if (this.input.isHeld('right')) dir = 'right';
    if (!dir && pointer) {
      const dxs = pointer.x - this.W / 2, dys = pointer.y - this.H / 2;
      if (Math.abs(dxs) > Math.abs(dys)) dir = dxs > 0 ? 'right' : 'left';
      else dir = dys > 0 ? 'down' : 'up';
    }
    if (dir) this.tryMove(dir);
  }

  _updateEvent(buttons, pointer) {
    if (this.msg.active) {
      if (this.msg.choices) {
        if (buttons.includes('up')) this.msg.moveChoice('up');
        if (buttons.includes('down')) this.msg.moveChoice('down');
        if (buttons.includes('confirm')) this.msg.advance();
      } else {
        if (buttons.includes('confirm') || buttons.includes('cancel') || pointer) this.msg.advance();
      }
      return;
    }
    if (this.sm.state === STATE.EVENT) this.sm.set(STATE.FIELD);
  }

  _updateMenu(buttons, pointer) {
    if (this.msg.active) { this._updateEvent(buttons, pointer); return; }
    if (!this.menu.open) { this.sm.set(STATE.FIELD); return; }
    this.menu.handleInput(buttons, pointer);
    if (!this.menu.open && !this.msg.active) this.sm.set(STATE.FIELD);
  }

  _updateShop(buttons, pointer) {
    if (!this.shop) { this.sm.set(STATE.FIELD); return; }
    this.shop.update();
    if (this.msg.active) { this._updateEvent(buttons, pointer); return; }
    this.shop.handleInput(buttons, pointer);
    if (!this.shop.open) { this.shop = null; this.sm.set(STATE.FIELD); }
  }

  _updateBattle(buttons, pointer) {
    if (!this.battle) { this.sm.set(STATE.FIELD); return; }
    this.battle.update();
    this.battle.handleInput(buttons, pointer);
    if (this.battle && this.battle.phase === 'done') {
    }
  }

  _updateGameOver(buttons, pointer) {
    if (buttons.includes('confirm') || pointer) { this.reviveAfterGameOver(); }
  }

  _updateEnding(buttons, pointer) {
    this.endingTimer++;
    if ((buttons.includes('confirm') || pointer) && this.endingTimer > 20) {
      this.endingPage++;
      this.endingTimer = 0;
      if (this.endingPage >= this.endingMsgs.length) {
        this.sm.set(STATE.TITLE);
        this.titleIndex = 0;
      }
    }
  }

  // ============ RENDER ============
  render() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    switch (this.sm.state) {
      case STATE.TITLE: this._renderTitle(); break;
      case STATE.NAME: this._renderName(); break;
      case STATE.GAMEOVER: this._renderGameOver(); break;
      case STATE.ENDING: this._renderEnding(); break;
      case STATE.BATTLE: if (this.battle) this.battle.draw(ctx, W, H); break;
      default: this._renderWorld(); break;
    }

    if (this.flashFx > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashFx / 24})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  _renderWorld() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const p = this.player.pos;
    let drawX = p.x, drawY = p.y;
    if (this.move) {
      drawX = this.move.fromX + (this.move.toX - this.move.fromX) * this.move.progress;
      drawY = this.move.fromY + (this.move.toY - this.move.fromY) * this.move.progress;
    }
    const { camX, camY } = computeCamera(p.map, drawX, drawY, W, H);
    renderMap(ctx, p.map, camX, camY, W, H, this.player, this.frame);
    const px = drawX * TILE - camX, py = drawY * TILE - camY;
    drawSprite(ctx, 'hero', p.dir, px, py, TILE);

    this._drawFieldHud();

    if (this.sm.state === STATE.MENU) this.menu.draw(ctx, W, H);
    if (this.sm.state === STATE.SHOP && this.shop) this.shop.draw(ctx, W, H);
    this.msg.draw(ctx, W, H);
  }

  _drawFieldHud() {
    if (this.sm.state === STATE.SHOP) return;
    const ctx = this.ctx, p = this.player;
    const x = 10, y = 10, w = 150, h = 70;
    drawWindow(ctx, x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.font = '14px "MS Gothic", monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${p.name}  Lv${p.lv}`, x + 10, y + 8);
    ctx.fillStyle = hpColor(p.hp, p.maxHp);
    ctx.fillText(`HP ${p.hp}/${p.maxHp}`, x + 10, y + 27);
    ctx.fillStyle = '#fff';
    ctx.fillText(`MP ${p.mp}/${p.maxMp}  ${p.gold}G`, x + 10, y + 46);
  }

  _renderTitle() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0a2a'); g.addColorStop(1, '#1a0a1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 % W), sy = (i * 53 % (H / 2));
      const tw = (Math.sin(this.frame / 20 + i) + 1) / 2;
      ctx.globalAlpha = 0.3 + tw * 0.7; ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#400';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.36, 90, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a00';
    ctx.fillRect(W / 2 - 30, H * 0.32, 8, 8); ctx.fillRect(W / 2 + 22, H * 0.32, 8, 8);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0d040'; ctx.font = 'bold 52px "MS Gothic", serif';
    ctx.fillText(STR.gameTitle, W / 2, H * 0.50);
    ctx.fillStyle = '#fff'; ctx.font = '22px "MS Gothic", serif';
    ctx.fillText(STR.gameSubtitle, W / 2, H * 0.60);

    const hasSave = SaveManager.hasSave();
    ctx.font = '24px "MS Gothic", monospace';
    const items = [STR.title.newGame, STR.title.continue];
    items.forEach((it, i) => {
      const oy = H * 0.72 + i * 40;
      if (i === this.titleIndex) ctx.fillStyle = '#e0d040';
      else if (i === 1 && !hasSave) ctx.fillStyle = '#666';
      else ctx.fillStyle = '#fff';
      ctx.fillText((i === this.titleIndex ? '▶ ' : '') + it, W / 2, oy);
    });
    ctx.fillStyle = '#88a'; ctx.font = '14px "MS Gothic", monospace';
    if (Math.floor(this.frame / 30) % 2 === 0) ctx.fillText(STR.title.pressStart, W / 2, H * 0.90);
    // ファイル書き出し/読み込みの導線（再開のため）
    ctx.fillStyle = '#6a6a88'; ctx.font = '13px "MS Gothic", monospace';
    ctx.fillText(STR.title.fileHelp, W / 2, H * 0.96);
    ctx.textAlign = 'left';
  }

  _renderName() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = '#101028'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '24px "MS Gothic", monospace';
    ctx.fillText(STR.title.askName, W / 2, H * 0.35);
    const boxW = 320, boxH = 60, boxX = W / 2 - boxW / 2, boxY = Math.round(H * 0.45);
    drawWindow(ctx, boxX, boxY, boxW, boxH);
    const shown = (this.nameInput || 'ユウシャ') + (Math.floor(performance.now() / 400) % 2 ? '｜' : '');
    ctx.fillStyle = '#e0d040';
    let fs = 28;
    ctx.font = `${fs}px "MS Gothic", monospace`;
    while (ctx.measureText(shown).width > boxW - 32 && fs > 14) {
      fs -= 2; ctx.font = `${fs}px "MS Gothic", monospace`;
    }
    const prevBaseline = ctx.textBaseline;
    ctx.textBaseline = 'middle';
    ctx.fillText(shown, W / 2, boxY + boxH / 2 + 1);
    ctx.textBaseline = prevBaseline;
    ctx.fillStyle = '#88a'; ctx.font = '15px "MS Gothic", monospace';
    ctx.fillText('なまえを にゅうりょくして Enter（くうらんで ユウシャ）', W / 2, boxY + boxH + 34);
    ctx.textAlign = 'left';
  }

  _renderGameOver() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#a00'; ctx.font = 'bold 48px "MS Gothic", serif';
    ctx.fillText(STR.common.gameOver, W / 2, H * 0.42);
    ctx.fillStyle = '#fff'; ctx.font = '18px "MS Gothic", monospace';
    if (Math.floor(this.frame / 30) % 2 === 0)
      ctx.fillText('クリックか Enterで 城へ もどる', W / 2, H * 0.6);
    ctx.textAlign = 'left';
  }

  _renderEnding() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fdf3c0'); g.addColorStop(1, '#f0a060');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    drawSprite(ctx, 'hero', 'down', W / 2 - 50, H * 0.3, 48);
    drawSprite(ctx, 'princess', 'down', W / 2 + 4, H * 0.3, 48);
    drawWindow(ctx, 40, H - 160, W - 80, 130);
    ctx.fillStyle = '#fff';
    ctx.font = '22px "MS Gothic", monospace';
    ctx.textAlign = 'left';
    const msg = this.endingMsgs[Math.min(this.endingPage, this.endingMsgs.length - 1)];
    const lines = msg.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, 64, H - 140 + i * 28));
    if (Math.floor(this.frame / 30) % 2 === 0) {
      ctx.fillStyle = '#e0d040';
      ctx.fillText('▼', W - 70, H - 60);
    }
    ctx.textAlign = 'left';
  }
}
