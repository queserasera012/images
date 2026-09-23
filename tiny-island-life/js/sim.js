// 島のシミュレーション。DOM にも描画にも触らない（node のテストから直接 呼べる）。
//
// 🔑 シミュレーションは1本だけ（D281）。
// 画面を開いているあいだも、留守のあいだも、同じ tick() を回す。
// 描画は state を読んで絵を置くだけ。画面の NPC は「この状態を演じる役」。
// こうしておけば「画面では空いていたのに、日記では混んでいた」が起きない。

import { CONFIG } from './config.js';
import { HOUSE_SLOTS, PARK, SEATS, QUEUE, STROLL_POINTS, ARRIVAL, houseDoor } from './world.js';

const DAY = 1440;

// 島にやってくる住民の候補（先頭5人が最初の住民）
const RESIDENT_POOL = [
  { name: 'ユウタ', emoji: '🧑', prefs: { cafe: 30, park: 6, stroll: 12 }, coffee: 0.9 },
  { name: 'アヤ', emoji: '👩', prefs: { cafe: 14, park: 30, stroll: 10 }, coffee: 0.6 },
  { name: 'ケンジ', emoji: '👨', prefs: { cafe: 22, park: 10, stroll: 20 }, coffee: 0.9 },
  { name: 'ミナ', emoji: '👧', prefs: { cafe: 10, park: 34, stroll: 16 }, coffee: 0.5 },
  { name: 'ソラ', emoji: '👦', prefs: { cafe: 14, park: 24, stroll: 24 }, coffee: 0.7 },
  { name: 'ハルカ', emoji: '👵', prefs: { cafe: 24, park: 20, stroll: 8 }, coffee: 0.8 },
  { name: 'ダイチ', emoji: '🧔', prefs: { cafe: 18, park: 14, stroll: 26 }, coffee: 0.7 },
  { name: 'リコ', emoji: '👱', prefs: { cafe: 28, park: 12, stroll: 14 }, coffee: 0.6 },
  { name: 'タロウ', emoji: '👴', prefs: { cafe: 16, park: 28, stroll: 10 }, coffee: 0.9 },
  { name: 'ノゾミ', emoji: '🧒', prefs: { cafe: 8, park: 36, stroll: 20 }, coffee: 0.3 },
];

export const WEATHER_LABEL = { sunny: '晴れ', cloudy: 'くもり', rain: '雨' };
export const WEATHER_ICON = { sunny: '☀️', cloudy: '☁️', rain: '🌧️' };

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

// ---------------------------------------------------------------- 新しいゲーム

export function createGame(seed = Date.now()) {
  const state = {
    version: 1,
    seed,
    rng: seed | 0,
    t: clockToInDay(CONFIG.startClock),
    coin: CONFIG.startCoin,
    weather: 'sunny',
    cafe: { level: 1, seats: [null, null, null], queue: [] },
    park: { roof: false },
    houses: [
      { id: 'h1', ...HOUSE_SLOTS[0] },
      { id: 'h2', ...HOUSE_SLOTS[1] },
    ],
    residents: [],
    poolIndex: 0,
    today: freshToday(),
    diary: [],
    history: [],
    nextId: 1,
  };
  for (let i = 0; i < CONFIG.startResidents; i++) addResident(state, { arriving: false });
  // 最初の朝は、全員まだ家の中
  for (const r of state.residents) planDay(state, r);
  return state;
}

function freshToday() {
  return { served: 0, income: 0, lost: [], queueMinutes: { 朝: 0, 昼: 0, 夕方: 0, 夜: 0 }, maxQueue: 0, parkMinutes: {} };
}

function houseOf(state, r) {
  return state.houses.find((h) => h.id === r.homeId);
}

function vacancy(state) {
  return state.houses.length * CONFIG.houseCapacity - state.residents.length;
}

function freeHouse(state) {
  return state.houses.find((h) => state.residents.filter((r) => r.homeId === h.id).length < CONFIG.houseCapacity);
}

