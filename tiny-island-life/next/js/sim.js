// 島のシミュレーション。DOM にも描画にも触らない（node のテストから直接 呼べる）。
//
// 🔑 シミュレーションは1本だけ（D281）。
// 画面を開いているあいだも、留守のあいだも、同じ tick() を回す。
// 描画は state を読んで絵を置くだけ。画面の NPC は「この状態を演じる役」。
//
// 港と観光客（D292）：住民が7人になると船が来る。観光客は住民と同じ tick で動く（住民の数には入れない）。
// 格子版（D289）：住民は道のマスの上だけを歩く。建物はプレイヤーが場所を選んで建てる。
// 遠いカフェには行きにくい → 「どこに建てるか」が判断になる（v0.3 の Location Problem）。

import { CONFIG } from './config.js';
import { T, SIZES, MAP, PIER, center, roadPath, roadDistance, accessTile, canPlace, isRoad, idx } from './grid.js';

const DAY = 1440;

// 島にやってくる住民の候補（先頭5人が最初の住民）
const RESIDENT_POOL = [
  { name: 'ユウタ', prefs: { cafe: 30, park: 6, stroll: 12 }, coffee: 0.9 },
  { name: 'アヤ', prefs: { cafe: 14, park: 30, stroll: 10 }, coffee: 0.6 },
  { name: 'ケンジ', prefs: { cafe: 22, park: 10, stroll: 20 }, coffee: 0.9 },
  { name: 'ミナ', prefs: { cafe: 10, park: 34, stroll: 16 }, coffee: 0.5 },
  { name: 'ソラ', prefs: { cafe: 14, park: 24, stroll: 24 }, coffee: 0.7 },
  { name: 'ハルカ', prefs: { cafe: 24, park: 20, stroll: 8 }, coffee: 0.8 },
  { name: 'ダイチ', prefs: { cafe: 18, park: 14, stroll: 26 }, coffee: 0.7 },
  { name: 'リコ', prefs: { cafe: 28, park: 12, stroll: 14 }, coffee: 0.6 },
  { name: 'タロウ', prefs: { cafe: 16, park: 28, stroll: 10 }, coffee: 0.9 },
  { name: 'ノゾミ', prefs: { cafe: 8, park: 36, stroll: 20 }, coffee: 0.3 },
];

// 最初の島（左上のマス）
const START = [
  { type: 'house', c: 3, r: 7 },
  { type: 'house', c: 3, r: 9 },
  { type: 'park', c: 9, r: 7 },
  { type: 'cafe', c: 5, r: 8 },
];

const ROAD_TILES = MAP.map((k, i) => (k === 'road' ? i : -1)).filter((i) => i >= 0);

export const WEATHER_LABEL = { sunny: '晴れ', cloudy: 'くもり', rain: '雨' };

// ---------------------------------------------------------------- 乱数（state に持つので再現できる）

export function rand(state) {
  let t = (state.rng += 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (state, a, b) => a + (b - a) * rand(state);
const pick = (state, arr) => arr[Math.floor(rand(state) * arr.length)];

// ---------------------------------------------------------------- 時刻

export const dayOf = (t) => Math.floor(t / DAY) + 1;
export const inDay = (t) => ((t % DAY) + DAY) % DAY;
export const clockOf = (t) => (inDay(t) + CONFIG.dayStartClock) % DAY;
const clockToInDay = (clock) => (clock - CONFIG.dayStartClock + DAY) % DAY;

export function formatClock(t) {
  const c = Math.floor(clockOf(t));
  return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
}

export function timeBucket(clock) {
  if (clock < 10 * 60) return '朝';
  if (clock < 16 * 60) return '昼';
  if (clock < 20 * 60) return '夕方';
  return '夜';
}

export function isNight(t) {
  const c = clockOf(t);
  return c >= 22 * 60 || c < 6 * 60;
}

// 留守から戻ったときに進めてよい上限＝次の日の 07:00
export function nextMorning(t) {
  return dayOf(t) * DAY + clockToInDay(CONFIG.morningClock);
}

// ---------------------------------------------------------------- 建物

// 住民と観光客をまとめて（動かす・席や列で探す）
export const everyone = (state) => (state.visitors?.length ? state.residents.concat(state.visitors) : state.residents);
export const personById = (state, id) => state.residents.find((r) => r.id === id) || state.visitors?.find((r) => r.id === id);

// 席と列のある施設（カフェ・スーパー・プラネタリウム）。同じ仕組みで動く（D295）
export const VENUE_TYPES = ['cafe', 'super', 'planetarium'];
export const VENUE_NAME = { cafe: 'カフェ', super: 'スーパー', planetarium: 'プラネタリウム' };
export const isVenue = (b) => VENUE_TYPES.includes(b.type);
export const venues = (state) => state.buildings.filter(isVenue);
export const ofType = (state, type) => state.buildings.filter((b) => b.type === type);
export const cafes = (state) => ofType(state, 'cafe');
export const houses = (state) => state.buildings.filter((b) => b.type === 'house');
export const shops = (state) => state.buildings.filter((b) => b.type === 'shop');
export const parkOf = (state) => state.buildings.find((b) => b.type === 'park');
export const buildingById = (state, id) => state.buildings.find((b) => b.id === id);

function makeBuilding(state, type, c, r) {
  const b = { id: `b${state.nextId++}`, type, c, r, access: accessTile(type, c, r) };
  if (VENUE_TYPES.includes(type)) Object.assign(b, { level: 1, seats: new Array(CONFIG[type].levels[0].seats).fill(null), queue: [] });
  if (type === 'park') b.roof = false;
  if (type === 'shop') Object.assign(b, { level: 1, stock: CONFIG.shop.levels[0].stock });
  return b;
}

// 建物の中の点（描画と同じ場所）
export function houseDoor(h) {
  return { x: h.c * T + T / 2, y: h.r * T + T - 4 };
}

export function seatPositions(cafe) {
  const x0 = cafe.c * T;
  const y0 = (cafe.r + 1) * T;
  const w = SIZES.cafe.w * T;
  const pos = [];
  for (const row of [0, 1]) for (const k of [0, 1, 2, 3]) pos.push({ x: x0 + (w * (2 * k + 1)) / 8 - 5, y: y0 + 30 + row * 23 });
  // 前の列の真ん中から埋める
  return [pos[1], pos[2], pos[0], pos[5], pos[6], pos[3], pos[4], pos[7]];
}

// 待ち列：出入り口の道の歩道を、左へ（道が縦なら上へ）並ぶ
export function queueSlot(cafe, i) {
  const a = center(cafe.access);
  const horizontal = isRoad(cafe.access - 1) || isRoad(cafe.access + 1);
  return horizontal ? { x: a.x - 28 - i * 13, y: a.y - 6 } : { x: a.x + 8, y: a.y - 28 - i * 13 };
}

// お土産屋の名前（2軒以上なら方角をつける）
export function shopLabel(state, shop) {
  const list = shops(state);
  if (list.length <= 1) return 'お土産屋';
  return `${cafeLabel0(shop)}のお土産屋`;
}

// 店先で お土産を見る場所
export function shopFront(shop, k = 0) {
  return { x: shop.c * T + 14 + (k % 3) * 16, y: (shop.r + 2) * T - 6 };
}

// 島の中心から見た方角で名前をつける（同じ種類が2軒以上のとき）
export function labelOf(state, b) {
  if (b.type === 'shop') return shopLabel(state, b);
  if (!isVenue(b)) return b.type;
  const list = ofType(state, b.type);
  const base = VENUE_NAME[b.type];
  if (list.length <= 1) return base;
  const dir = cafeLabel0(b);
  const same = list.filter((x) => x !== b && cafeLabel0(x) === dir);
  return same.length && list.indexOf(b) > list.indexOf(same[0]) ? `${dir}の${base}2` : `${dir}の${base}`;
}

export function cafeLabel(state, cafe) {
  if (cafe.type !== 'cafe') return labelOf(state, cafe);
  const list = cafes(state);
  if (list.length <= 1) return 'カフェ';
  const cx = cafe.c + 1;
  const cy = cafe.r + 1;
  const dx = cx - 8;
  const dy = cy - 12;
  const dir = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? '東' : '西') : dy > 0 ? '南' : '北';
  const same = list.filter((b) => b !== cafe && cafeLabel0(b) === dir);
  return same.length && list.indexOf(cafe) > list.indexOf(same[0]) ? `${dir}のカフェ2` : `${dir}のカフェ`;
}
function cafeLabel0(b) {
  const dx = b.c + 1 - 8;
  const dy = b.r + 1 - 12;
  return Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? '東' : '西') : dy > 0 ? '南' : '北';
}

