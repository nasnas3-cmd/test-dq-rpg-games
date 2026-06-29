// strings.js - 全台詞・地名の集約（差し替え容易にするため一箇所に集約）
// 固有名詞・台詞はすべてオリジナル新規。
export const STR = {
  gameTitle: '竜王伝説',
  gameSubtitle: '〜 蒼き炎の章 〜',

  // 地名
  places: {
    castle: 'アルゴス城',
    town: 'リント城下町',
    field: 'エルゼン平原',
    cave: '西のうずまき洞',
    swampTown: 'ヌマベの里',
    darkCastle: '竜王ガルディスの城',
  },

  // タイトル
  title: {
    newGame: 'はじめから',
    continue: 'つづきから',
    pressStart: 'ボタンか クリックで すすむ',
    askName: 'なまえを いれてください',
    noSave: 'ぼうけんのしょが ありません',
    welcome: name => `ようこそ ${name}よ。\n竜王伝説の せかいへ！`,
    fileHelp: 'E:かきだす  I:よみこむ',
    exported: 'ぼうけんのしょを\n ファイルに かきだした！',
    importedTitle: name => `${name}の\n ぼうけんを よみこんだ！`,
    corrupt: 'ぼうけんのしょが\n こわれています',
    nothingToExport: 'かきだす ぼうけんが ない。',
  },

  // 王様・城イベント
  king: {
    firstAudience:
      'おお ユウシャよ！\nよくぞ まいった。\nわが国は 竜王ガルディスに\n おびやかされておる。',
    firstAudience2:
      'わが娘 ミレイユ姫も\n さらわれてしもうた。\nどうか 姫を すくい\n竜王を たおしておくれ！',
    giveItems:
      'これを もっていくがよい。\n旅の したくを ととのえ\n まずは 城下町へ いくのじゃ。',
    afterPrincess:
      'おお！ ミレイユを\n すくってくれたか！\nのこるは 竜王ガルディスのみ。\nたのんだぞ ユウシャよ！',
    needPrincess:
      '竜王の城は おそろしい所。\nまずは さらわれた姫の\n手がかりを さがすのじゃ。',
    cleared:
      'よくぞ 竜王をたおした！\nそなたこそ まことの ユウシャ。\nこの国の えいゆうじゃ！',
  },

  priest: {
    save: 'ぼうけんのしょに\n きろくを のこしますか？',
    saved: 'きろくしました。\nゆめゆめ ゆだんめさるな。',
    savedTip: 'きろくは 3日間 ゆうこう。\nとじる前に E:かきだしで\n バックアップ すると あんしん。',
    healFull: 'いのりを ささげました。\nHPと MPが かいふくした。',
    revive: name => `${name}よ\n しんでは なりませぬ…\nさあ もういちど！`,
  },

  // 兵士・町人NPC
  npc: {
    soldier1: 'ここは アルゴス城。\n王さまに ごようの ある者は\n おくの間へ。',
    soldier2: '西の洞には 古い宝が\n ねむっているらしいぞ。',
    townsman1: '武器も 防具も\n そろえてから いくんだね。\n生きて かえるために。',
    townsman2: '竜王の城へは ふねが\n いるって うわさだよ。',
    townsman3: 'ヌマベの里の 老人が\n 姫の ことを 知ってるらしい。',
    shopGuide: 'いらっしゃい！\n何を おもとめかな？',
    elder:
      'ミレイユ姫は 西の洞の\n おくに とらわれておる。\nこの「うずまきの鍵」を もって\n 助けに いくがよい。',
    elderDone: 'ミレイユ姫を よろしく\n たのみましたぞ。',
    bridgeKeeper:
      'わしは 橋の番人。\nなぞなぞに こたえれば\n とおしてやろう。\n「朝は よっつ 昼は ふたつ\n夜は みっつ あしを もつ者は？」',
    bridgeOK: 'ほう…「人」と こたえたか。\nみごと！ とおるがよい。',
    princess:
      'ああ ユウシャさま！\nたすけに きてくださったのね。\nさあ いっしょに\n かえりましょう！',
  },

  // 戦闘メッセージ
  battle: {
    appear: name => `${name}が あらわれた！`,
    appearGroup: name => `${name}たちが あらわれた！`,
    command: 'コマンド？',
    attack: name => `${name}の こうげき！`,
    damage: (name, n) => `${name}に ${n}の ダメージ！`,
    miss: name => `${name}は こうげきを かわした！`,
    playerMiss: 'こうげきは はずれた！',
    enemyTurn: name => `${name}の こうげき！`,
    playerHurt: n => `${n}の ダメージを うけた！`,
    castSpell: (who, spell) => `${who}は ${spell}を となえた！`,
    spellDamage: (name, n) => `${name}に ${n}の ダメージ！`,
    healSpell: n => `HPが ${n} かいふくした！`,
    noMp: 'MPが たりない！',
    fledOK: 'うまく にげだした！',
    fledNG: 'しかし まわりこまれた！',
    enemyFled: name => `${name}は にげだした！`,
    win: name => `${name}を たおした！`,
    expGold: (e, g) => `けいけんち ${e} かくとく！\n${g} ゴールド てにいれた！`,
    levelUp: lv => `レベルが ${lv}に あがった！`,
    learnSpell: s => `じゅもん「${s}」を おぼえた！`,
    statUp: 'ちからが みなぎってきた！',
    useItem: (who, item) => `${who}は ${item}を つかった！`,
    itemHeal: n => `HPが ${n} かいふくした！`,
    death: '目の前が まっくらに なった…',
    bossPhase: '竜王ガルディスは\n しんの すがたを あらわした！',
  },

  // メニュー
  menu: {
    talk: 'はなす',
    status: 'つよさ',
    items: 'どうぐ',
    spells: 'じゅもん',
    equip: 'そうび',
    search: 'しらべる',
    save: 'きろく',
    fileOut: 'かきだす',
    fileIn: 'よみこむ',
    close: 'とじる',
    nothing: 'だれも いない。',
    nothingHere: 'なにも みつからなかった。',
    foundGold: g => `${g}ゴールド みつけた！`,
    foundItem: i => `${i}を みつけた！`,
    emptyItems: 'なにも もっていない。',
    emptySpells: 'じゅもんを おぼえていない。',
    cantUseHere: 'ここでは つかえない。',
    usedItem: (i, n) => `${i}を つかった。\nHPが ${n} かいふくした！`,
    equipped: e => `${e}を そうびした。`,
    unequipped: e => `${e}を はずした。`,
  },

  // 店
  shop: {
    weapon: 'ぶきや',
    armor: 'ぼうぐや',
    item: 'どうぐや',
    inn: 'やどや',
    welcome: 'いらっしゃい！',
    buy: 'かう',
    sell: 'うる',
    leave: 'でる',
    whatBuy: 'どれに しますか？',
    bought: i => `${i}を かいました！`,
    notEnough: 'ゴールドが たりません。',
    full: 'もう もてません。',
    thanks: 'まいど あり！',
    innPrompt: g => `ひとばん ${g}ゴールドです。\n おとまりに なりますか？`,
    innRest: 'ぐっすり おやすみ…\nHPと MPが ぜんかいした！',
    innNoGold: 'ゴールドが たりないようで…',
    sellPrompt: 'どれを うりますか？',
    sold: (i, g) => `${i}を ${g}ゴールドで うりました。`,
  },

  // 共通
  common: {
    yes: 'はい',
    no: 'いいえ',
    gold: g => `${g} G`,
    gameOver: 'ゲームオーバー',
    locked: 'カギが かかっている。',
    unlock: 'うずまきの鍵で とびらを あけた！',
    needKey: 'おくへの とびらだ。\nなにか カギが いるようだ。',
    ending1: '竜王ガルディスは ほろび\nせかいに ひかりが もどった。',
    ending2: name => `ユウシャ ${name}と ミレイユ姫は\n城へと がいせんした。`,
    ending3: 'そして 二人は\nいつまでも しあわせに\n くらしたという。',
    endingThanks: '— おわり —\nあそんでくれて ありがとう！',
  },
};