function addResident(state, { arriving }) {
  const base = RESIDENT_POOL[state.poolIndex];
  if (!base) return null;
  const home = freeHouse(state);
  if (!home) return null;
  state.poolIndex += 1;
  const door = houseDoor(home);
  const r = {
    id: `r${state.nextId++}`,
    name: base.name,
    emoji: base.emoji,
    prefs: base.prefs,
    coffee: base.coffee,
    homeId: home.id,
    patience: between(state, CONFIG.patienceMin, CONFIG.patienceMax),
    speed: between(state, 0.9, 1.1),
    wake: 0,
    bed: 0,
    state: arriving ? 'PENDING' : 'SLEEP',
    arriveAt: 0,
    x: door.x,
    y: door.y,
    tx: door.x,
    ty: door.y,
    dest: null,
    until: 0,
    seat: -1,
    queuedAt: 0,
    pauseUntil: 0,
    facing: 1,
    visible: false,
    morning: false,
    bubble: null,
    bubbleUntil: 0,
    parkTotal: 0,
  };
  state.residents.push(r);
  return r;
}

// その日の起床・就寝をすこしずつずらす（毎日同じ動きにしない）
function planDay(state, r) {
  const base = Math.floor(state.t / DAY) * DAY;
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

  for (const r of state.residents) updateResident(state, r, h, events);
  updateCafe(state, events);

  const clock = clockOf(state.t);
  if (state.cafe.queue.length > 0) {
    state.today.queueMinutes[timeBucket(clock)] += h;
    state.today.maxQueue = Math.max(state.today.maxQueue, state.cafe.queue.length);
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
  if (r.state === 'WALK' && rand(state) < 0.025 * h) {
    r.pauseUntil = state.t + between(state, 1, 4);
    return false;
  }
  const d = Math.min(dist, CONFIG.walkSpeed * r.speed * h);
  r.x += (dx / dist) * d;
  r.y += (dy / dist) * d;
  if (Math.abs(dx) > 0.5) r.facing = dx > 0 ? 1 : -1;
  return false;
}

function goTo(state, r, dest, point) {
  r.state = 'WALK';
  r.dest = dest;
  r.visible = true;
  // 目的地はすこしずらす（全員が同じ点に向かわない）
  const jitter = dest === 'home' ? 0 : 6;
  r.tx = point.x + between(state, -jitter, jitter);
  r.ty = point.y + between(state, -jitter, jitter);
}

function goHome(state, r) {
  goTo(state, r, 'home', houseDoor(houseOf(state, r)));
}

function parkPoint(state) {
  const a = between(state, 0, Math.PI * 2);
  const d = between(state, 8, PARK.r - 14);
  return { x: PARK.x + Math.cos(a) * d, y: PARK.y + Math.sin(a) * d * 0.8 };
}

function cafeOpen(state, margin = 0) {
  const c = clockOf(state.t);
  return c >= CONFIG.cafe.open && c < CONFIG.cafe.close - margin;
}

function weights(state, r) {
  const w = CONFIG.weatherWeights[state.weather];
  let park = r.prefs.park * w.park;
  if (state.weather === 'rain' && state.park.roof) park = r.prefs.park * CONFIG.rainParkWithRoof;
  return {
    cafe: cafeOpen(state, 30) ? r.prefs.cafe * w.cafe : 0,
    park,
    stroll: r.prefs.stroll * w.stroll,
    home: 16 * w.home,
  };
}

function decideNext(state, r, { noCafe = false } = {}) {
  if (state.t >= r.bed - 20) return goHome(state, r);
  const w = weights(state, r);
  if (noCafe) w.cafe = 0;
  const total = w.cafe + w.park + w.stroll + w.home;
  let x = rand(state) * total;
  if ((x -= w.cafe) < 0) return goTo(state, r, 'cafe', QUEUE[0]);
  if ((x -= w.park) < 0) return goTo(state, r, 'park', parkPoint(state));
  if ((x -= w.stroll) < 0) return goTo(state, r, 'stroll', pick(state, STROLL_POINTS));
  return goHome(state, r);
}

function arrive(state, r, events) {
  switch (r.dest) {
    case 'cafe':
      return enterCafe(state, r, events);
    case 'park': {
      r.state = 'PARK';
      const rainNoRoof = state.weather === 'rain' && !state.park.roof;
      r.until = state.t + (rainNoRoof ? between(state, 8, 18) : between(state, CONFIG.park.stayMin, CONFIG.park.stayMax));
      return;
    }
    case 'stroll':
      r.state = 'STROLL';
      r.until = state.t + between(state, 4, 16);
      return;
    case 'home':
    default:
      r.visible = false;
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
        r.x = ARRIVAL.x;
        r.y = ARRIVAL.y;
        r.visible = true;
        r.bubble = '🧳';
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
        const door = houseDoor(houseOf(state, r));
        r.x = door.x;
        r.y = door.y;
      }
      if (r.morning) {
        r.morning = false;
        // 朝の一杯。雨の日は行きたくなる人が増える
        const p = Math.min(1, r.coffee * (state.weather === 'rain' ? 1.2 : 1));
        if (cafeOpen(state, 30) && rand(state) < p) return goTo(state, r, 'cafe', QUEUE[0]);
      }
      return decideNext(state, r);
    case 'WALK':
      if (moveToward(state, r, h)) arrive(state, r, events);
      return;
    case 'QUEUE': {
      const idx = state.cafe.queue.indexOf(r.id);
      const slot = QUEUE[Math.min(idx, QUEUE.length - 1)];
      r.tx = slot.x;
      r.ty = slot.y;
      moveToward(state, r, h);
      return;
    }
    case 'SEATED':
      moveToward(state, r, h);
      if (t >= r.until) leaveCafe(state, r, events);
      return;
    case 'PARK':
      r.parkTotal += h;
      state.today.parkMinutes[r.id] = (state.today.parkMinutes[r.id] || 0) + h;
      if (moveToward(state, r, h) && rand(state) < 0.04 * h) {
        const p = parkPoint(state);
        r.tx = p.x;
        r.ty = p.y;
      }
      if (t >= r.until || t >= r.bed) afterActivity(state, r, 0.5);
      return;
    case 'STROLL':
      if (moveToward(state, r, h) && t >= r.until) afterActivity(state, r, 0.5);
      return;
  }
}

