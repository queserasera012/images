// 島の地図（格子）。描画とシミュレーションの両方が使う。DOM には触らない。
//
// 下敷きは碁盤の目。ただし道は島の形で切れる（D289・オーナー承認）。
// 島は広げられる（D298）：本島のまわりに 北の丘・東の岬・西の森 をつなげる。
// 地図は「ひらいた土地」の組み合わせで決まる。組み合わせごとに一度だけ作って使い回す。
//
// 🔑 広げても本島のマスは1つも変えない（家の前の空き地に いきなり道が通ったりしない）。
//    新しい道は、新しく陸になったマスにだけ通す。
// 海の向こうの「山の島」は、橋でつなぐ別の島（D318）。地図を東と南に広げて置いた（34×31 → 48×33）

export const T = 30; // 1マスの大きさ（論理座標）
export const COLS = 48;
export const ROWS = 33;
export const OLD_COLS_2 = 34; // 山の島の前の地図の幅（セーブを移すため）
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
  ski: { w: 2, h: 2 }, // スキー場のロッジ（山の島だけ・D318）。滑る人は山の上に描く
  company: { w: 3, h: 2 }, // 会社（D319）
  aquarium: { w: 3, h: 3 }, // 水族館（D319）
  pool: { w: 3, h: 2 }, // プール（夏だけ・D319）。泳ぐ人が見える
  track: { w: 3, h: 3 }, // ドッグレース場（D328）。まわりに観客が立つ
  arcade: { w: 3, h: 2 }, // ゲームセンター（D331）
  school: { w: 3, h: 2 }, // 小学校（D347）
  college: { w: 3, h: 3 }, // 大学（D347）
  // 飾り（D334）
  flowerbed: { w: 1, h: 1 },
  bench: { w: 1, h: 1 },
  streetlamp: { w: 1, h: 1 },
  fountain: { w: 2, h: 2 },
  clocktower: { w: 1, h: 1 },
};
// 飾り（D334）：道に面していなくても置ける（使っていない土地の使い道にもなる）
export const DECO = ['flowerbed', 'bench', 'streetlamp', 'fountain', 'clocktower'];

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
  // 山の島（D318）：本島の南東の海の向こう。橋でつなぐ。港は無い。まんなかに山（建てられない。冬はスキー場）
  {
    id: 'mountain', name: '山の島', ph: 3.3, island: true, cx: 37 * T, cy: 25.6 * T, rx: 7 * T, ry: 6.2 * T,
    mountain: { cx: 38 * T, cy: 23.2 * T, rx: 3.4 * T, ry: 2.5 * T },
    bridgeRow: 26,
    // 道は碁盤の目から作らず、ここで決める（山をぐるりと回る。行き止まりの切れ端を作らない）
    // [行, 始めの列, 終わりの列] / [列, 始めの行, 終わりの行]
    roads: { rows: [[26, 30, 43], [29, 34, 40]], cols: [[32, 21, 26], [34, 26, 29], [40, 26, 29], [42, 22, 26]] },
  },
  // 本島を広げる 2周目（D329）：北西の丘・南西の浜。本島の横の道（12行目・26行目）の西の端から浜を通してつなぐ。
  // 今ある土地のマスは1つも変えない（late）。区画は3マス以上（3×3の施設が建つ）
  {
    id: 'northwest', name: '北西の丘', ph: 3.9, late: true, cost: 10000, unlock: 'expand3',
    cx: 5 * T, cy: 8 * T, rx: 4.8 * T, ry: 5.7 * T,
    neck: { cx: 8.6 * T, cy: 11.6 * T, rx: 2.4 * T, ry: 1.8 * T },
    roads: { rows: [[12, 1, 10], [7, 1, 8]], cols: [[5, 3, 12]] },
  },
  {
    id: 'southwest', name: '南西の浜', ph: 0.6, late: true, cost: 6000, unlock: 'expand2',
    cx: 5.4 * T, cy: 29.7 * T, rx: 5.4 * T, ry: 3 * T,
    neck: { cx: 9.4 * T, cy: 27.3 * T, rx: 2.2 * T, ry: 1.5 * T },
    roads: { rows: [[26, 6, 10], [30, 1, 10]], cols: [[8, 26, 30]] },
  },
  // 山の島を広げる（D321）：北東のふもと。山の島の東の道（42列）を北へ延ばしてつなぐ。
  // 山の島には3×3のカフェが建つ場所が無かった（冬のスキー客のカフェが要るのに）
  {
    id: 'mountain_ne', name: '山の島', parent: 'mountain', island: true, ph: 5.1,
    cx: 42.2 * T, cy: 16.4 * T, rx: 4.6 * T, ry: 4.8 * T,
    neck: { cx: 42.4 * T, cy: 20.6 * T, rx: 3 * T, ry: 2.6 * T },
    roads: { rows: [[15, 38, 46], [19, 39, 45]], cols: [[42, 12, 22]] }, // 3×3 のカフェが建つように、区画を3マス幅にする
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

// 山のマス（建てられない・道も通らない）
const MOUNTAIN_EDGE = 1.08; // 絵の山より少し広く（ふもとの家が 山に めり込まないように）
export function isMountainTile(c, r) {
  return AREAS.some((a) => a.mountain && tileFactor({ ...a.mountain, ph: a.ph }, c, r) <= MOUNTAIN_EDGE);
}

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

// あとから足す土地（late・D329）：今ある地図（ほかの土地）を1マスも変えずに、海と浜の上にだけ重ねる。
// 道は決めてあり（roads）、今ある道の端の となりの浜から つなぐ
function buildMap(ids) {
  const late = AREAS.filter((a) => a.late && ids.includes(a.id));
  const m = buildBase(ids.filter((id) => !late.some((a) => a.id === id)));
  if (!late.length) return m;
  const kind = m.kind.slice();
  const added = new Set();
  for (const a of late) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = idx(c, r);
        if (kind[i] !== 'sea' && kind[i] !== 'beach') continue;
        const f = Math.min(...shapesOf(a).map((sh) => tileFactor(sh, c, r)));
        if (f > 1) continue;
        const onLine = a.roads.rows.some(([rr, c0, c1]) => r === rr && c >= c0 && c <= c1) || a.roads.cols.some(([cc, r0, r1]) => c === cc && r >= r0 && r <= r1);
        kind[i] = onLine ? 'road' : f > 0.86 ? 'beach' : 'land';
        if (kind[i] !== 'beach') added.add(i);
      }
    }
  }
  // 本島の道とつながらない道は土地に（決めた道なので ふつうは起きない）
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
  for (const i of added) if (kind[i] === 'road' && !reach.has(i)) kind[i] = 'land';
  return { kind, piers: m.piers, bridges: m.bridges };
}

