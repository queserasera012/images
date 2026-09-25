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
import {
  T, SIZES, MAP, MAP_KEY, PIER, PIERS, OX, OY, AREAS, areaById, center, roadPath, roadDistance, accessTile, canPlace, isRoad, idx,
  useAreas, landTilesOf, placements, HOUSE_FLOOR,
} from './grid.js';

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

// 最初の島（左上のマス。本島の左上 OX, OY からの位置）
const START = [
  { type: 'house', c: 3, r: 7 },
  { type: 'house', c: 3, r: 9 },
  { type: 'park', c: 9, r: 7 },
  { type: 'cafe', c: 5, r: 8 },
].map((b) => ({ ...b, c: b.c + OX, r: b.r + OY }));

// 道のマスの一覧（地図が変わったら作り直す）
let roadTilesKey = null;
let roadTilesList = [];
function roadTiles() {
  if (roadTilesKey !== MAP_KEY) {
    roadTilesKey = MAP_KEY;
    roadTilesList = MAP.map((k, i) => (k === 'road' ? i : -1)).filter((i) => i >= 0);
  }
  return roadTilesList;
}

// このセーブの島の形に、地図を合わせる（D298）。ルールを動かす入口で必ず呼ぶ
export function syncMap(state) {
  useAreas(state.areas || ['main']);
}

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

