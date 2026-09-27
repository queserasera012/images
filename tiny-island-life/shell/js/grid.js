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
  hospital: { w: 3, h: 2 }, // 病院（D349）
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
const MAIN_AREAS = [
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
  // 北東の入り江（D350）：北の丘の東。北の丘の道（7行目）を東へ延ばしてつなぐ。
  // 北の丘の道と海のあいだに 土地が1マスある（21列7行）。そこだけ ひらくときに道にする（link）。そのマスには はじめから何も建てられない
  // 本島の南は 港の桟橋と船の通り道があるので ひらかない
  {
    id: 'northeast', name: '北東の入り江', ph: 2.3, late: true, cost: 8000, unlock: 'expand4',
    cx: 29 * T, cy: 5.6 * T, rx: 5.6 * T, ry: 3.6 * T,
    neck: { cx: 23.2 * T, cy: 6.8 * T, rx: 2.2 * T, ry: 1.6 * T },
    roads: { rows: [[7, 22, 33]], cols: [[28, 3, 9]] },
    link: [[21, 7]],
    needs: 'north', // 北の丘の道からつなぐので、北の丘が先
  },
  // 本島を広げる 3周目（D359）：土地と土地のあいだに残った 海の切れこみを埋める（fill）。
  // どれも 今ある道の端から道を延ばしてつなぐ。今ある土地のマスは1つも変えない（東の入り江の つなぎの1マスだけ D350 と同じ link）。
  // needs が2つある土地は、両どなりが ひらいてから（道の両端・形の両側）
  {
    id: 'bay_w', name: '西の入り江', ph: 4.7, fill: true, late: true, cost: 12000, unlock: 'expand5',
    cx: 5.2 * T, cy: 14.9 * T, rx: 4.5 * T, ry: 2.8 * T,
    neck: { cx: 9.2 * T, cy: 14.3 * T, rx: 1.6 * T, ry: 2.1 * T },
    roads: { rows: [], cols: [[4, 13, 16]] }, // 北西の丘の道（12行目）と 西の森の道（17行目）を 縦につなぐ
    needs: ['northwest', 'west'],
  },
  {
    id: 'bay_nw', name: '北西の浜', ph: 1.9, fill: true, late: true, cost: 10000, unlock: 'expand5',
    cx: 9.4 * T, cy: 4 * T, rx: 3 * T, ry: 3 * T,
    neck: [{ cx: 10 * T, cy: 7.2 * T, rx: 1.6 * T, ry: 1.5 * T }, { cx: 9.9 * T, cy: 9.4 * T, rx: 1.6 * T, ry: 2.3 * T }],
    roads: { rows: [[7, 9, 10]], cols: [[10, 3, 7]] }, // 北西の丘の道（7行目）を東へ延ばして、北へ折れる
    needs: ['northwest', 'north'],
  },
  {
    id: 'bay_n', name: '北の浜', ph: 5.6, fill: true, late: true, cost: 10000, unlock: 'expand5',
    cx: 24.2 * T, cy: 2.7 * T, rx: 3.7 * T, ry: 2.4 * T,
    neck: [{ cx: 28 * T, cy: 2.4 * T, rx: 1.8 * T, ry: 1.6 * T }, { cx: 22.5 * T, cy: 4.4 * T, rx: 1.6 * T, ry: 2.3 * T }],
    roads: { rows: [[1, 21, 28]], cols: [[28, 1, 2]] }, // 北東の入り江の道（28列）を北の端から 浜ぞいに西へ（下に3マスの区画が残る）
    needs: ['northeast'],
  },
  {
    id: 'bay_e', name: '東の入り江', ph: 0.9, fill: true, late: true, cost: 12000, unlock: 'expand5',
    cx: 28.6 * T, cy: 9.9 * T, rx: 5.8 * T, ry: 2.3 * T,
    neck: { cx: 23 * T, cy: 9.5 * T, rx: 2.8 * T, ry: 2.8 * T },
    roads: { rows: [[10, 23, 28]], cols: [[28, 8, 10]] }, // 北東の入り江の道（28列）を南へ延ばして、東の岬の道（12行目）までつなぐ
    link: [[28, 11]],
    needs: ['northeast', 'east'],
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
// neck は2つ以上のこともある（D359：切れこみの すみまで埋める）
// シェルの島（2つ目の本島・D336〜D354）。本島とは別の島なので、同じ格子の上に 別の地図として持つ。
// 土地の呼び名は本島と同じ 'main'（桟橋・港・引っ越してくる人のしくみを そのまま使うため）
const SX = 16; // シェルの島の左上のマス
const SY = 7;
const SHELL_COLS = 15;
const SHELL_ROWS = 17;
const SHELL_AREAS = [
  {
    id: 'main', name: 'シェルの島', ph: 1.7,
    cx: (SX + SHELL_COLS / 2) * T, cy: (SY + SHELL_ROWS / 2) * T,
    rx: (SHELL_COLS / 2) * T - 14, ry: (SHELL_ROWS / 2) * T - 16,
    pier: { col: SX + 7, dir: [0, 1] },
  },
];
// オーロラの島（北欧・常冬・D365〜D366）。シェルの島と同じく 同じ格子の上の別の地図。
// 本島の冬（雪）と見分けがつくよう、形で違える：入り組んだ海岸（フィヨルド）。fjords は 切れこみの向き（a）・幅（w）・深さ（d）
const AX = 15; // オーロラの島の左上のマス
const AY = 9;
const AURORA_COLS = 17;
const AURORA_ROWS = 15;
const AURORA_AREAS = [
  {
    id: 'main', name: 'オーロラの島', ph: 4.3,
    cx: (AX + AURORA_COLS / 2) * T, cy: (AY + AURORA_ROWS / 2) * T,
    rx: (AURORA_COLS / 2) * T - 12, ry: (AURORA_ROWS / 2) * T - 14,
    pier: { col: AX + 8, dir: [0, 1] },
    fjords: [
      { a: -2.8, w: 0.09, d: 0.3 }, // 西（1本目と2本目の横の道のあいだ）
      { a: 0.2, w: 0.08, d: 0.27 }, // 東
      { a: -1.35, w: 0.08, d: 0.24 }, // 北
      { a: 2.35, w: 0.07, d: 0.2 }, // 南西
    ],
  },
];

// いま動かしている島の土地。useAreas で島ごとに切り替える（ES モジュールの let は、読み込んだ側にも切り替えが見える）
export let ISLE = 'main';
export let AREAS = MAIN_AREAS;
export const shapesOf = (area) => [area, ...[].concat(area.neck || []).map((n, k) => ({ ...n, ph: area.ph + 0.7 * (k + 1) }))];
export const areaById = (id) => AREAS.find((a) => a.id === id);
export let MAIN = AREAS[0];

// 前の版の書き出し（本島だけ）との互換のため
export const ISLAND = { cx: MAIN_AREAS[0].cx, cy: MAIN_AREAS[0].cy, rx: MAIN_AREAS[0].rx, ry: MAIN_AREAS[0].ry };
export function islandRadius(a, ph = 0) {
  return 1 + 0.035 * Math.sin(3 * a + 1 + ph) + 0.022 * Math.sin(5 * a + 2 + ph * 2) + 0.012 * Math.sin(9 * a + ph * 3);
}
// その土地の岸までの遠さ（向き a）。フィヨルドのある土地（オーロラの島）は、そこだけ細く深く切れこむ
export function edgeRadius(area, a) {
  let f = islandRadius(a, area.ph);
  for (const j of area.fjords || []) {
    const d = Math.atan2(Math.sin(a - j.a), Math.cos(a - j.a));
    f -= j.d * Math.exp(-((d / j.w) ** 2));
  }
  return f;
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
  return Math.hypot(dx / area.rx, dy / area.ry) / edgeRadius(area, a);
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

// 島の芯（本島は前の版と1マスも違わない作り方。位置だけ OX, OY ずらす）。
// ox, oy：左上のマス。roadCols / roadRows：道の線（島の左上から数える）。
// sideCols：横の道のあいだだけ通す縦の脇道。pierCol：南の桟橋へ延ばす道の列
function coreKind({ area, ox, oy, cols, rows, roadCols, roadRows, sideCols, pierCol }) {
  const kind = new Array(COLS * ROWS).fill('sea');
  const at = (c, r) => idx(ox + c, oy + r);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const f = tileFactor(area, ox + c, oy + r);
      let k = f > 1 ? 'sea' : f > 0.86 ? 'beach' : 'land';
      const onLine = roadCols.includes(c) || roadRows.includes(r);
      // 横の道は島の端まで、縦の脇道（本島は4列目・12列目）は横の道のあいだだけ
      const sideCol = sideCols.includes(c) && (r < roadRows[0] || r > roadRows[roadRows.length - 1]);
      if (k === 'land' && onLine && !sideCol) k = 'road';
      kind[at(c, r)] = k;
    }
  }
  // 南の桟橋：中央の道を浜まで延ばす（新しい住民はここから来る）
  for (let r = rows - 1; r >= 0; r--) {
    const i = at(pierCol, r);
    if (kind[i] === 'road') break;
    if (kind[i] === 'beach') kind[i] = 'road';
  }
  // 行き止まりの短い切れ端（1マスだけ飛び出した道）は土地に戻す
  const inside = (i) => colOf(i) >= ox && colOf(i) < ox + cols && rowOf(i) >= oy && rowOf(i) < oy + rows;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < kind.length; i++) {
      if (kind[i] !== 'road') continue;
      const n = neighbors(i).filter((j) => inside(j) && kind[j] === 'road').length;
      if (n === 0) kind[i] = 'land';
    }
  }
  let pier = null;
  for (let r = ROWS - 1; r >= 0 && pier === null; r--) if (kind[idx(ox + pierCol, r)] === 'road') pier = idx(ox + pierCol, r);
  return { kind, pier };
}