function buildBase(ids) {
  const areas = AREAS.filter((a) => a.id !== 'main' && ids.includes(a.id));
  const kind = MAIN_KIND.slice();
  const piers = { main: MAIN_PIER };
  const bridges = new Set();
  if (!areas.length) return { kind, piers, bridges };
  const fresh = new Set(); // 新しく陸になったマス
  const planned = new Set(); // 道を決めてある島のマス（行き止まりでも消さない）
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
      if (isMountainTile(c, r)) {
        kind[i] = 'mountain';
        continue;
      }
      const isle = areas.find((a) => a.roads && shapesOf(a).some((sh) => tileFactor(sh, c, r) <= 1));
      const onLine = isle
        ? isle.roads.rows.some(([rr, c0, c1]) => r === rr && c >= c0 && c <= c1) || isle.roads.cols.some(([cc, r0, r1]) => c === cc && r >= r0 && r <= r1)
        : ROAD_COLS.includes(c) || ROAD_ROWS.includes(r);
      kind[i] = onLine ? 'road' : 'land';
      fresh.add(i);
      if (isle) planned.add(i);
    }
  }
  // 橋（D318）：本島の横の道の東の端から、海をわたって島の道まで
  for (const a of areas) {
    if (!a.bridgeRow) continue;
    const r = a.bridgeRow;
    let c = OX + MAIN_COLS - 1;
    while (c > OX && MAIN_KIND[idx(c, r)] !== 'road') c -= 1;
    const span = [];
    for (c += 1; c < COLS; c++) {
      const i = idx(c, r);
      if (kind[i] === 'road' && fresh.has(i)) break;
      span.push(i);
    }
    for (const i of span) {
      if (kind[i] === 'sea') bridges.add(i);
      kind[i] = 'road';
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
    const ends = [...fresh].filter((i) => !planned.has(i) && kind[i] === 'road' && neighbors(i).filter((j) => kind[j] === 'road').length <= 1);
    for (const i of ends) kind[i] = 'land';
  }
  // 港の桟橋：線の上の いちばん外側の道から、浜を海まで延ばす
  for (const a of areas) {
    if (!a.pier) continue;
    const [dc, dr] = a.pier.dir;
    const line = [];
    if (a.pier.col !== undefined) for (let r = 0; r < ROWS; r++) line.push(idx(a.pier.col, r));
    else for (let c = 0; c < COLS; c++) line.push(idx(c, a.pier.row));
    if (dc + dr < 0) line.reverse();
    // 進む向きで いちばん先の道（その土地の中。D321：同じ線の上の ほかの土地の道を拾わない）
    const own = (i) => shapesOf(a).some((sh) => tileFactor(sh, colOf(i), rowOf(i)) <= 1);
    let start = null;
    for (const i of line) if (kind[i] === 'road' && fresh.has(i) && own(i)) start = i;
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
  return { kind, piers, bridges };
}

// いまの地図。useAreas で切り替える（ES モジュールの let は、読み込んだ側にも切り替えが見える）
const MAPS = new Map();
export let MAP_KEY = 'main';
export let MAP = MAIN_KIND;
export let PIER = MAIN_PIER; // 本島の桟橋（新しい住民が現れる場所）
export let PIERS = { main: MAIN_PIER };
export let BRIDGES = new Set(); // 橋のマス（海の上の道）
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
  BRIDGES = m.bridges;
  if (!pathCaches.has(key)) pathCaches.set(key, new Map());
  pathCache = pathCaches.get(key);
}
useAreas(['main']);
MAPS.set('main', { kind: MAIN_KIND, piers: { main: MAIN_PIER }, bridges: new Set() });