const fmtClock = (c) => `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;

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

// 夜の早送り（D299）：島のお店が全部 閉まってから、朝6時まで。
// 22時より前には始めない（夕方〜夜の帰り道は眺めたい）。一晩じゅう開いている施設ができたら、早送りしない
export function fastForwardFrom(state) {
  let last = 22 * 60;
  for (const b of state.buildings) {
    const V = CONFIG[b.type];
    if (!V || V.close === undefined) continue;
    const close = closeOf(b);
    if (close === null || close >= 24 * 60 + 6 * 60) return null; // 一晩じゅう
    last = Math.max(last, close);
  }
  return last;
}
export function fastForwardNow(state) {
  const from = fastForwardFrom(state);
  if (from === null) return false;
  const c = clockOf(state.t);
  // 0時をまたいで開いている店があれば、その閉店時刻から
  if (from >= 24 * 60) return c >= from - 24 * 60 && c < 6 * 60;
  return c >= from || c < 6 * 60;
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
export const VENUE_TYPES = ['cafe', 'super', 'planetarium', 'petshop', 'pond', 'stand'];
export const VENUE_NAME = { cafe: 'カフェ', super: 'スーパー', planetarium: 'プラネタリウム', petshop: 'ペットショップ', pond: '釣り堀', stand: 'コーヒースタンド' };
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
  if (VENUE_TYPES.includes(type) || type === 'kinder') Object.assign(b, { level: 1, seats: new Array(CONFIG[type].levels[0].seats).fill(null), queue: [] });
  if (type === 'park') b.roof = false;
  if (type === 'house') b.level = 1;
  if (type === 'shop') Object.assign(b, { level: 1, stock: CONFIG.shop.levels[0].stock });
  return b;
}

// 家に住める人数と、次に広げる費用（D303）
export const capacityOf = (h) => CONFIG.house.levels[(h?.level || 1) - 1].capacity;
export const houseUpgradeCost = (h) => CONFIG.house.levels[h.level || 1]?.cost ?? null;
export const houseLift = (h) => ((h.level || 1) - 1) * HOUSE_FLOOR;

// 建物の中の点（描画と同じ場所）
export function houseDoor(h) {
  return { x: h.c * T + T / 2, y: h.r * T + T - 4 };
}

export function seatPositions(cafe) {
  if (cafe.type === 'pond') return pondSeats(cafe);
  const x0 = cafe.c * T;
  const y0 = (cafe.r + 1) * T;
  const w = SIZES.cafe.w * T;
  const pos = [];
  for (const row of [0, 1]) for (const k of [0, 1, 2, 3]) pos.push({ x: x0 + (w * (2 * k + 1)) / 8 - 5, y: y0 + 30 + row * 23 });
  // 前の列の真ん中から埋める
  return [pos[1], pos[2], pos[0], pos[5], pos[6], pos[3], pos[4], pos[7]];
}

// コーヒースタンドのカウンターの前（出入り口の道の、建物寄り）
export function standFront(b) {
  const a = center(b.access);
  const dx = Math.sign(b.c * T + T / 2 - a.x);
  const dy = Math.sign(b.r * T + T / 2 - a.y);
  return { x: a.x + dx * 8, y: a.y + dy * 8 + (dy ? 0 : 4) };
}

// 釣り堀の釣り座：池の下のふちに並ぶ（池の方を向いて座る）
function pondSeats(b) {
  const x0 = b.c * T;
  const y = (b.r + 2) * T - 9;
  const w = SIZES.pond.w * T;
  const n = CONFIG.pond.levels[CONFIG.pond.levels.length - 1].seats;
  const pos = [];
  for (let k = 0; k < n; k++) pos.push({ x: x0 + 10 + ((w - 20) * (k + 0.5)) / n, y });
  // 真ん中から埋める
  return pos.map((p, i) => ({ p, d: Math.abs(i - (n - 1) / 2) })).sort((a, b) => a.d - b.d).map((x) => x.p);
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
  if (b.type === 'kinder') return '幼稚園';
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
    port: { id: 'main', open: false, today: [] },
    harbors: [], // 広げた土地の港（D298）
    areas: ['main'], // ひらいた土地（D298）
    grid: 2, // 地図の版（2＝島を広げられる版。1＝本島だけの 17×25）
    pets: [],
    petsSpawned: { cat: false, dog: false },
    unlocked: {},
    unlockedOn: {},
    affinity: {},
    naming: [],
    fishLog: {}, // あなたが釣った魚（種類 → 匹数）
    poolIndex: 0,
    today: freshToday(),
    diary: [],
    history: [],
    nextId: 1,
  };
  syncMap(state);
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
    kinder: { went: 0, missed: 0 },
    fishing: { plays: 0, rewarded: 0, coin: 0, caught: [] },
    ads: { bonus: 0, boat: 0, bait: 0 },
  };
}

// 古いセーブ（港が無かった頃）を今の形にそろえる
export function migrate(state) {
  state.visitors ||= [];
  state.port ||= { open: false, today: [] };
  state.port.id = 'main';
  state.harbors ||= [];
  state.areas ||= ['main'];
  if (!state.grid) shiftOldGrid(state);
  syncMap(state);
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
  state.affinity ||= {};
  state.naming ||= [];
  state.today.kinder ||= { went: 0, missed: 0 };
  state.today.fishing ||= { plays: 0, rewarded: 0, coin: 0, caught: [] };
  state.today.ads ||= { bonus: 0, boat: 0, bait: 0 };
  state.fishLog ||= {};
  if (state.port.open) state.unlocked.port = true;
  for (const b of state.buildings) if (isVenue(b) && !b.queue) Object.assign(b, { seats: [], queue: [] });
  for (const b of state.buildings) if (b.type === 'house') b.level ||= 1;
  return state;
}

// 本島だけの地図（17×25）のセーブを、広げられる地図に移す。本島の位置が OX, OY ずれるだけ
function shiftOldGrid(state) {
  const OLD_COLS = 17;
  const dx = OX * T;
  const dy = OY * T;
  const shiftIdx = (i) => (typeof i === 'number' && i >= 0 ? idx((i % OLD_COLS) + OX, Math.floor(i / OLD_COLS) + OY) : i);
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (typeof o.x === 'number' && typeof o.y === 'number') {
      o.x += dx;
      o.y += dy;
    }
    if (typeof o.tx === 'number' && typeof o.ty === 'number') {
      o.tx += dx;
      o.ty += dy;
    }
    for (const k of ['at', 'nextAt', 'pier']) if (k in o) o[k] = shiftIdx(o[k]);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  };
  useAreas(['main']);
  for (const b of state.buildings) {
    b.c += OX;
    b.r += OY;
    b.access = accessTile(b.type, b.c, b.r);
  }
  walk(state.residents);
  walk(state.visitors);
  walk(state.pets);
  state.grid = 2;
}

// 夫婦の住む家の空きは、生まれてくる子どもの分。新しい住民には貸さない（D297）
function familyHome(state, h) {
  const here = state.residents.filter((r) => r.homeId === h.id);
  return here.some((a) => {
    const b = a.spouseId && here.find((x) => x.id === a.spouseId);
    return b && here.filter((x) => x.parents?.includes(a.id)).length < CONFIG.family.maxKids;
  });
}

function openRoom(state, h) {
  return familyHome(state, h) ? 0 : Math.max(0, capacityOf(h) - state.residents.filter((r) => r.homeId === h.id).length);
}

function vacancy(state) {
  return houses(state).reduce((n, h) => n + openRoom(state, h), 0);
}

function freeHouse(state) {
  return houses(state).find((h) => openRoom(state, h) > 0);
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

// 住民の数に上限は無い（D301）。住めるのは家の空きの分だけ。家は土地の分だけ。土地は島を広げると増える
function addResident(state, { arriving }) {
  const home = freeHouse(state);
  if (!home) return null;
  const base = RESIDENT_POOL[state.poolIndex] || genericResident(state);
  if (RESIDENT_POOL[state.poolIndex]) state.poolIndex += 1;
  return makeResident(state, base, home, arriving);
}

function makeResident(state, base, home, arriving) {
  const door = houseDoor(home);
  const r = {
    id: `r${state.nextId++}`,
    name: base.name,
    generic: !!base.generic,
    age: base.age || null, // null＝大人／'baby'／'kid'（D297）
    parents: base.parents || null,
    bornOn: base.bornOn || null,
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
  r.fished = false; // 釣り堀も1日1回まで
  // ペットのいる家の人は、2日に1回 ペットショップへ（家ごとに曜日をずらす）
  r.needPet = ofType(state, 'petshop').length > 0 && householdHasPet(state, r) && (dayOf(state.t) + (r.look || 0)) % 2 === 0;
  r.wake = base + clockToInDay(6 * 60 + 30) + between(state, 0, 35);
  r.bed = base + clockToInDay(21 * 60 + 30) + between(state, 0, 60);
  // 夜ふかしの人（住民ごとに決まっている）は1時間半おそく寝る
  if (r.nightOwl === undefined) r.nightOwl = rand(state) < CONFIG.nightOwls;
  if (r.nightOwl && !r.tourist && !r.age) r.bed += 90;
  if (r.age) r.bed = base + clockToInDay(20 * 60) + between(state, 0, 20); // 子どもは早寝
  r.kinderToday = false;
}

// ---------------------------------------------------------------- 進める

// dt（ゲーム内の分）だけ進める。起きた出来事を返す。
export function step(state, dt) {
  syncMap(state);
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
  syncMap(state);
  const target = Math.min(state.t + gameMinutes, nextMorning(state.t));
  if (target <= state.t) return [];
  return step(state, target - state.t);
}

function tick(state, h, events) {
  const before = dayOf(state.t);
  state.t += h;
  if (dayOf(state.t) > before) rolloverDay(state, events);

  for (const r of everyone(state)) updateResident(state, r, h, events);
  growAffinity(state, h);
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

// 建物ごとの閉店時刻（カフェ&バーは夜23時まで・D297）
export const closeOf = (b) => (b.type === 'cafe' && b.bar ? CONFIG.cafe.bar.close : CONFIG[b.type].close);
function buildingOpen(state, b, margin = 0) {
  const c = clockOf(state.t);
  return c >= CONFIG[b.type].open && c < closeOf(b) - margin;
}
const isBarTime = (state, b) => b.bar && clockOf(state.t) >= CONFIG.cafe.close;

// 遠いところほど行きにくい（D289）
const near = (r, access) => 1 / (1 + roadDistance(r.at, access) / CONFIG.distanceHalf);

function cafeChoices(state, r) {
  const w = CONFIG.weatherWeights[state.weather].cafe;
  return cafes(state)
    .filter((c) => buildingOpen(state, c, 30))
    // 夜のバーに行くのは大人だけ
    .filter((c) => !(isBarTime(state, c) && (r.tourist || r.age)))
    .map((c) => ({ cafe: c, w: r.prefs.cafe * w * near(r, c.access) * (isBarTime(state, c) ? 1.4 : 1) }));
}

// コーヒースタンド：朝の一杯だけ（D305）。座らずに持ち帰る
function standChoices(state, r) {
  if (!venueOpen(state, 'stand', 10)) return [];
  const w = CONFIG.weatherWeights[state.weather].cafe;
  return ofType(state, 'stand').map((b) => ({ cafe: b, w: r.prefs.cafe * w * CONFIG.stand.pull * near(r, b.access) }));
}

// カフェの上限は島の広さで決まる（D305）
export const cafeMax = (state) => CONFIG.cafe.max + ((state.areas?.length || 1) - 1) * CONFIG.cafe.perArea;

// スーパー：住民だけ。1日1回。夕方に行きたくなる
function superChoices(state, r) {
  if (r.tourist || !r.needShop || !venueOpen(state, 'super', 20)) return [];
  const c = clockOf(state.t);
  const boost = c >= 16 * 60 && c < 19 * 60 + 30 ? CONFIG.super.eveningBoost : 1;
  return ofType(state, 'super').map((b) => ({ cafe: b, w: CONFIG.super.pull * boost * near(r, b.access) }));
}

// ペットショップ：ペットのいる家の人だけ。2日に1回（needPet）
function petshopChoices(state, r) {
  if (r.tourist || !r.needPet || !venueOpen(state, 'petshop', 20)) return [];
  return ofType(state, 'petshop').map((b) => ({ cafe: b, w: CONFIG.petshop.pull * near(r, b.access) }));
}

const householdHasPet = (state, r) => (state.pets || []).some((p) => p.adopted && p.homeId === r.homeId);

// プラネタリウム：雨の日と夜に行きたくなる（屋内）
function planetariumChoices(state, r) {
  if (r.visitedFun || !venueOpen(state, 'planetarium', 45)) return [];
  const P = CONFIG.planetarium;
  const weather = state.weather === 'rain' ? P.rainBoost : state.weather === 'cloudy' ? 1.3 : 1;
  const night = clockOf(state.t) >= 18 * 60 ? P.nightBoost : 1;
  return ofType(state, 'planetarium').map((b) => ({ cafe: b, w: (r.prefs.fun ?? 12) * weather * night * near(r, b.access) }));
}

// 釣り堀：住民だけ。晴れた日に のんびり。1日1回まで（D304）
function pondChoices(state, r) {
  if (r.tourist || r.fished || !venueOpen(state, 'pond', 45)) return [];
  const P = CONFIG.pond;
  const weather = state.weather === 'rain' ? P.rainPull : state.weather === 'cloudy' ? 0.8 : 1;
  return ofType(state, 'pond').map((b) => ({ cafe: b, w: (r.prefs.fish ?? P.pull) * weather * near(r, b.access) }));
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
  if (r.age) return goHome(state, r); // 子どもは ひとりでは出かけない（親についていくか、幼稚園）
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
    ...(avoid === 'petshop' ? [] : petshopChoices(state, r)),
    ...(avoid === 'pond' ? [] : pondChoices(state, r)),
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
    const nearby = roadTiles().filter((i) => roadDistance(r.at, i) <= 6);
    const target = pick(state, nearby.length ? nearby : roadTiles());
    const p = center(target);
    return goTo(state, r, 'stroll', null, target, { x: p.x + between(state, -9, 9), y: p.y + between(state, -9, 9) });
  }
  return goHome(state, r);
}

function arrive(state, r, events) {
  r.at = r.nextAt;
  if (r.carry === 'coffee') r.carry = null; // 持ち帰りのコーヒーは、着くまでに飲み終わる
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
    case 'kinder':
      return enterKinder(state, r, events);
    case 'escort':
      return afterActivity(state, r, 0.3);
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
      if (r.age === 'baby') return; // 赤ちゃんは家の中
      if (r.age === 'kid') return kidAtHome(state, r, events);
      if (t < r.until) return;
      if (waitingForKid(state, r)) return; // 幼稚園に送るまで、親のどちらかは家にいる
      {
        const door = houseDoor(buildingById(state, r.homeId));
        r.x = door.x;
        r.y = door.y;
      }
      if (r.morning) {
        r.morning = false;
        // 朝の一杯。雨の日は行きたくなる人が増える。近いカフェほど行く
        const list = [...cafeChoices(state, r), ...standChoices(state, r)];
        if (list.length) {
          const best = list.reduce((a, b) => (b.w > a.w ? b : a));
          const p = Math.min(1, r.coffee * (state.weather === 'rain' ? 1.2 : 1) * Math.min(1, near(r, best.cafe.access) * 1.5));
          if (rand(state) < p) return goCafe(state, r, best.cafe);
        }
      }
      decideNext(state, r);
      bringCompanions(state, r);
      return;
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
    case 'KINDER':
      if (t >= r.until) leaveKinder(state, r);
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
  if (r.age) homeChance = 1; // 子どもは親と遊んだら家に帰る
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
  if (b.type === 'pond') r.fished = true;
  if (b.type === 'stand') {
    // カウンターの前に立って待つ（見える）
    const f = standFront(b);
    r.tx = f.x;
    r.ty = f.y;
  } else if (b.type === 'cafe' || b.type === 'pond') {
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
  const closeAt = Math.floor(state.t / DAY) * DAY + clockToInDay(closeOf(b));
  // カフェは閉店後も飲み終わるまで居てよい。ただしバーは23時で閉める
  if (b.type !== 'cafe' || isBarTime(state, b)) r.until = Math.min(r.until, Math.max(state.t + 5, closeAt));
  if (r.tourist) r.until = Math.min(r.until, r.bed);
}

function enterVenue(state, r, b, events) {
  if (!buildingOpen(state, b)) {
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
  const night = isBarTime(state, b);
  const value = night ? CONFIG.cafe.bar.nightValue : V.customerValue;
  state.coin += value;
  const t = (state.today.byType[night ? 'bar' : b.type] ||= { served: 0, income: 0 });
  t.served += 1;
  t.income += value;
  if (b.type === 'cafe' && !night) {
    state.today.served += 1;
    state.today.income += value;
  }
  if (b.type === 'super') {
    r.needShop = false;
    r.carry = 'groceries'; // 買い物袋を持って帰る
  }
  if (b.type === 'planetarium') r.visitedFun = true;
  if (b.type === 'petshop') {
    r.needPet = false;
    r.carry = 'petfood';
  }
  if (b.type === 'stand') r.carry = 'coffee'; // 持ち帰りのカップ
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
  if (!buildingOpen(state, b) && b.queue.length > 0) {
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
  const bar = today.byType.bar;
  if (bar?.served) lines.push({ kind: 'good', text: `夜のバーに ${bar.served}人 が来ました（+${bar.income} Coin）` });
  const stand = today.byType.stand;
  if (stand?.served) lines.push({ kind: 'good', text: `コーヒースタンドで ${stand.served}人 がコーヒーを買いました（+${stand.income} Coin）` });
  const pond = today.byType.pond;
  if (pond?.served) lines.push({ kind: 'good', text: `釣り堀に ${pond.served}人 が来ました（+${pond.income} Coin）` });
  const me = today.fishing;
  if (me?.caught?.length) {
    const coin = me.coin ? `（+${me.coin} Coin）` : '';
    lines.push({ kind: 'good', text: `あなたは釣り堀で ${me.caught.length}匹 釣りました${coin}` });
  }
  const ps = today.byType.petshop;
  if (ps?.served) lines.push({ kind: 'good', text: `ペットショップに ${ps.served}人 が来ました（+${ps.income} Coin）` });
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
  const kg = today.kinder || { went: 0, missed: 0 };
  if (kg.went) lines.push({ kind: 'good', text: `幼稚園に ${kg.went}人 が通いました（+${kg.went * CONFIG.kinder.fee} Coin）` });
  if (kg.missed) lines.push({ kind: 'problem', text: `幼稚園がいっぱいで、${kg.missed}人 の子が家で過ごしました` });
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
  const upkeep = venues(state).reduce((s, c) => s + CONFIG[c.type].levels[c.level - 1].upkeep + (c.bar ? CONFIG.cafe.bar.upkeep : 0), 0);
  const onlyCafes = venues(state).every((v) => v.type === 'cafe');
  const shopUpkeep =
    shops(state).reduce((s, b) => s + CONFIG.shop.levels[b.level - 1].upkeep, 0) +
    ofType(state, 'kinder').reduce((s, b) => s + CONFIG.kinder.levels[b.level - 1].upkeep, 0);
  const harborUpkeep = (state.harbors || []).length * CONFIG.harbor.upkeep;
  if (harborUpkeep > 0) {
    state.coin -= harborUpkeep;
    lines.push({ kind: 'info', text: `港の維持費 −${harborUpkeep} Coin` });
  }
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

  // 家族：結婚・引っ越し・赤ちゃん・歩けるようになる（D297）
  for (const l of familyEvents(state, endedDay, events)) lines.push(l);

  // 解放：ひらいた日の日記に書く（ひらくのは条件を満たしたその場・checkUnlocks）
  for (const u of CONFIG.unlocks) {
    const on = u.id === 'port' ? state.port.openedOn ?? state.unlockedOn.port : state.unlockedOn[u.id];
    if (on === endedDay) {
      const why = u.pets ? `家族のペットが ${u.pets}匹 になって` : u.kids ? '島に子どもが生まれて' : `住民が ${u.pop}人 になって`;
      lines.push({ kind: 'good', text: `${why}、${u.done}` });
    }
  }

  // その日の売上（朝の日記の上乗せに使う・D309）
  const earned =
    Object.values(today.byType || {}).reduce((n, t) => n + (t.income || 0), 0) +
    (today.shopIncome || 0) +
    (today.kinder?.went || 0) * CONFIG.kinder.fee;
  const entry = { day: endedDay, weather: state.weather, lines, read: false, earned };
  state.diary.push(entry);
  events.push({ type: 'newday', entry });

  // 新しい1日
  state.weather = chooseWeather(state, dayOf(state.t));
  state.today = freshToday();
  for (const r of state.residents) planDay(state, r);
  planBoats(state);
}

// ---------------------------------------------------------------- 港と観光客（D292）

// 港の一覧。本島の港（state.port）と、広げた土地の港（state.harbors・D298）
export const portsOf = (state) => [state.port, ...(state.harbors || [])];
export const portById = (state, id) => portsOf(state).find((p) => p.id === id);
const portClocks = (port) => (port.id === 'main' ? CONFIG.port.boats : CONFIG.harbor.boats);
export const pierOf = (port) => (port.id === 'main' ? PIER : PIERS[port.id]);
// 観光客が乗ってきた船の名前（本島の港は前の版と同じ番号のまま）
const boatKey = (port, i) => (port.id === 'main' ? i : `${port.id}:${i}`);

function planBoats(state, { onlyFuture = false, only = null } = {}) {
  const P = CONFIG.port;
  for (const port of only ? [only] : portsOf(state)) {
    port.today = [];
    if (!port.open) continue;
    const base = Math.floor(state.t / DAY) * DAY;
    for (const clock of portClocks(port)) {
      const arrive = base + clockToInDay(clock) + Math.round(between(state, 0, 25));
      if (onlyFuture && arrive - P.sail <= state.t) continue;
      port.today.push({ arrive, depart: arrive + P.stay, spawned: false, left: false });
    }
  }
}

// テストや ?debug 用：今すぐ港を開く
export function openPort(state) {
  state.port.open = true;
  state.unlocked ||= {};
  state.unlocked.port = true;
  state.port.openedOn = dayOf(state.t);
  planBoats(state, { onlyFuture: true, only: state.port });
}

// 住民が決まった人数になったら、その場でひらく（D292 の不具合修正：区切りの時刻ではなく、満たした瞬間に判定する）
function checkUnlocks(state, events) {
  for (const u of CONFIG.unlocks) {
    if (isUnlocked(state, u.id) || !unlockMet(state, u)) continue;
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

const adoptedPets = (state) => (state.pets || []).filter((p) => p.adopted).length;
const kidsCount = (state) => state.residents.filter((r) => r.age).length;
function unlockMet(state, u) {
  if (u.pets) return adoptedPets(state) >= u.pets;
  if (u.kids) return kidsCount(state) >= u.kids;
  return state.residents.length >= u.pop;
}

export function isUnlocked(state, id) {
  if (id === 'port') return !!state.port?.open;
  return !!state.unlocked?.[id];
}

// 次の目標（まだひらいていない中で いちばん手前）
export function nextGoal(state) {
  const u = CONFIG.unlocks.find((x) => !isUnlocked(state, x.id));
  if (!u) return null;
  if (u.kids) return { ...u, now: kidsCount(state), need: u.kids, unit: '人', what: '島の子ども' };
  return u.pets
    ? { ...u, now: adoptedPets(state), need: u.pets, unit: '匹', what: '家族のペット' }
    : { ...u, now: state.residents.length, need: u.pop, unit: '人', what: '住民' };
}

// テストや ?debug 用：今すぐ解放する
export function unlockNow(state, id) {
  if (id === 'port') return openPort(state);
  state.unlocked[id] = true;
  state.unlockedOn[id] = dayOf(state.t);
}

function spawnTourists(state, port, boatIdx, boat) {
  const [lo, hi] = CONFIG.port.tourists[state.weather];
  const n = Math.round(between(state, lo, hi));
  const at = pierOf(port);
  const pier = center(at);
  const dir = areaById(port.id).pier.dir;
  for (let k = 0; k < n; k++) {
    const v = {
      id: `v${state.nextId++}`,
      name: '観光客',
      tourist: true,
      boat: boatKey(port, boatIdx),
      pier: at,
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
      at,
      x: pier.x + between(state, -6, 6) + dir[0] * (T + 14 + k * 4),
      y: pier.y + (dir[1] ? dir[1] * (T + 14 + k * 4) : between(state, -6, 6)),
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
  const at = r.pier ?? PIER;
  const pier = center(at);
  const port = portsOf(state).find((p) => pierOf(p) === at) || state.port;
  const [dx, dy] = areaById(port.id).pier.dir;
  const j = between(state, -5, 5);
  goTo(state, r, 'boat', null, at, { x: pier.x + (dx ? dx * (T + 10) : j), y: pier.y + (dy ? dy * (T + 10) : j) });
}

function updatePort(state, events) {
  for (const port of portsOf(state)) updateOnePort(state, port, events);
}

function updateOnePort(state, port, events) {
  if (!port.open) return;
  port.today.forEach((boat, idx0) => {
    const i = boatKey(port, idx0);
    if (!boat.spawned && state.t >= boat.arrive) {
      boat.spawned = true;
      const n = spawnTourists(state, port, idx0, boat);
      events.push({ type: 'boat', n, port: port.id });
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

// 描画用：いま海の上にいる船（いつもの船と臨時の船・D309）
export function boatsNow(state, port = state.port) {
  if (!port?.open) return [];
  const S = CONFIG.port.sail;
  const out = [];
  for (const b of port.today) {
    let p = null;
    if (state.t >= b.arrive - S && state.t < b.arrive) p = { phase: 'arriving', k: (state.t - (b.arrive - S)) / S };
    else if (state.t >= b.arrive && state.t < b.depart) p = { phase: 'docked', k: 1 };
    else if (state.t >= b.depart && state.t < b.depart + S) p = { phase: 'leaving', k: 1 - (state.t - b.depart) / S };
    if (p) out.push({ ...p, depart: b.depart, extra: !!b.extra });
  }
  return out;
}

// 描画用：いま船が海のどこにいるか（null＝見えない）
export function boatNow(state, port = state.port) {
  if (!port?.open) return null;
  const S = CONFIG.port.sail;
  for (const b of port.today) {
    if (b.extra) continue;
    if (state.t >= b.arrive - S && state.t < b.arrive) return { phase: 'arriving', k: (state.t - (b.arrive - S)) / S };
    if (state.t >= b.arrive && state.t < b.depart) return { phase: 'docked', k: 1, depart: b.depart };
    if (state.t >= b.depart && state.t < b.depart + S) return { phase: 'leaving', k: 1 - (state.t - b.depart) / S };
  }
  return null;
}

export function nextBoat(state, port = state.port) {
  return port.today.find((b) => state.t < b.arrive) || null;
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
  syncMap(state);
  const list = [];
  // 家の軒数に上限は無い（D300）。建てられる土地が無くなったら、それが上限
  list.push({ id: 'house', icon: 'house_build', place: 'house', title: '家を建てる', detail: `${CONFIG.house.levels[0].capacity}人まで住める。場所を選べる`, cost: CONFIG.house.cost });
  // 軒数に上限のある施設は、上限に達しても一覧から消さない（消えると理由が分からない・D300）
  const full = cafes(state).length >= cafeMax(state);
  const moreLand = state.areas.length < AREAS.length;
  list.push({
    id: 'cafe', icon: 'cafe_new', place: 'cafe', title: 'カフェをもう1軒つくる',
    detail: full
      ? `カフェは いまの島に ${cafeMax(state)}軒まで${moreLand ? '（島を広げると1軒ずつ増える）' : ''}`
      : `席 3。維持費 1日 ${CONFIG.cafe.levels[0].upkeep} Coin。場所を選べる`,
    cost: CONFIG.cafe.buildCost, locked: full,
  });
  {
    const S = CONFIG.stand;
    const fullS = ofType(state, 'stand').length >= S.max;
    list.push({
      id: 'stand', icon: 'stand_new', place: 'stand', title: 'コーヒースタンドをつくる',
      detail: fullS ? `コーヒースタンドは島に ${S.max}軒まで` : `朝だけ開く（${fmtClock(S.open)}〜${fmtClock(S.close)}）。持ち帰りなので座らない。1マス。維持費 1日 ${S.levels[0].upkeep} Coin`,
      cost: S.buildCost, locked: fullS,
    });
  }
  for (const type of ['pond', 'super', 'petshop', 'planetarium', 'kinder']) {
    const V = CONFIG[type];
    const u = CONFIG.unlocks.find((x) => x.id === type);
    const full = ofType(state, type).length >= V.max;
    const locked = !isUnlocked(state, type) || full;
    const what = type === 'pond'
      ? `住民が釣りに来る。あなたも釣りができる。釣り座 ${V.levels[0].seats}つ。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`
      : type === 'super'
      ? `住民が毎日 買い物に行く。一度に ${V.levels[0].seats}人。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`
      : type === 'kinder'
        ? `子どもが朝 通って、15時に帰る。${V.levels[0].seats}人まで。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`
      : type === 'petshop'
        ? `ペットのいる家の人が通う。一度に ${V.levels[0].seats}人。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`
        : `長く過ごせる屋内の施設。${V.levels[0].seats}席。維持費 1日 ${V.levels[0].upkeep} Coin。場所を選べる`;
    list.push({
      id: type,
      icon: `${type}_new`,
      place: type,
      title: `${VENUE_NAME[type] || '幼稚園'}をつくる`,
      detail: full ? `${VENUE_NAME[type] || '幼稚園'}は島に ${V.max}軒まで` : locked ? (u.pets ? `家族のペットが ${u.pets}匹 になると建てられます` : u.kids ? '島に子どもが生まれると建てられます' : `住民が ${u.pop}人 になると建てられます`) : what,
      cost: V.buildCost,
      locked,
    });
  }
  for (const c of cafes(state)) {
    if (c.bar) continue;
    const B = CONFIG.cafe.bar;
    list.push({
      id: `cafe_bar:${c.id}`,
      icon: 'bar',
      title: `${cafeLabel(state, c)}を カフェ&バーにする`,
      detail: `夜 ${fmtClock(B.close)} まで開く。維持費 1日 +${B.upkeep} Coin`,
      cost: B.cost,
    });
  }
  for (const c of [...venues(state), ...ofType(state, 'kinder')]) {
    const next = CONFIG[c.type].levels[c.level];
    if (!next) continue;
    const unit = c.type === 'kinder' ? '通える子' : c.type === 'super' ? '一度に入れる人' : '席';
    list.push({
      id: `${c.type === 'cafe' ? 'cafe' : 'venue'}_upgrade:${c.id}`,
      icon: 'cafe_upgrade',
      title: `${labelOf(state, c)}を広げる（Lv${next.level}）`,
      detail: `${unit} ${seatCount(c)} → ${next.seats}　維持費 1日 ${next.upkeep} Coin`,
      cost: next.cost,
    });
  }
  {
    const full = shops(state).length >= CONFIG.shop.max;
    list.push({
      id: 'shop',
      icon: 'shop_new',
      place: 'shop',
      title: shops(state).length ? 'お土産屋をもう1軒つくる' : 'お土産屋をつくる',
      detail: full
        ? `お土産屋は島に ${CONFIG.shop.max}軒まで`
        : state.port?.open ? `観光客がお土産を買う。1日 ${CONFIG.shop.levels[0].stock}個まで。維持費 1日 ${CONFIG.shop.levels[0].upkeep} Coin。場所を選べる` : '港がひらくと建てられます',
      cost: CONFIG.shop.cost,
      locked: !state.port?.open || full,
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
  // 家を広げる（D303）：家の数だけ並べると一覧が長くなるので1行にまとめ、広げる家は島の上で選ぶ
  const growable = houses(state).filter((h) => houseUpgradeCost(h) !== null);
  if (growable.length) {
    const L = CONFIG.house.levels;
    list.push({
      id: 'house_upgrade',
      icon: 'house_up',
      pick: 'house',
      title: '家を広げる',
      detail: `住める人が増える（2階建て ${L[1].capacity}人・アパート ${L[2].capacity}人）。広げる家を選べる`,
      cost: Math.min(...growable.map(houseUpgradeCost)),
    });
  }
  const park = parkOf(state);
  if (park && !park.roof) {
    list.push({ id: 'park_roof', icon: 'park_roof', title: '公園に東屋をつくる', detail: '屋根の下なら、雨でも過ごせる', cost: CONFIG.park.roofCost });
  }
  // 島を広げる（D298）：「島」のタブ
  const u = CONFIG.unlocks.find((x) => x.id === 'expand');
  const expandLocked = !isUnlocked(state, 'expand');
  const opened = state.areas.length - 1;
  for (const a of AREAS) {
    if (a.id === 'main' || state.areas.includes(a.id)) continue;
    list.push({
      id: `expand:${a.id}`,
      tab: 'island',
      icon: `expand_${a.id}`,
      title: `${a.name}をひらく`,
      detail: expandLocked ? `住民が ${u.pop}人 になると広げられます` : `建てられる土地が ${landTilesOf(a.id)}マス 増える。道も通る`,
      cost: CONFIG.expand.costs[Math.min(opened, CONFIG.expand.costs.length - 1)],
      locked: expandLocked,
    });
  }
  for (const id of state.areas) {
    if (id === 'main' || portById(state, id)) continue;
    const H = CONFIG.harbor;
    list.push({
      id: `harbor:${id}`,
      tab: 'island',
      icon: 'harbor',
      title: `${areaById(id).name}に港をつくる`,
      detail: state.port.open
        ? `船が1日2回 来る（${H.boats.map(fmtClock).join('・')}ごろ）。維持費 1日 ${H.upkeep} Coin`
        : '本島の港がひらくと つくれます',
      cost: H.cost,
      locked: !state.port.open,
    });
  }
  return list;
}

// place は { c, r }（建てる場所の左上のマス）
export function applyAction(state, id, place) {
  syncMap(state);
  if (id === 'house_upgrade') return upgradeHouse(state, place?.id);
  const action = actionsFor(state).find((a) => a.id === id);
  if (!action || action.locked) return { ok: false, message: 'いまは できません' };
  if (state.coin < action.cost) return { ok: false, message: `Coin が足りません（あと ${action.cost - state.coin}）` };
  if (action.place) {
    if (!place || !canPlace(action.place, place.c, place.r, state.buildings)) return { ok: false, message: 'そこには建てられません' };
    state.buildings.push(makeBuilding(state, action.place, place.c, place.r));
    // スーパーを建てたら、その日から買い物に行く（翌朝まで待たせない）
    if (action.place === 'super') for (const r of state.residents) if (!r.carry) r.needShop = true;
    if (action.place === 'petshop') for (const r of state.residents) if (householdHasPet(state, r)) r.needPet = true;
  } else if (id.startsWith('cafe_upgrade:') || id.startsWith('venue_upgrade:')) {
    const cafe = buildingById(state, id.split(':')[1]);
    cafe.level += 1;
    while (cafe.seats.length < seatCount(cafe)) cafe.seats.push(null);
  } else if (id.startsWith('cafe_bar:')) {
    buildingById(state, id.split(':')[1]).bar = true;
  } else if (id.startsWith('shop_upgrade:')) {
    const shop = buildingById(state, id.split(':')[1]);
    shop.level += 1;
    shop.stock = CONFIG.shop.levels[shop.level - 1].stock;
  } else if (id === 'park_roof') {
    parkOf(state).roof = true;
  } else if (id.startsWith('expand:')) {
    state.areas.push(id.split(':')[1]);
    syncMap(state);
  } else if (id.startsWith('harbor:')) {
    const port = { id: id.split(':')[1], open: true, today: [], openedOn: dayOf(state.t) };
    state.harbors.push(port);
    planBoats(state, { onlyFuture: true, only: port });
  }
  state.coin -= action.cost;
  state.history.push({ t: state.t, action: id, place: place || null });
  return { ok: true, message: `${action.title.replace('（', ' ').replace('）', '')}：完成しました` };
}

// ---------------------------------------------------------------- あなたの釣り（D304）
//
// 画面のミニゲームが「ぴったり／よい／のがした」を決めて、ここに渡す。どの魚が釣れるか・Coin はここで決める。
// 遊ぶのは何回でも。Coin が出るのは1日 rewardsPerDay 回まで（上限が無いと Coin があふれて「何を建てるか選ぶ」が消える）

export function fishingLeft(state) {
  return Math.max(0, CONFIG.pond.game.rewardsPerDay - (state.today.fishing?.rewarded || 0));
}

export function landFish(state, grade) {
  const G = CONFIG.pond.game;
  state.today.fishing ||= { plays: 0, rewarded: 0, coin: 0, caught: [] };
  const f = state.today.fishing;
  f.plays += 1;
  if (grade !== 'perfect' && grade !== 'good') return { ok: true, fish: null, coin: 0, left: fishingLeft(state), grade };
  // 特別なエサ（D309）：つけていれば、釣れる魚は大物。使ったらなくなる（のがしたら残る）
  const bait = state.bait > 0;
  const pool = bait ? G.fish.filter((x) => x.big) : G.fish.filter((x) => grade === 'perfect' || !x.big);
  if (bait) state.bait -= 1;
  let x = rand(state) * pool.reduce((s, y) => s + y.w, 0);
  const fish = pool.find((y) => (x -= y.w) < 0) || pool[0];
  let coin = 0;
  if (fishingLeft(state) > 0) {
    coin = fish.big ? G.coin.big : G.coin[grade];
    f.rewarded += 1;
    f.coin += coin;
    state.coin += coin;
  }
  f.caught.push(fish.id);
  state.fishLog ||= {};
  const first = !state.fishLog[fish.id];
  state.fishLog[fish.id] = (state.fishLog[fish.id] || 0) + 1;
  return { ok: true, fish, coin, left: fishingLeft(state), grade, first };
}

// 「もう少し広い家に住みたい」家族が住んでいる家（D307）。日記に書いた家のうち、まだ空きが無いものだけ
// 目印は「起きていること」（日記と同じ）。どうすればよいかは出さない
export function wantsRoomHouses(state) {
  return (state.wantsRoom || []).filter((id) => {
    const h = buildingById(state, id);
    return h && h.type === 'house' && roomIn(state, id) <= 0;
  });
}

// ---------------------------------------------------------------- リワード広告のおまけ（D309）
//
// 広告そのものは画面（ads.js）が出す。見終わったら、ここの関数でおまけを渡す。
// どれも「島に見えるものが少し増える」。行列・上限・待ち時間は解かない（D303・D305）

export function adsLeft(state, kind) {
  return Math.max(0, CONFIG.ads[kind].perDay - (state.today.ads?.[kind] || 0));
}
const usedAd = (state, kind) => {
  state.today.ads ||= { bonus: 0, boat: 0, bait: 0 };
  state.today.ads[kind] += 1;
};

// 朝の日記：昨日の売上に上乗せ
export function dailyBonus(state) {
  const last = state.diary[state.diary.length - 1];
  if (!last || adsLeft(state, 'bonus') <= 0) return 0;
  const A = CONFIG.ads.bonus;
  return Math.min(A.cap, Math.round((last.earned || 0) * A.rate));
}
export function claimDailyBonus(state) {
  const coin = dailyBonus(state);
  if (coin <= 0) return { ok: false, message: 'いまは もらえません' };
  usedAd(state, 'bonus');
  state.coin += coin;
  return { ok: true, coin, message: `昨日の売上に +${coin} Coin` };
}

// 臨時の観光船：その港に、少しあとで船が着く
export function canCallBoat(state, portId = 'main') {
  const port = portById(state, portId);
  if (!port?.open || adsLeft(state, 'boat') <= 0) return false;
  const c = clockOf(state.t);
  const A = CONFIG.ads.boat;
  if (c < A.from || c >= A.until) return false;
  // 臨時の船は桟橋の反対側に着くので、いつもの船とは重ならない。臨時の船どうしは1隻ずつ
  return !port.today.some((b) => b.extra && state.t < b.depart + CONFIG.port.sail);
}
export function callExtraBoat(state, portId = 'main') {
  if (!canCallBoat(state, portId)) return { ok: false, message: 'いまは船を呼べません' };
  const P = CONFIG.port;
  const port = portById(state, portId);
  const arrive = Math.ceil(state.t + P.sail + 2);
  port.today.push({ arrive, depart: arrive + P.stay, spawned: false, left: false, extra: true });
  usedAd(state, 'boat');
  return { ok: true, message: '臨時の船が、こちらへ向かっています' };
}

// 釣りの特別なエサ
export function addBait(state) {
  if (adsLeft(state, 'bait') <= 0) return { ok: false, message: '今日の特別なエサは おしまい' };
  usedAd(state, 'bait');
  state.bait = (state.bait || 0) + 1;
  return { ok: true, message: '特別なエサをつけました' };
}

// 家を広げる（D303）。place ではなく家の id で選ぶ
function upgradeHouse(state, id) {
  const h = buildingById(state, id);
  if (!h || h.type !== 'house') return { ok: false, message: 'いまは できません' };
  const cost = houseUpgradeCost(h);
  if (cost === null) return { ok: false, message: 'この家は これ以上 広げられません' };
  if (state.coin < cost) return { ok: false, message: `Coin が足りません（あと ${cost - state.coin}）` };
  h.level = (h.level || 1) + 1;
  state.coin -= cost;
  state.history.push({ t: state.t, action: `house_upgrade:${h.id}`, place: null });
  return { ok: true, message: `家を広げました（${capacityOf(h)}人まで住める）` };
}

// ---------------------------------------------------------------- 建物を動かす（D299）
//
// 島を広げたら、家やお店を置き直したくなる（オーナー）。お金はかからない（並べ替えは遊び）。
// 中にいる人・並んでいる人は、建物ごと いっしょに動く。向かっている人は、新しい場所へ行き先を変える。

export function movePlaces(state, id) {
  syncMap(state);
  const b = buildingById(state, id);
  if (!b) return [];
  return placements(b.type, state.buildings.filter((x) => x !== b)).filter((p) => p.c !== b.c || p.r !== b.r);
}

export function canMoveTo(state, id, c, r) {
  syncMap(state);
  const b = buildingById(state, id);
  return !!b && (b.c !== c || b.r !== r) && canPlace(b.type, c, r, state.buildings.filter((x) => x !== b));
}

export function moveBuilding(state, id, place) {
  syncMap(state);
  const b = buildingById(state, id);
  if (!b || !place || !canMoveTo(state, id, place.c, place.r)) return { ok: false, message: 'そこには動かせません' };
  const dx = (place.c - b.c) * T;
  const dy = (place.r - b.r) * T;
  const S = SIZES[b.type];
  // 前の場所（まわり1マスを含む）。ここにいたペットは いっしょに動かす
  const was = { x0: (b.c - 1) * T, y0: (b.r - 1) * T, x1: (b.c + S.w + 1) * T, y1: (b.r + S.h + 1) * T };
  const inWas = (x, y) => x >= was.x0 && x < was.x1 && y >= was.y0 && y < was.y1;
  b.c = place.c;
  b.r = place.r;
  b.access = accessTile(b.type, b.c, b.r);

  const HERE = ['SEATED', 'QUEUE', 'PARK', 'SHOP', 'KINDER'];
  for (const p of everyone(state)) {
    const home = p.homeId === b.id && ['HOME', 'SLEEP'].includes(p.state);
    if (home || (p.destId === b.id && HERE.includes(p.state))) {
      p.x += dx;
      p.y += dy;
      p.tx += dx;
      p.ty += dy;
      p.at = b.access;
      continue;
    }
    if (p.state === 'WALK' && p.destId === b.id) {
      // 向かっていた人：いま立っている道から、新しい場所へ
      const under = idx(Math.floor(p.x / T), Math.floor(p.y / T));
      if (isRoad(under)) p.at = under;
      const end = p.path.length ? p.path[p.path.length - 1] : { x: p.tx, y: p.ty };
      goTo(state, p, p.dest, p.destId, b.access, { x: end.x + dx, y: end.y + dy });
    }
  }
  for (const pet of state.pets || []) {
    if (inWas(pet.x, pet.y)) {
      pet.x += dx;
      pet.y += dy;
    }
    if (inWas(pet.tx, pet.ty)) {
      pet.tx += dx;
      pet.ty += dy;
    }
    if (pet.anchor && inWas(pet.anchor.x, pet.anchor.y)) pet.anchor = { x: pet.anchor.x + dx, y: pet.anchor.y + dy };
  }
  state.history.push({ t: state.t, action: `move:${b.id}`, place });
  return { ok: true, message: `${{ house: '家', park: '公園' }[b.type] || labelOf(state, b)}を動かしました` };
}

// ---------------------------------------------------------------- 画面から読むための情報

export function describeResident(state, r) {
  switch (r.state) {
    case 'WALK': {
      if (r.dest === 'cafe') return `${labelOf(state, buildingById(state, r.destId))}へ向かっている`;
      if (r.dest === 'shop') return `${shopLabel(state, buildingById(state, r.destId))}へ向かっている`;
      return (
        { park: '公園へ向かっている', stroll: r.tourist ? '島を見て回っている' : 'ぶらぶら歩いている', home: '家へ帰るところ', boat: '港へ戻るところ', kinder: '幼稚園へ向かっている', escort: '子どもを幼稚園へ送っている' }[r.dest] ||
        '歩いている'
      );
    }
    case 'QUEUE':
      return `${labelOf(state, buildingById(state, r.destId))}の前で待っている（${Math.round(state.t - r.queuedAt)}分）`;
    case 'SEATED': {
      const b = buildingById(state, r.destId);
      if (b.type === 'super') return 'スーパーで買い物中';
      if (b.type === 'planetarium') return 'プラネタリウムで星を見ている';
      if (b.type === 'pond') return '釣り堀で釣りをしている';
      if (b.type === 'stand') return 'コーヒースタンドで注文している';
      if (b.type === 'petshop') return 'ペットショップで買い物中';
      return isBarTime(state, b) ? `${labelOf(state, b)}で夜のひととき` : `${labelOf(state, b)}でひと休み中`;
    }
    case 'PARK':
      return '公園で過ごしている';
    case 'SHOP':
      return 'お土産を見ている';
    case 'STROLL':
      return r.tourist ? '景色を眺めている' : 'あたりを眺めている';
    case 'HOME':
      return r.age === 'baby' ? '家で すやすや眠っている' : '家にいる';
    case 'SLEEP':
      return '寝ている';
    case 'BEDTIME':
      return '家に帰るところ';
    case 'KINDER':
      return '幼稚園にいる';
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

// ---------------------------------------------------------------- 結婚・子ども・幼稚園（D297）
//
// 独身の大人どうしが、同じ席・公園・散歩道で一緒に過ごした時間が長いと、仲よくなって結婚する。
// 結婚すると同じ家に住む（空きが無ければ、家が建つまで別々）。2日たつと赤ちゃんが生まれ、プレイヤーが名前をつける。
// 赤ちゃんは2日で歩けるようになる。子どもは ひとりでは出かけず、親と公園に行ったり、幼稚園に通ったりする。

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
// 結婚するのは名前のある住民だけ（「島の人と島の人が結婚しました」では誰の話か分からない）
// 名前をつけた「島の人」も結婚する（D310：名前があれば誰の話か分かる）
const single = (r) => !r.age && !r.tourist && (!r.generic || r.named) && !r.spouseId && r.state !== 'PENDING';

function placeKey(r) {
  if (r.state === 'SEATED' || r.state === 'QUEUE') return `v:${r.destId}`;
  if (r.state === 'PARK') return `p:${r.destId}`;
  if (r.state === 'STROLL') return `s:${r.at}`;
  return null;
}

function growAffinity(state, h) {
  const groups = {};
  for (const r of state.residents) {
    if (!single(r)) continue;
    const k = placeKey(r);
    if (k) (groups[k] ||= []).push(r.id);
  }
  for (const ids of Object.values(groups)) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = pairKey(ids[i], ids[j]);
      state.affinity[k] = (state.affinity[k] || 0) + h;
    }
  }
}

const houseCount = (state, homeId) => state.residents.filter((x) => x.homeId === homeId).length;
const roomIn = (state, homeId) => capacityOf(buildingById(state, homeId)) - houseCount(state, homeId);

// 夫婦（と子ども）を、空きのある1軒にまとめる。できなければ false
// その人と、同じ家に住む その人の子ども
const familyOf = (state, p) => state.residents.filter((x) => x.homeId === p.homeId && (x === p || (x.parents && x.parents.includes(p.id))));

// 家族をまるごと別の家へ。飼っているペットも いっしょに
function relocate(state, who, house) {
  const from = new Set(who.map((x) => x.homeId));
  const ids = new Set(who.map((x) => x.id));
  for (const x of who) {
    x.homeId = house.id;
    x.at = house.access;
  }
  for (const pet of state.pets || []) if (from.has(pet.homeId) && ids.has(pet.ownerId)) pet.homeId = house.id;
}

// n人が住める家（空き家を先に）。夫婦が子どもの分として空けている家には入らない（D302・D305）
function roomyHouse(state, n, exclude = []) {
  return houses(state)
    .filter((h) => !exclude.includes(h.id) && openRoom(state, h) >= n)
    .sort((x, y) => houseCount(state, x.id) - houseCount(state, y.id))[0] || null;
}

function moveTogether(state, a, b) {
  if (a.homeId === b.homeId) return true;
  const moveFamily = (from, to) => {
    const who = familyOf(state, from);
    if (roomIn(state, to.homeId) < who.length) return false;
    relocate(state, who, buildingById(state, to.homeId));
    return true;
  };
  if (moveFamily(b, a) || moveFamily(a, b)) return true;
  // どちらの家にも空きが無ければ、2人（と子ども）が住める別の家へ（D305：前は空き家があっても探していなかった）
  const who = [...familyOf(state, a), ...familyOf(state, b)];
  const h = roomyHouse(state, who.length, [a.homeId, b.homeId]);
  if (!h) return false;
  relocate(state, who, h);
  return true;
}

function familyEvents(state, day, events) {
  const F = CONFIG.family;
  const lines = [];
  const byId = (id) => state.residents.find((x) => x.id === id);
  state.wantsRoom = []; // 「もう少し広い家に住みたい」家族の家（D307：家に目印を出す）

  // 赤ちゃん → 歩けるように
  for (const r of state.residents) {
    if (r.age === 'baby' && day - r.bornOn >= F.babyDays) {
      r.age = 'kid';
      lines.push({ kind: 'good', text: `${r.name}が歩けるようになりました` });
    }
  }

  // 別々に住んでいる夫婦は、空きができたら一緒に住む
  for (const a of state.residents) {
    const b = a.spouseId && byId(a.spouseId);
    if (!b || a.id > b.id || a.homeId === b.homeId) continue;
    if (moveTogether(state, a, b)) lines.push({ kind: 'good', text: `${a.name}と${b.name}が、同じ家で暮らしはじめました` });
    else lines.push({ kind: 'problem', text: `${a.name}と${b.name}は、一緒に住める家を探しているようです` });
  }

  // 夫婦と同じ家に住んでいる人は、ほかの家に空きがあれば引っ越す（子どもの部屋をあける）
  for (const a of state.residents) {
    const b = a.spouseId && byId(a.spouseId);
    if (!b || a.id > b.id || a.homeId !== b.homeId || roomIn(state, a.homeId) > 0) continue;
    const other = state.residents.find(
      (x) => x.homeId === a.homeId && x !== a && x !== b && !x.parents?.includes(a.id) && !(x.spouseId && byId(x.spouseId)?.homeId === a.homeId),
    );
    const to = other && freeHouse(state);
    if (to) {
      other.homeId = to.id;
      other.at = to.access;
      lines.push({ kind: 'info', text: `${other.name}は、${a.name}と${b.name}の家を出て、別の家に引っ越しました` });
      continue;
    }
    // 家族だけで いっぱいなら、家族ごと広い家へ（D305：前は引っ越さず「広い家に住みたい」と言い続けていた）
    const family = [...new Set([...familyOf(state, a), ...familyOf(state, b)])];
    const kids = family.filter((x) => x.parents?.includes(a.id)).length;
    if (kids >= F.maxKids) continue;
    const h = roomyHouse(state, family.length + 1, [a.homeId]);
    if (!h) continue;
    relocate(state, family, h);
    lines.push({ kind: 'info', text: `${a.name}と${b.name}の家族は、広い家に引っ越しました` });
  }

  // 赤ちゃんが生まれる（結婚して2日・一緒に住んでいて・家に空きがある）
  for (const a of state.residents) {
    const b = a.spouseId && byId(a.spouseId);
    if (!b || a.id > b.id || a.homeId !== b.homeId) continue;
    if (day - a.marriedOn < F.birthAfterDays || day - (a.lastBirth || 0) < F.birthAfterDays + 1) continue;
    const kids = state.residents.filter((x) => x.parents && x.parents.includes(a.id));
    if (kids.length >= F.maxKids) continue;
    if (roomIn(state, a.homeId) <= 0) {
      lines.push({ kind: 'problem', text: `${a.name}と${b.name}は、もう少し広い家に住みたいようです` });
      state.wantsRoom.push(a.homeId);
      continue;
    }
    const used = new Set(state.residents.map((x) => x.name));
    const name = F.kidNames.find((n) => !used.has(n)) || '赤ちゃん';
    const baby = makeResident(
      state,
      { name, age: 'baby', parents: [a.id, b.id], bornOn: day, prefs: { cafe: 0, park: 30, stroll: 20, fun: 0 }, coffee: 0 },
      buildingById(state, a.homeId),
      false,
    );
    planDay(state, baby);
    a.lastBirth = day;
    b.lastBirth = day;
    state.naming.push(baby.id);
    lines.push({ kind: 'good', text: `${a.name}と${b.name}に、赤ちゃんが生まれました` });
    events.push({ type: 'birth', id: baby.id });
  }

  // 結婚（3日目から・1日に1組まで）
  if (day >= F.minDay) {
    const best = Object.entries(state.affinity)
      .filter(([, v]) => v >= F.affinityNeed)
      .map(([k, v]) => ({ ids: k.split('|'), v }))
      .filter(({ ids }) => ids.every((id) => byId(id) && single(byId(id))))
      .sort((x, y) => y.v - x.v)[0];
    if (best && rand(state) < F.marryChance) {
      const [a, b] = best.ids.map(byId);
      a.spouseId = b.id;
      b.spouseId = a.id;
      a.marriedOn = b.marriedOn = day;
      for (const k of Object.keys(state.affinity)) if (k.split('|').some((id) => id === a.id || id === b.id)) delete state.affinity[k];
      lines.push({ kind: 'good', text: `${a.name}と${b.name}が結婚しました` });
      events.push({ type: 'married', a: a.name, b: b.name });
      const apart = a.homeId !== b.homeId;
      const aHome = a.homeId;
      const bHome = b.homeId;
      if (moveTogether(state, a, b)) {
        const [mover, stay] = a.homeId === aHome ? [b, a] : [a, b];
        if (apart && a.homeId !== aHome && b.homeId !== bHome) lines.push({ kind: 'info', text: `${a.name}と${b.name}は、空いていた家に引っ越しました` });
        else if (apart) lines.push({ kind: 'info', text: `${mover.name}は${stay.name}の家に引っ越しました` });
      } else {
        lines.push({ kind: 'problem', text: `${a.name}と${b.name}は、一緒に住める家を探しているようです` });
      }
    }
  }
  return lines;
}

// 大人が家を出るとき、夫婦や子どもが ついてくることがある
function bringCompanions(state, r) {
  if (r.age || r.tourist || r.state !== 'WALK' || r.dest === 'home') return;
  const F = CONFIG.family;
  const join = (c) => {
    c.at = r.at;
    goTo(state, c, r.dest, r.destId, r.nextAt, r.path.length ? { x: r.path[r.path.length - 1].x + 8, y: r.path[r.path.length - 1].y + 2 } : { x: r.tx + 8, y: r.ty });
    c.x = r.x + 6;
    c.y = r.y + 2;
    c.visible = true;
  };
  const awakeHome = (c) => c && c.homeId === r.homeId && c.state === 'HOME' && state.t >= c.wake && state.t < c.bed;
  // 用のない所には付いていかない（買い物は1日1回、プラネタリウムも1日1回）
  // （施設はどれも dest='cafe' で向かうので、行き先の建物の種類で見る）
  const where = r.dest === 'cafe' ? buildingById(state, r.destId)?.type : r.dest;
  const wants = (c) =>
    ({ super: c.needShop, petshop: c.needPet, planetarium: !c.visitedFun, pond: !c.fished }[where] ?? true);
  const spouse = r.spouseId && state.residents.find((x) => x.id === r.spouseId);
  if (awakeHome(spouse) && wants(spouse) && rand(state) < F.walkTogether) join(spouse);
  if (r.dest === 'park' || r.dest === 'stroll') {
    for (const kid of state.residents) {
      if (kid.age === 'kid' && kid.parents?.includes(r.id) && awakeHome(kid) && rand(state) < F.kidJoins) join(kid);
    }
  }
}

// 子ども：朝は幼稚園へ（親が送る）。それ以外は家にいる（親が公園に連れていく）
function kidAtHome(state, r, events) {
  const kinder = ofType(state, 'kinder')[0];
  const c = clockOf(state.t);
  if (!kinder || r.kinderToday || c < CONFIG.kinder.open || c >= CONFIG.kinder.dropUntil) return;
  // ひとりでは行かない。家にいる親が送っていく
  const parent = state.residents.find((p) => r.parents?.includes(p.id) && p.homeId === r.homeId && p.state === 'HOME' && state.t >= p.wake);
  if (!parent) return;
  r.kinderToday = true;
  goTo(state, r, 'kinder', kinder.id, kinder.access, kinderFront(kinder));
  parent.at = r.at;
  goTo(state, parent, 'escort', kinder.id, kinder.access, { x: kinderFront(kinder).x + 10, y: kinderFront(kinder).y + 2 });
  void events;
}

// 朝、幼稚園に送る子がいて、ほかに家にいる親がいなければ、出かけずに待つ
function waitingForKid(state, r) {
  if (!r.spouseId && !state.residents.some((k) => k.parents?.includes(r.id))) return false;
  if (!ofType(state, 'kinder').length || clockOf(state.t) >= CONFIG.kinder.dropUntil) return false;
  const kids = state.residents.filter((k) => k.age === 'kid' && k.parents?.includes(r.id) && k.homeId === r.homeId && !k.kinderToday);
  if (!kids.length) return false;
  const other = state.residents.find((p) => p.id === r.spouseId && p.homeId === r.homeId && p.state === 'HOME' && state.t >= p.wake);
  return !other;
}

export function kinderFront(k) {
  return { x: (k.c + 1.5) * T, y: (k.r + SIZES.kinder.h) * T - 6 };
}

function enterKinder(state, r, events) {
  const k = buildingById(state, r.destId);
  const seat = k ? k.seats.findIndex((x) => x === null) : -1;
  if (seat < 0) {
    state.today.kinder.missed += 1;
    r.bubble = 'lost';
    r.bubbleUntil = state.t + 20;
    return goHome(state, r);
  }
  k.seats[seat] = r.id;
  r.seat = seat;
  r.state = 'KINDER';
  r.visible = false;
  r.until = Math.floor(state.t / DAY) * DAY + clockToInDay(CONFIG.kinder.close) + between(state, 0, 6);
  state.coin += CONFIG.kinder.fee;
  state.today.kinder.went += 1;
  events.push({ type: 'kinder', name: r.name });
}

function leaveKinder(state, r) {
  const k = buildingById(state, r.destId);
  if (k) k.seats[r.seat] = null;
  r.seat = -1;
  r.visible = true;
  const p = kinderFront(k);
  r.x = r.tx = p.x + between(state, -8, 8);
  r.y = r.ty = p.y;
  goHome(state, r);
}

// 赤ちゃんに名前をつける（プレイヤー）
export function nameBaby(state, id, name) {
  const r = state.residents.find((x) => x.id === id);
  state.naming = state.naming.filter((x) => x !== id);
  if (!r) return { ok: false };
  const n = cleanName(name);
  if (n) r.name = n;
  return { ok: true, message: `${r.name}、ようこそ` };
}

// 名前に使えない文字（画面の HTML に入るので < > & " ' は落とす）。8文字まで
export const cleanName = (name) => (name || '').replace(/[<>&"']/g, '').trim().slice(0, 8);

// 住民の名前を変える（D310）。見た目は変えない（名前で見た目を決めている人は、最初の名前を覚えておく）
export function nameResident(state, id, name) {
  const r = state.residents.find((x) => x.id === id);
  const n = cleanName(name);
  if (!r || r.tourist) return { ok: false, message: 'いまは できません' };
  if (!n) return { ok: false, message: '名前を入れてください' };
  if (n === r.name) return { ok: true, message: `${r.name}のままです` };
  r.lookName ||= r.name;
  r.name = n;
  if (r.generic) r.named = true;
  return { ok: true, message: `これからは「${n}」` };
}

export const parentsOf = (state, r) => (r.parents || []).map((id) => state.residents.find((x) => x.id === id)).filter(Boolean);

// ---------------------------------------------------------------- ペット（D293）
//
// 迷い込んできた ねこ・いぬ に名前をつけて、家族にする。能力は無い（眺めて かわいい、だけ）。
// いぬは飼い主が出かけると後ろをついて歩く。ねこは毎日ちがう場所で昼寝する。雨の日は軒下へ。

const PET_SPOT_LABEL = {
  terrace: 'カフェのテラス', bench: '公園のベンチ', roof: '家の屋根の上', plaza: '広場',
  lawn: '公園の芝生', garden: '家の庭', north: '島の北の木かげ', shopfront: 'お店の前',
};
export const PET_KINDS = Object.keys(CONFIG.pets);

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
  for (const kind of PET_KINDS) {
    const P = CONFIG.pets[kind];
    if (state.petsSpawned[kind] || day < P.day || (day === P.day && clock < P.clock)) continue;
    if (clock < 6 * 60 || clock >= 20 * 60) continue; // 夜には来ない
    const anchor = strayAnchor(state, P.near);
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
    events.push({ type: 'stray', kind, label: P.label, near: { cafe: 'カフェ', park: '公園', north: '島の北' }[P.near] });
  }
}

function strayAnchor(state, near) {
  if (near === 'cafe') {
    const cafe = cafes(state)[0];
    const q = cafe ? queueSlot(cafe, 0) : center(PIER);
    return { x: q.x + 22, y: q.y + 12 };
  }
  if (near === 'north') return { x: (OX + 7.5) * T, y: (OY + 3.6) * T };
  const park = parkOf(state);
  return park ? { x: center(park.access).x, y: center(park.access).y + 10 } : center(PIER);
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
  pet.name = cleanName(name) || CONFIG.pets[pet.kind].name;
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

function spotPoint(state, key, home) {
  const cafe = cafes(state)[0];
  const park = parkOf(state);
  switch (key) {
    case 'terrace':
      return cafe && { x: cafe.c * T + 10, y: (cafe.r + 3) * T - 8 };
    case 'bench':
      return park && { x: (park.c + 1.5) * T + 22, y: (park.r + 3) * T - 16 };
    case 'lawn':
      return park && parkPoint(state, park);
    case 'roof':
      return home && { x: home.c * T + T / 2, y: home.r * T - 2 - houseLift(home) };
    case 'garden':
      return home && landPoint(state, houseDoor(home), 22);
    case 'north':
      return landPoint(state, { x: (OX + 7.5) * T, y: (OY + 3.6) * T }, 45);
    case 'shopfront': {
      const shop = shops(state)[0] || ofType(state, 'super')[0];
      return shop ? { x: shop.c * T + 8, y: (shop.r + SIZES[shop.type].h) * T - 4 } : cafe && { x: cafe.c * T + 10, y: (cafe.r + 3) * T - 8 };
    }
    case 'plaza':
    default:
      return { x: (OX + 8) * T + T / 2 + 14, y: (OY + 11) * T + T / 2 - 12 };
  }
}

function petSpots(state, pet, home) {
  return (CONFIG.pets[pet.kind].spots || ['plaza'])
    .map((key) => ({ key, ...spotPoint(state, key, home) }))
    .filter((p) => p.x !== undefined);
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
    // 飼い主がお店の中にいるあいだは、お店の前で待つ
    if (owner && !owner.visible && owner.state === 'SEATED') {
      const b = buildingById(state, owner.destId);
      if (b) {
        const door = queueSlot(b, 0);
        pet.state = 'WAIT';
        pet.tx = door.x + 30;
        pet.ty = door.y + 4;
        petMove(state, pet, h, 1.2);
        return;
      }
    }
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
      // 家の前に着いてから寝る（着くまでは歩いて帰る・D302）
      pet.tx = door.x + 14;
      pet.ty = door.y + 2;
      pet.state = petMove(state, pet, h, 1) ? 'SLEEP' : 'BEDTIME';
      return;
    }
    if (pet.state === 'FOLLOW' || pet.state === 'SLEEP' || pet.state === 'BEDTIME') pet.until = state.t;
    if (petMove(state, pet, h, 0.9) && state.t >= pet.until) {
      const p = landPoint(state, door, 36);
      pet.tx = p.x;
      pet.ty = p.y;
      pet.state = rand(state) < 0.4 ? 'SIT' : 'WANDER';
      pet.until = state.t + between(state, 6, 25);
    }
    return;
  }

  // ねこ・うさぎ・キツネ・アライグマ（昼寝の場所を選んで過ごす）
  // アライグマは夜の方が元気（21時まで起きている）
  const sleepy = pet.kind === 'raccoon' ? clock >= 23 * 60 || clock < 9 * 60 : night;
  if (sleepy) {
    pet.tx = door.x - 14;
    pet.ty = door.y + 1;
    pet.state = petMove(state, pet, h, kind.speed) ? 'SLEEP' : 'BEDTIME';
    return;
  }
  if (pet.state === 'SLEEP' || pet.state === 'BEDTIME') pet.state = 'WANDER';
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
      const [a, b] = kind.nap || [60, 150];
      pet.until = state.t + between(state, a, b);
    }
    return;
  }
  // WANDER：すこし歩いたら、昼寝の場所を選ぶ（毎日ちがう場所になりやすい）
  if (petMove(state, pet, h, kind.speed) && state.t >= pet.until) {
    const spots = petSpots(state, pet, home);
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
    const where = { cafe: 'カフェ', park: '公園', north: '島の北' }[CONFIG.pets[stray.kind].near];
    return { kind: 'info', text: `${where}のあたりに、迷い${CONFIG.pets[stray.kind].label}がいたようです` };
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
    case 'WAIT':
      return `お店の前で ${owner?.name ?? '飼い主'}を待っている`;
    case 'SIT':
      return 'ひと休みしている';
    default:
      return pet.kind === 'dog' ? '家のまわりを うろうろしている' : 'のんびり歩いている';
  }
}

export { idx };