const MAIN_CORE = coreKind({
  area: MAIN_AREAS[0], ox: OX, oy: OY, cols: MAIN_COLS, rows: MAIN_ROWS,
  roadCols: MAIN_ROAD_COLS, roadRows: MAIN_ROAD_ROWS, sideCols: [4, 12], pierCol: 8,
});
// シェルの島は本島より小さい（15×17）。道は本島と同じ4マスおき
const SHELL_CORE = coreKind({
  area: SHELL_AREAS[0], ox: SX, oy: SY, cols: SHELL_COLS, rows: SHELL_ROWS,
  roadCols: [3, 7, 11], roadRows: [4, 8, 12], sideCols: [3, 11], pierCol: 7,
});
// オーロラの島は横に長い（17×15）
const AURORA_CORE = coreKind({
  area: AURORA_AREAS[0], ox: AX, oy: AY, cols: AURORA_COLS, rows: AURORA_ROWS,
  roadCols: [4, 8, 12], roadRows: [3, 7, 11], sideCols: [4, 12], pierCol: 8,
});

// 島ごとの下敷き。BASE はいま動かしている島（useAreas で切り替える）
const ISLES = {
  main: { areas: MAIN_AREAS, kind: MAIN_CORE.kind, pier: MAIN_CORE.pier },
  shell: { areas: SHELL_AREAS, kind: SHELL_CORE.kind, pier: SHELL_CORE.pier, mid: { c: SX + 7, r: SY + 8 } },
  aurora: { areas: AURORA_AREAS, kind: AURORA_CORE.kind, pier: AURORA_CORE.pier, mid: { c: AX + 8, r: AY + 7 } },
};
export const ISLE_IDS = Object.keys(ISLES);
let BASE = ISLES.main;
const MAIN_KIND = BASE.kind;
const MAIN_PIER = BASE.pier;

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
  // つなぎのマス（link・D350）：今ある土地を1マスだけ道にする。そのマスは はじめから建てられない（LINK_TILES）
  for (const a of late) for (const [c, r] of a.link || []) {
    kind[idx(c, r)] = 'road';
    added.add(idx(c, r));
  }
  // 本島の道とつながらない道は土地に（決めた道なので ふつうは起きない）
  const reach = new Set([BASE.pier]);
  const queue = [BASE.pier];
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
  const kind = BASE.kind.slice();
  const piers = { main: BASE.pier };
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
  const reach = new Set([BASE.pier]);
  const queue = [BASE.pier];
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
// 地図の名前（MAP_KEY）は 本島なら「main+north」、シェルの島なら「shell:main」、オーロラの島なら「aurora:main」。島が違えば名前も違う
const MAPS = new Map();
export let MAP_KEY = 'main';
export let MAP = MAIN_KIND;
export let PIER = MAIN_PIER; // 島の桟橋（新しい住民が現れる場所）
export let PIERS = { main: MAIN_PIER };
export let BRIDGES = new Set(); // 橋のマス（海の上の道）
let MAP_IDS = ['main'];
let pathCache = new Map();
const pathCaches = new Map([['main', pathCache]]);
const keyOf = (ids) => (ISLE === 'main' ? '' : `${ISLE}:`) + ids.join('+');

