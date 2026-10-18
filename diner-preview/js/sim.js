// ルールのすべて。DOM に触らない（node のテストでそのまま動く）。
// 画面（main.js）は state を読み、ここの関数を呼ぶだけ。
import {
  DAY, STATIONS, DISHES, GUEST, DEMAND, WEATHER, RUSH, REP, STAGES, SHOP,
  STAFF, STAFF_NAMES, REGULARS, REGULAR, ADS, START, TRIAL_COST,
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

export const stageOf = (s) => STAGES[s.stage];
export const stars = (rep) => Math.max(1, Math.min(5, Math.floor(rep / 20) + 1));
export const clockOf = (t) => DAY.openMin + (t / DAY.seconds) * (DAY.closeMin - DAY.openMin);
export const fmtClock = (min) => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
export const canCook = (s, dishId) => DISHES[dishId].steps.every(([type]) => s.stations.some((st) => st.type === type));

// ---- はじめの状態 ----
export function createState(seed = (Date.now() >>> 0)) {
  const menu = {};
  const prep = {};
  for (const [id, d] of Object.entries(DISHES)) {
    if (d.start) { menu[id] = { on: true, price: d.base }; prep[id] = 8; }
  }
  const stations = [];
  for (const [type, n] of Object.entries(START.stations)) for (let i = 0; i < n; i++) stations.push({ id: `${type}${i}`, type });
  const regulars = {};
  for (const r of REGULARS) regulars[r.id] = { love: 0, lastDay: 0, visits: 0, noted: false };
  return {
    v: SAVE_VERSION, seed, day: 1, money: START.money, rep: REP.start, stage: 0, totalSales: 0,
    seats: START.seats, stations, staff: [], menu, prep, known: Object.keys(menu), tried: [],
    regulars, ads: 0, boosts: { market: false, flyer: false, freeTrial: false },
    history: [], log: [{ day: 1, kind: 'open', text: '屋台を開いた' }], lastReport: null, today: null, phase: 'night',
  };
}

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
  if (kind === 'seat' && s.seats >= st.maxSeats) return { ok: false, why: `${st.name}では ここまで` };
  if (kind !== 'seat' && s.stations.length >= st.maxStations) return { ok: false, why: `${st.name}では ここまで` };
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
  if (role !== 'hall' && !s.stations.some((st) => st.type === role)) return { ok: false, why: `${STATIONS[role].name}が無い` };
  return { ok: true };
}
export function hire(s, role) {
  const c = canHire(s, role);
  if (!c.ok) return c;
  const used = new Set(s.staff.map((x) => x.name));
  const name = STAFF_NAMES.find((n) => !used.has(n)) || `スタッフ${s.staff.length + 1}`;
  s.staff.push({ id: `st${s.day}_${s.staff.length}`, name, role });
  if (!s.log.some((x) => x.kind === 'staff')) note(s, 'staff', `はじめてのスタッフ ${name}さん`);
  return { ok: true, name };
}
export function fire(s, staffId) { s.staff = s.staff.filter((x) => x.id !== staffId); }
export const wages = (s) => s.staff.reduce((a, x) => a + STAFF[x.role].wage, 0);

export function nextStage(s) {
  const st = STAGES[s.stage + 1];
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
  const key = [a, b].sort().join('+');
  if (s.tried.includes(key)) return { ok: false, why: 'もう試した組み合わせ' };
  const free = s.boosts.freeTrial;
  if (!free && s.money < TRIAL_COST) return { ok: false, why: 'お金が足りない' };
  if (free) s.boosts.freeTrial = false; else s.money -= TRIAL_COST;
  s.tried.push(key);
  const hit = Object.entries(DISHES).find(([, d]) => d.combo && [...d.combo].sort().join('+') === key);
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

export function startDay(s) {
  // 営業の途中で閉じたら、開店前の状態に戻すための写し
  const snap = JSON.stringify({ ...s, today: null, phase: 'night' });
  const today = { snap, rng: hash(s.seed, s.day), t: 0, idSeq: 1, guests: [], jobs: [], slots: {}, stock: {}, events: [], evSeq: 1 };
  today.weather = pickWeather(rand(today)).id;
  const w = WEATHER.find((x) => x.id === today.weather);

  // 仕入れ。お金が足りなければ、足りる分だけ（同じ割合で減らす）
  let cost = prepCost(s);
  let scale = 1;
  if (cost > s.money) { scale = cost > 0 ? s.money / cost : 0; cost = Math.floor(cost * scale); }
  for (const [id, m] of Object.entries(s.menu)) {
    if (m.on && canCook(s, id)) today.stock[id] = Math.floor((s.prep[id] || 0) * scale);
  }
  today.bought = { ...today.stock };
  today.prepCost = cost;
  s.money -= cost;

  // お客さんの来る時刻を先に決める
  const n = Math.round((DEMAND.base + s.rep * DEMAND.perRep) * w.mul * (s.boosts.flyer ? ADS.flyerMul : 1));
  const arrivals = [];
  const span = DAY.seconds * DAY.lastEntryRatio;
  while (arrivals.length < n) {
    const t = rand(today) * span;
    if (rand(today) * 2.4 < rushWeight(clockOf(t))) arrivals.push(t);
  }
  arrivals.sort((a, b) => a - b);
  // 常連さん（来る日を決める）
  const regs = REGULARS.filter((r) => s.day >= 2 && rand(today) < REGULAR.chance + s.regulars[r.id].love * 0.08);
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
  s.boosts.market = false; s.boosts.flyer = false;
  s.today = today;
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
    s.rep = clampRep(s.rep + (reason === 'soldOut' ? REP.soldOut : reason === 'pricey' ? REP.tooPricey : REP.left));
    emit(today, { type: 'leave', reason, seat: g.seat, guest: g.id, look: g.look });
  }
  g.seat = null;
}
function avgPrice(s) {
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && canCook(s, id));
  return on.length ? Math.round(on.reduce((a, [, m]) => a + m.price, 0) / on.length) : 500;
}
const clampRep = (r) => Math.max(0, Math.min(100, r));