// ---------------------------------------------------------------- 新しいゲーム

export function createGame(seed = Date.now()) {
  const state = {
    version: 2,
    seed,
    rng: seed | 0,
    t: clockToInDay(CONFIG.startClock),
    coin: CONFIG.startCoin,
    weather: 'sunny',
    buildings: [],
    residents: [],
    visitors: [],
    port: { open: false, today: [] },
    pets: [],
    petsSpawned: { cat: false, dog: false },
    unlocked: {},
    unlockedOn: {},
    poolIndex: 0,
    today: freshToday(),
    diary: [],
    history: [],
    nextId: 1,
  };
  for (const s of START) state.buildings.push(makeBuilding(state, s.type, s.c, s.r));
  for (let i = 0; i < CONFIG.startResidents; i++) addResident(state, { arriving: false });
  for (const r of state.residents) planDay(state, r);
  return state;
}

function freshToday() {
  return {
    served: 0, income: 0, lost: [], queueMinutes: { 朝: 0, 昼: 0, 夕方: 0, 夜: 0 }, maxQueue: 0, parkMinutes: {},
    boats: 0, tourists: 0, petWalk: {}, petNap: {}, shopSold: 0, shopIncome: 0, shopMissed: [],
    byType: {},
  };
}

// 古いセーブ（港が無かった頃）を今の形にそろえる
export function migrate(state) {
  state.visitors ||= [];
  state.port ||= { open: false, today: [] };
  state.today.boats ||= 0;
  state.today.tourists ||= 0;
  state.pets ||= [];
  state.petsSpawned ||= { cat: false, dog: false };
  state.today.petWalk ||= {};
  state.today.petNap ||= {};
  state.today.shopSold ||= 0;
  state.today.shopIncome ||= 0;
  state.today.shopMissed ||= [];
  state.today.byType ||= {};
  state.unlocked ||= {};
  state.unlockedOn ||= {};
  if (state.port.open) state.unlocked.port = true;
  for (const b of state.buildings) if (isVenue(b) && !b.queue) Object.assign(b, { seats: [], queue: [] });
  return state;
}

function vacancy(state) {
  return houses(state).length * CONFIG.houseCapacity - state.residents.length;
}

function freeHouse(state) {
  return houses(state).find((h) => state.residents.filter((r) => r.homeId === h.id).length < CONFIG.houseCapacity);
}

// 名前のある住民（10人）のあとは「島の人」が住む（v0.3 §16 の一般住民・D295）
function genericResident(state) {
  return {
    name: '島の人',
    generic: true,
    prefs: { cafe: between(state, 8, 28), park: between(state, 8, 30), stroll: between(state, 8, 26), fun: between(state, 6, 22) },
    coffee: between(state, 0.2, 0.9),
  };
}

function addResident(state, { arriving }) {
  if (state.residents.length >= CONFIG.maxPopulation) return null;
  const home = freeHouse(state);
  if (!home) return null;
  const base = RESIDENT_POOL[state.poolIndex] || genericResident(state);
  if (RESIDENT_POOL[state.poolIndex]) state.poolIndex += 1;
  const door = houseDoor(home);
  const r = {
    id: `r${state.nextId++}`,
    name: base.name,
    generic: !!base.generic,
    look: Math.floor(rand(state) * 1000),
    prefs: { fun: 12, ...base.prefs },
    coffee: base.coffee,
    homeId: home.id,
    patience: between(state, CONFIG.patienceMin, CONFIG.patienceMax),
    speed: between(state, 0.9, 1.1),
    lane: between(state, -5, 5),
    wake: 0,
    bed: 0,
    state: arriving ? 'PENDING' : 'SLEEP',
    arriveAt: 0,
    at: home.access,
    x: door.x,
    y: door.y,
    tx: door.x,
    ty: door.y,
    path: [],
    dest: null,
    destId: null,
    until: 0,
    seat: -1,
    queuedAt: 0,
    pauseUntil: 0,
    facing: 1,
    visible: false,
    morning: false,
    bubble: null,
    bubbleUntil: 0,
  };
  state.residents.push(r);
  return r;
}

// その日の起床・就寝をすこしずつずらす（毎日同じ動きにしない）
function planDay(state, r) {
  const base = Math.floor(state.t / DAY) * DAY;
  r.needShop = ofType(state, 'super').length > 0; // スーパーがあれば、毎日1回 買い物に行きたい
  r.visitedFun = false; // プラネタリウムも1日1回まで
  r.wake = base + clockToInDay(6 * 60 + 30) + between(state, 0, 35);
  r.bed = base + clockToInDay(21 * 60 + 30) + between(state, 0, 60);
}

// ---------------------------------------------------------------- 進める

// dt（ゲーム内の分）だけ進める。起きた出来事を返す。
export function step(state, dt) {
  const events = [];
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(1, remaining);
    tick(state, h, events);
    remaining -= h;
  }
  return events;
}

// 留守のあいだの分を進める。上限は「次の日の 07:00」まで（D281）
export function catchUp(state, gameMinutes) {
  const target = Math.min(state.t + gameMinutes, nextMorning(state.t));
  if (target <= state.t) return [];
  return step(state, target - state.t);
}

function tick(state, h, events) {
  const before = dayOf(state.t);
  state.t += h;
  if (dayOf(state.t) > before) rolloverDay(state, events);

  for (const r of everyone(state)) updateResident(state, r, h, events);
  for (const v of venues(state)) updateVenue(state, v, events);
  checkUnlocks(state, events);
  updatePort(state, events);
  spawnStrays(state, events);
  for (const pet of state.pets) updatePet(state, pet, h);

  const longest = Math.max(0, ...cafes(state).map((c) => c.queue.length));
  if (longest > 0) {
    state.today.queueMinutes[timeBucket(clockOf(state.t))] += h;
    state.today.maxQueue = Math.max(state.today.maxQueue, longest);
  }
}

// ---------------------------------------------------------------- 住民

function moveToward(state, r, h) {
  const dx = r.tx - r.x;
  const dy = r.ty - r.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) {
    r.x = r.tx;
    r.y = r.ty;
    return true;
  }
  if (state.t < r.pauseUntil) return false;
  // 「ちょこちょこ」: 歩いている途中で ときどき立ち止まる
  if (r.state === 'WALK' && rand(state) < 0.02 * h) {
    r.pauseUntil = state.t + between(state, 1, 3);
    return false;
  }
  const d = Math.min(dist, CONFIG.walkSpeed * r.speed * h);
  r.x += (dx / dist) * d;
  r.y += (dy / dist) * d;
  if (Math.abs(dx) > 0.5) r.facing = dx > 0 ? 1 : -1;
  return false;
}