// isle：どの島か（'main'＝本島・'shell'＝シェルの島・'aurora'＝オーロラの島）。島が変わると 土地の一覧（AREAS）ごと切り替わる
export function useAreas(ids = ['main'], isle = 'main') {
  if (isle !== ISLE) {
    ISLE = isle;
    BASE = ISLES[isle];
    AREAS = BASE.areas;
    MAIN = AREAS[0];
    LINK_TILES = linkTiles();
  }
  const list = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id)).map((a) => a.id);
  const key = keyOf(list);
  if (key === MAP_KEY) return;
  if (!MAPS.has(key)) MAPS.set(key, buildMap(list));
  const m = MAPS.get(key);
  MAP_KEY = key;
  MAP_IDS = list;
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

// ---------------------------------------------------------------- 片付け（海の向こうの島・D354）
// 島は まんなかの縦と横の道で 4つの区画に分かれる（0 北西・1 北東・2 南西・3 南東）。
// 片付いていない区画の土地（COVERED）には 何も建たない。道は はじめから通れる
export const PLOT_NAMES = ['北西', '北東', '南西', '南東'];
export function plotOf(c, r) {
  const mid = BASE.mid;
  if (!mid) return null;
  return (r > mid.r ? 2 : 0) + (c > mid.c ? 1 : 0);
}
export let COVERED = new Set();
export let COVER_KEY = '';
const covers = new Map();
// debris：区画ごとに まだ覆われているか（[true, true, false, true] など）。本島は無し
export function useCover(debris = []) {
  const key = debris.some(Boolean) ? `${MAP_KEY}|${debris.map(Number).join('')}` : '';
  if (key === COVER_KEY) return;
  COVER_KEY = key;
  if (!key) {
    COVERED = new Set();
    return;
  }
  if (!covers.has(key)) {
    const set = new Set();
    for (let i = 0; i < MAP.length; i++) if (MAP[i] === 'land' && debris[plotOf(colOf(i), rowOf(i))]) set.add(i);
    covers.set(key, set);
  }
  COVERED = covers.get(key);
}
// その区画の土地のマス数（片付けると 建てられる土地になる）
export const plotLand = (n) => MAP.reduce((s, k, i) => s + (k === 'land' && plotOf(colOf(i), rowOf(i)) === n ? 1 : 0), 0);

