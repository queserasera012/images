// 島の地図（格子）。描画とシミュレーションの両方が使う。DOM には触らない。
//
// 下敷きは碁盤の目。ただし道は島の形で切れる（D289・オーナー承認）。
// 島は広げられる（D298）：本島のまわりに 北の丘・東の岬・西の森 をつなげる。
// 地図は「ひらいた土地」の組み合わせで決まる。組み合わせごとに一度だけ作って使い回す。
//
// 🔑 広げても本島のマスは1つも変えない（家の前の空き地に いきなり道が通ったりしない）。
//    新しい道は、新しく陸になったマスにだけ通す。

export const T = 30; // 1マスの大きさ（論理座標）
export const COLS = 34;
export const ROWS = 31;
export const WORLD = { w: COLS * T, h: ROWS * T };

// 本島の左上のマス。前の版（17×25 の本島だけの地図）の (0,0) がここになる
export const OX = 8;
export const OY = 6;
const MAIN_COLS = 17;
const MAIN_ROWS = 25;

// 家を広げたときの1階分の高さ（描画と、屋根の上で昼寝するペットの位置に使う）
export const HOUSE_FLOOR = 12;

// 建物の大きさ（マス）
export const SIZES = {
  house: { w: 1, h: 1 },
  cafe: { w: 3, h: 3 }, // 上の1段が建物、下の2段がテラス
  park: { w: 3, h: 3 },
  shop: { w: 2, h: 2 }, // お土産屋（上の段が建物、下の段が店先の台）
  super: { w: 3, h: 2 }, // スーパー
  planetarium: { w: 3, h: 3 }, // プラネタリウム（ドーム）
  petshop: { w: 2, h: 2 }, // ペットショップ
  kinder: { w: 3, h: 2 }, // 幼稚園
  stand: { w: 1, h: 1 }, // コーヒースタンド
  pond: { w: 3, h: 2 }, // 釣り堀（上の段と下の段の半分が池、下のふちに釣り座）
};

// 島の土地。本島と、あとからつなげる3つ。
// ふちは楕円をすこし揺らした形（ph で揺れ方を変える）。描画も同じ式を使うので、見た目と格子がずれない。
// pier：港をつくる場所（その道の線を、海まで延ばした先）
export const AREAS = [
  {
    id: 'main', name: '本島', ph: 0,
    cx: (OX + MAIN_COLS / 2) * T, cy: (OY + MAIN_ROWS / 2) * T,
    rx: (MAIN_COLS / 2) * T - 14, ry: (MAIN_ROWS / 2) * T - 16,
    pier: { col: OX + 8, dir: [0, 1] },
  },
  // neck：本島とのつなぎ目を なだらかにする楕円（無いと、つなぎ目に深い入り江ができる）
  {
    id: 'north', name: '北の丘', ph: 2.1, cx: 16.5 * T, cy: 5.6 * T, rx: 6.6 * T, ry: 4.6 * T, pier: { col: 16, dir: [0, -1] },
    neck: { cx: 16.5 * T, cy: 9.2 * T, rx: 7.6 * T, ry: 3.2 * T },
  },
  {
    id: 'east', name: '東の岬', ph: 4.2, cx: 27.4 * T, cy: 15.4 * T, rx: 5.2 * T, ry: 5.6 * T, pier: { row: 17, dir: [1, 0] },
    neck: { cx: 23.6 * T, cy: 16 * T, rx: 3.4 * T, ry: 5.6 * T },
  },
  {
    id: 'west', name: '西の森', ph: 1.3, cx: 6.4 * T, cy: 21.4 * T, rx: 5.2 * T, ry: 5.8 * T, pier: { row: 22, dir: [-1, 0] },
    neck: { cx: 9.8 * T, cy: 21 * T, rx: 3.2 * T, ry: 6 * T },
  },
];
// 土地を形づくる楕円（本体と、つなぎ目）
export const shapesOf = (area) => (area.neck ? [area, { ...area.neck, ph: area.ph + 0.7 }] : [area]);
export const areaById = (id) => AREAS.find((a) => a.id === id);
export const MAIN = AREAS[0];

// 前の版の書き出し（本島だけ）との互換のため
export const ISLAND = { cx: MAIN.cx, cy: MAIN.cy, rx: MAIN.rx, ry: MAIN.ry };
export function islandRadius(a, ph = 0) {
  return 1 + 0.035 * Math.sin(3 * a + 1 + ph) + 0.022 * Math.sin(5 * a + 2 + ph * 2) + 0.012 * Math.sin(9 * a + ph * 3);
}

