// assets.js - 画像差し替え用の読み込み層。
// 現段階ではPNGを置かず、Canvas2Dでプログラム描画したプレースホルダを使う。
// assets/ にPNGを置けば自動で差し替わる設計。
//
// 使い方:
//   AssetManager.tile(ctx, 'grass', x, y, size)  → タイル描画
//   AssetManager.sprite(ctx, 'hero_down', x, y, size) → スプライト描画
// PNGがロード済みならそれを、無ければプレースホルダ描画関数を使う。

const TILE_PATHS = {
  grass: 'assets/tiles/grass.png',
  water: 'assets/tiles/water.png',
  mountain: 'assets/tiles/mountain.png',
  forest: 'assets/tiles/forest.png',
  wall: 'assets/tiles/wall.png',
  floor: 'assets/tiles/floor.png',
  stairsDown: 'assets/tiles/stairs_down.png',
  stairsUp: 'assets/tiles/stairs_up.png',
  door: 'assets/tiles/door.png',
  brick: 'assets/tiles/brick.png',
  road: 'assets/tiles/road.png',
  bridge: 'assets/tiles/bridge.png',
  swamp: 'assets/tiles/swamp.png',
  throne: 'assets/tiles/throne.png',
  chest: 'assets/tiles/chest.png',
  sign: 'assets/tiles/sign.png',
};

class AssetManagerClass {
  constructor() {
    this.images = {};   // key -> HTMLImageElement (ロード成功したもの)
    this.loaded = {};   // key -> bool
  }

  // 任意：PNGを事前ロード（存在しなくてもエラーにしない）
  preload() {
    return new Promise((resolve) => {
      const keys = Object.keys(TILE_PATHS);
      let remain = keys.length;
      if (remain === 0) return resolve();
      keys.forEach((k) => {
        const img = new Image();
        img.onload = () => { this.images[k] = img; this.loaded[k] = true; if (--remain === 0) resolve(); };
        img.onerror = () => { this.loaded[k] = false; if (--remain === 0) resolve(); };
        img.src = TILE_PATHS[k];
      });
    });
  }

  hasImage(key) { return !!this.images[key]; }
}

export const AssetManager = new AssetManagerClass();