// 道のマスをたどって目的地へ。最後に建物の中の点（席・家の戸口など）へ入る
function goTo(state, r, dest, destId, access, inner) {
  const tiles = roadPath(r.at, access) || [access];
  r.path = tiles.map((i) => {
    const p = center(i);
    return { x: p.x + r.lane, y: p.y + r.lane * 0.6 };
  });
  if (inner) r.path.push(inner);
  const first = r.path.shift();
  r.tx = first.x;
  r.ty = first.y;
  r.state = 'WALK';
  r.dest = dest;
  r.destId = destId;
  r.nextAt = access;
  r.visible = true;
}

function goHome(state, r) {
  if (r.tourist) return goBoat(state, r);
  const home = buildingById(state, r.homeId);
  goTo(state, r, 'home', home.id, home.access, houseDoor(home));
}

function parkPoint(state, park) {
  return {
    x: park.c * T + between(state, 16, SIZES.park.w * T - 16),
    y: park.r * T + between(state, 20, SIZES.park.h * T - 10),
  };
}

function venueOpen(state, type, margin = 0) {
  const c = clockOf(state.t);
  return c >= CONFIG[type].open && c < CONFIG[type].close - margin;
}
const cafeOpen = (state, margin = 0) => venueOpen(state, 'cafe', margin);

// 遠いところほど行きにくい（D289）
const near = (r, access) => 1 / (1 + roadDistance(r.at, access) / CONFIG.distanceHalf);

function cafeChoices(state, r) {
  if (!cafeOpen(state, 30)) return [];
  const w = CONFIG.weatherWeights[state.weather].cafe;
  return cafes(state).map((c) => ({ cafe: c, w: r.prefs.cafe * w * near(r, c.access) }));
}

// スーパー：住民だけ。1日1回。夕方に行きたくなる
function superChoices(state, r) {
  if (r.tourist || !r.needShop || !venueOpen(state, 'super', 20)) return [];
  const c = clockOf(state.t);
  const boost = c >= 16 * 60 && c < 19 * 60 + 30 ? CONFIG.super.eveningBoost : 1;
  return ofType(state, 'super').map((b) => ({ cafe: b, w: CONFIG.super.pull * boost * near(r, b.access) }));
}

// プラネタリウム：雨の日と夜に行きたくなる（屋内）
function planetariumChoices(state, r) {
  if (r.visitedFun || !venueOpen(state, 'planetarium', 45)) return [];
  const P = CONFIG.planetarium;
  const weather = state.weather === 'rain' ? P.rainBoost : state.weather === 'cloudy' ? 1.3 : 1;
  const night = clockOf(state.t) >= 18 * 60 ? P.nightBoost : 1;
  return ofType(state, 'planetarium').map((b) => ({ cafe: b, w: (r.prefs.fun ?? 12) * weather * night * near(r, b.access) }));
}

// お土産屋：行くのは観光客だけ。1人1回まで。遠い店ほど行きにくい（船の時間が限られているので）
function shopChoices(state, r) {
  if (!r.tourist || r.bought || r.visitedShop) return [];
  const c = clockOf(state.t);
  if (c < CONFIG.shop.open || c >= CONFIG.shop.close - 15) return [];
  return shops(state).map((b) => ({ shop: b, w: r.prefs.shop * near(r, b.access) }));
}

function goCafe(state, r, cafe) {
  goTo(state, r, 'cafe', cafe.id, cafe.access, queueSlot(cafe, 0));
}

function decideNext(state, r, { noCafe = false, avoid = null } = {}) {
  if (state.t >= r.bed - 20) return goHome(state, r);
  const w = CONFIG.weatherWeights[state.weather];
  const park = parkOf(state);
  let parkW = 0;
  if (park) {
    const mult = state.weather === 'rain' && park.roof ? CONFIG.rainParkWithRoof : w.park;
    parkW = r.prefs.park * mult * near(r, park.access);
  }
  const cafeList = [
    ...(noCafe || avoid === 'cafe' ? [] : cafeChoices(state, r)),
    ...(avoid === 'super' ? [] : superChoices(state, r)),
    ...(avoid === 'planetarium' ? [] : planetariumChoices(state, r)),
  ];
  const shopList = shopChoices(state, r);
  const shopW = shopList.reduce((s, x) => s + x.w, 0);
  const cafeW = cafeList.reduce((s, x) => s + x.w, 0);
  const strollW = r.prefs.stroll * w.stroll;
  const homeW = r.tourist ? 0 : 16 * w.home;
  let x = rand(state) * (cafeW + shopW + parkW + strollW + homeW);
  for (const c of cafeList) if ((x -= c.w) < 0) return goCafe(state, r, c.cafe);
  for (const c of shopList) if ((x -= c.w) < 0) return goTo(state, r, 'shop', c.shop.id, c.shop.access, shopFront(c.shop, Math.floor(rand(state) * 3)));
  if ((x -= parkW) < 0) return goTo(state, r, 'park', park.id, park.access, parkPoint(state, park));
  if ((x -= strollW) < 0) {
    // 近くの道をぶらぶら（遠くには行かない）
    const nearby = ROAD_TILES.filter((i) => roadDistance(r.at, i) <= 6);
    const target = pick(state, nearby.length ? nearby : ROAD_TILES);
    const p = center(target);
    return goTo(state, r, 'stroll', null, target, { x: p.x + between(state, -9, 9), y: p.y + between(state, -9, 9) });
  }
  return goHome(state, r);
}

function arrive(state, r, events) {
  r.at = r.nextAt;
  switch (r.dest) {
    case 'cafe':
      return enterCafe(state, r, buildingById(state, r.destId), events);
    case 'park': {
      r.state = 'PARK';
      const park = buildingById(state, r.destId);
      const rainNoRoof = state.weather === 'rain' && !park.roof;
      r.until = state.t + (rainNoRoof ? between(state, 8, 18) : between(state, CONFIG.park.stayMin, CONFIG.park.stayMax));
      return;
    }
    case 'stroll':
      r.state = 'STROLL';
      r.until = state.t + between(state, 4, 14);
      return;
    case 'boat':
      r.state = 'BOARDED';
      r.visible = false;
      return;
    case 'shop':
      r.state = 'SHOP';
      r.visitedShop = true;
      r.until = Math.min(state.t + between(state, CONFIG.shop.browseMin, CONFIG.shop.browseMax), r.bed);
      return;
    case 'home':
    default:
      r.visible = false;
      r.carry = null;
      if (state.t >= r.bed) {
        r.state = 'SLEEP';
      } else {
        r.state = 'HOME';
        r.until = state.t + between(state, 25, 80);
      }
  }
}

