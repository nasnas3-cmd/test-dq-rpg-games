// saveManager.js - 「ぼうけんのしょ」セーブ/ロード
// 多重バックエンド(localStorage + Cookie) ＋ 3日有効期限 ＋ file://向け冗長化。
import { Player } from '../player/player.js';

const KEY = 'ryuou_densetsu_save';
const LEGACY_KEY = 'ryuou_densetsu_save_v1';
const SAVE_VERSION = 3;
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3日 = 259200000ms
const COOKIE_MAX_AGE = 259200; // 3日(秒)
const COOKIE_LIMIT = 3500; // 4KB制限の安全マージン

// ===== 低レベル: Cookie 入出力 =====
function cookieGet(name) {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) { return null; }
}
function cookieSet(name, value) {
  try {
    const enc = encodeURIComponent(value);
    // 4KB制限：大きすぎる場合は localStorage のみに頼り、Cookie保存をスキップ
    if (enc.length > COOKIE_LIMIT) return false;
    document.cookie = name + '=' + enc + '; max-age=' + COOKIE_MAX_AGE + '; path=/; SameSite=Lax';
    return true;
  } catch (e) { return false; }
}
function cookieErase(name) {
  try { document.cookie = name + '=; max-age=0; path=/; SameSite=Lax'; } catch (e) {}
}

function lsGet(name) { try { return localStorage.getItem(name); } catch (e) { return null; } }
function lsSet(name, value) { try { localStorage.setItem(name, value); return true; } catch (e) { return false; } }
function lsRemove(name) { try { localStorage.removeItem(name); } catch (e) {} }

// 期限検証つきパース。期限切れ/不正なら null。
function parseValid(raw) {
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch (e) { return null; }
  if (!data || !data.player) return null;
  if (Number.isFinite(data.expiresAt) && Date.now() > data.expiresAt) return null; // 期限切れ
  return data;
}

// 生の保存文字列を、有効なものから取得（localStorage→Cookieの順）。期限切れは無視。
function readRawValid() {
  const ls = lsGet(KEY) || lsGet(LEGACY_KEY);
  if (parseValid(ls)) return { raw: ls, from: 'ls' };
  const ck = cookieGet(KEY);
  if (parseValid(ck)) return { raw: ck, from: 'cookie' };
  return null;
}

export const SaveManager = {
  // ===== 期限内のセーブが いずれかのバックエンドに あるか =====
  hasSave() {
    return !!readRawValid();
  },

  // ===== セーブ本体(JSON文字列)を生成 =====
  // player が toJSON を持つ Player か、既にプレーンな state でも受ける。
  buildPayload(player, openedChests) {
    const savedAt = Date.now();
    return {
      version: SAVE_VERSION,
      savedAt,
      expiresAt: savedAt + TTL_MS,
      player: (player && typeof player.toJSON === 'function') ? player.toJSON() : player,
      openedChests: Array.from(openedChests || []),
    };
  },

  // ===== 保存：localStorage と Cookie の両方へ =====
  save(player, openedChests) {
    try {
      const data = this.buildPayload(player, openedChests);
      const json = JSON.stringify(data);
      const okLs = lsSet(KEY, json);
      cookieSet(KEY, json); // Cookieは失敗しても握りつぶす(4KB超 / file://無効など)
      return okLs || this.hasSave();
    } catch (e) {
      console.error('save failed', e);
      return false;
    }
  },

  // ===== 内部：既存のpayload文字列をそのまま両バックエンドへ書き戻す(有効期限維持) =====
  _writeRaw(json) {
    lsSet(KEY, json);
    cookieSet(KEY, json);
  },

  // ===== ロード：localStorage→Cookie、期限検証、復元、両者へ同期 =====
  load() {
    try {
      const hit = readRawValid();
      if (!hit) {
        // 期限切れデータが残っていれば掃除する
        const stale = lsGet(KEY) || cookieGet(KEY);
        if (stale) this.erase();
        return null;
      }
      const data = JSON.parse(hit.raw);
      const player = Player.fromJSON(data.player);
      const openedChests = new Set(Array.isArray(data.openedChests) ? data.openedChests : []);
      // 成功時：両バックエンドへ書き戻して同期(有効期限は元の値を維持・延長しない)
      this._writeRaw(hit.raw);
      return { player, openedChests };
    } catch (e) {
      console.error('load failed / corrupt save', e);
      return null;
    }
  },

  // ===== 外部JSON文字列からの復元(インポート用)。保存もする。 =====
  importFromJSON(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return null; }
    if (!data || !data.player) return null;
    try {
      const player = Player.fromJSON(data.player);
      const openedChests = new Set(Array.isArray(data.openedChests) ? data.openedChests : []);
      // インポートしたら期限を3日延長して両バックエンドへ保存
      this.save(player, openedChests);
      return { player, openedChests };
    } catch (e) {
      return null;
    }
  },

  // ===== エクスポート用JSON文字列を生成(セーブ不要・現プレイ状態でも可) =====
  exportToJSON(player, openedChests) {
    try { return JSON.stringify(this.buildPayload(player, openedChests)); }
    catch (e) { return null; }
  },

  erase() {
    lsRemove(KEY);
    lsRemove(LEGACY_KEY);
    cookieErase(KEY);
  },
};
