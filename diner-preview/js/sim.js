// ルールのすべて。DOM に触らない（node のテストでそのまま動く）。
// 画面（main.js）は state を読み、ここの関数を呼ぶだけ。
import {
  DAY, STATIONS, DISHES, GUEST, DEMAND, WEATHER, RUSH, REP, STAGES, SHOP,
  STAFF, STAFF_NAMES, REGULARS, REGULAR, ADS, START, TRIAL_COST, GENRES, BRANCH_ORDER, EVENTS,
} from './config.js';

export const SAVE_VERSION = 1;

// ---- 乱数（同じ種なら同じ一日になる） ----
function hash(a, b) {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function rand(today) {
  let t = (today.rng = (today.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const genreOf = (s) => s.genre || 'washoku';
const shopOfDish = (d) => d.shop || 'washoku';
const shopOfReg = (r) => r.shop || 'washoku';
export const regularsOf = (s) => REGULARS.filter((r) => shopOfReg(r) === genreOf(s));
// 店の段。名前は ジャンルごと（中華なら「小さな中華料理店」）
export const stageOf = (s, i = s.stage) => STAGES[i] && { ...STAGES[i], name: GENRES[genreOf(s)].stageNames[i] };
// この店で使える食材と、使えるようになる段
export const ingredientsOf = (s) => GENRES[genreOf(s)].ing;
export const stars = (rep) => Math.max(1, Math.min(5, Math.floor(rep / 20) + 1));
export const clockOf = (t) => DAY.openMin + (t / DAY.seconds) * (DAY.closeMin - DAY.openMin);
export const fmtClock = (min) => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
export const canCook = (s, dishId) => DISHES[dishId].steps.every(([type]) => s.stations.some((st) => st.type === type));
// 値段が「来る人数」に効く倍率。出している料理の 値段比（ふつうの値段に対して）の平均で決まる
export function priceDemand(s) {
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && canCook(s, id) && s.known.includes(id));
  if (!on.length) return 1;
  const r = on.reduce((a, [id, m]) => a + m.price / DISHES[id].base, 0) / on.length;
  if (r >= 1) return Math.max(0.1, 1 - GUEST.demandUp * (r - 1));
  return Math.min(GUEST.maxBoost, 1 + GUEST.demandDown * (1 - r));
}

// ---- はじめの状態 ----
// 店ごとに持つもの（お金・日付・日報・広告は 全部の店で共通）
export const SHOP_KEYS = ['genre', 'stage', 'totalSales', 'rep', 'seats', 'stations', 'staff', 'menu', 'prep', 'known', 'tried', 'regulars', 'lastCrew'];
export function createShop(genre = 'washoku') {
  const g = GENRES[genre];
  const start = g.start || START;
  const menu = {};
  const prep = {};
  for (const [id, d] of Object.entries(DISHES)) {
    if (d.start && shopOfDish(d) === genre) { menu[id] = { on: true, price: d.base }; prep[id] = start.prep || 8; }
  }
  const stations = [];
  for (const [type, n] of Object.entries(start.stations)) for (let i = 0; i < n; i++) stations.push({ id: `${type}${i}`, type });
  const regulars = {};
  for (const r of REGULARS) if (shopOfReg(r) === genre) regulars[r.id] = { love: 0, lastDay: 0, visits: 0, noted: false, upset: 0 };
  return {
    genre, stage: g.startStage || 0, totalSales: 0, rep: REP.start, seats: start.seats, stations, staff: [],
    menu, prep, known: Object.keys(menu), tried: [], regulars, lastCrew: [],
  };
}
export function createState(seed = (Date.now() >>> 0)) {
  return {
    v: SAVE_VERSION, seed, day: 1, money: START.money, debt: 0, ...createShop('washoku'), branches: {},
    ads: 0, boosts: { market: false, flyer: false, freeTrial: false },
    history: [], reports: [], log: [{ day: 1, kind: 'open', text: '屋台を開いた' }], lastReport: null, today: null, phase: 'night',
  };
}

// ---- 2号店から ----
// 立っている店のものは s の上に、ほかの店のものは s.branches に しまっておく
const pickShop = (s) => Object.fromEntries(SHOP_KEYS.map((k) => [k, s[k]]));
function swapTo(s, genre) {
  if (genreOf(s) === genre || !s.branches[genre]) return false;
  const away = pickShop(s);
  Object.assign(s, s.branches[genre]);
  delete s.branches[genre];
  s.branches[away.genre] = away;
  return true;
}
// 開いている店（番号の順）
export const shopsOf = (s) => BRANCH_ORDER.filter((g) => g === genreOf(s) || s.branches[g]);
export const shopInfo = (s, genre) => (genre === genreOf(s) ? s : s.branches[genre]);
// あした あなたが立つ店を変える（夜だけ）
export function switchShop(s, genre) {
  if (s.phase !== 'night') return { ok: false };
  return { ok: swapTo(s, genre) };
}
export function nextBranch(s) {
  const genre = BRANCH_ORDER.find((g) => !shopsOf(s).includes(g));
  if (!genre) return null;
  const g = GENRES[genre];
  const base = shopInfo(s, g.need.shop);
  const ready = !!base && base.stage >= g.need.stage;
  return { genre, ...g, ready, affordable: s.money >= g.price, needName: `${GENRES[g.need.shop].name}が ${GENRES[g.need.shop].stageNames[g.need.stage]}に なったら` };
}
export function openBranch(s) {
  const n = nextBranch(s);
  if (!n || !n.ready || !n.affordable || s.phase !== 'night') return { ok: false };
  s.money -= n.price;
  s.branches[n.genre] = createShop(n.genre);
  note(s, 'stage', `${n.no}号店「${n.name}」を出した`);
  // いまの店は あしたから アルバイトで回る。呼んでいなければ きのうの人を呼んでおく
  if (!s.staff.length) rehire(s);
  const home = { genre: genreOf(s), crew: s.staff.map((x) => x.name), open: crewOk(s.staff) };
  swapTo(s, n.genre);
  return { ok: true, name: n.name, home };
}
// 立たない店は アルバイトだけで回る。店長が きのうと同じ人を呼ぶ
// 回るのは 仕込み係（札を受ける）と ホール係（台から運ぶ）が いるとき。ほかの台は 人がいなくても 流れる
export const crewOk = (staff) => staff.some((x) => x.role === 'board') && staff.some((x) => x.role === 'hall');
export function crewPlan(s, genre) {
  const sh = shopInfo(s, genre);
  const staff = sh.staff.length ? sh.staff : sh.lastCrew;
  return { staff, open: crewOk(staff), why: staff.length ? '仕込み係と ホール係が 要る' : '人がいない' };
}
// ほかの店の アルバイトを、店を切り替えずに 呼ぶ・帰す（夜だけ）
function atShop(s, genre, fn) {
  if (genre === genreOf(s)) return fn();
  if (!s.branches[genre]) return { ok: false };
  const home = genreOf(s);
  swapTo(s, genre);
  try { return fn(); } finally { swapTo(s, home); }
}
export const canHireAt = (s, genre, role) => atShop(s, genre, () => canHire(s, role));
export const hireAt = (s, genre, role) => atShop(s, genre, () => hire(s, role));
export const fireAt = (s, genre, id) => atShop(s, genre, () => { fire(s, id); return { ok: true }; });
export const canRehireAt = (s, genre) => atShop(s, genre, () => canRehire(s));
export const rehireAt = (s, genre) => atShop(s, genre, () => rehire(s));

// ---- 夜の準備 ----
export function setPrice(s, dishId, price) {
  const d = DISHES[dishId];
  const p = Math.round(Math.max(d.base * 0.5, Math.min(d.base * 2, price)) / 10) * 10;
  s.menu[dishId].price = p;
}
export function toggleMenu(s, dishId) { s.menu[dishId].on = !s.menu[dishId].on; }
export function setPrep(s, dishId, n) { s.prep[dishId] = Math.max(0, Math.min(60, Math.round(n))); }
export function prepCost(s) {
  let c = 0;
  for (const [id, m] of Object.entries(s.menu)) if (m.on && canCook(s, id)) c += (s.prep[id] || 0) * DISHES[id].cost;
  return s.boosts.market ? Math.round(c / 2) : c;
}

export function shopPrice(s, kind) {
  if (kind === 'seat') return SHOP.seat.price(s.seats);
  return SHOP[kind].price(s.stations.filter((st) => st.type === kind).length);
}
export function canBuy(s, kind) {
  const st = stageOf(s);
  const nx = stageOf(s, s.stage + 1);
  const cap = `${st.name}では ここまで${nx ? `（${nx.name}に広げると増やせる）` : ''}`;
  if (kind === 'seat' && s.seats >= st.maxSeats) return { ok: false, why: cap };
  if (kind !== 'seat' && s.stations.length >= st.maxStations) return { ok: false, why: cap };
  if (kind === 'fryer' && s.stage === 0) return { ok: false, why: '小さな食堂から' };
  if (s.money < shopPrice(s, kind)) return { ok: false, why: 'お金が足りない' };
  return { ok: true };
}
export function buy(s, kind) {
  const c = canBuy(s, kind);
  if (!c.ok) return c;
  s.money -= shopPrice(s, kind);
  if (kind === 'seat') s.seats += 1;
  else s.stations.push({ id: `${kind}${s.stations.length}`, type: kind });
  return { ok: true };
}

// あゆみ（外観のタブに出す出来事）
function note(s, kind, text) { s.log.push({ day: s.day, kind, text }); if (s.log.length > 40) s.log.shift(); }

export function canHire(s, role) {
  if (s.staff.length >= stageOf(s).maxStaff) return { ok: false, why: `${stageOf(s).name}では ここまで` };
  if (s.staff.length >= s.stations.length + 1) return { ok: false, why: '台の数 ＋ ホール1人 まで' };
  if (role !== 'hall' && !s.stations.some((st) => st.type === role)) return { ok: false, why: `${STATIONS[role].name}が無い` };
  if (role !== 'hall' && s.staff.filter((x) => x.role === role).length >= s.stations.filter((st) => st.type === role).length) return { ok: false, why: `${STATIONS[role].name}の数だけ` };
  if (role === 'hall' && s.staff.some((x) => x.role === 'hall')) return { ok: false, why: '1人で足りる' };
  return { ok: true };
}
export function hire(s, role) {
  const c = canHire(s, role);
  if (!c.ok) return c;
  const used = new Set([...s.staff, ...Object.values(s.branches || {}).flatMap((b) => b.staff)].map((x) => x.name));
  const name = STAFF_NAMES.find((n) => !used.has(n)) || `スタッフ${s.staff.length + 1}`;
  s.staff.push({ id: `st${s.day}_${s.staff.length}`, name, role });
  if (!s.log.some((x) => x.kind === 'staff')) note(s, 'staff', `はじめてのアルバイト ${name}さん`);
  return { ok: true, name };
}
export function fire(s, staffId) { s.staff = s.staff.filter((x) => x.id !== staffId); }
// アルバイトは その日1日だけ。閉店したら帰るので、毎晩 呼び直す。
// 「きのうと同じ人」を まとめて呼べる（呼べない役は飛ばす）
export function canRehire(s) { return s.staff.length === 0 && s.lastCrew.length > 0; }
export function rehire(s) {
  if (!canRehire(s)) return { ok: false };
  let n = 0;
  for (const x of s.lastCrew) {
    if (!canHire(s, x.role).ok) continue;
    s.staff.push({ id: `st${s.day}_${s.staff.length}`, name: x.name, role: x.role });
    n += 1;
  }
  return { ok: n > 0, n };
}
export const wages = (s) => s.staff.reduce((a, x) => a + STAFF[x.role].wage, 0);

export function nextStage(s) {
  const st = stageOf(s, s.stage + 1);
  if (!st) return null;
  const ready = s.totalSales >= st.unlock.totalSales && s.rep >= st.unlock.rep;
  return { ...st, ready, affordable: s.money >= st.price };
}
export function expand(s) {
  const n = nextStage(s);
  if (!n || !n.ready || !n.affordable) return { ok: false };
  s.money -= n.price;
  s.stage += 1;
  note(s, 'stage', `${n.name}になった`);
  return { ok: true, name: n.name };
}

// レシピ帳：食材2つで試作する
export function tryRecipe(s, a, b) {
  if (a === b) return { ok: false, why: 'ちがう食材を2つ' };
  const ing = ingredientsOf(s);
  if (!(a in ing) || !(b in ing)) return { ok: false, why: 'この店では使わない食材' };
  if (ing[a] > s.stage || ing[b] > s.stage) return { ok: false, why: 'まだ仕入れられない食材' };
  const key = [a, b].sort().join('+');
  if (s.tried.includes(key)) return { ok: false, why: 'もう試した組み合わせ' };
  const free = s.boosts.freeTrial;
  if (!free && s.money < TRIAL_COST) return { ok: false, why: 'お金が足りない' };
  if (free) s.boosts.freeTrial = false; else s.money -= TRIAL_COST;
  s.tried.push(key);
  const hit = Object.entries(DISHES).find(([, d]) => d.combo && shopOfDish(d) === genreOf(s) && d.stage <= s.stage && [...d.combo].sort().join('+') === key);
  if (hit && !s.known.includes(hit[0])) {
    const [id, d] = hit;
    s.known.push(id);
    s.menu[id] = { on: true, price: d.base };
    s.prep[id] = 6;
    note(s, 'recipe', `${d.name}を考えた`);
    return { ok: true, found: id };
  }
  return { ok: true, found: null };
}

// 広告（見た人だけが得をする）
export function adLeft(s) { return Math.max(0, ADS.perDay - s.ads); }
export function watchAd(s, kind) {
  if (adLeft(s) <= 0) return { ok: false };
  if (kind === 'profit') {
    const r = s.lastReport;
    if (!r || r.adDone || r.profit <= 0) return { ok: false };
    const add = Math.round(r.profit * (ADS.profitMul - 1));
    s.money += add; r.adDone = true; r.adBonus = add;
    const kept = s.reports.find((x) => x.day === r.day && (x.shop || 'washoku') === (r.shop || 'washoku'));
    if (kept) { kept.adDone = true; kept.adBonus = add; }
  } else if (kind in s.boosts) {
    if (s.boosts[kind]) return { ok: false };
    s.boosts[kind] = true;
  } else return { ok: false };
  s.ads += 1;
  return { ok: true };
}

// ---- 営業 ----
function pickWeather(r) {
  let x = r;
  for (const w of WEATHER) { if ((x -= w.p) < 0) return w; }
  return WEATHER[0];
}
function rushWeight(min) {
  for (let i = RUSH.length - 1; i >= 0; i--) if (min >= RUSH[i][0]) return RUSH[i][1];
  return RUSH[0][1];
}

const SALT = { washoku: 0, chuka: 7919 };
// あしたの天気と出来事は 種と日付から決まっている（夜の貼り紙に出す）
export function weatherOf(s, day = s.day) { return pickWeather(rand({ rng: hash(s.seed, day) })); }
export function eventOf(s, day = s.day) {
  if (day < 3) return null;
  const r = { rng: hash(s.seed + 104729, day) };
  if (rand(r) >= EVENTS.chance) return null;
  return EVENTS.list[Math.floor(rand(r) * EVENTS.list.length)];
}
export function startDay(s, { branch = false, weather = null } = {}) {
  // 営業の途中で閉じたら、開店前の状態に戻すための写し
  const snap = branch ? null : JSON.stringify({ ...s, today: null, phase: 'night' });
  const today = { snap, branch, rng: hash(s.seed + (SALT[genreOf(s)] || 0), s.day), t: 0, idSeq: 1, guests: [], jobs: [], slots: {}, stock: {}, events: [], evSeq: 1 };
  // 天気は 町に1つ（どの店も同じ）
  today.weather = weather || weatherOf(s).id;
  const ev = eventOf(s);
  today.event = ev ? ev.id : null;
  today.repMul = ev && ev.repMul ? ev.repMul : 1;
  if (!weather && genreOf(s) === 'washoku') rand(today);
  const w = WEATHER.find((x) => x.id === today.weather);

  // 仕入れ。お金が足りない分は ツケ（閉店のときに 売上から返す）
  const cost = prepCost(s);
  for (const [id, m] of Object.entries(s.menu)) {
    if (m.on && canCook(s, id)) today.stock[id] = s.prep[id] || 0;
  }
  today.credit = Math.max(0, cost - s.money);
  s.debt = (s.debt || 0) + today.credit;
  today.bought = { ...today.stock };
  today.prepCost = cost;
  s.money = Math.max(0, s.money - cost);

  // お客さんの来る時刻を先に決める
  const n = Math.round((DEMAND.base + s.rep * DEMAND.perRep) * w.mul * (s.boosts.flyer ? ADS.flyerMul : 1) * priceDemand(s) * (ev && ev.nMul ? ev.nMul : 1));
  const arrivals = [];
  const span = DAY.seconds * DAY.lastEntryRatio;
  while (arrivals.length < n) {
    const t = rand(today) * span;
    const boost = ev && ev.period && periodOf(clockOf(t)) === ev.period ? ev.boost : 1;
    if (rand(today) * 2.4 < rushWeight(clockOf(t)) * boost) arrivals.push(t);
  }
  arrivals.sort((a, b) => a - b);
  // 常連さん（来る日を決める。嫌なことがあった直後は 来にくい）
  const regs = regularsOf(s).filter((r) => s.day >= 2 && rand(today) < REGULAR.chance + s.regulars[r.id].love * 0.08 - ((s.regulars[r.id].upset || 0) > 0 ? REGULAR.upsetDrop : 0));
  today.arrivals = arrivals.map((at, i) => ({ at, look: Math.floor(rand(today) * 12), reg: null, i }));
  for (const r of regs) {
    const a = today.arrivals[Math.floor(rand(today) * today.arrivals.length)];
    if (a && !a.reg) { a.reg = r.id; a.look = r.look; }
  }
  today.next = 0;
  for (const st of s.stations) today.slots[st.id] = null;
  today.stats = {
    served: 0, sales: 0, left: { queue: 0, wait: 0, soldOut: 0, pricey: 0 }, lostSales: 0,
    leftBy: { lunch: 0, day: 0, dinner: 0 }, soldOutAt: {}, sold: {}, regulars: {}, usual: [], repStart: s.rep, closedOut: 0,
  };
  s.today = today;
  if (branch) return today;
  s.boosts.market = false; s.boosts.flyer = false;
  s.phase = 'service';
  return today;
}

function emit(today, ev) { today.events.push({ id: today.evSeq++, t: today.t, ...ev }); if (today.events.length > 60) today.events.shift(); }
const periodOf = (min) => (min < 14 * 60 ? 'lunch' : min < 17 * 60 ? 'day' : 'dinner');
const guestById = (today, id) => today.guests.find((g) => g.id === id);
const seatedCount = (today) => today.guests.filter((g) => g.seat != null).length;

function freeSeat(s, today) {
  const used = new Set(today.guests.filter((g) => g.seat != null).map((g) => g.seat));
  for (let i = 0; i < s.seats; i++) if (!used.has(i)) return i;
  return null;
}

function order(s, today, g) {
  const sense = GUEST.priceSense;
  const cands = [];
  let wantedButOut = false;
  for (const [id, m] of Object.entries(s.menu)) {
    if (!m.on || !canCook(s, id) || !s.known.includes(id)) continue;
    const d = DISHES[id];
    const ratio = m.price / d.base;
    let w = ratio > GUEST.maxPriceRatio ? 0 : d.appeal * Math.exp(-sense * (ratio - 1));
    if (g.reg && REGULARS.find((r) => r.id === g.reg).fav === id) w *= 3;
    if ((today.stock[id] || 0) <= 0) { if (w >= GUEST.minWeight) wantedButOut = true; continue; }
    cands.push([id, w]);
  }
  const best = cands.reduce((a, c) => Math.max(a, c[1]), 0);
  if (best < GUEST.minWeight) return wantedButOut ? 'soldOut' : 'pricey';
  const sum = cands.reduce((a, c) => a + c[1], 0);
  let x = rand(today) * sum;
  let pick = cands[0][0];
  for (const [id, w] of cands) { if ((x -= w) < 0) { pick = id; break; } }
  today.stock[pick] -= 1;
  if (today.stock[pick] === 0) today.stats.soldOutAt[pick] = clockOf(today.t);
  g.dish = pick; g.price = s.menu[pick].price;
  if (g.reg) {
    const r = REGULARS.find((x) => x.id === g.reg);
    if (r.fav === pick && s.regulars[g.reg].love >= REGULAR.loveToUsual) { g.usual = true; today.stats.usual.push(g.reg); }
  }
  today.jobs.push({ id: today.idSeq++, guest: g.id, dish: pick, step: 0, state: 'ticket', station: null, prog: 0, at: today.t });
  return null;
}

function leave(s, today, g, reason) {
  g.state = 'gone';
  const job = today.jobs.find((j) => j.guest === g.id);
  if (job) {
    if (job.station) today.slots[job.station] = null;
    today.jobs = today.jobs.filter((j) => j !== job);
  }
  if (reason) {
    today.stats.left[reason] += 1;
    today.stats.leftBy[periodOf(clockOf(today.t))] += 1;
    const lost = g.price || avgPrice(s);
    today.stats.lostSales += lost;
    s.rep = clampRep(s.rep + (reason === 'soldOut' ? REP.soldOut : reason === 'pricey' ? REP.tooPricey : REP.left) * (today.repMul || 1));
    if (g.reg) today.stats.regulars[g.reg] = 'left';
    emit(today, { type: 'leave', reason, seat: g.seat, guest: g.id, look: g.look });
  }
  g.seat = null;
}
function avgPrice(s) {
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && canCook(s, id));
  return on.length ? Math.round(on.reduce((a, [, m]) => a + m.price, 0) / on.length) : 500;
}
const clampRep = (r) => Math.max(0, Math.min(100, r));

// 空いている台。人のいる台を先に使う（そこから先は ひとりでに進む）
function freeStation(s, today, type) {
  const free = s.stations.filter((x) => x.type === type && today.slots[x.id] == null);
  const st = free.find((x) => staffOf(s, x.id)) || free[0];
  return st ? st.id : null;
}
function stepOf(job) { return DISHES[job.dish].steps[job.step]; }

// 札をタップ → 1つめの台で作り始める
export function tapTicket(s, jobId, at = null) {
  const today = s.today;
  const job = today && today.jobs.find((j) => j.id === jobId);
  if (!job || job.state !== 'ticket') return { ok: false };
  const sid = at || freeStation(s, today, stepOf(job)[0]);
  if (!sid) return { ok: false, why: `${STATIONS[stepOf(job)[0]].name}が ふさがっている` };
  job.state = 'cook'; job.station = sid; job.prog = 0; today.slots[sid] = job.id;
  return { ok: true };
}
// できあがった台をタップ → 次の台か、受け渡し台へ
export function tapStation(s, stationId) {
  const today = s.today;
  const jobId = today && today.slots[stationId];
  const job = jobId != null && today.jobs.find((j) => j.id === jobId);
  if (!job || job.state !== 'ready') return { ok: false };
  const steps = DISHES[job.dish].steps;
  if (job.step + 1 < steps.length) {
    const type = steps[job.step + 1][0];
    const sid = freeStation(s, today, type);
    if (!sid) return { ok: false, why: `${STATIONS[type].name}が ふさがっている` };
    today.slots[stationId] = null;
    job.step += 1; job.state = 'cook'; job.station = sid; job.prog = 0; today.slots[sid] = job.id;
  } else {
    const onPass = today.jobs.filter((j) => j.state === 'pass').length;
    if (onPass >= stageOf(s).pass) return { ok: false, why: '受け渡し台が いっぱい' };
    today.slots[stationId] = null;
    job.state = 'pass'; job.station = null; job.at = today.t;
  }
  return { ok: true };
}
// 受け渡し台の料理をタップ → お客さんへ
export function tapPass(s, jobId) {
  const today = s.today;
  const job = today && today.jobs.find((j) => j.id === jobId);
  if (!job || job.state !== 'pass') return { ok: false };
  const g = guestById(today, job.guest);
  today.jobs = today.jobs.filter((j) => j !== job);
  if (!g || g.state !== 'seated') return { ok: false };
  g.state = 'eating'; g.servedAt = today.t;
  const fast = today.t - g.seatedAt < GUEST.orderPatience * 0.5;
  s.rep = clampRep(s.rep + (fast ? REP.servedFast : REP.served) * (today.repMul || 1));
  emit(today, { type: 'serve', seat: g.seat, dish: job.dish, fast });
  return { ok: true };
}

const hasStaff = (s, role) => s.staff.some((x) => x.role === role);
// 1人が受け持つのは 台1つ。同じ種類の台が並んでいたら、雇った順に 左の台から受け持つ
export function staffOf(s, stationId) {
  const st = s.stations.find((x) => x.id === stationId);
  if (!st) return null;
  const k = s.stations.filter((x) => x.type === st.type).indexOf(st);
  return s.staff.filter((x) => x.role === st.type)[k] || null;
}

export function tick(s, dt) {
  const today = s.today;
  if (!today || (s.phase !== 'service' && !today.branch)) return;
  today.t += dt;
  const t = today.t;

  // 来店
  while (today.next < today.arrivals.length && today.arrivals[today.next].at <= t) {
    const a = today.arrivals[today.next++];
    today.guests.push({ id: today.idSeq++, state: 'queue', since: t, seat: null, look: a.look, reg: a.reg });
    if (a.reg) {
      const r = s.regulars[a.reg];
      r.lastDay = s.day; r.visits += 1; r.noted = false;
      today.stats.regulars[a.reg] = 'came';
    }
  }
  // 席に案内して注文
  for (const g of today.guests) {
    if (g.state !== 'queue') continue;
    const seat = freeSeat(s, today);
    if (seat == null) break;
    g.seat = seat; g.state = 'seated'; g.seatedAt = t;
    const no = order(s, today, g);
    if (no) leave(s, today, g, no);
    else emit(today, { type: 'order', seat, dish: g.dish, reg: g.reg, usual: !!g.usual });
  }
  // 列に入れていない人（通りで様子見）は、列に入った時から待ち時間を数える
  let inLine = 0;
  for (const g of today.guests) {
    if (g.state !== 'queue') continue;
    if (inLine++ >= GUEST.lineShown) g.since = t;
  }
  // 待ちきれずに帰る
  for (const g of today.guests) {
    if (g.state === 'queue' && t - g.since > GUEST.queuePatience) leave(s, today, g, 'queue');
    else if (g.state === 'seated' && t - g.seatedAt > GUEST.orderPatience) leave(s, today, g, 'wait');
  }
  // 調理
  for (const j of today.jobs) {
    if (j.state === 'cook') {
      j.prog += dt * (staffOf(s, j.station) ? STAFF.speed : 1);
      if (j.prog >= stepOf(j)[1]) { j.state = 'ready'; j.readyAt = t; }
    }
  }
  // できあがった料理は、次の台が空いていれば ひとりでに移る（最後の工程だけ 人が台へ出す）
  for (const j of [...today.jobs]) {
    if (j.state !== 'ready' || t - j.readyAt < STAFF.autoNext) continue;
    const steps = DISHES[j.dish].steps;
    if (j.step + 1 < steps.length && freeStation(s, today, steps[j.step + 1][0])) tapStation(s, j.station);
  }
  // スタッフが受け持つ
  for (const j of [...today.jobs]) {
    if (j.state === 'ticket' && t - j.at >= STAFF.delay) {
      // 人のいる台が空いていれば、そこで作りはじめる
      const st = s.stations.find((x) => x.type === stepOf(j)[0] && today.slots[x.id] == null && staffOf(s, x.id));
      if (st) tapTicket(s, j.id, st.id);
    } else if (j.state === 'ready' && t - j.readyAt >= STAFF.delay) {
      if (staffOf(s, j.station)) tapStation(s, j.station);
      else {
        // 人のいない台で できあがった料理は、人のいる台が空いたら そこへ・最後の工程なら ホール係が台へ出す
        const steps = DISHES[j.dish].steps;
        if (j.step + 1 < steps.length) {
          const type = steps[j.step + 1][0];
          if (s.stations.some((x) => x.type === type && today.slots[x.id] == null && staffOf(s, x.id))) tapStation(s, j.station);
        } else if (hasStaff(s, 'hall')) tapStation(s, j.station);
      }
    } else if (j.state === 'pass' && hasStaff(s, 'hall') && t - j.at >= STAFF.delay) tapPass(s, j.id);
  }
  // 食べ終わって払う
  for (const g of today.guests) {
    if (g.state === 'eating' && t - g.servedAt >= GUEST.eatSeconds) {
      s.money += g.price;
      today.stats.sales += g.price;
      today.stats.served += 1;
      today.stats.sold[g.dish] = (today.stats.sold[g.dish] || 0) + 1;
      if (g.reg) {
        const fav = REGULARS.find((r) => r.id === g.reg).fav;
        if (fav === g.dish) { s.regulars[g.reg].love += 1; today.stats.regulars[g.reg] = 'fav'; }
        else today.stats.regulars[g.reg] = 'other';
      }
      emit(today, { type: 'pay', seat: g.seat, amount: g.price, reg: g.reg });
      g.state = 'gone'; g.seat = null;
    }
  }
  today.guests = today.guests.filter((g) => g.state !== 'gone');

  if (t >= DAY.seconds) closeDay(s);
}

export const queueOf = (today) => today.guests.filter((g) => g.state === 'queue');
export const seatOf = (today, i) => today.guests.find((g) => g.seat === i) || null;
export const patienceLeft = (today, g) =>
  g.state === 'queue' ? 1 - (today.t - g.since) / GUEST.queuePatience
    : g.state === 'seated' ? 1 - (today.t - g.seatedAt) / GUEST.orderPatience : 1;

// ---- 閉店と日報 ----
function closeDay(s) {
  const today = s.today;
  const st = today.stats;
  // 閉店時に まだ食べている人は払って帰る。待っている人は閉店で帰る（評判は下げない）
  for (const g of today.guests) {
    if (g.state === 'eating') { s.money += g.price; st.sales += g.price; st.served += 1; st.sold[g.dish] = (st.sold[g.dish] || 0) + 1; }
    else st.closedOut += 1;
  }
  const waste = [];
  let wasteCost = 0;
  for (const [id, n] of Object.entries(today.stock)) {
    if (n > 0) { waste.push([id, n]); wasteCost += n * DISHES[id].cost; }
  }
  // アルバイト代と家賃。足りない分は ツケ
  const wage = wages(s);
  const rent = stageOf(s).rent || 0;
  let credit = today.credit || 0;
  const short = Math.max(0, wage + rent - s.money);
  s.debt += short; credit += short;
  s.money = Math.max(0, s.money - wage - rent);
  // ツケを 手持ちから返す
  const repaid = Math.min(s.debt, s.money);
  s.debt -= repaid; s.money -= repaid;
  // 高い評判は 毎日 少し戻る
  const dec = REP.decay.find(([over]) => s.rep > over);
  if (dec) s.rep = clampRep(s.rep - dec[1]);
  const before = s.totalSales;
  s.totalSales += st.sales;
  for (const m of [10000, 50000, 100000, 300000, 1000000]) if (before < m && s.totalSales >= m) note(s, 'sales', `売上の合計が ${m.toLocaleString('ja-JP')}円に`);

  // 常連さんのようす
  const notes = [];
  for (const r of regularsOf(s)) {
    const rs = s.regulars[r.id];
    const what = st.regulars[r.id];
    const favOn = s.menu[r.fav] && s.menu[r.fav].on && canCook(s, r.fav) && s.known.includes(r.fav);
    const favPricey = favOn && s.menu[r.fav].price > DISHES[r.fav].base * REGULAR.pricey;
    const favOut = favOn && st.soldOutAt[r.fav] != null;
    if (what === 'fav') notes.push({ reg: r.id, text: `${r.name}が${DISHES[r.fav].name}を食べていった`, good: true });
    else if (what && what !== 'left' && !favOn) notes.push({ reg: r.id, text: `${r.name}がメニューを長いこと見ていた`, good: false });
    // 嫌なこと：好物が無い・高い・売り切れ・待たされて帰った。あると しばらく来にくくなる
    const bad = !favOn || favPricey || what === 'left' || (what === 'other' && favOut);
    rs.upset = bad ? REGULAR.upsetDays : Math.max(0, (rs.upset || 0) - 1);
    // 「見ない」は 来にくくなる理由が あるときだけ書く（乱数で来なかっただけの日は書かない）
    if (!what && rs.visits > 0 && rs.upset > 0 && s.day - rs.lastDay >= REGULAR.missDays && !rs.noted) {
      notes.push({ reg: r.id, text: `最近${r.name}を見ない`, good: false });
      rs.noted = true;
    }
  }
  const report = {
    shop: genreOf(s), day: s.day, weather: today.weather, event: today.event, guests: today.arrivals.length, served: st.served,
    sales: st.sales, prepCost: today.prepCost, wage, rent, credit, repaid, debt: s.debt, wasteCost, waste,
    left: st.left, leftBy: st.leftBy, lostSales: st.lostSales,
    soldOutAt: st.soldOutAt, sold: st.sold, usual: st.usual, notes,
    rep: s.rep, repDelta: s.rep - st.repStart, closedOut: st.closedOut,
    profit: st.sales - today.prepCost - wage - rent,
    crew: s.staff.map((x) => ({ name: x.name, role: x.role })),
  };
  // アルバイトは閉店で帰る
  s.lastCrew = report.crew;
  s.staff = [];
  s.reports.push(report);
  if (s.reports.length > 60) s.reports.shift();
  s.history.push({ shop: genreOf(s), day: s.day, sales: st.sales, profit: report.profit, served: st.served, guests: report.guests });
  if (s.history.length > 30) s.history.shift();
  s.today = null;
  if (today.branch) return report;
  // ほかの店も 同じ日を閉める
  report.branches = runBranches(s, today.weather);
  s.lastReport = report;
  s.phase = 'report';
  s.day += 1;
  s.ads = 0;
  return report;
}

// 立っていない店の1日を まとめて回す（アルバイトが いれば ひとりでに回る）
const BRANCH_DT = 0.1;
function runBranches(s, weather) {
  const out = [];
  for (const genre of BRANCH_ORDER) {
    if (!s.branches[genre]) continue;
    const home = genreOf(s);
    swapTo(s, genre);
    if (!s.staff.length) rehire(s);
    let r;
    if (!crewOk(s.staff)) {
      // 人がそろわない日は 休み（給料も 評判の変化も 無い）。顔ぶれは 残しておく
      r = { shop: genre, day: s.day, closed: true, why: crewPlan(s, genre).why };
      if (s.staff.length) s.lastCrew = s.staff.map((x) => ({ name: x.name, role: x.role }));
      s.staff = [];
    } else {
      startDay(s, { branch: true, weather });
      while (s.today) tick(s, BRANCH_DT);
      r = s.reports[s.reports.length - 1];
    }
    swapTo(s, home);
    out.push({ shop: genre, closed: !!r.closed, why: r.why, served: r.served || 0, guests: r.guests || 0, sales: r.sales || 0, profit: r.profit || 0,
      left: r.closed ? 0 : r.left.queue + r.left.wait + r.left.soldOut + r.left.pricey });
  }
  return out;
}

export function toNight(s) { if (s.phase === 'report') s.phase = 'night'; }

// ---- 保存 ----
export function serialize(s) {
  // 営業の途中で閉じたら、その日は開店前からやり直す
  if (s.today && s.phase === 'service') return s.today.snap;
  const { today, ...rest } = s;
  return JSON.stringify(rest);
}
export function parseSave(text) {
  try {
    const o = JSON.parse(text);
    if (!o || o.v !== SAVE_VERSION || typeof o.money !== 'number' || !Array.isArray(o.stations)) return null;
    const base = createState(o.seed);
    return { ...base, ...o, debt: typeof o.debt === 'number' ? o.debt : 0, branches: o.branches && typeof o.branches === 'object' ? o.branches : {}, regulars: { ...(o.genre && o.genre !== 'washoku' ? {} : base.regulars), ...o.regulars }, log: Array.isArray(o.log) ? o.log : base.log,
      reports: Array.isArray(o.reports) ? o.reports : [], lastCrew: Array.isArray(o.lastCrew) ? o.lastCrew : [], boosts: { ...base.boosts, ...o.boosts }, today: null };
  } catch { return null; }
}