function updateResident(state, r, h, events) {
  const t = state.t;
  if (r.bubble && t > r.bubbleUntil) r.bubble = null;

  switch (r.state) {
    case 'PENDING':
      if (t >= r.arriveAt) {
        const p = center(PIER);
        r.x = p.x;
        r.y = p.y + T / 2;
        r.at = PIER;
        r.visible = true;
        r.bubble = 'arrive';
        r.bubbleUntil = t + 60;
        goHome(state, r);
        events.push({ type: 'arrived', name: r.name });
      }
      return;
    case 'SLEEP':
      if (t >= r.wake && t < r.bed) {
        r.state = 'HOME';
        r.until = t + between(state, 0, 8);
        r.morning = true;
      }
      return;
    case 'HOME':
      if (t >= r.bed || t < r.wake) {
        r.state = 'SLEEP';
        return;
      }
      if (t < r.until) return;
      {
        const door = houseDoor(buildingById(state, r.homeId));
        r.x = door.x;
        r.y = door.y;
      }
      if (r.morning) {
        r.morning = false;
        // 朝の一杯。雨の日は行きたくなる人が増える。近いカフェほど行く
        const list = cafeChoices(state, r);
        if (list.length) {
          const best = list.reduce((a, b) => (b.w > a.w ? b : a));
          const p = Math.min(1, r.coffee * (state.weather === 'rain' ? 1.2 : 1) * Math.min(1, near(r, best.cafe.access) * 1.5));
          if (rand(state) < p) return goCafe(state, r, best.cafe);
        }
      }
      return decideNext(state, r);
    case 'WALK':
      if (moveToward(state, r, h)) {
        if (r.path.length) {
          const next = r.path.shift();
          r.tx = next.x;
          r.ty = next.y;
        } else {
          arrive(state, r, events);
        }
      }
      return;
    case 'QUEUE': {
      const cafe = buildingById(state, r.destId);
      if (!cafe) return;
      const slot = queueSlot(cafe, Math.max(0, cafe.queue.indexOf(r.id)));
      r.tx = slot.x;
      r.ty = slot.y;
      moveToward(state, r, h);
      return;
    }
    case 'SEATED':
      if (r.visible) moveToward(state, r, h);
      if (t >= r.until) leaveVenue(state, r, events);
      return;
    case 'PARK':
      state.today.parkMinutes[r.id] = (state.today.parkMinutes[r.id] || 0) + h;
      if (moveToward(state, r, h) && rand(state) < 0.04 * h) {
        const p = parkPoint(state, buildingById(state, r.destId));
        r.tx = p.x;
        r.ty = p.y;
      }
      if (t >= r.until || t >= r.bed) afterActivity(state, r, 0.5);
      return;
    case 'STROLL':
      if (moveToward(state, r, h) && t >= r.until) afterActivity(state, r, 0.5);
      return;
    case 'SHOP':
      moveToward(state, r, h);
      if (t >= r.until) buySouvenir(state, r, buildingById(state, r.destId), events);
      return;
  }
}

function buySouvenir(state, r, shop, events) {
  if (shop.stock > 0) {
    shop.stock -= 1;
    state.coin += CONFIG.shop.value;
    state.today.shopSold += 1;
    state.today.shopIncome += CONFIG.shop.value;
    r.bought = true;
    r.bubble = 'bag';
    r.bubbleUntil = state.t + 20;
    events.push({ type: 'bought', shopId: shop.id });
  } else {
    // 売り切れ：何も買えずに店を出る
    state.today.shopMissed.push({ clock: clockOf(state.t), shopId: shop.id });
    r.bubble = 'lost';
    r.bubbleUntil = state.t + 20;
    events.push({ type: 'soldOut', shopId: shop.id });
  }
  afterActivity(state, r, 0.1);
}

function afterActivity(state, r, homeChance, opts) {
  if (r.tourist) homeChance = 0.1; // 観光客は船の時間まで島を見て回る
  if (state.t >= r.bed - 20 || rand(state) < homeChance) return goHome(state, r);
  return decideNext(state, r, opts);
}

// ---------------------------------------------------------------- 席と列のある施設（カフェ・スーパー・プラネタリウム）

export function seatCount(b) {
  return CONFIG[b.type].levels[b.level - 1].seats;
}

// カフェはテラスに座る姿が見える。スーパーとプラネタリウムは中に入る（見えない）
function sit(state, r, b, seatIdx) {
  const V = CONFIG[b.type];
  b.seats[seatIdx] = r.id;
  r.state = 'SEATED';
  r.seat = seatIdx;
  if (b.type === 'cafe') {
    const s = seatPositions(b)[seatIdx];
    r.tx = s.x;
    r.ty = s.y;
  } else {
    r.visible = false;
    const door = queueSlot(b, 0);
    r.x = r.tx = door.x + 20;
    r.y = r.ty = door.y;
  }
  const linger = state.weather === 'rain' ? V.rainLinger || 1 : 1;
  r.until = state.t + between(state, V.stayMin, V.stayMax) * linger;
  const closeAt = Math.floor(state.t / DAY) * DAY + clockToInDay(V.close);
  if (b.type !== 'cafe') r.until = Math.min(r.until, Math.max(state.t + 5, closeAt));
  if (r.tourist) r.until = Math.min(r.until, r.bed);
}

function enterVenue(state, r, b, events) {
  if (!venueOpen(state, b.type)) {
    // 閉まっていた。売り損ではないので数えない
    r.bubble = 'closed';
    r.bubbleUntil = state.t + 15;
    return afterActivity(state, r, 0.8, { avoid: b.type });
  }
  const seat = b.seats.findIndex((x) => x === null);
  if (seat >= 0 && b.queue.length === 0) return sit(state, r, b, seat);
  if (b.queue.length < CONFIG[b.type].maxQueue) {
    r.state = 'QUEUE';
    r.queuedAt = state.t;
    b.queue.push(r.id);
    return;
  }
  // 並ぶ場所も無い
  loseCustomer(state, r, b, 0, events);
}
const enterCafe = enterVenue;

function leaveVenue(state, r, events) {
  const b = buildingById(state, r.destId);
  const V = CONFIG[b.type];
  b.seats[r.seat] = null;
  r.seat = -1;
  if (!r.visible) {
    r.visible = true;
    const door = queueSlot(b, 0);
    r.x = door.x + 20;
    r.y = door.y;
  }
  state.coin += V.customerValue;
  const t = (state.today.byType[b.type] ||= { served: 0, income: 0 });
  t.served += 1;
  t.income += V.customerValue;
  if (b.type === 'cafe') {
    state.today.served += 1;
    state.today.income += V.customerValue;
  }
  if (b.type === 'super') {
    r.needShop = false;
    r.carry = 'groceries'; // 買い物袋を持って帰る
  }
  if (b.type === 'planetarium') r.visitedFun = true;
  events.push({ type: 'served', name: r.name, venue: b.type });
  afterActivity(state, r, b.type === 'super' ? 0.8 : 0.55, { avoid: b.type });
}

function loseCustomer(state, r, b, waited, events) {
  state.today.lost.push({ clock: clockOf(state.t), waited: Math.round(waited), name: r.name, cafeId: b.id, venue: b.type, tourist: !!r.tourist });
  r.bubble = 'lost';
  r.bubbleUntil = state.t + 25;
  events.push({ type: 'lost', name: r.name, waited, venue: b.type });
  // 帰った人が、すぐまた同じ施設に並び直すことはしない
  afterActivity(state, r, 0.6, { avoid: b.type });
}

function updateVenue(state, b, events) {
  // 閉店したら、並んでいた人は帰る（売り損には数えない）
  if (!venueOpen(state, b.type) && b.queue.length > 0) {
    for (const id of b.queue.splice(0)) {
      const r = personById(state, id);
      r.bubble = 'closed';
      r.bubbleUntil = state.t + 15;
      afterActivity(state, r, 0.9, { avoid: b.type });
    }
    return;
  }
  // 空いた席に、列の先頭から入る
  let seat = b.seats.findIndex((x) => x === null);
  while (seat >= 0 && b.queue.length > 0) {
    const id = b.queue.shift();
    sit(state, personById(state, id), b, seat);
    seat = b.seats.findIndex((x) => x === null);
  }
  // 待ちきれなかった人は帰る
  for (const id of [...b.queue]) {
    const r = personById(state, id);
    // 待ちきれない、または（観光客は）船の時間になった
    if (state.t - r.queuedAt > r.patience || (r.tourist && state.t >= r.bed)) {
      b.queue.splice(b.queue.indexOf(id), 1);
      loseCustomer(state, r, b, state.t - r.queuedAt, events);
    }
  }
}

