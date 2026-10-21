// 調整する数字はここだけに置く。sim.js の中に直接書かない。

export const DAY = {
  seconds: 180,          // 1日の営業（実時間の秒）
  openMin: 11 * 60,      // 11:00 開店
  closeMin: 21 * 60,     // 21:00 閉店
  lastEntryRatio: 0.94,  // これより後は新しい客が来ない
};

// 調理台の種類
export const STATIONS = {
  board: { name: 'まな板', verb: '切る' },
  stove: { name: 'コンロ', verb: '焼く' },
  fryer: { name: '揚げ場', verb: '揚げる' },
};

// 料理。steps は [台の種類, 秒]。base は「ふつうの値段」
// stage：レシピ帳で見つけられるようになる お店の段階（0 屋台・1 小さな食堂・2 町の人気店）
export const DISHES = {
  onigiri:   { name: 'おにぎり',       icon: '🍙', steps: [['board', 2.0]],                                 base: 250,  cost: 70,  appeal: 0.8, start: true },
  yakisoba:  { name: '焼きそば',       icon: '🍝', steps: [['board', 1.5], ['stove', 3.5]],                 base: 600,  cost: 170, appeal: 1.0, start: true },
  tonjiru:   { name: '豚汁',           icon: '🍲', steps: [['board', 1.5], ['stove', 4.0]],                 base: 400,  cost: 110, appeal: 0.9, start: true },
  // 屋台で見つかる
  omurice:   { name: 'オムライス',     icon: '🍳', steps: [['board', 1.5], ['stove', 4.5]],                 base: 800,  cost: 210, appeal: 1.3, combo: ['egg', 'rice'], stage: 0 },
  napolitan: { name: 'ナポリタン',     icon: '🍅', steps: [['board', 1.5], ['stove', 4.0]],                 base: 750,  cost: 200, appeal: 1.2, combo: ['noodle', 'tomato'], stage: 0 },
  shogayaki: { name: '生姜焼き定食',   icon: '🥩', steps: [['board', 2.0], ['stove', 4.0]],                 base: 900,  cost: 260, appeal: 1.3, combo: ['pork', 'cabbage'], stage: 0 },
  // 小さな食堂で見つかる（揚げ場・3工程が入る）
  karaage:   { name: 'からあげ定食',   icon: '🍗', steps: [['board', 1.5], ['fryer', 5.0]],                 base: 950,  cost: 270, appeal: 1.5, combo: ['chicken', 'rice'], stage: 1 },
  tonkatsu:  { name: 'とんかつ定食',   icon: '🐷', steps: [['board', 2.0], ['fryer', 5.5]],                 base: 1100, cost: 330, appeal: 1.5, combo: ['pork', 'panko'], stage: 1 },
  oyakodon:  { name: '親子丼',         icon: '🥚', steps: [['board', 1.5], ['stove', 4.5]],                 base: 850,  cost: 230, appeal: 1.3, combo: ['chicken', 'egg'], stage: 1 },
  croquette: { name: 'コロッケ定食',   icon: '🥔', steps: [['board', 1.5], ['stove', 2.5], ['fryer', 4.0]], base: 1000, cost: 240, appeal: 1.5, combo: ['potato', 'panko'], stage: 1 },
  // 町の人気店で見つかる（3工程の大物）
  curry:     { name: 'カレーライス',   icon: '🍛', steps: [['board', 2.0], ['stove', 5.0]],                 base: 900,  cost: 240, appeal: 1.4, combo: ['curry', 'rice'], stage: 2 },
  ebifry:    { name: 'エビフライ定食', icon: '🍤', steps: [['board', 2.0], ['fryer', 5.0]],                 base: 1300, cost: 400, appeal: 1.6, combo: ['shrimp', 'panko'], stage: 2 },
  katsudon:  { name: 'カツ丼',         icon: '🍱', steps: [['board', 1.5], ['fryer', 4.5], ['stove', 3.0]], base: 1200, cost: 340, appeal: 1.7, combo: ['pork', 'dashi'], stage: 2 },
  tendon:    { name: '天丼',           icon: '🍤', steps: [['board', 1.5], ['fryer', 4.5], ['stove', 2.5]], base: 1300, cost: 380, appeal: 1.7, combo: ['shrimp', 'dashi'], stage: 2 },
  katsucurry:{ name: 'カツカレー',     icon: '🍛', steps: [['board', 2.0], ['fryer', 4.5], ['stove', 3.5]], base: 1400, cost: 400, appeal: 1.8, combo: ['pork', 'curry'], stage: 2 },

  // ---- 2号店（中華）。shop を付けた料理は その店でだけ出る ----
  gyoza:     { shop: 'chuka', name: '餃子',       steps: [['board', 1.5], ['stove', 3.5]],                 base: 450,  cost: 110, appeal: 1.1, start: true },
  chahan:    { shop: 'chuka', name: 'チャーハン', steps: [['board', 1.5], ['stove', 3.5]],                 base: 700,  cost: 180, appeal: 1.2, start: true },
  ramen:     { shop: 'chuka', name: 'ラーメン',   steps: [['board', 1.5], ['stove', 4.5]],                 base: 800,  cost: 220, appeal: 1.5, combo: ['noodle', 'negi'], stage: 1 },
  tenshin:   { shop: 'chuka', name: '天津飯',     steps: [['board', 1.5], ['stove', 4.0]],                 base: 850,  cost: 220, appeal: 1.3, combo: ['egg', 'rice'], stage: 1 },
  harumaki:  { shop: 'chuka', name: '春巻き',     steps: [['board', 2.0], ['fryer', 4.5]],                 base: 600,  cost: 150, appeal: 1.2, combo: ['pork', 'cabbage'], stage: 1 },
  mapo:      { shop: 'chuka', name: '麻婆豆腐',   steps: [['board', 1.5], ['stove', 4.5]],                 base: 950,  cost: 250, appeal: 1.5, combo: ['tofu', 'chili'], stage: 2 },
  tantan:    { shop: 'chuka', name: '担々麺',     steps: [['board', 1.5], ['stove', 5.0]],                 base: 1000, cost: 280, appeal: 1.6, combo: ['noodle', 'chili'], stage: 2 },
  ebichili:  { shop: 'chuka', name: 'エビチリ',   steps: [['board', 1.5], ['fryer', 4.0], ['stove', 3.0]], base: 1300, cost: 380, appeal: 1.7, combo: ['shrimp', 'chili'], stage: 2 },
  subuta:    { shop: 'chuka', name: '酢豚',       steps: [['board', 2.0], ['fryer', 4.5], ['stove', 3.0]], base: 1200, cost: 330, appeal: 1.7, combo: ['pork', 'su'], stage: 2 },

  // ---- 3号店（ハンバーガー）。安くて 早い。さっと食べて すぐ帰る ----
  burger:    { shop: 'burger', name: 'ハンバーガー',       steps: [['board', 1.5], ['stove', 3.0]],                 base: 500, cost: 130, appeal: 1.2, start: true },
  fries:     { shop: 'burger', name: 'フライドポテト',     steps: [['board', 1.0], ['fryer', 3.0]],                 base: 300, cost: 70,  appeal: 1.0, start: true },
  cheese:    { shop: 'burger', name: 'チーズバーガー',     steps: [['board', 1.5], ['stove', 3.5]],                 base: 600, cost: 160, appeal: 1.4, combo: ['beef', 'cheese'], stage: 1 },
  chickenb:  { shop: 'burger', name: 'チキンバーガー',     steps: [['board', 1.5], ['fryer', 4.0]],                 base: 650, cost: 170, appeal: 1.4, combo: ['chicken', 'panko'], stage: 1 },
  hotdog:    { shop: 'burger', name: 'ホットドッグ',       steps: [['board', 1.5], ['stove', 2.5]],                 base: 450, cost: 110, appeal: 1.1, combo: ['sausage', 'bun'], stage: 1 },
  teriyaki:  { shop: 'burger', name: '照り焼きバーガー',   steps: [['board', 1.5], ['stove', 4.0]],                 base: 700, cost: 190, appeal: 1.5, combo: ['chicken', 'teri'], stage: 2 },
  ebiburger: { shop: 'burger', name: 'エビバーガー',       steps: [['board', 1.5], ['fryer', 4.0]],                 base: 750, cost: 210, appeal: 1.6, combo: ['shrimp', 'panko'], stage: 2 },
  tsukimi:   { shop: 'burger', name: '月見バーガー',       steps: [['board', 1.5], ['stove', 4.0]],                 base: 750, cost: 200, appeal: 1.6, combo: ['beef', 'egg'], stage: 2 },
  bigset:    { shop: 'burger', name: 'ベーコンバーガーセット', steps: [['board', 1.5], ['stove', 3.5], ['fryer', 3.0]], base: 950, cost: 260, appeal: 1.8, combo: ['bacon', 'potato'], stage: 2 },

  // ---- 4号店（カフェ）。お客さんが 一日じゅう来て、長く座る ----
  coffee:    { shop: 'cafe', name: 'ブレンドコーヒー',   steps: [['board', 1.5]],                                 base: 400, cost: 60,  appeal: 1.0, start: true },
  toast:     { shop: 'cafe', name: 'バタートースト',     steps: [['board', 1.0], ['stove', 2.5]],                 base: 450, cost: 90,  appeal: 1.0, start: true },
  sandwich:  { shop: 'cafe', name: 'ハムサンド',         steps: [['board', 2.0]],                                 base: 600, cost: 150, appeal: 1.3, combo: ['bread', 'ham'], stage: 1 },
  pancake:   { shop: 'cafe', name: 'パンケーキ',         steps: [['board', 1.5], ['stove', 3.5]],                 base: 650, cost: 150, appeal: 1.4, combo: ['flour', 'egg'], stage: 1 },
  pudding:   { shop: 'cafe', name: 'プリン',             steps: [['board', 1.5], ['stove', 3.5]],                 base: 450, cost: 100, appeal: 1.2, combo: ['egg', 'milk'], stage: 1 },
  parfait:   { shop: 'cafe', name: 'フルーツパフェ',     steps: [['board', 2.5]],                                 base: 800, cost: 220, appeal: 1.6, combo: ['fruit', 'cream'], stage: 2 },
  doria:     { shop: 'cafe', name: 'ドリア',             steps: [['board', 1.5], ['stove', 4.5]],                 base: 900, cost: 240, appeal: 1.6, combo: ['cream', 'rice'], stage: 2 },
  tart:      { shop: 'cafe', name: 'フルーツタルト',     steps: [['board', 2.0], ['stove', 4.0]],                 base: 750, cost: 200, appeal: 1.6, combo: ['fruit', 'flour'], stage: 2 },
  katsusand: { shop: 'cafe', name: 'カツサンド',         steps: [['board', 1.5], ['fryer', 4.0], ['stove', 2.0]], base: 950, cost: 270, appeal: 1.7, combo: ['pork', 'bread'], stage: 2 },

  // ---- 5号店（イタリアン）。夜に お客さんが多く、値段が高い。いちばん大きな店 ----
  margherita:{ shop: 'italian', name: 'マルゲリータ',     steps: [['board', 1.5], ['stove', 4.0]],                 base: 1000, cost: 250, appeal: 1.3, start: true },
  minestrone:{ shop: 'italian', name: 'ミネストローネ',   steps: [['board', 1.5], ['stove', 3.5]],                 base: 600,  cost: 140, appeal: 1.0, start: true },
  pomodoro:  { shop: 'italian', name: 'ポモドーロ',       steps: [['board', 1.5], ['stove', 4.0]],                 base: 1000, cost: 250, appeal: 1.4, combo: ['pasta', 'tomato'], stage: 1 },
  carbonara: { shop: 'italian', name: 'カルボナーラ',     steps: [['board', 1.5], ['stove', 4.0]],                 base: 1100, cost: 280, appeal: 1.5, combo: ['pasta', 'egg'], stage: 1 },
  caprese:   { shop: 'italian', name: 'カプレーゼ',       steps: [['board', 2.0]],                                 base: 800,  cost: 200, appeal: 1.2, combo: ['tomato', 'mozza'], stage: 1 },
  pescatore: { shop: 'italian', name: 'ペスカトーレ',     steps: [['board', 1.5], ['stove', 4.5]],                 base: 1400, cost: 400, appeal: 1.7, combo: ['pasta', 'seafood'], stage: 2 },
  lasagna:   { shop: 'italian', name: 'ラザニア',         steps: [['board', 2.0], ['stove', 5.0]],                 base: 1400, cost: 380, appeal: 1.7, combo: ['meat', 'mozza'], stage: 2 },
  fritto:    { shop: 'italian', name: 'フリット・ミスト', steps: [['board', 1.5], ['fryer', 4.0]],                 base: 1200, cost: 330, appeal: 1.6, combo: ['seafood', 'potato'], stage: 2 },
  cotoletta: { shop: 'italian', name: 'ミラノ風カツレツ', steps: [['board', 1.5], ['fryer', 4.0], ['stove', 2.5]], base: 1600, cost: 450, appeal: 1.8, combo: ['meat', 'panko'], stage: 2 },
};