function afterActivity(state, r, homeChance, opts) {
  if (state.t >= r.bed - 20 || rand(state) < homeChance) return goHome(state, r);
  return decideNext(state, r, opts);
}

// ---------------------------------------------------------------- カフェ

function seatCount(state) {
  return CONFIG.cafe.levels[state.cafe.level - 1].seats;
}

function freeSeat(state) {
  return state.cafe.seats.findIndex((s) => s === null);
}

function sit(state, r, seatIdx) {
  state.cafe.seats[seatIdx] = r.id;
  r.state = 'SEATED';
  r.seat = seatIdx;
  r.tx = SEATS[seatIdx].x;
  r.ty = SEATS[seatIdx].y;
  const linger = state.weather === 'rain' ? CONFIG.cafe.rainLinger : 1;
  r.until = state.t + between(state, CONFIG.cafe.stayMin, CONFIG.cafe.stayMax) * linger;
}

function enterCafe(state, r, events) {
  if (!cafeOpen(state)) {
    // 閉まっていた。売り損ではないので数えない
    r.bubble = '🔒';
    r.bubbleUntil = state.t + 15;
    return afterActivity(state, r, 0.8, { noCafe: true });
  }
  const seat = freeSeat(state);
  if (cafeOpen(state) && seat >= 0 && state.cafe.queue.length === 0) return sit(state, r, seat);
  if (cafeOpen(state) && state.cafe.queue.length < CONFIG.cafe.maxQueue) {
    r.state = 'QUEUE';
    r.queuedAt = state.t;
    state.cafe.queue.push(r.id);
    return;
  }
  // 並ぶ場所も無い
  loseCustomer(state, r, 0, events);
}