// ---------------------------------------------------------------- 1日の区切り（05:00）

function rolloverDay(state, events) {
  const endedDay = dayOf(state.t) - 1;
  const today = state.today;
  const lines = [];

  lines.push({ kind: 'info', text: `昨日は${WEATHER_LABEL[state.weather]}でした。` });

  // 良かったこと（1〜2個）
  if (today.served > 0) {
    lines.push({ kind: 'good', text: `カフェに ${today.served}人 が来ました（+${today.income} Coin）` });
  }
  if (today.boats > 0) {
    lines.push({ kind: 'good', text: `船が ${today.boats}回 来て、観光客が ${today.tourists}人 やってきました` });
  }
  const parkFan = Object.entries(today.parkMinutes)
    .filter(([id]) => state.residents.some((x) => x.id === id))
    .sort((a, b) => b[1] - a[1])[0];
  if (parkFan && parkFan[1] >= 60 && today.boats === 0) {
    const r = state.residents.find((x) => x.id === parkFan[0]);
    lines.push({ kind: 'good', text: `${r.name}は公園で長いこと過ごしていました` });
  }

  const sup = today.byType.super;
  if (sup?.served) lines.push({ kind: 'good', text: `スーパーで ${sup.served}人 が買い物しました（+${sup.income} Coin）` });
  const fun = today.byType.planetarium;
  if (fun?.served) lines.push({ kind: 'good', text: `プラネタリウムに ${fun.served}人 が来ました（+${fun.income} Coin）` });
  if (today.shopSold > 0) {
    lines.push({ kind: 'good', text: `お土産が ${today.shopSold}個 売れました（+${today.shopIncome} Coin）` });
  }
  const missed = {};
  for (const m of today.shopMissed) {
    const shop = buildingById(state, m.shopId);
    const key = `${timeBucket(m.clock)}|${shop ? shopLabel(state, shop) : 'お土産屋'}`;
    missed[key] = (missed[key] || 0) + 1;
  }
  for (const [key, n] of Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 1)) {
    const [bucket, label] = key.split('|');
    lines.push({
      kind: 'problem',
      text: `${bucket}、${label}が売り切れて、観光客 ${n}人 が何も買えませんでした（−${n * CONFIG.shop.value} Coin）`,
    });
  }
  const petLine = petDiaryLine(state, endedDay);
  if (petLine) lines.push(petLine);

  // 困ったこと（答えは書かない。起きたことと損だけ・D281）
  const groups = {};
  for (const l of today.lost) {
    const b = buildingById(state, l.cafeId);
    const venue = l.venue || 'cafe';
    const key = `${timeBucket(l.clock)}|${b ? labelOf(state, b) : VENUE_NAME[venue]}|${l.tourist ? 'tourist' : ''}|${venue}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  const top = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 2);
  for (const [key, n] of top) {
    const [bucket, label, who, venue] = key.split('|');
    const loss = `（−${n * CONFIG[venue].customerValue} Coin）`;
    const how = venue === 'super' ? '買い物できずに帰りました' : venue === 'planetarium' ? '入れずに帰りました' : '帰ってしまいました';
    lines.push({
      kind: 'problem',
      text: who
        ? `${bucket}、${label}の前で待っていた観光客 ${n}人 が、港へ戻ってしまいました${loss}`
        : `${bucket}、${label}の前で待っていた ${n}人 が、${how}${loss}`,
    });
  }
  if (top.length === 0) {
    const q = Object.entries(today.queueMinutes).sort((a, b) => b[1] - a[1])[0];
    if (q && q[1] >= 10) {
      lines.push({ kind: 'problem', text: `${q[0]}、カフェの前に列ができていました（いちばん長いときで ${today.maxQueue}人）` });
    }
  }

  // 維持費
  const upkeep = venues(state).reduce((s, c) => s + CONFIG[c.type].levels[c.level - 1].upkeep, 0);
  const onlyCafes = venues(state).every((v) => v.type === 'cafe');
  const shopUpkeep = shops(state).reduce((s, b) => s + CONFIG.shop.levels[b.level - 1].upkeep, 0);
  if (upkeep + shopUpkeep > 0) {
    state.coin -= upkeep + shopUpkeep;
    lines.push({ kind: 'info', text: shopUpkeep || !onlyCafes ? `お店の維持費 −${upkeep + shopUpkeep} Coin` : `カフェの維持費 −${upkeep} Coin` });
  }
  // お土産屋は毎朝 入荷する
  for (const b of shops(state)) b.stock = CONFIG.shop.levels[b.level - 1].stock;

  // 人口：空き家があって、昨日 お店に入れた人が多ければ、1人（とても多ければ2人）やってくる
  const served = Object.values(today.byType).reduce((n, x) => n + x.served, 0) || today.served;
  const customers = served + today.lost.length;
  const satisfaction = customers === 0 ? 1 : served / customers;
  if (state.residents.length < CONFIG.maxPopulation) {
    if (vacancy(state) <= 0) {
      lines.push({ kind: 'problem', text: '島に住みたい人がいたようですが、空いている家がありませんでした' });
    } else if (satisfaction < CONFIG.growth.minSatisfaction) {
      lines.push({ kind: 'problem', text: '島を見に来た人がいましたが、住むのはやめたようです' });
    } else {
      const n = satisfaction >= 0.9 && vacancy(state) >= 2 && state.poolIndex >= RESIDENT_POOL.length ? 2 : 1;
      const names = [];
      for (let k = 0; k < n; k++) {
        const r = addResident(state, { arriving: true });
        if (!r) break;
        r.arriveAt = Math.floor(state.t / DAY) * DAY + clockToInDay(8 * 60) + between(state, 0, 120);
        names.push(r);
      }
      if (names.length === 1 && !names[0].generic) lines.push({ kind: 'good', text: `今日、${names[0].name}が島に引っ越してくるそうです` });
      else if (names.length) lines.push({ kind: 'good', text: `今日、新しい住民が ${names.length}人 引っ越してくるそうです` });
    }
  }

  // 解放：ひらいた日の日記に書く（ひらくのは条件を満たしたその場・checkUnlocks）
  for (const u of CONFIG.unlocks) {
    const on = u.id === 'port' ? state.port.openedOn ?? state.unlockedOn.port : state.unlockedOn[u.id];
    if (on === endedDay) lines.push({ kind: 'good', text: `住民が ${u.pop}人 になって、${u.done}` });
  }

  const entry = { day: endedDay, weather: state.weather, lines, read: false };
  state.diary.push(entry);
  events.push({ type: 'newday', entry });

  // 新しい1日
  state.weather = chooseWeather(state, dayOf(state.t));
  state.today = freshToday();
  for (const r of state.residents) planDay(state, r);
  planBoats(state);
}

// ---------------------------------------------------------------- 港と観光客（D292）

function planBoats(state, { onlyFuture = false } = {}) {
  const P = CONFIG.port;
  state.port.today = [];
  if (!state.port.open) return;
  const base = Math.floor(state.t / DAY) * DAY;
  for (const clock of P.boats) {
    const arrive = base + clockToInDay(clock) + Math.round(between(state, 0, 25));
    if (onlyFuture && arrive - P.sail <= state.t) continue;
    state.port.today.push({ arrive, depart: arrive + P.stay, spawned: false, left: false });
  }
}

// テストや ?debug 用：今すぐ港を開く
export function openPort(state) {
  state.port.open = true;
  state.unlocked ||= {};
  state.unlocked.port = true;
  state.port.openedOn = dayOf(state.t);
  planBoats(state, { onlyFuture: true });
}

// 住民が決まった人数になったら、その場でひらく（D292 の不具合修正：区切りの時刻ではなく、満たした瞬間に判定する）
function checkUnlocks(state, events) {
  for (const u of CONFIG.unlocks) {
    if (isUnlocked(state, u.id) || state.residents.length < u.pop) continue;
    if (u.id === 'port') {
      openPort(state);
      events.push({ type: 'portOpen' });
    } else {
      state.unlocked[u.id] = true;
      state.unlockedOn[u.id] = dayOf(state.t);
    }
    events.push({ type: 'unlock', id: u.id, done: u.done });
  }
}

export function isUnlocked(state, id) {
  if (id === 'port') return !!state.port?.open;
  return !!state.unlocked?.[id];
}

// 次の目標（まだひらいていない中で いちばん手前）
export function nextGoal(state) {
  const u = CONFIG.unlocks.find((x) => !isUnlocked(state, x.id));
  return u ? { ...u, now: state.residents.length } : null;
}

// テストや ?debug 用：今すぐ解放する
export function unlockNow(state, id) {
  if (id === 'port') return openPort(state);
  state.unlocked[id] = true;
  state.unlockedOn[id] = dayOf(state.t);
}

function spawnTourists(state, boatIdx, boat) {
  const [lo, hi] = CONFIG.port.tourists[state.weather];
  const n = Math.round(between(state, lo, hi));
  const pier = center(PIER);
  for (let k = 0; k < n; k++) {
    const v = {
      id: `v${state.nextId++}`,
      name: '観光客',
      tourist: true,
      boat: boatIdx,
      look: Math.floor(rand(state) * 1000),
      prefs: { cafe: between(state, 18, 34), park: between(state, 10, 24), stroll: between(state, 22, 36), shop: between(state, 26, 40) },
      coffee: 0,
      patience: between(state, CONFIG.patienceMin, CONFIG.patienceMax),
      speed: between(state, 0.85, 1.05),
      lane: between(state, -5, 5),
      wake: 0,
      bed: boat.depart - CONFIG.port.leaveBefore,
      departAt: boat.depart,
      state: 'STROLL',
      at: PIER,
      x: pier.x + between(state, -6, 6),
      y: pier.y + T + 14 + k * 4,
      tx: 0,
      ty: 0,
      path: [],
      dest: null,
      destId: null,
      until: 0,
      seat: -1,
      queuedAt: 0,
      pauseUntil: state.t + k * 2, // 1人ずつ降りてくる
      facing: 1,
      visible: true,
      bubble: null,
      bubbleUntil: 0,
    };
    v.tx = v.x;
    v.ty = v.y;
    state.visitors.push(v);
    decideNext(state, v);
  }
  state.today.boats += 1;
  state.today.tourists += n;
  return n;
}

function goBoat(state, r) {
  const pier = center(PIER);
  goTo(state, r, 'boat', null, PIER, { x: pier.x + between(state, -5, 5), y: pier.y + T + 10 });
}

function updatePort(state, events) {
  if (!state.port.open) return;
  state.port.today.forEach((boat, i) => {
    if (!boat.spawned && state.t >= boat.arrive) {
      boat.spawned = true;
      const n = spawnTourists(state, i, boat);
      events.push({ type: 'boat', n });
    }
    if (boat.spawned && !boat.left && state.t >= boat.depart) {
      boat.left = true;
      // 乗り遅れた人は 船が待っていてくれた、ということにする（島に取り残さない）
      for (const v of state.visitors.filter((x) => x.boat === i)) {
        for (const c of cafes(state)) {
          const q = c.queue.indexOf(v.id);
          if (q >= 0) c.queue.splice(q, 1);
          const s = c.seats.indexOf(v.id);
          if (s >= 0) c.seats[s] = null;
        }
      }
      state.visitors = state.visitors.filter((x) => x.boat !== i);
    }
  });
}

// 描画用：いま船が海のどこにいるか（null＝見えない）
export function boatNow(state) {
  if (!state.port?.open) return null;
  const S = CONFIG.port.sail;
  for (const b of state.port.today) {
    if (state.t >= b.arrive - S && state.t < b.arrive) return { phase: 'arriving', k: (state.t - (b.arrive - S)) / S };
    if (state.t >= b.arrive && state.t < b.depart) return { phase: 'docked', k: 1, depart: b.depart };
    if (state.t >= b.depart && state.t < b.depart + S) return { phase: 'leaving', k: 1 - (state.t - b.depart) / S };
  }
  return null;
}

export function nextBoat(state) {
  return state.port.today.find((b) => state.t < b.arrive) || null;
}

function chooseWeather(state, day) {
  if (day === 2) return 'rain'; // 2日目は雨で固定（曖昧な行列を早めに見せる）
  const o = CONFIG.weatherOdds;
  const x = rand(state);
  if (x < o.sunny) return 'sunny';
  if (x < o.sunny + o.cloudy) return 'cloudy';
  return 'rain';
}

// ---------------------------------------------------------------- プレイヤーの介入

// place: true のものは、建てる場所をプレイヤーが選ぶ
export function actionsFor(state) {
  const list = [];
  if (houses(state).length < CONFIG.house.max) {
    list.push({ id: 'house', icon: 'house_build', place: 'house', title: '家を建てる', detail: `${CONFIG.houseCapacity}人まで住める。場所を選べる`, cost: CONFIG.house.cost });
  }
  if (cafes(state).length < CONFIG.cafe.max) {
    list.push({ id: 'cafe', icon: 'cafe_new', place: 'cafe', title: 'カフェをもう1軒つくる', detail: `席 3。維持費 1日 ${CONFIG.cafe.levels[0].upkeep} Coin。場所を選べる`, cost: CONFIG.cafe.buildCost });
  }
  for (const type of ['super', 'planetarium']) {
    const V = CONFIG[type];
    if (ofType(state, type).length >= V.max) continue;
    const u = CONFIG.unlocks.find((x) => x.id === type);
    const locked = !isUnlocked(state, type);
    const what = type === 'super'
      ? `住民が毎日 買い物に行く。一度に ${V.levels[0].seats}人。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`
      : `長く過ごせる屋内の施設。${V.levels[0].seats}席。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`;
    list.push({
      id: type,
      icon: type === 'super' ? 'super_new' : 'planetarium_new',
      place: type,
      title: `${VENUE_NAME[type]}をつくる`,
      detail: locked ? `住民が ${u.pop}人 になると建てられます` : what,
      cost: V.buildCost,
      locked,
    });
  }
  for (const c of venues(state)) {
    const next = CONFIG[c.type].levels[c.level];
    if (!next) continue;
    const unit = c.type === 'cafe' ? '席' : c.type === 'super' ? '一度に入れる人' : '席';
    list.push({
      id: `${c.type === 'cafe' ? 'cafe' : 'venue'}_upgrade:${c.id}`,
      icon: 'cafe_upgrade',
      title: `${labelOf(state, c)}を広げる（Lv${next.level}）`,
      detail: `${unit} ${seatCount(c)} → ${next.seats}　維持費 1日 ${next.upkeep} Coin`,
      cost: next.cost,
    });
  }
  if (shops(state).length < CONFIG.shop.max) {
    list.push({
      id: 'shop',
      icon: 'shop_new',
      place: 'shop',
      title: shops(state).length ? 'お土産屋をもう1軒つくる' : 'お土産屋をつくる',
      detail: state.port?.open ? `観光客がお土産を買う。1日 ${CONFIG.shop.levels[0].stock}個まで。維持費 1日 ${CONFIG.shop.levels[0].upkeep} Coin。場所を選べる` : '港がひらくと建てられます',
      cost: CONFIG.shop.cost,
      locked: !state.port?.open,
    });
  }
  for (const b of shops(state)) {
    const next = CONFIG.shop.levels[b.level];
    if (!next) continue;
    list.push({
      id: `shop_upgrade:${b.id}`,
      icon: 'shop_new',
      title: `${shopLabel(state, b)}の品数を増やす（Lv${next.level}）`,
      detail: `1日 ${CONFIG.shop.levels[b.level - 1].stock} → ${next.stock}個　維持費 1日 ${next.upkeep} Coin`,
      cost: next.cost,
    });
  }
  const park = parkOf(state);
  if (park && !park.roof) {
    list.push({ id: 'park_roof', icon: 'park_roof', title: '公園に東屋をつくる', detail: '屋根の下なら、雨でも過ごせる', cost: CONFIG.park.roofCost });
  }
  return list;
}

// place は { c, r }（建てる場所の左上のマス）
export function applyAction(state, id, place) {
  const action = actionsFor(state).find((a) => a.id === id);
  if (!action || action.locked) return { ok: false, message: 'いまは できません' };
  if (state.coin < action.cost) return { ok: false, message: `Coin が足りません（あと ${action.cost - state.coin}）` };
  if (action.place) {
    if (!place || !canPlace(action.place, place.c, place.r, state.buildings)) return { ok: false, message: 'そこには建てられません' };
    state.buildings.push(makeBuilding(state, action.place, place.c, place.r));
    // スーパーを建てたら、その日から買い物に行く（翌朝まで待たせない）
    if (action.place === 'super') for (const r of state.residents) if (!r.carry) r.needShop = true;
  } else if (id.startsWith('cafe_upgrade:') || id.startsWith('venue_upgrade:')) {
    const cafe = buildingById(state, id.split(':')[1]);
    cafe.level += 1;
    while (cafe.seats.length < seatCount(cafe)) cafe.seats.push(null);
  } else if (id.startsWith('shop_upgrade:')) {
    const shop = buildingById(state, id.split(':')[1]);
    shop.level += 1;
    shop.stock = CONFIG.shop.levels[shop.level - 1].stock;
  } else if (id === 'park_roof') {
    parkOf(state).roof = true;
  }
  state.coin -= action.cost;
  state.history.push({ t: state.t, action: id, place: place || null });
  return { ok: true, message: `${action.title.replace('（', ' ').replace('）', '')}：完成しました` };
}

// ---------------------------------------------------------------- 画面から読むための情報

export function describeResident(state, r) {
  switch (r.state) {
    case 'WALK': {
      if (r.dest === 'cafe') return `${labelOf(state, buildingById(state, r.destId))}へ向かっている`;
      if (r.dest === 'shop') return `${shopLabel(state, buildingById(state, r.destId))}へ向かっている`;
      return { park: '公園へ向かっている', stroll: r.tourist ? '島を見て回っている' : 'ぶらぶら歩いている', home: '家へ帰るところ', boat: '港へ戻るところ' }[r.dest] || '歩いている';
    }
    case 'QUEUE':
      return `${labelOf(state, buildingById(state, r.destId))}の前で待っている（${Math.round(state.t - r.queuedAt)}分）`;
    case 'SEATED': {
      const b = buildingById(state, r.destId);
      if (b.type === 'super') return 'スーパーで買い物中';
      if (b.type === 'planetarium') return 'プラネタリウムで星を見ている';
      return `${labelOf(state, b)}でひと休み中`;
    }
    case 'PARK':
      return '公園で過ごしている';
    case 'SHOP':
      return 'お土産を見ている';
    case 'STROLL':
      return r.tourist ? '景色を眺めている' : 'あたりを眺めている';
    case 'HOME':
      return '家にいる';
    case 'SLEEP':
      return '寝ている';
    default:
      return '';
  }
}

export function favoriteText(r) {
  const top = Object.entries(r.prefs).sort((a, b) => b[1] - a[1])[0][0];
  return { cafe: 'カフェが好き', park: '公園が好き', stroll: '散歩が好き', fun: '星を見るのが好き' }[top];
}

// 家から、いちばん近いカフェまで何マスか（カードで見せる。答えではなく事実）
export function nearestCafeSteps(state, house) {
  const d = Math.min(...cafes(state).map((c) => roadDistance(house.access, c.access)));
  return Number.isFinite(d) ? d : null;
}

// ---------------------------------------------------------------- ペット（D293）
//
// 迷い込んできた ねこ・いぬ に名前をつけて、家族にする。能力は無い（眺めて かわいい、だけ）。
// いぬは飼い主が出かけると後ろをついて歩く。ねこは毎日ちがう場所で昼寝する。雨の日は軒下へ。

const PET_SPOT_LABEL = { terrace: 'カフェのテラス', bench: '公園のベンチ', roof: '家の屋根の上', plaza: '広場' };

function landPoint(state, around, radius) {
  for (let k = 0; k < 12; k++) {
    const x = around.x + between(state, -radius, radius);
    const y = around.y + between(state, -radius, radius);
    const i = idx(Math.floor(x / T), Math.floor(y / T));
    if (MAP[i] === 'land' || MAP[i] === 'road') return { x, y };
  }
  return { x: around.x, y: around.y };
}

function spawnStrays(state, events) {
  const clock = clockOf(state.t);
  const day = dayOf(state.t);
  for (const kind of ['cat', 'dog']) {
    const P = CONFIG.pets[kind];
    if (state.petsSpawned[kind] || day < P.day || (day === P.day && clock < P.clock)) continue;
    if (clock < 6 * 60 || clock >= 20 * 60) continue; // 夜には来ない
    let anchor;
    if (kind === 'cat') {
      const cafe = cafes(state)[0];
      const q = cafe ? queueSlot(cafe, 0) : center(PIER);
      anchor = { x: q.x + 22, y: q.y + 12 };
    } else {
      const park = parkOf(state);
      anchor = park ? { x: center(park.access).x, y: center(park.access).y + 10 } : center(PIER);
    }
    const pet = {
      id: `p${state.nextId++}`,
      kind,
      name: P.label,
      adopted: false,
      ownerId: null,
      homeId: null,
      anchor,
      x: anchor.x,
      y: anchor.y,
      tx: anchor.x,
      ty: anchor.y,
      state: 'WANDER',
      until: state.t + between(state, 3, 10),
      spot: null,
      facing: 1,
    };
    state.pets.push(pet);
    state.petsSpawned[kind] = true;
    events.push({ type: 'stray', kind, near: kind === 'cat' ? 'カフェ' : '公園' });
  }
}

// 名前をつけて家族にする。いちばん近い、人が住んでいる家の子になる
export function adoptPet(state, petId, name) {
  const pet = state.pets.find((p) => p.id === petId);
  if (!pet || pet.adopted) return { ok: false, message: 'もう家族になっています' };
  const lived = houses(state).filter((h) => state.residents.some((r) => r.homeId === h.id && r.state !== 'PENDING'));
  if (lived.length === 0) return { ok: false, message: '住んでいる家がありません' };
  const home = lived.reduce((a, b) => {
    const da = Math.hypot(houseDoor(a).x - pet.x, houseDoor(a).y - pet.y);
    const db = Math.hypot(houseDoor(b).x - pet.x, houseDoor(b).y - pet.y);
    return db < da ? b : a;
  });
  const owner = state.residents.find((r) => r.homeId === home.id && r.state !== 'PENDING');
  pet.adopted = true;
  pet.name = (name || '').trim().slice(0, 8) || CONFIG.pets[pet.kind].name;
  pet.homeId = home.id;
  pet.ownerId = owner.id;
  pet.state = 'WANDER';
  pet.until = state.t;
  return { ok: true, message: `${pet.name}が${owner.name}の家の子になりました`, owner };
}

function petMove(state, pet, h, speedMul) {
  const dx = pet.tx - pet.x;
  const dy = pet.ty - pet.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return true;
  const stepLen = Math.min(d, CONFIG.walkSpeed * speedMul * h);
  pet.x += (dx / d) * stepLen;
  pet.y += (dy / d) * stepLen;
  if (Math.abs(dx) > 0.5) pet.facing = dx > 0 ? 1 : -1;
  return false;
}

function catSpots(state, home) {
  const spots = [];
  const cafe = cafes(state)[0];
  if (cafe) spots.push({ key: 'terrace', x: cafe.c * T + 10, y: (cafe.r + 3) * T - 8 });
  const park = parkOf(state);
  if (park) spots.push({ key: 'bench', x: (park.c + 1.5) * T + 22, y: (park.r + 3) * T - 16 });
  if (home) spots.push({ key: 'roof', x: home.c * T + T / 2, y: home.r * T - 2 });
  spots.push({ key: 'plaza', x: 8 * T + T / 2 + 14, y: 11 * T + T / 2 - 12 });
  return spots;
}

function updatePet(state, pet, h) {
  const clock = clockOf(state.t);
  const night = clock >= 21 * 60 || clock < 6 * 60 + 30;
  const kind = CONFIG.pets[pet.kind];

  if (!pet.adopted) {
    // 迷い込んだ子：見つけた場所のまわりを うろうろ
    if (petMove(state, pet, h, kind.speed) && state.t >= pet.until) {
      const p = landPoint(state, pet.anchor, 40);
      pet.tx = p.x;
      pet.ty = p.y;
      pet.state = rand(state) < 0.5 ? 'SIT' : 'WANDER';
      pet.until = state.t + between(state, 5, 20);
    }
    return;
  }

  const home = buildingById(state, pet.homeId);
  const owner = state.residents.find((r) => r.id === pet.ownerId);
  const door = home ? houseDoor(home) : { x: pet.x, y: pet.y };

  if (pet.kind === 'dog') {
    const out = owner && owner.visible && !['HOME', 'SLEEP', 'PENDING'].includes(owner.state);
    if (out) {
      // 飼い主の うしろを ついて歩く
      pet.state = 'FOLLOW';
      pet.tx = owner.x - owner.facing * 13;
      pet.ty = owner.y + 3;
      const far = Math.hypot(pet.tx - pet.x, pet.ty - pet.y) > 40;
      petMove(state, pet, h, far ? 1.6 : 1.05);
      if (owner.state === 'WALK') state.today.petWalk[pet.id] = (state.today.petWalk[pet.id] || 0) + h;
      return;
    }
    if (night) {
      pet.state = 'SLEEP';
      pet.tx = door.x + 14;
      pet.ty = door.y + 2;
      petMove(state, pet, h, 1);
      return;
    }
    if (pet.state === 'FOLLOW' || pet.state === 'SLEEP') pet.until = state.t;
    if (petMove(state, pet, h, 0.9) && state.t >= pet.until) {
      const p = landPoint(state, door, 36);
      pet.tx = p.x;
      pet.ty = p.y;
      pet.state = rand(state) < 0.4 ? 'SIT' : 'WANDER';
      pet.until = state.t + between(state, 6, 25);
    }
    return;
  }

  // ねこ
  if (night) {
    pet.state = 'SLEEP';
    pet.tx = door.x - 14;
    pet.ty = door.y + 1;
    petMove(state, pet, h, kind.speed);
    return;
  }
  if (state.weather === 'rain' && pet.state !== 'SHELTER') {
    // 雨の日は、家の軒下で雨宿り
    pet.state = 'SHELTER';
    pet.spot = null;
    pet.tx = door.x - 12;
    pet.ty = door.y - 2;
  }
  if (pet.state === 'SHELTER') {
    petMove(state, pet, h, kind.speed * 1.3);
    if (state.weather !== 'rain') pet.state = 'WANDER';
    return;
  }
  if (pet.state === 'NAP') {
    state.today.petNap[pet.id] ||= {};
    state.today.petNap[pet.id][pet.spot] = (state.today.petNap[pet.id][pet.spot] || 0) + h;
    if (state.t >= pet.until) {
      pet.state = 'WANDER';
      const p = landPoint(state, { x: pet.x, y: pet.y + 12 }, 30);
      pet.tx = p.x;
      pet.ty = p.y;
      pet.until = state.t + between(state, 10, 30);
    }
    return;
  }
  if (pet.state === 'GOING') {
    if (petMove(state, pet, h, kind.speed)) {
      pet.state = 'NAP';
      pet.until = state.t + between(state, 60, 150);
    }
    return;
  }
  // WANDER：すこし歩いたら、昼寝の場所を選ぶ（毎日ちがう場所になりやすい）
  if (petMove(state, pet, h, kind.speed) && state.t >= pet.until) {
    const spots = catSpots(state, home);
    const spot = pick(state, spots);
    pet.spot = spot.key;
    pet.tx = spot.x;
    pet.ty = spot.y;
    pet.state = 'GOING';
  }
}

function petDiaryLine(state, day) {
  const adopted = state.pets.filter((p) => p.adopted);
  const stray = state.pets.find((p) => !p.adopted);
  if (adopted.length === 0) {
    if (!stray) return null;
    return { kind: 'info', text: `${stray.kind === 'cat' ? 'カフェ' : '公園'}のあたりに、迷い${stray.name}がいたようです` };
  }
  const pet = adopted[day % adopted.length];
  const owner = state.residents.find((r) => r.id === pet.ownerId);
  if (pet.kind === 'dog') {
    const walked = state.today.petWalk[pet.id] || 0;
    return walked >= 30
      ? { kind: 'good', text: `${pet.name}は${owner?.name ?? '飼い主'}と一緒に、たくさん歩きました` }
      : { kind: 'good', text: `${pet.name}は家のまわりで、のんびりしていました` };
  }
  const naps = state.today.petNap[pet.id];
  if (!naps) return { kind: 'good', text: `${pet.name}は軒下で、雨があがるのを待っていました` };
  const best = Object.entries(naps).sort((a, b) => b[1] - a[1])[0][0];
  return { kind: 'good', text: `${pet.name}は${PET_SPOT_LABEL[best]}で昼寝していました` };
}

export function describePet(state, pet) {
  if (!pet.adopted) return 'あたりを うろうろしている';
  const owner = state.residents.find((r) => r.id === pet.ownerId);
  switch (pet.state) {
    case 'FOLLOW':
      return `${owner?.name ?? '飼い主'}と一緒に歩いている`;
    case 'SLEEP':
      return '寝ている';
    case 'NAP':
      return `${PET_SPOT_LABEL[pet.spot]}で昼寝している`;
    case 'GOING':
      return '昼寝の場所を探している';
    case 'SHELTER':
      return '軒下で雨宿りしている';
    case 'SIT':
      return 'ひと休みしている';
    default:
      return pet.kind === 'dog' ? '家のまわりを うろうろしている' : 'のんびり歩いている';
  }
}

export { idx };
