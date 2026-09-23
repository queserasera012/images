// 島の地図（論理座標 390 x 620）。描画とシミュレーションの両方が使う。

export const WORLD = { w: 390, h: 620 };

// 島の形（楕円）
export const ISLAND = { cx: 195, cy: 318, rx: 185, ry: 285 };

// 家を建てられる場所（先頭から順に使う）
export const HOUSE_SLOTS = [
  { x: 72, y: 170 },
  { x: 150, y: 118 },
  { x: 58, y: 262 },
  { x: 226, y: 96 },
  { x: 132, y: 212 },
  { x: 70, y: 352 },
];

export const PARK = { x: 292, y: 222, r: 62 };
export const ROOF = { x: 318, y: 196 };

export const CAFE = { x: 238, y: 438, w: 150, h: 58 };

// テラス席（Lv に応じて先頭から使う）
export const SEATS = [
  { x: 190, y: 500 }, { x: 234, y: 500 }, { x: 278, y: 500 },
  { x: 212, y: 540 }, { x: 256, y: 540 },
  { x: 300, y: 540 }, { x: 322, y: 500 }, { x: 168, y: 540 },
];

// 待ち列（先頭から）
export const QUEUE = [
  { x: 142, y: 492 }, { x: 118, y: 480 }, { x: 96, y: 466 }, { x: 78, y: 450 }, { x: 64, y: 432 },
];

// 散歩で立ち寄る場所
export const STROLL_POINTS = [
  { x: 192, y: 300 }, { x: 214, y: 330 }, { x: 170, y: 336 },
  { x: 330, y: 360 }, { x: 60, y: 440 }, { x: 196, y: 586 }, { x: 350, y: 300 },
];

// 新しい住民がやってくる場所（島の南端）
export const ARRIVAL = { x: 196, y: 606 };

export function houseDoor(house) {
  return { x: house.x, y: house.y + 24 };
}