function leaveCafe(state, r, events) {
  state.cafe.seats[r.seat] = null;
  r.seat = -1;
  state.coin += CONFIG.cafe.customerValue;
  state.today.served += 1;
  state.today.income += CONFIG.cafe.customerValue;
  events.push({ type: 'served', name: r.name });
  afterActivity(state, r, 0.55);
}

function loseCustomer(state, r, waited, events) {
  state.today.lost.push({ clock: clockOf(state.t), waited: Math.round(waited), name: r.name });
  r.bubble = '😞';
  r.bubbleUntil = state.t + 25;
  events.push({ type: 'lost', name: r.name, waited });
  // 帰った人が、すぐまたカフェに並び直すことはしない
  afterActivity(state, r, 0.6, { noCafe: true });
}

function updateCafe(state, events) {
  const cafe = state.cafe;
  // 閉店したら、並んでいた人は帰る
  if (!cafeOpen(state) && cafe.queue.length > 0) {
    for (const id of cafe.queue.splice(0)) {
      const r = state.residents.find((x) => x.id === id);
      r.bubble = '🔒';
      r.bubbleUntil = state.t + 15;
      afterActivity(state, r, 0.9, { noCafe: true });
    }
    return;
  }
  // 空いた席に、列の先頭から座る
  let seat = freeSeat(state);
  while (seat >= 0 && cafe.queue.length > 0) {
    const id = cafe.queue.shift();
    const r = state.residents.find((x) => x.id === id);
    sit(state, r, seat);
    seat = freeSeat(state);
  }
  // 待ちきれなかった人は帰る
  for (const id of [...cafe.queue]) {
    const r = state.residents.find((x) => x.id === id);
    if (state.t - r.queuedAt > r.patience) {
      cafe.queue.splice(cafe.queue.indexOf(id), 1);
      loseCustomer(state, r, state.t - r.queuedAt, events);
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
    lines.push({ kind: 'good', text: `☕ カフェに ${today.served}人 が来ました（+${today.income} Coin）` });
  }
  const parkFan = Object.entries(today.parkMinutes).sort((a, b) => b[1] - a[1])[0];
  if (parkFan && parkFan[1] >= 60) {
    const r = state.residents.find((x) => x.id === parkFan[0]);
    lines.push({ kind: 'good', text: `🌳 ${r.name}は公園で長いこと過ごしていました` });
  }

  // 困ったこと（答えは書かない。起きたことと損だけ・D281）
  const lostByBucket = {};
  for (const l of today.lost) {
    const b = timeBucket(l.clock);
    lostByBucket[b] = (lostByBucket[b] || 0) + 1;
  }
  const buckets = Object.entries(lostByBucket).sort((a, b) => b[1] - a[1]).slice(0, 2);
  for (const [b, n] of buckets) {
    lines.push({
      kind: 'problem',
      text: `${b}、カフェの前で待っていた ${n}人 が、帰ってしまいました（−${n * CONFIG.cafe.customerValue} Coin）`,
    });
  }
  if (buckets.length === 0) {
    const q = Object.entries(today.queueMinutes).sort((a, b) => b[1] - a[1])[0];
    if (q && q[1] >= 10) {
      lines.push({ kind: 'problem', text: `${q[0]}、カフェの前に列ができていました（いちばん長いときで ${today.maxQueue}人）` });
    }
  }

  // 維持費
  const upkeep = CONFIG.cafe.levels[state.cafe.level - 1].upkeep;
  if (upkeep > 0) {
    state.coin -= upkeep;
    lines.push({ kind: 'info', text: `🧾 カフェの維持費 −${upkeep} Coin` });
  }

  // 人口：空き家があって、昨日のカフェで座れた人が多ければ、1人やってくる
  const customers = today.served + today.lost.length;
  const satisfaction = customers === 0 ? 1 : today.served / customers;
  const hasCandidate = state.poolIndex < RESIDENT_POOL.length;
  if (hasCandidate) {
    if (vacancy(state) <= 0) {
      lines.push({ kind: 'problem', text: '🏠 島に住みたい人がいたようですが、空いている家がありませんでした' });
    } else if (satisfaction < CONFIG.growth.minSatisfaction) {
      lines.push({ kind: 'problem', text: '🧳 島を見に来た人がいましたが、住むのはやめたようです' });
    } else {
      const r = addResident(state, { arriving: true });
      r.arriveAt = Math.floor(state.t / DAY) * DAY + clockToInDay(8 * 60) + between(state, 0, 90);
      lines.push({ kind: 'good', text: `🧳 今日、${r.name}が島に引っ越してくるそうです` });
    }
  }

  const entry = { day: endedDay, weather: state.weather, lines, read: false };
  state.diary.push(entry);
  events.push({ type: 'newday', entry });

  // 新しい1日
  state.weather = chooseWeather(state, dayOf(state.t));
  state.today = freshToday();
  for (const r of state.residents) planDay(state, r);
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

export function actionsFor(state) {
  const list = [];
  const next = CONFIG.cafe.levels[state.cafe.level];
  if (next) {
    list.push({
      id: 'cafe_upgrade',
      icon: '☕',
      title: `カフェを広げる（Lv${next.level}）`,
      detail: `席 ${seatCount(state)} → ${next.seats}　維持費 1日 ${next.upkeep} Coin`,
      cost: next.cost,
    });
  }
  if (!state.park.roof) {
    list.push({ id: 'park_roof', icon: '🛖', title: '公園に東屋をつくる', detail: '屋根の下なら、雨でも過ごせる', cost: CONFIG.park.roofCost });
  }
  if (state.houses.length < HOUSE_SLOTS.length) {
    list.push({ id: 'house_build', icon: '🏠', title: '家を建てる', detail: `${CONFIG.houseCapacity}人まで住める`, cost: CONFIG.house.cost });
  }
  return list;
}

export function applyAction(state, id) {
  const action = actionsFor(state).find((a) => a.id === id);
  if (!action) return { ok: false, message: 'いまは できません' };
  if (state.coin < action.cost) return { ok: false, message: `Coin が足りません（あと ${action.cost - state.coin}）` };
  state.coin -= action.cost;
  if (id === 'cafe_upgrade') {
    state.cafe.level += 1;
    while (state.cafe.seats.length < seatCount(state)) state.cafe.seats.push(null);
  } else if (id === 'park_roof') {
    state.park.roof = true;
  } else if (id === 'house_build') {
    const slot = HOUSE_SLOTS[state.houses.length];
    state.houses.push({ id: `h${state.houses.length + 1}`, ...slot });
  }
  state.history.push({ t: state.t, action: id });
  return { ok: true, message: `${action.title}：完成しました` };
}

// ---------------------------------------------------------------- 画面から読むための情報

export function describeResident(state, r) {
  switch (r.state) {
    case 'WALK':
      return { cafe: 'カフェへ向かっている', park: '公園へ向かっている', stroll: 'ぶらぶら歩いている', home: '家へ帰るところ' }[r.dest] || '歩いている';
    case 'QUEUE':
      return `カフェの前で待っている（${Math.round(state.t - r.queuedAt)}分）`;
    case 'SEATED':
      return 'カフェでひと休み中';
    case 'PARK':
      return '公園で過ごしている';
    case 'STROLL':
      return 'あたりを眺めている';
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
  return { cafe: 'カフェが好き', park: '公園が好き', stroll: '散歩が好き' }[top];
}

export { seatCount };