// 試作に使う食材（レシピ帳）。お店を広げると 使える食材が増える
export const INGREDIENTS = {
  rice: 'ごはん', egg: '卵', noodle: '麺', pork: '豚肉', cabbage: 'キャベツ', tomato: 'トマト',
  chicken: '鶏肉', potato: 'じゃがいも', panko: 'パン粉',
  shrimp: 'エビ', curry: 'カレー粉', dashi: 'だし',
  negi: 'ねぎ', tofu: '豆腐', chili: '唐辛子', su: 'お酢',
  beef: '牛肉', cheese: 'チーズ', sausage: 'ソーセージ', bun: 'パン', teri: '照り焼きのたれ', bacon: 'ベーコン',
  bread: '食パン', ham: 'ハム', milk: '牛乳', flour: '小麦粉', cream: '生クリーム', fruit: 'フルーツ',
  pasta: 'パスタ', mozza: 'モッツァレラ', seafood: '魚介', meat: 'ひき肉',
};
// 1号店の食材（どの段から使えるか）。店ごとの表は GENRES の ing
export const INGREDIENT_STAGE = {
  rice: 0, egg: 0, noodle: 0, pork: 0, cabbage: 0, tomato: 0,
  chicken: 1, potato: 1, panko: 1,
  shrimp: 2, curry: 2, dashi: 2,
};

