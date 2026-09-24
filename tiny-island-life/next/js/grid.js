// 島の地図（格子）。描画とシミュレーションの両方が使う。DOM には触らない。
//
// 下敷きは碁盤の目。ただし道は島の形で切れる（D289・オーナー承認）。
// 道は変わらない（建物は道の上に建てられない）ので、経路は一度計算したら使い回せる。

export const T = 30; // 1マスの大きさ（論理座標）
export const COLS = 17;
export const ROWS = 25;
export const WORLD = { w: COLS * T, h: ROWS * T };

// 島のふち（楕円をすこし揺らした形）。描画も同じ式を使うので、見た目と格子がずれない
export const ISLAND = { cx: WORLD.w / 2, cy: WORLD.h / 2, rx: WORLD.w / 2 - 14, ry: WORLD.h / 2 - 16 };
export function islandRadius(a) {
  return 1 + 0.035 * Math.sin(3 * a + 1) + 0.022 * Math.sin(5 * a + 2) + 0.012 * Math.sin(9 * a);
}

// 建物の大きさ（マス）
export const SIZES = {
  house: { w: 1, h: 1 },
  cafe: { w: 3, h: 3 }, // 上の1段が建物、下の2段がテラス
  park: { w: 3, h: 3 },
  shop: { w: 2, h: 2 }, // お土産屋（上の段が建物、下の段が店先の台）
};

// 道の線（碁盤の目）
const ROAD_COLS = [4, 8, 12];
const ROAD_ROWS = [6, 11, 16, 20];

export const idx = (c, r) => r * COLS + c;
export const colOf = (i) => i % COLS;
export const rowOf = (i) => Math.floor(i / COLS);
export const center = (i) => ({ x: colOf(i) * T + T / 2, y: rowOf(i) * T + T / 2 });
export const inBounds = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

function edgeFactor(c, r) {
  const x = c * T + T / 2 - ISLAND.cx;
  const y = r * T + T / 2 - ISLAND.cy;
  const a = Math.atan2(y / ISLAND.ry, x / ISLAND.rx);
  return Math.hypot(x / ISLAND.rx, y / ISLAND.ry) / islandRadius(a);
}

// ---------------------------------------------------------------- 地図を作る

// 'sea' 海 / 'beach' 浜 / 'land' 建てられる土地 / 'road' 道
export const MAP = (() => {
  const kind = new Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const f = edgeFactor(c, r);
      let k = f > 1 ? 'sea' : f > 0.86 ? 'beach' : 'land';
      const onLine = ROAD_COLS.includes(c) || ROAD_ROWS.includes(r);
      // 横の道は島の端まで、縦の脇道（4列目・12列目）は横の道のあいだだけ
      const sideCol = (c === 4 || c === 12) && (r < ROAD_ROWS[0] || r > ROAD_ROWS[ROAD_ROWS.length - 1]);
      if (k === 'land' && onLine && !sideCol) k = 'road';
      kind[idx(c, r)] = k;
    }
  }
  // 南の桟橋：中央の道を浜まで延ばす（新しい住民はここから来る）
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = idx(8, r);
    if (kind[i] === 'road') break;
    if (kind[i] === 'beach') kind[i] = 'road';
  }
  // 行き止まりの短い切れ端（1マスだけ飛び出した道）は土地に戻す
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < kind.length; i++) {
      if (kind[i] !== 'road') continue;
      const n = neighbors(i).filter((j) => kind[j] === 'road').length;
      if (n === 0) kind[i] = 'land';
    }
  }
  return kind;
})();

export function neighbors(i) {
  const c = colOf(i);
  const r = rowOf(i);
  const out = [];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inBounds(c + dc, r + dr)) out.push(idx(c + dc, r + dr));
  }
  return out;
}

export const isRoad = (i) => MAP[i] === 'road';

// 桟橋の先（新しい住民が現れる場所）
export const PIER = (() => {
  let best = null;
  for (let r = ROWS - 1; r >= 0; r--) {
    const i = idx(8, r);
    if (isRoad(i)) {
      best = i;
      break;
    }
  }
  return best;
})();

// ---------------------------------------------------------------- 経路（道の上だけを歩く）

const pathCache = new Map();

// 道のマス a から b までのマスの列（a と b を含む）。つながっていなければ null
export function roadPath(a, b) {
  if (a === b) return [a];
  const key = a * 10000 + b;
  if (pathCache.has(key)) return pathCache.get(key);
  const prev = new Map([[a, -1]]);
  const queue = [a];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === b) break;
    for (const n of neighbors(cur)) {
      if (!isRoad(n) || prev.has(n)) continue;
      prev.set(n, cur);
      queue.push(n);
    }
  }
  let result = null;
  if (prev.has(b)) {
    result = [];
    for (let cur = b; cur !== -1; cur = prev.get(cur)) result.push(cur);
    result.reverse();
  }
  pathCache.set(key, result);
  return result;
}

export function roadDistance(a, b) {
  const p = roadPath(a, b);
  return p ? p.length - 1 : Infinity;
}

// ---------------------------------------------------------------- 建てられる場所

export function footprint(type, c, r) {
  const s = SIZES[type];
  const tiles = [];
  for (let dr = 0; dr < s.h; dr++) for (let dc = 0; dc < s.w; dc++) tiles.push(idx(c + dc, r + dr));
  return tiles;
}

// 建物が使っているマス
export function occupied(buildings) {
  const set = new Set();
  for (const b of buildings) for (const t of footprint(b.type, b.c, b.r)) set.add(t);
  return set;
}

// 出入り口：建物に接する道のマス。カフェは下（テラス側）の道を優先する
export function accessTile(type, c, r) {
  const s = SIZES[type];
  const candidates = [];
  if (type === 'cafe') {
    for (let dc = 0; dc < s.w; dc++) candidates.push([c + dc, r + s.h]);
    candidates.push([c - 1, r + s.h - 1], [c + s.w, r + s.h - 1]);
  }
  for (let dc = 0; dc < s.w; dc++) candidates.push([c + dc, r + s.h], [c + dc, r - 1]);
  for (let dr = 0; dr < s.h; dr++) candidates.push([c - 1, r + dr], [c + s.w, r + dr]);
  // 真ん中に近い出入り口を選ぶ
  const mid = { c: c + (s.w - 1) / 2, r: r + (s.h - 1) / 2 };
  const ok = candidates
    .filter(([cc, rr]) => inBounds(cc, rr) && isRoad(idx(cc, rr)))
    .sort((p, q) => Math.hypot(p[0] - mid.c, p[1] - mid.r) - Math.hypot(q[0] - mid.c, q[1] - mid.r));
  if (type === 'cafe') {
    const below = ok.find(([, rr]) => rr === r + s.h);
    if (below) return idx(...below);
  }
  return ok.length ? idx(...ok[0]) : null;
}

// その場所に建てられるか
export function canPlace(type, c, r, buildings) {
  const s = SIZES[type];
  if (!inBounds(c, r) || !inBounds(c + s.w - 1, r + s.h - 1)) return false;
  const used = occupied(buildings);
  for (const t of footprint(type, c, r)) {
    if (MAP[t] !== 'land' || used.has(t)) return false;
  }
  return accessTile(type, c, r) !== null;
}

// 建てられる場所の一覧（左上のマス）
export function placements(type, buildings) {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canPlace(type, c, r, buildings)) out.push({ c, r });
  return out;
}