// 道の線（碁盤の目）。本島は前の版と同じ [4,8,12] / [6,11,16,20]
const MAIN_ROAD_COLS = [4, 8, 12];
const MAIN_ROAD_ROWS = [6, 11, 16, 20];
// 新しい土地の道の線（本島の線を そのまま外へ延ばしたもの）
const ROAD_COLS = [4, 8, 12, 16, 20, 24, 28, 32];
const ROAD_ROWS = [2, 7, 12, 17, 22, 26];

export const idx = (c, r) => r * COLS + c;
export const colOf = (i) => i % COLS;
export const rowOf = (i) => Math.floor(i / COLS);
export const center = (i) => ({ x: colOf(i) * T + T / 2, y: rowOf(i) * T + T / 2 });
export const inBounds = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

function edgeFactor(area, x, y) {
  const dx = x - area.cx;
  const dy = y - area.cy;
  const a = Math.atan2(dy / area.ry, dx / area.rx);
  return Math.hypot(dx / area.rx, dy / area.ry) / islandRadius(a, area.ph);
}
const tileFactor = (area, c, r) => edgeFactor(area, c * T + T / 2, r * T + T / 2);

export function neighbors(i) {
  const c = colOf(i);
  const r = rowOf(i);
  const out = [];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inBounds(c + dc, r + dr)) out.push(idx(c + dc, r + dr));
  }
  return out;
}

// ---------------------------------------------------------------- 地図を作る

// 本島（前の版と1マスも違わない作り方。位置だけ OX, OY ずらす）
const MAIN_KIND = (() => {
  const kind = new Array(COLS * ROWS).fill('sea');
  const at = (c, r) => idx(OX + c, OY + r);
  for (let r = 0; r < MAIN_ROWS; r++) {
    for (let c = 0; c < MAIN_COLS; c++) {
      const f = tileFactor(MAIN, OX + c, OY + r);
      let k = f > 1 ? 'sea' : f > 0.86 ? 'beach' : 'land';
      const onLine = MAIN_ROAD_COLS.includes(c) || MAIN_ROAD_ROWS.includes(r);
      // 横の道は島の端まで、縦の脇道（4列目・12列目）は横の道のあいだだけ
      const sideCol = (c === 4 || c === 12) && (r < MAIN_ROAD_ROWS[0] || r > MAIN_ROAD_ROWS[MAIN_ROAD_ROWS.length - 1]);
      if (k === 'land' && onLine && !sideCol) k = 'road';
      kind[at(c, r)] = k;
    }
  }
  // 南の桟橋：中央の道を浜まで延ばす（新しい住民はここから来る）
  for (let r = MAIN_ROWS - 1; r >= 0; r--) {
    const i = at(8, r);
    if (kind[i] === 'road') break;
    if (kind[i] === 'beach') kind[i] = 'road';
  }
  // 行き止まりの短い切れ端（1マスだけ飛び出した道）は土地に戻す
  const inMain = (i) => colOf(i) >= OX && colOf(i) < OX + MAIN_COLS && rowOf(i) >= OY && rowOf(i) < OY + MAIN_ROWS;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < kind.length; i++) {
      if (kind[i] !== 'road') continue;
      const n = neighbors(i).filter((j) => inMain(j) && kind[j] === 'road').length;
      if (n === 0) kind[i] = 'land';
    }
  }
  return kind;
})();

const MAIN_PIER = (() => {
  for (let r = ROWS - 1; r >= 0; r--) if (MAIN_KIND[idx(OX + 8, r)] === 'road') return idx(OX + 8, r);
  return null;
})();