// お店のジャンル。1号店は和食、2号店から ジャンルを変えて出す（2026-10-19 オーナー決定）
export const GENRES = {
  washoku: {
    name: 'まちかど食堂', short: '食堂', no: 1, stageNames: ['屋台', '小さな食堂', '町の人気店'], ing: INGREDIENT_STAGE,
    look: { sign: 'まちかど食堂', noren: '食堂', roof: '#4a4870', signFill: '#ff4f5e', signText: '#fff', norenFill: '#25406b' },
  },
  chuka: {
    name: '中華 まんぷく亭', short: '中華', no: 2, stageNames: ['中華の屋台', '小さな中華料理店', '町の人気中華'],
    ing: { rice: 1, egg: 1, noodle: 1, pork: 1, cabbage: 1, negi: 1, tofu: 2, chili: 2, shrimp: 2, su: 2 },
    look: { sign: 'まんぷく亭', noren: '中華', roof: '#c0392b', signFill: '#ffd23f', signText: '#c0392b', norenFill: '#c0392b' },
    // 出店：1号店が この段になったら。小さな中華料理店から始まる
    need: { shop: 'washoku', stage: 2 }, price: 60000, startStage: 1, start: { seats: 4, stations: { board: 1, stove: 1 }, prep: 8 },
    blurb: 'コンロが主役の店。少ない台で 速く回す',
    perk: { stovePrice: 0.6, text: 'コンロが 4割 安い' },
  },
  // perk：その店で 効く投資（席の上限 seats・台の上限 stations・コンロの値段 stovePrice・内装の効き priceUp）。第2回レビュー 6
  // 3号店から。eat：食べている時間の倍率 / period：時間帯ごとの 来る人の倍率（lunch 11〜14時・day 14〜17時・dinner 17時〜）
  burger: {
    name: 'バーガー スマイル', short: 'バーガー', no: 3, stageNames: ['バーガーの屋台', '小さなバーガー店', '町の人気バーガー'],
    ing: { beef: 1, cheese: 1, chicken: 1, panko: 1, sausage: 1, bun: 1, potato: 1, shrimp: 2, teri: 2, egg: 2, bacon: 2 },
    look: { sign: 'SMILE', noren: 'バーガー', roof: '#e8742a', signFill: '#fff3c4', signText: '#d9481e', norenFill: '#d9481e' },
    need: { shop: 'chuka', stage: 2 }, price: 90000, startStage: 1, start: { seats: 4, stations: { board: 1, stove: 1, fryer: 1 }, prep: 10 },
    blurb: '安くて 早い店。お客さんは さっと食べて すぐ帰る。昼に 行列',
    eat: 0.45, period: { lunch: 1.5, day: 0.9, dinner: 0.8 },
    perk: { stations: 2, text: '台を 2つ 多く 置ける' },
  },
  cafe: {
    name: 'カフェ こもれび', short: 'カフェ', no: 4, stageNames: ['コーヒーの屋台', '小さなカフェ', '町の人気カフェ'],
    ing: { bread: 1, ham: 1, egg: 1, milk: 1, flour: 1, rice: 2, cream: 2, fruit: 2, pork: 2 },
    look: { sign: 'こもれび', noren: 'カフェ', roof: '#5b8a5a', signFill: '#fffaf0', signText: '#5b4636', norenFill: '#5b8a5a' },
    need: { shop: 'burger', stage: 2 }, price: 120000, startStage: 1, start: { seats: 6, stations: { board: 1, stove: 1 }, prep: 10 },
    blurb: 'お客さんが 一日じゅう 少しずつ来て、長く座る店。席の数が ものを言う',
    eat: 2.2, period: { lunch: 0.8, day: 1.8, dinner: 0.7 },
    perk: { seats: 4, text: '席を 4つ 多く 置ける' },
  },
  italian: {
    name: 'トラットリア ソーレ', short: 'イタリアン', no: 5, stageNames: ['パスタの屋台', '小さなイタリアン', '町の人気イタリアン'],
    ing: { pasta: 1, tomato: 1, egg: 1, mozza: 1, potato: 1, panko: 1, seafood: 2, meat: 2 },
    look: { sign: 'SOLE', noren: 'イタリアン', roof: '#2f6e4a', signFill: '#fff', signText: '#c0392b', norenFill: '#2f6e4a' },
    need: { shop: 'cafe', stage: 2 }, price: 150000, startStage: 1, start: { seats: 6, stations: { board: 1, stove: 2 }, prep: 10 },
    blurb: '夜に お客さんが多い、値段の高い店。商店街で いちばん大きな店になる',
    eat: 1.4, period: { lunch: 0.8, day: 0.7, dinner: 1.6 },
    perk: { priceUp: 0.12, text: '内装の 1段ごとに 値段を 12% 高く見せられる（ほかの店は 6%）' },
  },
};
export const BRANCH_ORDER = ['washoku', 'chuka', 'burger', 'cafe', 'italian'];
// まだ作っていない店（設備のタブに「準備中」として見せる）。5店そろったので 空
export const BRANCH_LATER = [];
export const TRIAL_COST = 300;

