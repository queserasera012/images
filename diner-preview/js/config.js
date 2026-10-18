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
export const DISHES = {
  onigiri:  { name: 'おにぎり',       icon: '🍙', steps: [['board', 2.0]],                    base: 250, cost: 70,  appeal: 0.8, start: true },
  yakisoba: { name: '焼きそば',       icon: '🍝', steps: [['board', 1.5], ['stove', 3.5]],    base: 600, cost: 170, appeal: 1.0, start: true },
  tonjiru:  { name: '豚汁',           icon: '🍲', steps: [['board', 1.5], ['stove', 4.0]],    base: 400, cost: 110, appeal: 0.9, start: true },
  omurice:  { name: 'オムライス',     icon: '🍳', steps: [['board', 1.5], ['stove', 4.5]],    base: 800, cost: 210, appeal: 1.3, combo: ['egg', 'rice'] },
  napolitan:{ name: 'ナポリタン',     icon: '🍅', steps: [['board', 1.5], ['stove', 4.0]],    base: 750, cost: 200, appeal: 1.2, combo: ['noodle', 'tomato'] },
  shogayaki:{ name: '生姜焼き定食',   icon: '🥩', steps: [['board', 2.0], ['stove', 4.0]],    base: 900, cost: 260, appeal: 1.3, combo: ['pork', 'cabbage'] },
  karaage:  { name: 'からあげ定食',   icon: '🍗', steps: [['board', 1.5], ['fryer', 5.0]],    base: 950, cost: 270, appeal: 1.5, combo: ['chicken', 'rice'] },
  tonkatsu: { name: 'とんかつ定食',   icon: '🐷', steps: [['board', 2.0], ['fryer', 5.5]],    base: 1100, cost: 330, appeal: 1.5, combo: ['pork', 'rice'] },
};

// 試作に使う食材（レシピ帳）
export const INGREDIENTS = {
  rice: 'ごはん', egg: '卵', noodle: '麺', pork: '豚肉',
  chicken: '鶏肉', cabbage: 'キャベツ', tomato: 'トマト',
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