function buildMap(ids) {
  const areas = AREAS.filter((a) => a.id !== 'main' && ids.includes(a.id));
  const kind = MAIN_KIND.slice();
  const piers = { main: MAIN_PIER };
  if (!areas.length) return { kind, piers };
  const fresh = new Set(); // 新しく陸になったマス
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(c, r);
      if (kind[i] === 'land' || kind[i] === 'road') continue; // 本島の陸は変えない
      const f = Math.min(tileFactor(MAIN, c, r), ...areas.flatMap(shapesOf).map((a) => tileFactor(a, c, r)));
      if (f > 1) continue;
      if (f > 0.86) {
        kind[i] = 'beach';
        continue;
      }
      kind[i] = ROAD_COLS.includes(c) || ROAD_ROWS.includes(r) ? 'road' : 'land';
      fresh.add(i);
    }
  }
  // 本島の道とつながらない新しい道は、土地に戻す
  const reach = new Set([MAIN_PIER]);
  const queue = [MAIN_PIER];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(cur)) {
      if (kind[n] !== 'road' || reach.has(n)) continue;
      reach.add(n);
      queue.push(n);
    }
  }
  for (const i of fresh) if (kind[i] === 'road' && !reach.has(i)) kind[i] = 'land';
  // 新しい道の短い行き止まり（2マスまで）は土地に戻す
  for (let pass = 0; pass < 2; pass++) {
    const ends = [...fresh].filter((i) => kind[i] === 'road' && neighbors(i).filter((j) => kind[j] === 'road').length <= 1);
    for (const i of ends) kind[i] = 'land';
  }
  // 港の桟橋：線の上の いちばん外側の道から、浜を海まで延ばす
  for (const a of areas) {
    const [dc, dr] = a.pier.dir;
    const line = [];
    if (a.pier.col !== undefined) for (let r = 0; r < ROWS; r++) line.push(idx(a.pier.col, r));
    else for (let c = 0; c < COLS; c++) line.push(idx(c, a.pier.row));
    if (dc + dr < 0) line.reverse();
    // 進む向きで いちばん先の道（新しい土地の中）
    let start = null;
    for (const i of line) if (kind[i] === 'road' && fresh.has(i)) start = i;
    if (start === null) continue;
    let cur = start;
    for (;;) {
      const c = colOf(cur) + dc;
      const r = rowOf(cur) + dr;
      if (!inBounds(c, r)) break;
      const n = idx(c, r);
      if (kind[n] === 'beach' || kind[n] === 'land') {
        kind[n] = 'road';
        cur = n;
      } else break;
    }
    piers[a.id] = cur;
  }
  return { kind, piers };
}

// いまの地図。useAreas で切り替える（ES モジュールの let は、読み込んだ側にも切り替えが見える）
const MAPS = new Map();
export let MAP_KEY = 'main';
export let MAP = MAIN_KIND;
export let PIER = MAIN_PIER; // 本島の桟橋（新しい住民が現れる場所）
export let PIERS = { main: MAIN_PIER };
let pathCache = new Map();
const pathCaches = new Map([['main', pathCache]]);

export function useAreas(ids = ['main']) {
  const key = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id)).map((a) => a.id).join('+');
  if (key === MAP_KEY) return;
  if (!MAPS.has(key)) MAPS.set(key, buildMap(key.split('+')));
  const m = MAPS.get(key);
  MAP_KEY = key;
  MAP = m.kind;
  PIERS = m.piers;
  PIER = m.piers.main;
  if (!pathCaches.has(key)) pathCaches.set(key, new Map());
  pathCache = pathCaches.get(key);
}
useAreas(['main']);
MAPS.set('main', { kind: MAIN_KIND, piers: { main: MAIN_PIER } });

export const isRoad = (i) => MAP[i] === 'road';

// そのマスは どの土地か（本島 or 広げた土地）。住民の一覧で「東の岬の家」のように呼ぶため
export function areaAt(c, r) {
  const k = MAIN_KIND[idx(c, r)];
  if (k === 'land' || k === 'road') return 'main';
  let best = 'main';
  let bestF = Infinity;
  for (const a of AREAS) {
    if (a.id === 'main') continue;
    const f = Math.min(...shapesOf(a).map((s) => tileFactor(s, c, r)));
    if (f < bestF) {
      bestF = f;
      best = a.id;
    }
  }
  return best;
}

// ひらいた土地が収まる範囲（px）。カメラが動ける範囲と、地面の絵の大きさに使う
export function landBounds(ids = ['main']) {
  const list = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id));
  const pad = 1.05;
  return {
    left: Math.max(0, Math.min(...list.map((a) => a.cx - a.rx * pad))),
    right: Math.min(WORLD.w, Math.max(...list.map((a) => a.cx + a.rx * pad))),
    top: Math.max(0, Math.min(...list.map((a) => a.cy - a.ry * pad))),
    bottom: Math.min(WORLD.h, Math.max(...list.map((a) => a.cy + a.ry * pad))),
  };
}

// その土地の、建てられるマスの数（広げる前に「どのくらい広いか」を見せるため）
export function landTilesOf(id) {
  if (id === 'main') return MAIN_KIND.filter((k) => k === 'land').length;
  const before = MAPS.get(MAP_KEY).kind;
  const ids = MAP_KEY.split('+');
  if (ids.includes(id)) return null;
  const key = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id) || a.id === id).map((a) => a.id).join('+');
  if (!MAPS.has(key)) MAPS.set(key, buildMap(key.split('+')));
  const after = MAPS.get(key).kind;
  let n = 0;
  for (let i = 0; i < after.length; i++) if (after[i] === 'land' && before[i] !== 'land') n += 1;
  return n;
}

// ---------------------------------------------------------------- 経路（道の上だけを歩く）

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