// そのマスは どの土地か（本島 or 広げた土地）。住民の一覧で「東の岬の家」のように呼ぶため
export function areaAt(c, r) {
  const k = BASE.kind[idx(c, r)];
  if (k === 'land' || k === 'road') return 'main';
  // 橋の向こうの島（広げたふもとも、同じ島として呼ぶ・D321）
  for (const a of AREAS) if (a.island && shapesOf(a).some((sh) => tileFactor(sh, c, r) <= 1)) return a.parent || a.id;
  // 切れこみを埋めた土地（fill・D359）は あとから。今ある土地のマスの呼び名（「北の丘の家」）を変えない
  let best = 'main';
  let bestF = Infinity;
  for (const a of [...AREAS.filter((x) => !x.fill), ...AREAS.filter((x) => x.fill)]) {
    if (a.id === 'main' || (a.fill && bestF <= 1)) continue;
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
  if (id === 'main') return BASE.kind.filter((k) => k === 'land').length;
  const before = MAPS.get(MAP_KEY).kind;
  const ids = MAP_IDS;
  if (ids.includes(id)) return null;
  const list = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id) || a.id === id).map((a) => a.id);
  const key = keyOf(list);
  if (!MAPS.has(key)) MAPS.set(key, buildMap(list));
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
// あとから道にする つなぎのマス（D350）。はじめから建てられない
const linkTiles = () => new Set(AREAS.flatMap((a) => (a.link || []).map(([c, r]) => idx(c, r))));
export let LINK_TILES = linkTiles();

export function canPlace(type, c, r, buildings) {
  const s = SIZES[type];
  if (!inBounds(c, r) || !inBounds(c + s.w - 1, r + s.h - 1)) return false;
  const used = occupied(buildings);
  for (const t of footprint(type, c, r)) {
    if (MAP[t] !== 'land' || used.has(t) || LINK_TILES.has(t) || COVERED.has(t)) return false;
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