// お客さん
export const GUEST = {
  queuePatience: 34,     // 入口の列に入ってから待てる秒
  orderPatience: 50,     // 座ってから料理が届くまで待てる秒
  lineShown: 3,          // 入口の列に並べる人数。あふれた人は通りで様子を見ていて、列に入ってから待ち時間を数える
  lineExtra: 1.0,        // 通りで 様子を見る人は 席の数 × これ まで。それより 多いと 店の前で 引き返す（評判は 下がらない・第2回レビュー 7）
  eatSeconds: 9,
  priceSense: 2.2,       // 値段に敏感な度合い（大きいほど高いと頼まない）
  maxPriceRatio: 1.7,    // ふつうの値段のこれ倍を超えると誰も頼まない
  minWeight: 0.18,       // 頼みたい物がこれ未満なら「高い」と帰る
  // 値段は「来る人数」にも効く。店の平均の値段比が 1 を超えた分 × up だけ減り、1 を下回った分 × down だけ増える（上限 maxBoost）
  demandUp: 0.75,        // 1.3倍で −22%・1.6倍で −45%
  demandDown: 0.5,
  maxBoost: 1.1,
};

// 1日に来るお客さんの数 = (base + 評判 × perRep) × 天気 × チラシ
export const DEMAND = { base: 16, perRep: 0.55, stageMul: [1, 1.15, 1.35] }; // 店が大きいほど 人が来る
export const WEATHER = [
  { id: 'sun', name: '晴れ', icon: '☀️', mul: 1.0, p: 0.5 },
  { id: 'cloud', name: 'くもり', icon: '☁️', mul: 0.9, p: 0.3 },
  { id: 'rain', name: '雨', icon: '☔', mul: 0.7, p: 0.2 },
];
// ときどきの出来事。前の晩の貼り紙で分かり、仕込みで備えられる。3日目から 1日 chance の確率で どれか1つ
// period：その時間帯に来る人が boost 倍（lunch 11〜14時・dinner 17時〜）/ nMul：1日の人数 / repMul：その日の評判の動き
// 季節：30日ごとに 春→夏→秋→冬 と めぐる（1日目は 春）。旬の料理は よく頼まれ、食材の値段が 動く。
// 商店街の顔の あとも 日々が 変わり続けるための 1つ（第2回レビュー 8）
export const SEASON = {
  days: 30, hotMul: 1.3, cheapMul: 0.8, dearMul: 1.25,
  list: [
    { id: 'spring', name: '春', icon: '🌸', text: '旬：たけのこ・いちご・春キャベツ',
      hot: ['onigiri', 'shogayaki', 'harumaki', 'tenshin', 'teriyaki', 'sandwich', 'parfait', 'caprese', 'pomodoro'],
      cheap: ['tonjiru', 'gyoza', 'pancake', 'tart', 'minestrone'], dear: ['ebifry', 'ebichili', 'ebiburger', 'pescatore'] },
    { id: 'summer', name: '夏', icon: '🌻', text: '旬：トマト・とうもろこし・冷たいもの',
      hot: ['napolitan', 'curry', 'katsucurry', 'mapo', 'tantan', 'burger', 'fries', 'pudding', 'parfait', 'margherita', 'caprese'],
      cheap: ['napolitan', 'pomodoro', 'margherita', 'caprese', 'tsukimi'], dear: ['tonjiru', 'ramen', 'doria', 'lasagna'] },
    { id: 'autumn', name: '秋', icon: '🍁', text: '旬：きのこ・さつまいも・新米',
      hot: ['oyakodon', 'tendon', 'katsudon', 'croquette', 'chahan', 'subuta', 'bigset', 'doria', 'tart', 'lasagna', 'fritto'],
      cheap: ['onigiri', 'croquette', 'chahan', 'fries', 'tart'], dear: ['parfait', 'caprese', 'pudding'] },
    { id: 'winter', name: '冬', icon: '⛄', text: '旬：大根・白菜・あたたかいもの',
      hot: ['tonjiru', 'curry', 'ramen', 'tantan', 'mapo', 'hotdog', 'coffee', 'doria', 'toast', 'minestrone', 'lasagna'],
      cheap: ['tonjiru', 'ramen', 'minestrone', 'coffee', 'hotdog'], dear: ['parfait', 'tart', 'ebiburger', 'pescatore'] },
  ],
};
export const EVENTS = {
  chance: 0.25,
  list: [
    { id: 'undokai', name: '近くで 運動会', icon: '🏃', text: '昼に お客さんが どっと来る', period: 'lunch', boost: 2.2, nMul: 1.3 },
    { id: 'matsuri', name: '夕方から お祭り', icon: '🏮', text: '夜に お客さんが 増える', period: 'dinner', boost: 1.8, nMul: 1.25 },
    { id: 'holiday', name: '祝日', icon: '🎌', text: '一日中 お客さんが 多い', nMul: 1.4 },
    { id: 'reporter', name: 'グルメ記者が 来る', icon: '📝', text: '評判が 大きく動く日', repMul: 3 },
  ],
};
// 時間帯ごとの混み具合（分, 重み）
export const RUSH = [
  [11 * 60, 0.7], [12 * 60, 2.4], [13 * 60 + 30, 0.9], [15 * 60, 0.5],
  [17 * 60, 1.0], [18 * 60, 2.0], [20 * 60, 0.8], [21 * 60, 0.4],
];

