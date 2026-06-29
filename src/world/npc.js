// npc.js - NPC配置・会話・イベントフック
// 各NPC: { map, x, y, sprite, dir, name, action(game) }
// action は会話/店/セーブ等を起動。game オブジェクト経由でメッセージ・店・フラグを操作。
import { STR } from '../data/strings.js';

export const NPCS = [
  // === アルゴス城 ===
  {
    map: 'castle', x: 7, y: 2, sprite: 'king', dir: 'down', name: '王',
    action: (g) => {
      const p = g.player;
      if (!p.flags.metKing) {
        g.msg.show([STR.king.firstAudience, STR.king.firstAudience2, STR.king.giveItems], () => {
          p.flags.metKing = true;
          p.gold += 120;
          p.addItem('herb', 3);
          p.addItem('branch');
          p.equip('branch');
          p.addItem('cloth');
          p.equip('cloth');
          g.msg.show(['ゴールドと そうびを\n さずかった！']);
        });
      } else if (p.flags.savedPrincess && !p.flags.galdisDefeated) {
        g.msg.show([STR.king.afterPrincess]);
      } else if (p.flags.galdisDefeated) {
        g.msg.show([STR.king.cleared]);
      } else {
        g.msg.show([STR.king.needPrincess]);
      }
    },
  },
  {
    map: 'castle', x: 4, y: 8, sprite: 'priest', dir: 'down', name: '神官',
    action: (g) => {
      g.msg.showChoice(STR.priest.save, [STR.common.yes, STR.common.no], (sel) => {
        if (sel === 0) {
          g.saveGame();
          g.msg.show([STR.priest.saved, STR.priest.healFull], () => g.player.fullHeal());
        }
      });
    },
  },
  { map: 'castle', x: 3, y: 6, sprite: 'soldier', dir: 'right', name: '兵士',
    action: (g) => g.msg.show([STR.npc.soldier1]) },
  { map: 'castle', x: 11, y: 9, sprite: 'soldier', dir: 'left', name: '兵士',
    action: (g) => g.msg.show([STR.npc.soldier2]) },

  // === リント城下町 ===
  { map: 'town', x: 2, y: 3, sprite: 'shop', dir: 'down', name: '武器屋',
    action: (g) => g.openShop('weapon') },
  { map: 'town', x: 7, y: 3, sprite: 'shop', dir: 'down', name: '防具屋',
    action: (g) => g.openShop('armor') },
  { map: 'town', x: 5, y: 7, sprite: 'shop', dir: 'down', name: '道具屋',
    action: (g) => g.openShop('item') },
  { map: 'town', x: 9, y: 10, sprite: 'shop', dir: 'down', name: '宿屋',
    action: (g) => g.openInn('town') },
  { map: 'town', x: 6, y: 13, sprite: 'townsman', dir: 'down', name: '町人',
    action: (g) => g.msg.show([STR.npc.townsman1]) },
  { map: 'town', x: 11, y: 8, sprite: 'townsman', dir: 'left', name: '町人',
    action: (g) => g.msg.show([STR.npc.townsman3]) },
  { map: 'town', x: 3, y: 9, sprite: 'townsman', dir: 'right', name: '町人',
    action: (g) => g.msg.show([STR.npc.townsman2]) },

  // === エルゼン平原：橋の番人（サブイベント） ===
  {
    map: 'field', x: 12, y: 3, sprite: 'bridge', dir: 'down', name: '橋の番人',
    action: (g) => {
      const p = g.player;
      if (p.flags.bridgeSolved) { g.msg.show(['よい旅を。']); return; }
      g.msg.show([STR.npc.bridgeKeeper], () => {
        g.msg.showChoice('こたえは？', ['けもの', '人', 'とり'], (sel) => {
          if (sel === 1) {
            p.flags.bridgeSolved = true;
            g.msg.show([STR.npc.bridgeOK, 'ごほうびに\n100ゴールドを もらった！'], () => { p.gold += 100; });
          } else {
            g.msg.show(['ちがうな。\nまた こんど。']);
          }
        });
      });
    },
  },

  // === ヌマベの里 ===
  {
    map: 'swampTown', x: 7, y: 10, sprite: 'elder', dir: 'down', name: '里の老人',
    action: (g) => {
      const p = g.player;
      if (!p.flags.gotKey) {
        g.msg.show([STR.npc.elder], () => {
          p.flags.gotKey = true;
          p.addItem('swirlKey');
          g.msg.show(['「うずまきの鍵」を\n てにいれた！']);
        });
      } else {
        g.msg.show([STR.npc.elderDone]);
      }
    },
  },
  { map: 'swampTown', x: 2, y: 3, sprite: 'shop', dir: 'down', name: '武器屋',
    action: (g) => g.openShop('swampWeapon') },
  { map: 'swampTown', x: 7, y: 3, sprite: 'shop', dir: 'down', name: '防具屋',
    action: (g) => g.openShop('swampArmor') },
  { map: 'swampTown', x: 7, y: 7, sprite: 'shop', dir: 'down', name: '道具屋',
    action: (g) => g.openShop('swampItem') },
  { map: 'swampTown', x: 4, y: 11, sprite: 'priest', dir: 'right', name: '宿屋',
    action: (g) => g.openInn('swamp') },

  // === うずまき洞 最深部：姫 ===
  {
    map: 'caveInner', x: 4, y: 4, sprite: 'princess', dir: 'down', name: 'ミレイユ姫',
    action: (g) => {
      const p = g.player;
      if (!p.flags.savedPrincess) {
        g.msg.show([STR.npc.princess], () => {
          p.flags.savedPrincess = true;
          g.msg.show(['姫を すくいだした！\n竜王の城への とびらが\n ひらかれた…！'], () => {
            // 姫を城へ帰す演出として、プレイヤーを城前へ戻す
            g.warpTo('field', 10, 8, 'down');
          });
        });
      }
    },
  },
];

// 指定マップ上のNPC一覧
export function npcsOnMap(mapKey) { return NPCS.filter(n => n.map === mapKey); }

// 指定座標のNPC（救出済みの姫は消す等の条件付き）
export function npcAt(mapKey, x, y, player) {
  return NPCS.find(n => {
    if (n.map !== mapKey || n.x !== x || n.y !== y) return false;
    if (n.sprite === 'princess' && player.flags.savedPrincess) return false;
    return true;
  });
}
