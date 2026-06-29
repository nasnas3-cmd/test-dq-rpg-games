// audio.js - Web Audio API によるチップチューン風BGM合成エンジン
// 外部音声ファイル不使用。すべてコード合成（OscillatorNode + GainNode）。
//
// 著作権注記: 既存楽曲の旋律は一切流用していない。各曲はジャンルの雰囲気
// （勇壮なマーチ/牧歌的な町/不穏な洞窟/緊迫した戦闘/荘厳なボス/感動の凱旋）
// のみを表現した完全オリジナルのループである。叙情性を高めるため旋律を
// 長尺化(A→A')し、薄いハモリ声部と豊かなコード進行を加えている。
//
// 公開API:
//   BGM.play(trackId)  同じ曲なら再スタートしない
//   BGM.stop()
//   BGM.setMuted(bool) / BGM.toggleMute() -> bool
//   BGM.resume()       初回ユーザー操作時に呼ぶ（AudioContext.resume + 現曲再生）
//   BGM.isMuted()

// ===== 音名 -> 周波数（A4=440, 12平均律） =====
// 音符表記: 'C4','D#5','R'(休符)。
const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToFreq(n) {
  if (!n || n === 'R') return 0;
  const m = NOTE_RE.exec(n);
  if (!m) return 0;
  let semi = SEMI[m[1]];
  if (m[2] === '#') semi += 1; else if (m[2] === 'b') semi -= 1;
  const oct = parseInt(m[3], 10);
  const midi = (oct + 1) * 12 + semi; // C-1 = 0
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ===== 楽曲データ =====
// 各曲: { tempo(BPM), loopBeats, mel:[{n,d,?w,?g}], bass:[...], harm:[...](任意ハモリ),
//         arp:[...](任意), drums:[{type,d}](任意) }
// d = 拍数（1=四分音符, 0.5=八分音符）。w=波形, g=音量倍率。
// メロディ既定波形 square、ベース triangle、ハモリ triangle(薄め)。
// harm はメロディの3度/6度下や対旋律。各声部は独立ループ（総拍数を揃えると安定）。
const TRACKS = {
  // 序曲: 荘厳で勇壮なファンファーレ調。上行→頂点(E5/F5)→威厳ある下行。
  // 長尺をA→A'で構成し、和声を II-V-I・サブドミナント変化させ感動を作る。
  title: {
    tempo: 92, swing: 0,
    // A: 呼びかけの主題（C基調・上行して輝く）
    mel: [
      { n: 'C4', d: 0.5, g: 1.15 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'C5', d: 1.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'F4', d: 0.5, g: 1.1 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1.5 }, { n: 'C5', d: 0.5 },
      { n: 'E5', d: 1.5, g: 1.2 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 2 },
      // A': 応答の主題（より高く昇りつめ堂々と帰結）
      { n: 'E4', d: 0.5, g: 1.1 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'E5', d: 1.5 }, { n: 'D5', d: 0.5 },
      { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'D5', d: 0.5, g: 1.1 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'D5', d: 1 }, { n: 'G4', d: 1 },
      { n: 'C5', d: 1, g: 1.15 }, { n: 'B4', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 2 },
    ],
    // メロの3度下を中心にしたハモリ（要所で6度に開く）
    harm: [
      { n: 'E3', d: 0.5 }, { n: 'G3', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'E4', d: 1.5 }, { n: 'G4', d: 0.5 },
      { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'A3', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1.5 }, { n: 'E4', d: 0.5 },
      { n: 'G4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 },
      { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'G4', d: 1.5 }, { n: 'F4', d: 0.5 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'F4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 2 },
    ],
    bass: [
      { n: 'C2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C2', d: 1 }, { n: 'E2', d: 1 },
      { n: 'F2', d: 1 }, { n: 'C2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 },
      { n: 'F2', d: 1 }, { n: 'A2', d: 1 }, { n: 'G2', d: 1 }, { n: 'G2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'E2', d: 1 }, { n: 'G2', d: 1 }, { n: 'G2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'G2', d: 1 }, { n: 'A2', d: 1 }, { n: 'E2', d: 1 },
      { n: 'F2', d: 1 }, { n: 'C2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 },
      { n: 'F2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 }, { n: 'G2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'G2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C2', d: 1 },
    ],
  },

  // フィールド: 冒険の高揚。軽快なマーチを長尺化し、A(出発)→A'(高揚)で頂点(G5)へ。
  field: {
    tempo: 128,
    mel: [
      // A: 旅立ちの足取り（G基調・弾む）
      { n: 'G4', d: 0.5, g: 1.1 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'D5', d: 1 },
      { n: 'B4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'R', d: 1 },
      { n: 'E4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'A4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'G4', d: 1.5 }, { n: 'D4', d: 0.5 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'B4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'D5', d: 1.5 }, { n: 'G4', d: 0.5 },
      { n: 'E5', d: 1, g: 1.15 }, { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'F#4', d: 0.5 }, { n: 'G4', d: 2 },
      // A': 高揚（頂点G5へ駆け上がる）
      { n: 'D5', d: 0.5, g: 1.1 }, { n: 'E5', d: 0.5 }, { n: 'G5', d: 1, g: 1.2 }, { n: 'E5', d: 1 },
      { n: 'D5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'R', d: 1 },
      { n: 'A4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'F5', d: 1 }, { n: 'E5', d: 1 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1.5 }, { n: 'G4', d: 0.5 },
      { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1.5 }, { n: 'A4', d: 0.5 },
      { n: 'G4', d: 1, g: 1.1 }, { n: 'F#4', d: 1 }, { n: 'A4', d: 1 }, { n: 'F#4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'D5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'G4', d: 2 },
    ],
    // メロの3度下基調、軽い対旋律
    harm: [
      { n: 'B3', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'B4', d: 1 },
      { n: 'G4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'F#4', d: 1 }, { n: 'R', d: 1 },
      { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'F#4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'B3', d: 2 },
      { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F#4', d: 1 },
      { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 2 },
      { n: 'C5', d: 1 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'F#4', d: 1 }, { n: 'A3', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'B3', d: 2 },
      { n: 'B4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'B4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'R', d: 1 },
      { n: 'F4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'C5', d: 1 },
      { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 2 },
      { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'F#4', d: 0.5 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 2 },
      { n: 'B3', d: 1 }, { n: 'A3', d: 1 }, { n: 'C4', d: 1 }, { n: 'A3', d: 1 },
      { n: 'B3', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'B3', d: 2 },
    ],
    bass: [
      { n: 'G2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 }, { n: 'D2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C2', d: 1 }, { n: 'D2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'D2', d: 1 }, { n: 'E2', d: 1 }, { n: 'B2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 }, { n: 'D2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'B2', d: 1 }, { n: 'C3', d: 1 }, { n: 'A2', d: 1 },
      { n: 'D2', d: 1 }, { n: 'F#2', d: 1 }, { n: 'G2', d: 1 }, { n: 'D2', d: 1 },
      { n: 'C2', d: 1 }, { n: 'G2', d: 1 }, { n: 'A2', d: 1 }, { n: 'D2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'D2', d: 1 }, { n: 'G2', d: 1 }, { n: 'D2', d: 1 },
    ],
    drums: [
      { type: 'kick', d: 1 }, { type: 'hat', d: 1 }, { type: 'snare', d: 1 }, { type: 'hat', d: 1 },
    ],
  },

  // 町: 明るく牧歌的（ゆったり）。安らぎの3度ハモリを添える。
  town: {
    tempo: 100,
    mel: [
      { n: 'E4', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 2 },
      { n: 'F4', d: 1 }, { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'E4', d: 1 }, { n: 'C4', d: 2 },
    ],
    harm: [
      { n: 'C4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'B3', d: 2 },
      { n: 'A3', d: 1 }, { n: 'C4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 2 },
    ],
    bass: [
      { n: 'C3', d: 1 }, { n: 'G2', d: 1 }, { n: 'C3', d: 1 }, { n: 'G2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'D3', d: 1 }, { n: 'G2', d: 2 },
      { n: 'F2', d: 1 }, { n: 'C3', d: 1 }, { n: 'F2', d: 1 }, { n: 'C3', d: 1 },
      { n: 'G2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C3', d: 2 },
    ],
    arp: [
      { n: 'C5', d: 0.5 }, { n: 'E5', d: 0.5 },
    ],
  },

  // 王の間: 気品と哀愁。緩やかに息の長い旋律を伸ばし、6度下のハモリで荘厳に。
  // サブドミナントマイナー(Ab色)を匂わせる哀愁の和声進行。
  castle: {
    tempo: 80,
    mel: [
      { n: 'C5', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1.5 }, { n: 'D5', d: 0.5 },
      { n: 'E5', d: 1.5, g: 1.1 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'B4', d: 1 },
      { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'G4', d: 2 },
      // A': 哀愁を帯びた高みへ、Ab(サブドミナントマイナー色)を経て
      { n: 'G5', d: 1.5, g: 1.15 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'Ab4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'D5', d: 1.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'C5', d: 2 }, { n: 'B4', d: 1 }, { n: 'C5', d: 1 },
    ],
    // 6度下を主としたハモリ（哀感を強める）
    harm: [
      { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'B3', d: 1 },
      { n: 'C4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1.5 }, { n: 'F4', d: 0.5 },
      { n: 'G4', d: 1.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'C4', d: 1 }, { n: 'B3', d: 1 }, { n: 'B3', d: 2 },
      { n: 'B4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'C4', d: 1 },
      { n: 'F4', d: 1.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'B3', d: 1 },
      { n: 'E4', d: 2 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
    ],
    bass: [
      { n: 'C3', d: 2 }, { n: 'G2', d: 2 },
      { n: 'A2', d: 1 }, { n: 'E2', d: 1 }, { n: 'F2', d: 2 },
      { n: 'C3', d: 2 }, { n: 'G2', d: 1 }, { n: 'D3', d: 1 },
      { n: 'G2', d: 2 }, { n: 'G2', d: 2 },
      { n: 'C3', d: 2 }, { n: 'A2', d: 2 },
      { n: 'F2', d: 1 }, { n: 'Ab2', d: 1 }, { n: 'D2', d: 2 },
      { n: 'G2', d: 1 }, { n: 'B2', d: 1 }, { n: 'C3', d: 2 },
      { n: 'G2', d: 2 }, { n: 'C3', d: 2 },
    ],
  },

  // 洞窟: 孤独と不安。間(休符)を活かし、低く彷徨う短調。半音の擦れで不穏に。
  // 薄い対旋律ハモリで「忍び寄る何か」の気配を出す。
  cave: {
    tempo: 72,
    mel: [
      { n: 'A4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 }, { n: 'A4', d: 1 },
      { n: 'G#4', d: 1.5 }, { n: 'A4', d: 0.5 }, { n: 'E4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'F4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G#4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 2 }, { n: 'D4', d: 1 }, { n: 'E4', d: 1 },
      // A': さらに沈み込み、頂点で不安が極まる
      { n: 'A4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'C5', d: 1.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'F4', d: 1 }, { n: 'G#4', d: 1 }, { n: 'A4', d: 1 }, { n: 'C5', d: 1 },
      { n: 'B4', d: 1 }, { n: 'A4', d: 1 }, { n: 'A4', d: 2 },
    ],
    // 5度/3度を彷徨う薄い対旋律
    harm: [
      { n: 'E4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'C4', d: 1 },
      { n: 'E4', d: 1.5 }, { n: 'C4', d: 0.5 }, { n: 'B3', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'C4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'B3', d: 1 }, { n: 'C4', d: 1 },
      { n: 'B3', d: 2 }, { n: 'A3', d: 1 }, { n: 'B3', d: 1 },
      { n: 'C4', d: 1 }, { n: 'R', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1.5 }, { n: 'R', d: 0.5 },
      { n: 'C4', d: 1 }, { n: 'B3', d: 1 }, { n: 'C4', d: 1 }, { n: 'E4', d: 1 },
      { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'C4', d: 2 },
    ],
    bass: [
      { n: 'A1', d: 2 }, { n: 'A1', d: 1 }, { n: 'E2', d: 1 },
      { n: 'F1', d: 2 }, { n: 'E2', d: 1 }, { n: 'B1', d: 1 },
      { n: 'D2', d: 2 }, { n: 'F2', d: 2 },
      { n: 'E2', d: 2 }, { n: 'A1', d: 2 },
      { n: 'A1', d: 2 }, { n: 'F1', d: 1 }, { n: 'G1', d: 1 },
      { n: 'A1', d: 2 }, { n: 'E2', d: 2 },
      { n: 'F1', d: 1 }, { n: 'E2', d: 1 }, { n: 'A1', d: 2 },
      { n: 'E2', d: 2 }, { n: 'A1', d: 2 },
    ],
  },

  // 通常戦闘: 緊迫したアップテンポ（短調・疾走感）。薄いハモリで攻撃性を増幅。
  battle: {
    tempo: 152,
    mel: [
      { n: 'A4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'A4', d: 1 },
      { n: 'E5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 },
      { n: 'A4', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'C5', d: 1 },
      { n: 'D5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'F5', d: 0.5 }, { n: 'E5', d: 0.5 },
      { n: 'D5', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'B4', d: 1 },
      { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'A4', d: 2 },
    ],
    harm: [
      { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'E4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'E4', d: 1 },
      { n: 'C5', d: 0.5 }, { n: 'B4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'E4', d: 0.5 }, { n: 'G#4', d: 0.5 }, { n: 'A4', d: 1 },
      { n: 'F4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G#4', d: 0.5 },
      { n: 'F4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'D4', d: 1 },
      { n: 'E4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 0.5 }, { n: 'B3', d: 0.5 },
      { n: 'A3', d: 2 },
    ],
    bass: [
      { n: 'A2', d: 0.5 }, { n: 'A2', d: 0.5 }, { n: 'A2', d: 0.5 }, { n: 'A2', d: 0.5 },
      { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 },
      { n: 'F2', d: 0.5 }, { n: 'F2', d: 0.5 }, { n: 'F2', d: 0.5 }, { n: 'F2', d: 0.5 },
      { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 }, { n: 'E2', d: 0.5 },
    ],
    drums: [
      { type: 'kick', d: 0.5 }, { type: 'hat', d: 0.5 },
      { type: 'snare', d: 0.5 }, { type: 'hat', d: 0.5 },
    ],
  },

  // 竜王戦: 荘厳で威圧的（重く不気味）。短3度を行き来する不気味なハモリ(薄め)。
  boss: {
    tempo: 118,
    mel: [
      { n: 'D4', d: 1 }, { n: 'D4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'A3', d: 1 },
      { n: 'Bb3', d: 1 }, { n: 'A3', d: 1 }, { n: 'G3', d: 1 }, { n: 'D4', d: 1 },
      { n: 'F4', d: 0.5 }, { n: 'Eb4', d: 0.5 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 }, { n: 'Bb3', d: 1 },
      { n: 'A3', d: 2 }, { n: 'D4', d: 1 }, { n: 'A3', d: 1 },
      // A-prime: 威圧を強めて頂点へ
      { n: 'D5', d: 1, g: 1.15 }, { n: 'C5', d: 0.5 }, { n: 'Bb4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'Eb4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'Bb4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 }, { n: 'Eb4', d: 1 },
      { n: 'D4', d: 2 }, { n: 'A3', d: 1 }, { n: 'D4', d: 1 },
    ],
    harm: [
      { n: 'A3', d: 1 }, { n: 'A3', d: 0.5 }, { n: 'Bb3', d: 0.5 }, { n: 'A3', d: 1 }, { n: 'F3', d: 1 },
      { n: 'G3', d: 1 }, { n: 'F3', d: 1 }, { n: 'Eb3', d: 1 }, { n: 'A3', d: 1 },
      { n: 'Bb3', d: 0.5 }, { n: 'A3', d: 0.5 }, { n: 'A3', d: 1 }, { n: 'A3', d: 1 }, { n: 'F3', d: 1 },
      { n: 'F3', d: 2 }, { n: 'A3', d: 1 }, { n: 'F3', d: 1 },
      { n: 'F4', d: 1 }, { n: 'Eb4', d: 0.5 }, { n: 'D4', d: 0.5 }, { n: 'C4', d: 1 }, { n: 'D4', d: 1 },
      { n: 'Eb4', d: 1 }, { n: 'D4', d: 1 }, { n: 'Bb3', d: 1 }, { n: 'A3', d: 1 },
      { n: 'G4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'Eb4', d: 1 }, { n: 'D4', d: 1 }, { n: 'C4', d: 1 },
      { n: 'A3', d: 2 }, { n: 'F3', d: 1 }, { n: 'A3', d: 1 },
    ],
    bass: [
      { n: 'D1', d: 0.5 }, { n: 'D1', d: 0.5 }, { n: 'D1', d: 1 }, { n: 'A1', d: 1 }, { n: 'D1', d: 1 },
      { n: 'Bb1', d: 0.5 }, { n: 'Bb1', d: 0.5 }, { n: 'Bb1', d: 1 }, { n: 'G1', d: 1 }, { n: 'D1', d: 1 },
      { n: 'F1', d: 0.5 }, { n: 'F1', d: 0.5 }, { n: 'F1', d: 1 }, { n: 'C2', d: 1 }, { n: 'Bb1', d: 1 },
      { n: 'A1', d: 1 }, { n: 'A1', d: 1 }, { n: 'D1', d: 1 }, { n: 'A1', d: 1 },
      { n: 'D1', d: 0.5 }, { n: 'D1', d: 0.5 }, { n: 'D1', d: 1 }, { n: 'F1', d: 1 }, { n: 'D1', d: 1 },
      { n: 'Bb1', d: 0.5 }, { n: 'Bb1', d: 0.5 }, { n: 'Bb1', d: 1 }, { n: 'Eb1', d: 1 }, { n: 'D1', d: 1 },
      { n: 'G1', d: 0.5 }, { n: 'G1', d: 0.5 }, { n: 'C2', d: 1 }, { n: 'F1', d: 1 }, { n: 'Eb1', d: 1 },
      { n: 'D1', d: 1 }, { n: 'A1', d: 1 }, { n: 'D1', d: 1 }, { n: 'A1', d: 1 },
    ],
    drums: [
      { type: 'kick', d: 1 }, { type: 'kick', d: 1 }, { type: 'snare', d: 1 }, { type: 'kick', d: 1 },
    ],
  },

  // エンディング: 感動と救済。長尺の凱旋歌をA->A-primeで頂点へ導き、温かな3度ハモリで包む。
  ending: {
    tempo: 88,
    mel: [
      { n: 'C5', d: 1 }, { n: 'G4', d: 0.5 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 1 }, { n: 'E5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'G4', d: 1.5 }, { n: 'A4', d: 0.5 },
      { n: 'F4', d: 1 }, { n: 'A4', d: 0.5 }, { n: 'C5', d: 0.5 }, { n: 'F5', d: 1, g: 1.1 }, { n: 'E5', d: 1 },
      { n: 'D5', d: 1 }, { n: 'C5', d: 1 }, { n: 'C5', d: 2 },
      { n: 'E5', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'G5', d: 1, g: 1.15 },
      { n: 'F5', d: 1 }, { n: 'E5', d: 1 }, { n: 'C5', d: 1.5 }, { n: 'D5', d: 0.5 },
      { n: 'A4', d: 1 }, { n: 'C5', d: 0.5 }, { n: 'D5', d: 0.5 }, { n: 'E5', d: 1 }, { n: 'D5', d: 1 },
      { n: 'G4', d: 1 }, { n: 'B4', d: 1 }, { n: 'C5', d: 2 },
    ],
    harm: [
      { n: 'E4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'E4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'D4', d: 1.5 }, { n: 'F4', d: 0.5 },
      { n: 'A3', d: 1 }, { n: 'C4', d: 0.5 }, { n: 'E4', d: 0.5 }, { n: 'A4', d: 1 }, { n: 'G4', d: 1 },
      { n: 'F4', d: 1 }, { n: 'E4', d: 1 }, { n: 'E4', d: 2 },
      { n: 'G4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'E5', d: 1 },
      { n: 'A4', d: 1 }, { n: 'G4', d: 1 }, { n: 'E4', d: 1.5 }, { n: 'F4', d: 0.5 },
      { n: 'C4', d: 1 }, { n: 'E4', d: 0.5 }, { n: 'F4', d: 0.5 }, { n: 'G4', d: 1 }, { n: 'F4', d: 1 },
      { n: 'E4', d: 1 }, { n: 'D4', d: 1 }, { n: 'E4', d: 2 },
    ],
    bass: [
      { n: 'C3', d: 1 }, { n: 'G2', d: 1 }, { n: 'C3', d: 1 }, { n: 'E3', d: 1 },
      { n: 'G2', d: 1 }, { n: 'D3', d: 1 }, { n: 'G2', d: 1 }, { n: 'D3', d: 1 },
      { n: 'F2', d: 1 }, { n: 'C3', d: 1 }, { n: 'F2', d: 1 }, { n: 'A2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'D3', d: 1 }, { n: 'C3', d: 2 },
      { n: 'A2', d: 1 }, { n: 'E3', d: 1 }, { n: 'C3', d: 1 }, { n: 'G2', d: 1 },
      { n: 'F2', d: 1 }, { n: 'C3', d: 1 }, { n: 'A2', d: 1 }, { n: 'D3', d: 1 },
      { n: 'F2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C3', d: 1 }, { n: 'G2', d: 1 },
      { n: 'G2', d: 1 }, { n: 'G2', d: 1 }, { n: 'C3', d: 2 },
    ],
  },
};

// ===== エンジン =====
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.current = null;
    this.pending = null;
    this._timer = null;
    this._voices = { mel: 0, harmony: 0, bass: 0, arp: 0, drums: 0 };
    this._idx = { mel: 0, harmony: 0, bass: 0, arp: 0, drums: 0 };
    this._scheduleAhead = 0.2;
    this._lookahead = 40;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('bgm_muted') === '1') {
        this.muted = true;
      }
    } catch (e) { /* ignore */ }
  }

  _ensureCtx() {
    if (this.ctx) return true;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.2;
      this.master.connect(this.ctx.destination);
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  }

  // 初回ユーザー操作で呼ぶ。既に再生中(_timer稼働)なら頭出ししない（キー入力ごとの頭出しバグ防止）。
  resume() {
    if (!this._ensureCtx()) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this._timer) return; // 既に再生中：頭出しせず ctx.resume だけで継続
    const want = this.pending || this.current;
    if (want) {
      this.pending = null;
      this.current = null;
      this._start(want);
    }
  }

  isMuted() { return this.muted; }

  setMuted(b) {
    this.muted = !!b;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('bgm_muted', this.muted ? '1' : '0');
    } catch (e) { /* ignore */ }
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.2, now + 0.05);
    }
    return this.muted;
  }

  toggleMute() { return this.setMuted(!this.muted); }

  play(trackId) {
    if (!TRACKS[trackId]) return;
    if (this.current === trackId) return;
    if (!this.ctx || this.ctx.state !== 'running') {
      this.pending = trackId;
      this.current = trackId;
      return;
    }
    this._start(trackId);
  }

  _start(trackId) {
    if (this.current === trackId && this._timer) return;
    this.stop();
    this.current = trackId;
    const t0 = this.ctx.currentTime + 0.06;
    this._voices = { mel: t0, harmony: t0, bass: t0, arp: t0, drums: t0 };
    this._idx = { mel: 0, harmony: 0, bass: 0, arp: 0, drums: 0 };
    this._scheduler();
    this._timer = setInterval(() => this._scheduler(), this._lookahead);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.current = null;
  }

  // 先読みスケジューラ: 各声部の次音符を scheduleAhead 秒先まで詰める。
  _scheduler() {
    if (!this.ctx || !this.current) return;
    const track = TRACKS[this.current];
    if (!track) return;
    const spb = 60 / track.tempo;
    const until = this.ctx.currentTime + this._scheduleAhead;

    this._scheduleVoice('mel', track.mel, spb, until, 'square', 0.16);
    // ハモリ声部: 三角波で薄く重ね、情感と厚みを出す（harm を持つトラックのみ）
    if (track.harm) this._scheduleVoice('harmony', track.harm, spb, until, 'triangle', 0.10);
    this._scheduleVoice('bass', track.bass, spb, until, 'triangle', 0.26);
    if (track.arp) this._scheduleVoice('arp', track.arp, spb, until, 'square', 0.07);
    if (track.drums) this._scheduleDrums(track.drums, spb, until);
  }

  _scheduleVoice(voice, notes, spb, until, wave, gain) {
    if (!notes || !notes.length) return;
    while (this._voices[voice] < until) {
      const i = this._idx[voice] % notes.length;
      const note = notes[i];
      const dur = note.d * spb;
      const start = this._voices[voice];
      const freq = noteToFreq(note.n);
      if (freq > 0) {
        this._playTone(freq, start, dur, note.w || wave, (note.g || 1) * gain);
      }
      this._voices[voice] += dur;
      this._idx[voice]++;
    }
  }

  _scheduleDrums(notes, spb, until) {
    while (this._voices.drums < until) {
      const i = this._idx.drums % notes.length;
      const note = notes[i];
      const dur = note.d * spb;
      const start = this._voices.drums;
      this._playDrum(note.type, start);
      this._voices.drums += dur;
      this._idx.drums++;
    }
  }

  // 1音をADSR風エンベロープで発音。アタック/リリースのフェードでクリックノイズ回避。
  _playTone(freq, start, dur, wave, gain) {
    const ctx = this.ctx;
    let osc;
    if (wave === 'pulse') {
      osc = ctx.createOscillator();
      osc.type = 'square';
    } else {
      osc = ctx.createOscillator();
      osc.type = wave;
    }
    osc.frequency.setValueAtTime(freq, start);

    const env = ctx.createGain();
    const peak = gain;
    const atk = 0.008, rel = Math.min(0.08, dur * 0.4);
    const sustain = Math.max(start + atk, start + dur - rel);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(peak, start + atk);
    env.gain.setValueAtTime(peak * 0.85, sustain);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  // パーカッション: kick/snare/hat をノイズ＋エンベロープで簡易合成。
  _playDrum(type, start) {
    const ctx = this.ctx;
    if (type === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, start);
      osc.frequency.exponentialRampToValueAtTime(40, start + 0.12);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.5, start + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(env); env.connect(this.master);
      osc.start(start); osc.stop(start + 0.16);
    } else {
      const dur = type === 'snare' ? 0.14 : 0.04;
      const peak = type === 'snare' ? 0.28 : 0.12;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = type === 'snare' ? 1200 : 6000;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(peak, start + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(hp); hp.connect(env); env.connect(this.master);
      src.start(start); src.stop(start + dur + 0.02);
    }
  }
}

export const BGM = new AudioEngine();