// 評判（0〜100。★ は 20 ごと）
// decay：高い評判は 毎日 少し戻る（[これより上なら, 1日に下がる量]）。★5 を保つのに 手が要る
export const PREP_WARN = { soldOutDays: 3 }; // 支度の料理の行：売り切れが この日数 続いたら 赤

export const REP = { start: 10, branchStart: 35, // 2号店からは 町に 名前が知られている
  servedFast: 0.35, served: 0.2, left: -1.2, soldOut: -0.5, tooPricey: -0.2, decay: [[80, 1, 0.25], [50, 1]], // [これを超えたら, 毎日 戻る量, 超えた1点ごとに さらに戻る量]。80を超えるほど 戻りが大きく、90台は 速く出す店でないと 保てない
  gain: [[80, 0.1], [60, 0.4]] }; // 高い評判ほど 1人を出しても 伸びにくい（99で 張りつかないため・第2回レビュー 3）
// 早送り（仕込み係とホール係がいる日だけ）
export const FAST = 3;

// お店の段階。rent は 1日の家賃（閉店のときに払う。もうけが出ないと赤字になる）（maxStaff は「台の数 ＋ ホール1人」。雇えるのは 置いてある台の数 ＋1 まで）
export const STAGES = [
  { id: 'stall', name: '屋台', maxSeats: 4, maxStations: 2, maxStaff: 3, pass: 2, rent: 0 },
  { id: 'diner', name: '小さな食堂', maxSeats: 10, maxStations: 5, maxStaff: 6, pass: 3, rent: 4000,
    unlock: { totalSales: 60000, rep: 30 }, price: 25000 },
  { id: 'popular', name: '町の人気店', maxSeats: 16, maxStations: 7, maxStaff: 8, pass: 4, rent: 8000,
    unlock: { totalSales: 200000, rep: 60 }, price: 90000 },
];

// 買えるもの（夜の準備）
export const SHOP = {
  seat: { name: '席を1つ増やす', price: (n) => 2500 + n * 900 },
  board: { name: 'まな板を増やす', price: (n) => 4000 + n * 3000 },
  stove: { name: 'コンロを増やす', price: (n) => 7000 + n * 4000 },
  fryer: { name: '揚げ場を置く', price: (n) => 14000 + n * 6000 },
};

