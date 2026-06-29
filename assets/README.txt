竜王伝説 アセット差し替えフォルダ
===================================

現段階では PNG を配置していません。ゲームは Canvas2D による
プレースホルダ描画（src/core/gfx.js）で完全にプレイ可能です。

後でAI生成PNGに差し替えるには、以下のパスに同名でPNGを置くだけです
（src/core/assets.js の TILE_PATHS を参照）。存在すれば自動で読み込まれ、
無ければプレースホルダ描画にフォールバックします。

tiles/
  grass.png water.png mountain.png forest.png wall.png floor.png
  stairs_down.png stairs_up.png door.png brick.png road.png
  bridge.png swamp.png throne.png chest.png sign.png

sprites/   主人公/NPC/敵スプライト（差し替え層は今後 gfx.js に追加）
ui/        ウィンドウ枠など

推奨画風：16bit風ピクセルアート、1タイル = 32x32px。