export const isRoad = (i) => MAP[i] === 'road';

// そのマスは どの土地か（本島 or 広げた土地）。住民の一覧で「東の岬の家」のように呼ぶため
export function areaAt(c, r) {
  const k = MAIN_KIND[idx(c, r)];
  if (k === 'land' || k === 'road') return 'main';
  // 橋の向こうの島（広げたふもとも、同じ島として呼ぶ・D321）
  for (const a of AREAS) if (a.island && shapesOf(a).some((sh) => tileFactor(sh, c, r) <= 1)) return a.parent || a.id;
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

// そこが陸（または山）か（px）。まだひらいていない土地も陸とみなす（船がその上を通らないように・D322）
export function onLand(x, y, grow = 1.02) {
  for (const a of AREAS) {
    if (shapesOf(a).some((sh) => edgeFactor(sh, x, y) <= grow)) return true;
    const m = a.mountain;
    if (m) {
      // 絵の山は島の上に はみ出す（頂上は ふもとから ry×2.3 上）
      const foot = m.cy + m.ry * 0.75;
      if (x >= m.cx - m.rx && x <= m.cx + m.rx && y >= foot - m.ry * 2.3 - 12 && y <= foot) return true;
    }
  }
  return false;
}

// 船の通り道（D322）：桟橋の先に着く場所（dock）と、沖から来るところ（from）。
// はじめは沖から斜めに来る。その線が陸（まだひらいていない土地・山も）にかかるなら、かからない向きを選ぶ。
// side：1＝いつもの船、-1＝臨時の船（桟橋の反対側に着く）
const routes = new Map();
export function boatRoute(id, side = 1) {
  const key = `${MAP_KEY}|${id}|${side}`;
  if (routes.has(key)) return routes.get(key);
  const pier = center(PIERS[id]);
  const [dx, dy] = areaById(id).pier.dir;
  const [px, py] = dx ? [0, side] : [side, 0];
  const dock = { x: pier.x + dx * 46 + px * 34, y: pier.y + dy * 46 + py * 34 };
  const base = Math.atan2(dy, dx);
  const toward = Math.sign(Math.sin(Math.atan2(py, px) - base)) || 1; // 船が着く側へ回す
  const clear = (v) => {
    for (let t = 0.3; t <= 1.0001; t += 0.05) {
      const x = dock.x + v.x * t;
      const y = dock.y + v.y * t;
      for (const hx of [-24, 0, 24]) for (const hy of [-14, 8]) if (onLand(x + hx, y + hy)) return false;
    }
    return true;
  };
  let v = null;
  for (const deg of [31, 0, -31, 50, -50, 70, -70]) {
    for (const len of [175, 130]) {
      const a = base + (toward * deg * Math.PI) / 180;
      const cand = { x: Math.cos(a) * len, y: Math.sin(a) * len };
      if (clear(cand)) {
        v = cand;
        break;
      }
    }
    if (v) break;
  }
  v ||= { x: dx * 150 + px * 90, y: dy * 150 + py * 90 };
  const route = { dock, from: { x: dock.x + v.x, y: dock.y + v.y }, clear: clear(v) };
  routes.set(key, route);
  return route;
}

// ひらいた土地が収まる範囲（px）。カメラが動ける範囲と、地面の絵の大きさに使う
// teaser：まだ橋をかけていない島も入れる（海の向こうに見えるように・D317）
export function landBounds(ids = ['main'], { teaser = false } = {}) {
  const list = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id) || (teaser && a.island && (!a.parent || ids.includes(a.parent))));
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
  const key = a * 100000 + b;
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

// その土地にしか建てられない建物（スキー場は山の島だけ・D318）
export const ONLY_ON = { ski: 'mountain' };

// その場所に建てられるか
export function canPlace(type, c, r, buildings) {
  const s = SIZES[type];
  if (!inBounds(c, r) || !inBounds(c + s.w - 1, r + s.h - 1)) return false;
  const used = occupied(buildings);
  for (const t of footprint(type, c, r)) {
    if (MAP[t] !== 'land' || used.has(t)) return false;
    if (ONLY_ON[type] && areaAt(colOf(t), rowOf(t)) !== ONLY_ON[type]) return false;
  }
  return DECO.includes(type) || accessTile(type, c, r) !== null;
}

// 建てられる場所の一覧（左上のマス）
export function placements(type, buildings) {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canPlace(type, c, r, buildings)) out.push({ c, r });
  return out;
}