function freeStation(s, today, type) {
  const st = s.stations.find((x) => x.type === type && today.slots[x.id] == null);
  return st ? st.id : null;
}
function stepOf(job) { return DISHES[job.dish].steps[job.step]; }

// 札をタップ → 1つめの台で作り始める
export function tapTicket(s, jobId) {
  const today = s.today;
  const job = today && today.jobs.find((j) => j.id === jobId);
  if (!job || job.state !== 'ticket') return { ok: false };
  const sid = freeStation(s, today, stepOf(job)[0]);
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
  s.rep = clampRep(s.rep + (fast ? REP.servedFast : REP.served));
  emit(today, { type: 'serve', seat: g.seat, dish: job.dish, fast });
  return { ok: true };
}

const hasStaff = (s, role) => s.staff.some((x) => x.role === role);

export function tick(s, dt) {
  const today = s.today;
  if (!today || s.phase !== 'service') return;
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
  // 待ちきれずに帰る
  for (const g of today.guests) {
    if (g.state === 'queue' && t - g.since > GUEST.queuePatience) leave(s, today, g, 'queue');
    else if (g.state === 'seated' && t - g.seatedAt > GUEST.orderPatience) leave(s, today, g, 'wait');
  }
  // 調理
  for (const j of today.jobs) {
    if (j.state === 'cook') {
      j.prog += dt;
      if (j.prog >= stepOf(j)[1]) { j.state = 'ready'; j.readyAt = t; }
    }
  }
  // スタッフが受け持つ
  for (const j of [...today.jobs]) {
    if (j.state === 'ticket' && hasStaff(s, stepOf(j)[0]) && t - j.at >= STAFF.delay) tapTicket(s, j.id);
    else if (j.state === 'ready' && t - j.readyAt >= STAFF.delay) {
      const here = s.stations.find((x) => x.id === j.station);
      if (here && hasStaff(s, here.type)) tapStation(s, here.id);
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
  const wage = wages(s);
  s.money -= wage;
  const before = s.totalSales;
  s.totalSales += st.sales;
  for (const m of [10000, 50000, 100000, 300000, 1000000]) if (before < m && s.totalSales >= m) note(s, 'sales', `売上の合計が ${m.toLocaleString('ja-JP')}円に`);

  // 常連さんのようす
  const notes = [];
  for (const r of REGULARS) {
    const rs = s.regulars[r.id];
    const what = st.regulars[r.id];
    const favOn = s.menu[r.fav] && s.menu[r.fav].on && canCook(s, r.fav);
    if (what === 'fav') notes.push({ reg: r.id, text: `${r.name}が${DISHES[r.fav].name}を食べていった`, good: true });
    else if (what && !favOn) notes.push({ reg: r.id, text: `${r.name}がメニューを長いこと見ていた`, good: false });
    else if (!what && rs.visits > 0 && s.day - rs.lastDay >= REGULAR.missDays && !rs.noted) {
      notes.push({ reg: r.id, text: `最近${r.name}を見ない`, good: false });
      rs.noted = true;
    }
  }
  const report = {
    day: s.day, weather: today.weather, guests: today.arrivals.length, served: st.served,
    sales: st.sales, prepCost: today.prepCost, wage, wasteCost, waste,
    left: st.left, leftBy: st.leftBy, lostSales: st.lostSales,
    soldOutAt: st.soldOutAt, sold: st.sold, usual: st.usual, notes,
    rep: s.rep, repDelta: s.rep - st.repStart, closedOut: st.closedOut,
    profit: st.sales - today.prepCost - wage,
  };
  s.history.push({ day: s.day, sales: st.sales, profit: report.profit, served: st.served, guests: report.guests });
  if (s.history.length > 30) s.history.shift();
  // 次の日の仕込みのめやす：きょう売れた数 ＋ 少し（はじめの値は残す）
  s.lastReport = report;
  s.today = null;
  s.phase = 'report';
  s.day += 1;
  s.ads = 0;
  return report;
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
    return { ...base, ...o, regulars: { ...base.regulars, ...o.regulars }, log: Array.isArray(o.log) ? o.log : base.log, boosts: { ...base.boosts, ...o.boosts }, today: null };
  } catch { return null; }
}