// スタッフ（1日の給料）
export const STAFF = {
  board: { name: '仕込み係', wage: 1200 },
  stove: { name: 'コンロ係', wage: 1500 },
  fryer: { name: '揚げ場係', wage: 1500 },
  hall: { name: 'ホール係', wage: 1300 },
  delay: 0.9,            // スタッフが次へ動かすまでの秒（前は 0.6。あなたの指より 遅い。手を出す意味を残す・第2回レビュー 4）
  autoNext: 0.4,         // できあがった料理が 次の台へ ひとりでに移るまでの秒（空いていれば）
  speed: 1.1,            // 人のいる台は 調理がこれだけ速い（前は 1.2。人を置く意味は ここ。速すぎると 手を出す意味が 消える）
  repMul: 0.6,           // ホール係が 運んだ料理の 評判の伸び（あなたが 運ぶと 1）
};
// 店を2つ持つと 8人＋8人 が並ぶので、名前は多めに（足りないときは「◯◯2」）
export const STAFF_NAMES = ['ハル', 'ミオ', 'ソウタ', 'リコ', 'ケン', 'ナナ', 'ユウ', 'サキ', 'ダイチ', 'アオイ', 'リク', 'モモ',
  'タクミ', 'ヒナ', 'レン', 'ユイ', 'カイ', 'メイ', 'シュン', 'アン', 'ジン', 'ルナ', 'ゴウ', 'スズ'];

// 常連さん
export const REGULARS = [
  { id: 'sato', name: 'サトウさん', fav: 'yakisoba', look: 0 },
  { id: 'tanaka', name: 'タナカさん', fav: 'tonjiru', look: 1 },
  { id: 'ito', name: 'イトウさん', fav: 'omurice', look: 2 },
  { id: 'kimura', name: 'キムラさん', fav: 'karaage', look: 3 },
  { id: 'mori', name: 'モリさん', fav: 'onigiri', look: 4 },
  { id: 'abe', name: 'アベさん', fav: 'napolitan', look: 5 },
  { id: 'wang', name: 'ワンさん', fav: 'gyoza', look: 6, shop: 'chuka' },
  { id: 'ogawa', name: 'オガワさん', fav: 'ramen', look: 8, shop: 'chuka' },
  { id: 'kudo', name: 'クドウさん', fav: 'mapo', look: 10, shop: 'chuka' },
  { id: 'hayashi', name: 'ハヤシさん', fav: 'burger', look: 7, shop: 'burger' },
  { id: 'nishi', name: 'ニシくん', fav: 'fries', look: 9, shop: 'burger' },
  { id: 'okada', name: 'オカダさん', fav: 'cheese', look: 11, shop: 'burger' },
  { id: 'suzuki', name: 'スズキさん', fav: 'coffee', look: 1, shop: 'cafe' },
  { id: 'yamada', name: 'ヤマダさん', fav: 'pancake', look: 4, shop: 'cafe' },
  { id: 'ueno', name: 'ウエノさん', fav: 'toast', look: 2, shop: 'cafe' },
  { id: 'rossi', name: 'ロッシさん', fav: 'margherita', look: 6, shop: 'italian' },
  { id: 'kato', name: 'カトウさん', fav: 'carbonara', look: 3, shop: 'italian' },
  { id: 'fujii', name: 'フジイさん', fav: 'minestrone', look: 5, shop: 'italian' },
];
// となりの店（町に呼ぶ店）。自分の店が 人気店に なるたびに、候補2つから1つを呼べる。効き目は 自分の店 ぜんぶに
// text は 起きることだけを書く（「おすすめ」は書かない）
export const TOWN = {
  lots: 5,
  list: [
    { id: 'yaoya', name: '八百屋', text: '仕入れが 1割 安くなる', prepMul: 0.9 },
    { id: 'honya', name: '本屋', text: '昼に 学生が 来るようになる', period: 'lunch', boost: 1.4, nMul: 1.06 },
    { id: 'sento', name: '銭湯', text: '夜に お客さんが 増える', period: 'dinner', boost: 1.4, nMul: 1.06 },
    { id: 'jimusho', name: '商店街の事務所', short: '事務所', text: 'お祭りや 行事の日が 増える', eventMul: 1.6 },
    { id: 'coffee', name: 'コーヒー屋', text: '常連さんの 機嫌が 早く直る', upsetHeal: 2 },
    { id: 'hanaya', name: '花屋', text: '高い評判が 下がりにくい', decayMul: 0.5 },
  ],
};
// upsetDays：嫌なこと（好物が無い・高い・売り切れ・待たされて帰った）があると、この日数は来る確率が upsetDrop ぶん下がる
// pricey：好物が ふつうの値段の これ倍を超えると「高い」
export const REGULAR = { chance: 0.35, loveToUsual: 3, missDays: 3, upsetDays: 4, upsetDrop: 0.3, pricey: 1.3 };

// 店長（2号店から。立たない店に置ける）。仕込みを きのう売れた数＋extra に合わせ、仕込み係と ホール係が いなければ呼ぶ。給料は 毎日
export const MANAGER = { wage: 2000, rate: 0.05, extra: 2, minPrep: 3, outMul: 1.4, stance: 'sales' };
// 店長の方針（店ごと）。どれかを取ると どれかを失う（2026-10-21 オーナー「トレードオフな仕組み」）
//   prepMul：仕込みの倍率 / extra：仕込みの上乗せ（無ければ MANAGER.extra）/ priceMul：値段 / hallRep：ホール係が運んだ料理の評判の伸び（無ければ STAFF.repMul）
//   hallDelay：ホール係が運ぶまでの秒の倍率 / decayMul：高い評判の 毎日の戻りの倍率 / lean：仕込み係とホール係だけで回す
export const STANCES = {
  sales: { name: '売上重視', text: '仕込み 1.15倍・値段を ふつうの +5%。売り切れは 減るが 食材が 余る', prepMul: 1.15, priceMul: 1.05 },
  rep: { name: '評判重視', text: '仕込み 1.2倍・ホール係が ひとりひとり 丁寧に 運ぶ。評判は 落ちにくいが 出せる数が 減り、食材が 余る', prepMul: 1.2, hallRep: 1.3, hallDelay: 2.5, decayMul: 0.7 },
  lean: { name: 'むだなし', text: '仕込みは きのう売れた数 ちょうど・バイトは 仕込み係と ホール係だけ。食材は 余らないが 売り切れが 出る', prepMul: 1.0, extra: 0, lean: true },
}; // 給料は 1日 wage ＋ その店の 売上の rate（前は 一律 ¥2,500・第2回レビュー 7）。売り切れた料理は きのうの 1.4倍＋2

