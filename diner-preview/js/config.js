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
};

// 試作に使う食材（レシピ帳）。お店を広げると 使える食材が増える
export const INGREDIENTS = {
  rice: 'ごはん', egg: '卵', noodle: '麺', pork: '豚肉', cabbage: 'キャベツ', tomato: 'トマト',
  chicken: '鶏肉', potato: 'じゃがいも', panko: 'パン粉',
  shrimp: 'エビ', curry: 'カレー粉', dashi: 'だし',
};
export const INGREDIENT_STAGE = {
  rice: 0, egg: 0, noodle: 0, pork: 0, cabbage: 0, tomato: 0,
  chicken: 1, potato: 1, panko: 1,
  shrimp: 2, curry: 2, dashi: 2,
};
export const TRIAL_COST = 300;

// お客さん
export const GUEST = {
  queuePatience: 28,     // 入口で待てる秒
  orderPatience: 42,     // 座ってから料理が届くまで待てる秒
  eatSeconds: 9,
  priceSense: 2.2,       // 値段に敏感な度合い（大きいほど高いと頼まない）
  maxPriceRatio: 1.7,    // ふつうの値段のこれ倍を超えると誰も頼まない
  minWeight: 0.18,       // 頼みたい物がこれ未満なら「高い」と帰る
};

// 1日に来るお客さんの数 = (base + 評判 × perRep) × 天気 × チラシ
export const DEMAND = { base: 16, perRep: 0.55 };
export const WEATHER = [
  { id: 'sun', name: '晴れ', icon: '☀️', mul: 1.0, p: 0.5 },
  { id: 'cloud', name: 'くもり', icon: '☁️', mul: 0.9, p: 0.3 },
  { id: 'rain', name: '雨', icon: '☔', mul: 0.7, p: 0.2 },
];
// 時間帯ごとの混み具合（分, 重み）
export const RUSH = [
  [11 * 60, 0.7], [12 * 60, 2.4], [13 * 60 + 30, 0.9], [15 * 60, 0.5],
  [17 * 60, 1.0], [18 * 60, 2.0], [20 * 60, 0.8], [21 * 60, 0.4],
];

// 評判（0〜100。★ は 20 ごと）
export const REP = { start: 10, servedFast: 0.35, served: 0.2, left: -1.2, soldOut: -0.5, tooPricey: -0.2 };

// お店の段階
export const STAGES = [
  { id: 'stall', name: '屋台', maxSeats: 4, maxStations: 2, maxStaff: 1, pass: 2 },
  { id: 'diner', name: '小さな食堂', maxSeats: 10, maxStations: 5, maxStaff: 4, pass: 3,
    unlock: { totalSales: 60000, rep: 30 }, price: 25000 },
  { id: 'popular', name: '町の人気店', maxSeats: 16, maxStations: 7, maxStaff: 6, pass: 4,
    unlock: { totalSales: 250000, rep: 60 }, price: 90000 },
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
  delay: 0.6,            // スタッフが次へ動かすまでの秒
};
export const STAFF_NAMES = ['ハル', 'ミオ', 'ソウタ', 'リコ', 'ケン', 'ナナ', 'ユウ'];

// 常連さん
export const REGULARS = [
  { id: 'sato', name: 'サトウさん', fav: 'yakisoba', look: 0 },
  { id: 'tanaka', name: 'タナカさん', fav: 'tonjiru', look: 1 },
  { id: 'ito', name: 'イトウさん', fav: 'omurice', look: 2 },
  { id: 'kimura', name: 'キムラさん', fav: 'karaage', look: 3 },
  { id: 'mori', name: 'モリさん', fav: 'onigiri', look: 4 },
  { id: 'abe', name: 'アベさん', fav: 'napolitan', look: 5 },
];
export const REGULAR = { chance: 0.35, loveToUsual: 3, missDays: 3 };

// 広告（見たい人が見るものだけ。1日の上限）
export const ADS = { perDay: 5, profitMul: 1.5, flyerMul: 1.25 };

export const START = { money: 6000, seats: 3, stations: { board: 1, stove: 1, fryer: 0 } };