// 広告（見たい人が見るものだけ。1日の上限）
export const ADS = { perDay: 5, profitMul: 1.5, flyerMul: 1.25 };

// お金が足りないときは「ツケ」になる（仕入れ・アルバイト代・家賃）。手持ちは 0 より下がらず、ツケは 閉店のときに 手持ちから返す
// 利子は無い。詰まないための仕組みで、ツケの残りは 画面の上に出る
// prep：はじめの仕込み（1品あたり）。1日目は 余らせない量から始める
export const START = { money: 6000, seats: 3, stations: { board: 1, stove: 1, fryer: 0 }, prep: 5 };

// 町の人のお願い：日にちと店と数だけが決まった注文。その日の朝、その店の仕込みから 届ける
// 文には 起きることだけを書く（どうすればいいかは書かない）
export const ASK = {
  fromDay: 4, chance: 0.5, max: 3, lead: 3, // 何日先まで（1〜3晩あと）
  n: [5, 4, 4], // 5 ＋ 段×4 ＋ 0〜3
  tip: 0.3, // ふつうの値段の 1.3倍で 買ってくれる
  rep: 2, failRep: 2,
};
// need：その となりの店が あるときだけ
export const ASK_FROM = [
  { who: '小学校', what: '運動会の お弁当', look: 2 },
  { who: '町内会', what: '集まりの 差し入れ', look: 5 },
  { who: '工事の 現場', what: 'お昼の まとめ買い', look: 3 },
  { who: '公民館', what: '習い事の あとの 食事会', look: 8 },
  { who: '病院', what: '夜勤の 人の 夜食', look: 10 },
  { who: '保育園', what: '先生たちの 打ち上げ', look: 4 },
  { who: '商店街の 事務所', what: '会議の お弁当', look: 9, need: 'jimusho' },
  { who: '銭湯', what: 'お風呂上がりの 夜食', look: 0, need: 'sento' },
  { who: '本屋', what: '読書会の 軽食', look: 6, need: 'honya' },
  { who: '花屋', what: '結婚式の 前の 腹ごしらえ', look: 11, need: 'hanaya' },
  { who: '八百屋', what: '朝市の 手伝いの まかない', look: 7, need: 'yaoya' },
  { who: 'コーヒー屋', what: '豆の 試飲会の 軽食', look: 1, need: 'coffee' },
];
// 常連さんの物語：来た回数（at）で 1つずつ進む。ask のある回は その人から お願いが届く（料理は 好物）
export const STORY_AT = [3, 7, 12, 18];
export const STORIES = {
  sato: ['サトウさんは 近くの 会社に 入ったばかりらしい', 'サトウさんが「仕事で 初めて ほめられた」と 話していた', { ask: '後輩の 歓迎会', text: 'サトウさんに 後輩が できるらしい' }, 'サトウさんが 後輩と 2人で 来るようになった'],
  tanaka: ['タナカさんは 毎朝 商店街を 散歩しているらしい', 'タナカさんが「孫が 遊びに来る」と うれしそうだった', { ask: 'お孫さんの 誕生会', text: 'タナカさんの お孫さんが もうすぐ 誕生日らしい' }, 'タナカさんが お孫さんと 並んで 豚汁を すすっていた'],
  ito: ['イトウさんは 美術の 学校に 通っているらしい', 'イトウさんが 店の 絵を 描いていた', { ask: '卒業制作の 打ち上げ', text: 'イトウさんの 卒業制作が できあがったらしい' }, 'イトウさんの 絵が 商店街に 飾られた'],
  kimura: ['キムラさんは 少年野球の コーチらしい', 'キムラさんの チームが 初めて 勝った', { ask: '試合の 日の 差し入れ', text: 'キムラさんの チームが 決勝に 出るらしい' }, 'キムラさんの チームの 子たちが 店に 寄るようになった'],
  mori: ['モリさんは 夜の タクシーの 運転手らしい', 'モリさんが「ここの おにぎりは 夜中に 効く」と 言っていた', { ask: '運転手仲間の 夜食', text: 'モリさんが 仲間に 店の話を したらしい' }, 'モリさんの 仲間も 来るようになった'],
  abe: ['アベさんは いつも 同じ人と 来ている', 'アベさんが 指輪を 見せてくれた', { ask: '結婚の お祝いの 集まり', text: 'アベさんが 結婚するらしい' }, 'アベさん夫婦が 並んで ナポリタンを 食べていた'],
  wang: ['ワンさんは 留学で 来たらしい', 'ワンさんが「故郷の 味に 近い」と 言っていた', { ask: '留学生の 集まり', text: 'ワンさんの 学校で 留学生が 集まるらしい' }, 'ワンさんが 友だちを 連れてきた'],
  ogawa: ['オガワさんは バンドを やっているらしい', 'オガワさんの バンドが 小さな ライブハウスに 出た', { ask: 'ライブの 打ち上げ', text: 'オガワさんの バンドが 初めて 満員に したらしい' }, 'オガワさんの 新しい曲に 店の名前が 出てくるらしい'],
  kudo: ['クドウさんは 消防署の 人らしい', 'クドウさんが 訓練の 帰りに 汗だくで 来た', { ask: '消防署の 夜勤の 夜食', text: 'クドウさんの 署で 夜勤が 続くらしい' }, '消防署の 人たちが 交代で 来るようになった'],
  hayashi: ['ハヤシさんは 近くの 高校の 先生らしい', 'ハヤシさんが テストの 採点を しながら 食べていた', { ask: '文化祭の 手伝いの 子たちに', text: 'ハヤシさんの 高校で 文化祭が あるらしい' }, 'ハヤシさんの 生徒たちが 店の前で 写真を 撮っていた'],
  nishi: ['ニシくんは 塾の 帰りに 寄るらしい', 'ニシくんが「テストで 100点 取った」と 言っていた', { ask: '塾の 合格祝い', text: 'ニシくんの 塾で 合格の 知らせが 続いているらしい' }, 'ニシくんが 制服で 来た。中学生に なったらしい'],
  okada: ['オカダさんは 宅配の 仕事を しているらしい', 'オカダさんが「この町の 道は 全部 覚えた」と 笑っていた', { ask: '配送センターの 昼の まとめ買い', text: 'オカダさんの 職場に 新人が 入るらしい' }, 'オカダさんが 新人さんを 連れてきた'],
  suzuki: ['スズキさんは 小説を 書いているらしい', 'スズキさんの 原稿が だいぶ 厚くなってきた', { ask: '本が 出た お祝い', text: 'スズキさんの 本が 出るらしい' }, 'スズキさんの 本に この店に よく似た カフェが 出てくる'],
  yamada: ['ヤマダさんは 子育ての 合間に 来るらしい', 'ヤマダさんの 子が 歩けるように なった', { ask: 'ママ友の お茶会', text: 'ヤマダさんが ママ友を 誘ってみるらしい' }, 'ヤマダさんが 子どもと パンケーキを 分けていた'],
  ueno: ['ウエノさんは 昔 この通りで パン屋を していたらしい', 'ウエノさんが 昔の 商店街の 写真を 見せてくれた', { ask: '昔の 商店街の 仲間の 集まり', text: 'ウエノさんが 昔の 仲間に 声を かけたらしい' }, 'ウエノさんが 昔の 仲間と 窓ぎわで 笑っていた'],
  rossi: ['ロッシさんは イタリアから 来た 料理人らしい', 'ロッシさんが「この町の ピッツァは 悪くない」と 言った', { ask: '故郷の 家族が 来る日の 食事会', text: 'ロッシさんの 家族が イタリアから 来るらしい' }, 'ロッシさんが 家族を 連れてきた'],
  kato: ['カトウさんは 記念日に だけ 来るらしい', 'カトウさんが「ここで プロポーズした」と 教えてくれた', { ask: '結婚10年の お祝い', text: 'カトウさん夫婦が もうすぐ 結婚10年らしい' }, 'カトウさん一家が 窓ぎわの 席で 笑っていた'],
  fujii: ['フジイさんは 病院の 看護師らしい', 'フジイさんが「夜勤明けの スープが いちばん」と 言った', { ask: '病棟の みんなへの 差し入れ', text: 'フジイさんの 病棟が 忙しいらしい' }, 'フジイさんの 病院の 人たちも 来るようになった'],
};

// ---- お金の使い道（2026-10-20 オーナー：3つとも） ----
// 町に建てるもの：2号店を出したら 建てられる。効き目は 自分の店 ぜんぶに（となりの店と同じ書き方）
export const BUILD = {
  from: 2, // 店の数
  list: [
    { id: 'hiroba', name: '駅前広場', short: '広場', price: 300000, text: 'お客さんが 1割 増える', nMul: 1.1 },
    { id: 'koen', name: '公園', short: '公園', price: 400000, text: '昼すぎの 客が 増え、全体も 5% 増える', period: 'day', boost: 1.5, nMul: 1.05 },
    { id: 'chusha', name: '駐車場', short: '駐車場', price: 500000, text: '夜の 客が 増え、全体も 5% 増える', period: 'dinner', boost: 1.3, nMul: 1.05 },
    { id: 'arcade', name: 'アーケード', short: '屋根', price: 700000, text: '雨の日も 客が 減らない', dry: true },
    { id: 'busstop', name: 'バス停', short: 'バス停', price: 900000, text: 'お客さんが さらに 1割 増える', nMul: 1.1 },
    { id: 'annai', name: '観光案内所', short: '案内所', price: 1200000, text: '町の人の お願いが 2倍 届き、行事の日も 増える', eventMul: 1.4, decayMul: 0.7, askMul: 2, askMore: 2 },
  ],
};
// 商店街まつり：あしたを まつりにする。全部の店に 人が多く来る。間を空ければ 何度でも
export const FESTIVAL = { from: 2, price: 60000, nMul: 1.7, rep: 3, gap: 7 }; // 値段は 150,000→60,000（1回で 元が取れる額に・第2回レビュー 5）
// 店を飾る：内装（3段）と 名物料理（1品）。店ごと
export const DECO = {
  levels: [
    { name: 'のぼりと 看板', price: 80000 },
    { name: '内装を 新しく', price: 250000 },
    { name: '照明と 飾り', price: 600000 },
  ],
  priceUp: 0.06, // 1段ごとに、ふつうの値段より 6% 高くても ふつうに見える
  signaturePrice: 100000, signatureAppeal: 1.6, signatureMul: 1.05, // 名物が あると 来る人も 5% 増える
};
