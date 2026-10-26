// ルールのすべて。DOM に触らない（node のテストでそのまま動く）。
// 画面（main.js）は state を読み、ここの関数を呼ぶだけ。
import {
  DAY, STATIONS, DISHES, GUEST, DEMAND, WEATHER, RUSH, REP, STAGES, SHOP,
  STAFF, STAFF_NAMES, REGULARS, REGULAR, ADS, START, TRIAL_COST, GENRES, BRANCH_ORDER, EVENTS, TOWN, MANAGER, ASK, ASK_FROM, STORIES, STORY_AT, BUILD, FESTIVAL, DECO, PREP_WARN, SEASON, STANCES,
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
export const perkOf = (s) => GENRES[genreOf(s)].perk || {};
export const stageOf = (s, i = s.stage) => STAGES[i] && { ...STAGES[i], name: GENRES[genreOf(s)].stageNames[i], maxSeats: STAGES[i].maxSeats + (perkOf(s).seats || 0), maxStations: STAGES[i].maxStations + (perkOf(s).stations || 0) };
// この店で使える食材と、使えるようになる段
export const ingredientsOf = (s) => GENRES[genreOf(s)].ing;
export const stars = (rep) => Math.max(1, Math.min(5, Math.floor(rep / 20) + 1));
export const clockOf = (t) => DAY.openMin + (t / DAY.seconds) * (DAY.closeMin - DAY.openMin);
export const fmtClock = (min) => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
// 季節（30日ごと）。旬の料理は 頼まれやすく、食材の値段が 動く
export const seasonOf = (s, day = s.day) => SEASON.list[Math.floor((day - 1) / SEASON.days) % SEASON.list.length];
export const seasonStarts = (day) => (day - 1) % SEASON.days === 0;
export const seasonTag = (s, id, day = s.day) => { const se = seasonOf(s, day); return se.hot.includes(id) ? 'hot' : se.cheap.includes(id) ? 'cheap' : se.dear.includes(id) ? 'dear' : null; };
export const dishCost = (s, id, day = s.day) => { const tag = seasonTag(s, id, day); return Math.round(DISHES[id].cost * (tag === 'cheap' ? SEASON.cheapMul : tag === 'dear' ? SEASON.dearMul : 1)); };
export const canCook = (s, dishId) => DISHES[dishId].steps.every(([type]) => s.stations.some((st) => st.type === type));
// 値段が「来る人数」に効く倍率。出している料理の 値段比（ふつうの値段に対して）の平均で決まる
export function priceDemand(s) {
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && canCook(s, id) && s.known.includes(id));
  if (!on.length) return 1;
  const r = on.reduce((a, [id, m]) => a + m.price / fairPrice(s, id), 0) / on.length;
  if (r >= 1) return Math.max(0.1, 1 - GUEST.demandUp * (r - 1));
  return Math.min(GUEST.maxBoost, 1 + GUEST.demandDown * (1 - r));
}

// 内装が良いほど 高めの値段でも ふつうに見える
export const priceUpOf = (s) => perkOf(s).priceUp || DECO.priceUp;
export const fairPrice = (s, id) => DISHES[id].base * (1 + (s.deco || 0) * priceUpOf(s));

// ---- はじめの状態 ----
// 店ごとに持つもの（お金・日付・日報・広告は 全部の店で共通）
export const SHOP_KEYS = ['genre', 'stage', 'totalSales', 'rep', 'seats', 'stations', 'staff', 'menu', 'prep', 'known', 'tried', 'regulars', 'lastCrew', 'manager', 'stance', 'managerNote', 'deco', 'signature'];
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
  for (const r of REGULARS) if (shopOfReg(r) === genre) regulars[r.id] = { love: 0, lastDay: 0, visits: 0, noted: false, upset: 0, story: 0 };
  return {
    genre, stage: g.startStage || 0, totalSales: 0, rep: genre === 'washoku' ? REP.start : REP.branchStart, seats: start.seats, stations, staff: [],
    menu, prep, known: Object.keys(menu), tried: [], regulars, lastCrew: [], manager: false, stance: MANAGER.stance, managerNote: null, deco: 0, signature: null,
  };
}
export function createState(seed = (Date.now() >>> 0)) {
  return {
    v: SAVE_VERSION, seed, day: 1, money: START.money, debt: 0, ...createShop('washoku'), branches: {},
    town: { picked: [], built: [] }, festival: { day: 0, last: -99 }, asks: newAsks(), ads: 0, boosts: { market: false, flyer: false, freeTrial: false },
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
// 早送りできるか：仕込み係と ホール係が いる日。それと、売り切れて 台にも 受け渡し台にも 何も残っていないとき
// （作るものが なく 待つだけの 時間を 飛ばす・2026-10-26 オーナー「売り切れてる店を 見続けるのは 苦痛」）
export function canFast(s) {
  if (!s.today) return false;
  if (crewOk(s.staff)) return true;
  return Object.values(s.today.stock).every((n) => n <= 0) && !s.today.jobs.some((j) => ['ticket', 'cook', 'ready', 'pass'].includes(j.state));
}
export function crewPlan(s, genre) {
  const sh = shopInfo(s, genre);
  const staff = sh.staff.length ? sh.staff : sh.lastCrew;
  // 店長がいれば 足りない人を 呼んで 開ける
  if (sh.manager) return { staff, open: true, manager: true, why: '' };
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
// 店長を置く・帰す（立たない店だけ。夜だけ）
export function setManager(s, genre, on) {
  if (s.phase !== 'night' || genre === genreOf(s) || !s.branches[genre]) return { ok: false };
  s.branches[genre].manager = !!on;
  return { ok: true };
}
export const stanceOf = (sh) => STANCES[sh.stance] ? sh.stance : MANAGER.stance;
export function setStance(s, genre, id) {
  const sh = shopInfo(s, genre);
  if (s.phase !== 'night' || !sh || !STANCES[id]) return { ok: false };
  sh.stance = id;
  return { ok: true };
}
export const managerWage = (sales) => MANAGER.wage + Math.round(sales * MANAGER.rate);
// 天気と出来事と まつりで 人数が 何倍になる日か（貼り紙に 書いてあるぶん）
function dayMul(s, weatherId, eventId, festival) {
  const w0 = WEATHER.find((x) => x.id === weatherId) || WEATHER[0];
  const wm = townThings(s).some((n) => n.dry) ? Math.max(1, w0.mul) : w0.mul;
  const ev = EVENTS.list.find((x) => x.id === eventId);
  return wm * (ev && ev.nMul ? ev.nMul : 1) * (festival ? FESTIVAL.nMul : 1);
}
// 店長の段取り：人が足りなければ呼び、仕込みを きのう売れた数に合わせる。
// 貼り紙（あしたの天気・出来事・まつり）を読み、きのうと 人数が 違う日は その分 増やす・減らす（第2回レビュー 2）
function managerPlan(s, weather = null) {
  const st = STANCES[stanceOf(s)];
  if (!s.staff.length) rehire(s);
  // むだなし：仕込み係と ホール係だけ
  if (st.lean) s.staff = s.staff.filter((x) => x.role === 'board' || x.role === 'hall');
  for (const role of ['board', 'hall']) if (!s.staff.some((x) => x.role === role) && canHire(s, role).ok) hire(s, role);
  const last = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === genreOf(s)).pop();
  s.managerNote = null;
  if (!last) return;
  const wId = weather || weatherOf(s).id;
  const ev = eventOf(s);
  const ratio = dayMul(s, wId, ev ? ev.id : null, festivalTomorrow(s)) / dayMul(s, last.weather, last.event, last.festival);
  // 売り切れて 帰した人のぶんも 見込む（どの料理かは 分からないので 全体に）
  const missed = 1 + Math.min(0.5, ((last.left && last.left.soldOut) || 0) / Math.max(1, last.served));
  const extra = st.extra != null ? st.extra : MANAGER.extra;
  const outs = [];
  for (const [id, m] of Object.entries(s.menu)) {
    if (!m.on) continue;
    const sold = last.sold[id] || 0;
    const out = last.soldOutAt[id] != null;
    if (out) outs.push(id);
    s.prep[id] = Math.max(MANAGER.minPrep, Math.ceil(sold * ratio * st.prepMul * (out ? MANAGER.outMul * missed : 1)) + extra);
  }
  // その日の お願いの分も 仕込む
  let askN = 0;
  for (const a of asksDue(s, genreOf(s))) {
    if (!s.menu[a.dish] || !canCook(s, a.dish)) continue;
    s.menu[a.dish].on = true;
    s.prep[a.dish] = (s.prep[a.dish] || 0) + a.n;
    askN += a.n;
  }
  // 店長の一言（日報に出す。何を読んで どう決めたか）
  const why = festivalTomorrow(s) ? 'まつり' : ev && ev.nMul ? ev.name : `${WEATHER.find((x) => x.id === wId).name}`;
  const pct = Math.round((ratio - 1) * 100);
  const parts = [pct >= 8 ? `${why}で 人が 増えそうなので 仕込みを ${pct}% 増やした` : pct <= -8 ? `${why}で 人が 減りそうなので 仕込みを ${-pct}% 減らした` : 'きのうと 同じくらいの 人出と 見た'];
  if (outs.length) parts.push(`${outs.map((id) => DISHES[id].name).join('・')}は 売り切れたので ${MANAGER.outMul}倍`);
  if (askN) parts.push(`お願いの ${askN}食も 仕込んだ`);
  s.managerNote = `店長（${st.name}）：${parts.join('。')}`;
}

// ---- 町の人のお願い・常連さんの物語 ----
function newAsks() { return { list: [], offer: null, queue: [], seq: 1, done: 0 }; }
export const asksDue = (s, genre, day = s.day) => s.asks.list.filter((a) => a.shop === genre && a.due === day);
export const askPay = (a) => Math.round(DISHES[a.dish].base * (1 + ASK.tip)) * a.n;
const askN = (stage, r) => ASK.n[0] + stage * ASK.n[1] + Math.floor(rand(r) * ASK.n[2]);
// 夜に 1つ届く（常連さんの物語の お願いが 先）。返事をしないと 次の夜に 消える
function makeOffer(s) {
  const a = s.asks;
  a.offer = null;
  if (a.list.length >= askMax(s)) return;
  const r = { rng: hash(s.seed + 31337, s.day) };
  const due = s.day + 1 + Math.floor(rand(r) * ASK.lead);
  while (a.queue.length) {
    const q = a.queue.shift();
    const reg = REGULARS.find((x) => x.id === q.reg);
    const g = shopOfReg(reg), sh = shopInfo(s, g);
    if (!sh || !sh.known.includes(reg.fav)) continue;
    a.offer = { id: a.seq++, who: reg.name, what: q.what, shop: g, dish: reg.fav, n: askN(sh.stage, r), due, reg: reg.id, look: reg.look };
    return;
  }
  if (s.day < ASK.fromDay || rand(r) >= ASK.chance * townMul(s, 'askMul')) return;
  const opts = shopsOf(s).map((g) => [g, shopInfo(s, g)]).map(([g, sh]) => [g, sh, Object.keys(sh.menu).filter((id) => sh.menu[id].on && canCook(sh, id) && sh.known.includes(id))]).filter((x) => x[2].length);
  if (!opts.length) return;
  const [g, sh, dishes] = opts[Math.floor(rand(r) * opts.length)];
  const have = neighbors(s).map((n) => n.id);
  const from = ASK_FROM.filter((f) => !f.need || have.includes(f.need));
  const f = from[Math.floor(rand(r) * from.length)];
  a.offer = { id: a.seq++, who: f.who, what: f.what, shop: g, dish: dishes[Math.floor(rand(r) * dishes.length)], n: askN(sh.stage, r), due, look: f.look };
}
export function answerAsk(s, yes) {
  const a = s.asks;
  if (s.phase !== 'night' || !a.offer) return { ok: false };
  if (yes && a.list.length >= askMax(s)) return { ok: false, why: `受けられるのは ${askMax(s)}件まで` };
  if (yes) a.list.push(a.offer);
  a.offer = null;
  return { ok: true };
}
// その日の朝、その店の仕込みから 届ける。stock が無いのは 休みの日
function settleAsks(s, genre, stock) {
  const out = [];
  for (const a of asksDue(s, genre)) {
    const have = stock ? stock[a.dish] : undefined;
    const res = { who: a.who, what: a.what, dish: a.dish, n: a.n, reg: a.reg || null };
    if (stock && have >= a.n) {
      stock[a.dish] -= a.n;
      res.ok = true; res.pay = askPay(a);
      s.money += res.pay;
      s.rep = clampRep(s.rep + ASK.rep);
      s.asks.done += 1;
    } else {
      res.ok = false;
      res.why = !stock ? '店が 休み' : have == null ? 'メニューに 無かった' : `仕込みが ${have}食`;
      s.rep = clampRep(s.rep - ASK.failRep);
    }
    out.push(res);
  }
  s.asks.list = s.asks.list.filter((a) => !(a.shop === genre && a.due === s.day));
  return out;
}
// 常連さんの話が 1つ進む（来た日だけ。待たされて帰った日は 進まない）
function storyStep(s, r, what) {
  const rs = s.regulars[r.id];
  const i = rs.story || 0;
  const ch = STORIES[r.id] && STORIES[r.id][i];
  if (!ch || !what || what === 'left' || rs.visits < STORY_AT[i]) return null;
  rs.story = i + 1;
  const text = typeof ch === 'string' ? ch : ch.text;
  if (ch.ask) s.asks.queue.push({ reg: r.id, what: ch.ask });
  note(s, 'story', text);
  return text;
}

// ---- 商店街（となりの店） ----
const TOP = STAGES.length - 1;
// 町の人気店に なった店の数。この数だけ となりの店を 呼べる
export const popularCount = (s) => shopsOf(s).filter((g) => shopInfo(s, g).stage >= TOP).length;
export const neighbors = (s) => (s.town ? s.town.picked : []).map((id) => TOWN.list.find((n) => n.id === id)).filter(Boolean);
// いま呼べる 候補2つ（種と 呼んだ数で 決まる。閉じても 変わらない）
export function townOffer(s) {
  const picked = s.town ? s.town.picked : [];
  if (picked.length >= Math.min(popularCount(s), TOWN.lots)) return null;
  const rest = TOWN.list.filter((n) => !picked.includes(n.id));
  if (!rest.length) return null;
  const r = { rng: hash(s.seed + 31337, picked.length) };
  const a = rest.splice(Math.floor(rand(r) * rest.length), 1)[0];
  const b = rest.length ? rest[Math.floor(rand(r) * rest.length)] : null;
  return b ? [a, b] : [a];
}
export function inviteNeighbor(s, id) {
  const offer = townOffer(s);
  if (s.phase !== 'night' || !offer || !offer.some((n) => n.id === id)) return { ok: false };
  s.town = { ...(s.town || {}), picked: [...(s.town ? s.town.picked : []), id] };
  const n = TOWN.list.find((x) => x.id === id);
  note(s, 'town', `となりに ${n.name}が 開いた`);
  checkFace(s);
  return { ok: true, name: n.name };
}
// ---- 商店街の顔：5店とも 町の人気店で、となりの店が ぜんぶ開いた。1度だけ（そのあとも 続く） ----
export const isFace = (s) => shopsOf(s).length >= BRANCH_ORDER.length && popularCount(s) >= BRANCH_ORDER.length && neighbors(s).length >= TOWN.lots;
function checkFace(s) {
  if (s.faceDay || !isFace(s)) return;
  s.faceDay = s.day;
  note(s, 'face', '商店街の顔に なった');
}
export function faceSeen(s) { s.faceSeen = true; }
// 商店街の顔の場面に出す数字（全部の店の）
export function townTotals(s) {
  const shops = shopsOf(s).map((g) => shopInfo(s, g));
  const regs = shops.flatMap((sh) => Object.values(sh.regulars));
  return { days: s.day, sales: shops.reduce((a, sh) => a + sh.totalSales, 0), asks: s.asks.done, regulars: regs.filter((r) => r.visits > 0).length, visits: regs.reduce((a, r) => a + r.visits, 0) };
}
// となりの店の 効き目（かけ算は ぜんぶ かける）
// となりの店と 建てたもの（効き目の書き方は 同じ）
export const builtOf = (s) => ((s.town && s.town.built) || []).map((id) => BUILD.list.find((b) => b.id === id)).filter(Boolean);
const townThings = (s) => [...neighbors(s), ...builtOf(s)];
const townMul = (s, key) => townThings(s).reduce((a, n) => a * (n[key] || 1), 1);
const townBoost = (s, period) => townThings(s).reduce((a, n) => a * (n.period === period ? n.boost : 1), 1);
const townHeal = (s) => townThings(s).reduce((a, n) => Math.max(a, n.upsetHeal || 1), 1);
export const askMax = (s) => ASK.max + townThings(s).reduce((a, n) => a + (n.askMore || 0), 0);

// ---- お金の使い道：町に建てる・商店街まつり・店を飾る ----
export function canBuild(s, id) {
  const b = BUILD.list.find((x) => x.id === id);
  if (!b || builtOf(s).includes(b)) return { ok: false, why: 'もう建てた' };
  if (shopsOf(s).length < BUILD.from) return { ok: false, why: `${BUILD.from}号店を出したら` };
  if (s.money < b.price) return { ok: false, why: 'お金が足りない' };
  return { ok: true };
}
export function build(s, id) {
  if (s.phase !== 'night' || !canBuild(s, id).ok) return { ok: false };
  const b = BUILD.list.find((x) => x.id === id);
  s.money -= b.price;
  s.town = { ...s.town, built: [...((s.town && s.town.built) || []), id] };
  note(s, 'town', `町に ${b.name}が できた`);
  return { ok: true, name: b.name };
}
export const festivalTomorrow = (s) => !!s.festival && s.festival.day === s.day;
export function canFestival(s) {
  if (shopsOf(s).length < FESTIVAL.from) return { ok: false, why: `${FESTIVAL.from}号店を出したら` };
  if (festivalTomorrow(s)) return { ok: false, why: 'あしたは まつり' };
  const wait = FESTIVAL.gap - (s.day - s.festival.last);
  if (wait > 0) return { ok: false, why: `あと ${wait}日で 開ける` };
  if (s.money < FESTIVAL.price) return { ok: false, why: 'お金が足りない' };
  return { ok: true };
}
export function holdFestival(s) {
  if (s.phase !== 'night' || !canFestival(s).ok) return { ok: false };
  s.money -= FESTIVAL.price;
  s.festival = { day: s.day, last: s.day };
  note(s, 'event', '商店街まつりを開いた');
  return { ok: true };
}
export function canDecorate(s) {
  const lv = DECO.levels[s.deco || 0];
  if (!lv) return { ok: false, why: 'これ以上は 飾れない' };
  if (s.money < lv.price) return { ok: false, why: 'お金が足りない' };
  return { ok: true, ...lv };
}
export function decorate(s) {
  if (s.phase !== 'night' || !canDecorate(s).ok) return { ok: false };
  const lv = DECO.levels[s.deco || 0];
  s.money -= lv.price;
  s.deco = (s.deco || 0) + 1;
  note(s, 'stage', `${GENRES[genreOf(s)].short}：${lv.name}`);
  return { ok: true, name: lv.name };
}
export function setSignature(s, id) {
  if (s.phase !== 'night' || !s.known.includes(id) || s.signature === id || s.money < DECO.signaturePrice) return { ok: false };
  s.money -= DECO.signaturePrice;
  s.signature = id;
  note(s, 'recipe', `${DISHES[id].name}を 名物にした`);
  return { ok: true };
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
  for (const [id, m] of Object.entries(s.menu)) if (m.on && canCook(s, id)) c += (s.prep[id] || 0) * dishCost(s, id);
  c = Math.round(c * townMul(s, 'prepMul'));
  return s.boosts.market ? Math.round(c / 2) : c;
}

export function shopPrice(s, kind) {
  if (kind === 'seat') return SHOP.seat.price(s.seats);
  return Math.round(SHOP[kind].price(s.stations.filter((st) => st.type === kind).length) * (kind === 'stove' ? perkOf(s).stovePrice || 1 : 1) / 10) * 10;
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
  const name = STAFF_NAMES.find((n) => !used.has(n)) || STAFF_NAMES.map((n) => `${n}2`).find((n) => !used.has(n)) || `${STAFF_NAMES[0]}${used.size}`;
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
    // 前の版の「スタッフ8」は 新しい名前で呼び直す
    if (/^スタッフ\d+$/.test(x.name)) { hire(s, x.role); n += 1; continue; }
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
  checkFace(s);
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

// 店ごとに 乱数の列を ずらす（1号店 0・2号店 7919 … 前の版と 同じ値）
const saltOf = (g) => (GENRES[g].no - 1) * 7919;
// あしたの天気と出来事は 種と日付から決まっている（夜の貼り紙に出す）
export function weatherOf(s, day = s.day) { return pickWeather(rand({ rng: hash(s.seed, day) })); }
export function eventOf(s, day = s.day) {
  if (day < 3) return null;
  const r = { rng: hash(s.seed + 104729, day) };
  if (rand(r) >= EVENTS.chance * townMul(s, 'eventMul')) return null;
  return EVENTS.list[Math.floor(rand(r) * EVENTS.list.length)];
}
export function startDay(s, { branch = false, weather = null } = {}) {
  // 営業の途中で閉じたら、開店前の状態に戻すための写し
  const snap = branch ? null : JSON.stringify({ ...s, today: null, phase: 'night' });
  const today = { snap, branch, rng: hash(s.seed + saltOf(genreOf(s)), s.day), t: 0, idSeq: 1, guests: [], jobs: [], slots: {}, stock: {}, events: [], evSeq: 1 };
  // 天気は 町に1つ（どの店も同じ）
  today.weather = weather || weatherOf(s).id;
  const ev = eventOf(s);
  today.event = ev ? ev.id : null;
  today.repMul = ev && ev.repMul ? ev.repMul : 1;
  if (!weather && genreOf(s) === 'washoku') rand(today);
  const w0 = WEATHER.find((x) => x.id === today.weather);
  const w = townThings(s).some((n) => n.dry) ? { ...w0, mul: Math.max(1, w0.mul) } : w0;
  today.festival = festivalTomorrow(s);
  if (today.festival) s.rep = clampRep(s.rep + FESTIVAL.rep);
  today.stance = branch && s.manager ? STANCES[stanceOf(s)] : null;

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
  const n = Math.round((DEMAND.base + s.rep * DEMAND.perRep) * (DEMAND.stageMul[s.stage] || 1) * w.mul * (s.boosts.flyer ? ADS.flyerMul : 1) * priceDemand(s) * (ev && ev.nMul ? ev.nMul : 1) * townMul(s, 'nMul') * (today.festival ? FESTIVAL.nMul : 1) * (s.signature ? DECO.signatureMul : 1));
  const arrivals = [];
  const span = DAY.seconds * DAY.lastEntryRatio;
  while (arrivals.length < n) {
    const t = rand(today) * span;
    const boost = (ev && ev.period && periodOf(clockOf(t)) === ev.period ? ev.boost : 1) * townBoost(s, periodOf(clockOf(t))) * ((GENRES[genreOf(s)].period || {})[periodOf(clockOf(t))] || 1);
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
    served: 0, sales: 0, left: { queue: 0, wait: 0, soldOut: 0, pricey: 0, full: 0 }, lostSales: 0,
    leftBy: { lunch: 0, day: 0, dinner: 0 }, soldOutAt: {}, sold: {}, regulars: {}, usual: [], repStart: s.rep, closedOut: 0,
  };
  today.asks = settleAsks(s, genreOf(s), today.stock);
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
    const price = Math.round(m.price * (today.stance && today.stance.priceMul ? today.stance.priceMul : 1) / 10) * 10;
    const ratio = price / fairPrice(s, id);
    let w = ratio > GUEST.maxPriceRatio ? 0 : d.appeal * Math.exp(-sense * (ratio - 1));
    if (s.signature === id) w *= DECO.signatureAppeal;
    if (seasonTag(s, id) === 'hot') w *= SEASON.hotMul;
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
  g.dish = pick; g.price = Math.round(s.menu[pick].price * (today.stance && today.stance.priceMul ? today.stance.priceMul : 1) / 10) * 10;
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
export function tapPass(s, jobId, byStaff = false) {
  const today = s.today;
  const job = today && today.jobs.find((j) => j.id === jobId);
  if (!job || job.state !== 'pass') return { ok: false };
  const g = guestById(today, job.guest);
  today.jobs = today.jobs.filter((j) => j !== job);
  if (!g || g.state !== 'seated') return { ok: false };
  g.state = 'eating'; g.servedAt = today.t;
  const fast = today.t - g.seatedAt < GUEST.orderPatience * 0.5;
  const gain = REP.gain.find(([over]) => s.rep > over);
  s.rep = clampRep(s.rep + (fast ? REP.servedFast : REP.served) * (today.repMul || 1) * (gain ? gain[1] : 1) * (byStaff ? (today.stance && today.stance.hallRep ? today.stance.hallRep : STAFF.repMul) : 1));
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
    // 列も 通りも いっぱいなら 店の前で 引き返す（常連さんは 並ぶ）
    if (!a.reg && today.guests.filter((g) => g.state === 'queue').length >= GUEST.lineShown + Math.round(s.seats * GUEST.lineExtra)) {
      today.stats.left.full += 1; today.stats.lostSales += avgPrice(s);
      emit(today, { type: 'full', look: a.look });
      continue;
    }
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
    } else if (j.state === 'pass' && hasStaff(s, 'hall') && t - j.at >= STAFF.delay * (today.stance && today.stance.hallDelay ? today.stance.hallDelay : 1)) tapPass(s, j.id, true);
  }
  // 食べ終わって払う
  for (const g of today.guests) {
    if (g.state === 'eating' && t - g.servedAt >= GUEST.eatSeconds * (GENRES[genreOf(s)].eat || 1)) {
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
    if (n > 0) { waste.push([id, n]); wasteCost += n * dishCost(s, id); }
  }
  // アルバイト代と家賃。足りない分は ツケ
  const wage = wages(s) + (today.branch && s.manager ? managerWage(st.sales) : 0);
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
  if (dec) s.rep = clampRep(s.rep - (dec[1] + (dec[2] || 0) * (s.rep - dec[0])) * townMul(s, 'decayMul') * (today.stance && today.stance.decayMul ? today.stance.decayMul : 1));
  const before = s.totalSales;
  s.totalSales += st.sales + (today.asks || []).reduce((a, x) => a + (x.pay || 0), 0);
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
    const story = storyStep(s, r, what);
    if (story) notes.push({ reg: r.id, text: story, good: true, story: true });
    else if (what && what !== 'left' && !favOn) notes.push({ reg: r.id, text: `${r.name}がメニューを長いこと見ていた`, good: false });
    // 嫌なこと：好物が無い・高い・売り切れ・待たされて帰った。あると しばらく来にくくなる
    const bad = !favOn || favPricey || what === 'left' || (what === 'other' && favOut);
    rs.upset = bad ? REGULAR.upsetDays : Math.max(0, (rs.upset || 0) - townHeal(s));
    // 「見ない」は 来にくくなる理由が あるときだけ書く（乱数で来なかっただけの日は書かない）
    if (!what && rs.visits > 0 && rs.upset > 0 && s.day - rs.lastDay >= REGULAR.missDays && !rs.noted) {
      notes.push({ reg: r.id, text: `最近${r.name}を見ない`, good: false });
      rs.noted = true;
    }
  }
  const report = {
    shop: genreOf(s), day: s.day, weather: today.weather, event: today.event, festival: !!today.festival, guests: today.arrivals.length, served: st.served,
    sales: st.sales, prepCost: today.prepCost, asks: today.asks || [], askPay: (today.asks || []).reduce((a, x) => a + (x.pay || 0), 0), wage, rent, credit, repaid, debt: s.debt, wasteCost, waste,
    left: st.left, leftBy: st.leftBy, lostSales: st.lostSales,
    soldOutAt: st.soldOutAt, sold: st.sold, usual: st.usual, notes,
    rep: s.rep, repDelta: s.rep - st.repStart, closedOut: st.closedOut,
    profit: st.sales + (today.asks || []).reduce((a, x) => a + (x.pay || 0), 0) - today.prepCost - wage - rent,
    crew: s.staff.map((x) => ({ name: x.name, role: x.role })), manager: !!(today.branch && s.manager), managerNote: today.branch && s.manager ? s.managerNote : null, stance: today.branch && s.manager ? stanceOf(s) : null,
  };
  // アルバイトは閉店で帰る
  s.lastCrew = report.crew;
  s.staff = [];
  s.reports.push(report);
  if (s.reports.length > 200) s.reports.shift();
  s.history.push({ shop: genreOf(s), day: s.day, sales: st.sales, profit: report.profit, served: st.served, guests: report.guests });
  if (s.history.length > 30) s.history.shift();
  s.today = null;
  if (today.branch) return report;
  // ほかの店も 同じ日を閉める
  report.branches = runBranches(s, today.weather);
  // ほかの店の お願いと 常連さんの話も、この日報に まとめて出す
  report.townAsks = [...report.asks, ...report.branches.flatMap((b) => b.asks || [])];
  report.stories = report.branches.flatMap((b) => b.stories || []);
  s.asks.list = s.asks.list.filter((a) => a.due > s.day);
  s.lastReport = report;
  s.phase = 'report';
  s.day += 1;
  s.ads = 0;
  makeOffer(s);
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
    if (s.manager) managerPlan(s, weather);
    else if (!s.staff.length) rehire(s);
    let r;
    if (!crewOk(s.staff)) {
      // 人がそろわない日は 休み（給料も 評判の変化も 無い）。顔ぶれは 残しておく
      r = { shop: genre, day: s.day, closed: true, why: crewPlan(s, genre).why, asks: settleAsks(s, genre, null) };
      if (s.staff.length) s.lastCrew = s.staff.map((x) => ({ name: x.name, role: x.role }));
      s.staff = [];
    } else {
      startDay(s, { branch: true, weather });
      while (s.today) tick(s, BRANCH_DT);
      r = s.reports[s.reports.length - 1];
    }
    swapTo(s, home);
    out.push({ shop: genre, closed: !!r.closed, why: r.why, served: r.served || 0, guests: r.guests || 0, sales: r.sales || 0, profit: r.profit || 0,
      left: r.closed ? 0 : r.left.queue + r.left.wait + r.left.soldOut + r.left.pricey + (r.left.full || 0),
      managerNote: r.managerNote || null, asks: (r.asks || []).map((x) => ({ ...x, shop: genre })), stories: r.closed ? [] : r.notes.filter((n) => n.story).map((n) => n.text) });
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
// 前の版で付いた「スタッフ8」などを、空いている名前に付け直す（呼んである人・きのうの人・ほかの店も）
function renameOldStaff(s) {
  const lists = [s.staff, s.lastCrew, ...Object.values(s.branches).flatMap((b) => [b.staff || [], b.lastCrew || []])];
  const used = new Set(lists.flat().map((x) => x.name));
  const free = [...STAFF_NAMES, ...STAFF_NAMES.map((n) => `${n}2`)].filter((n) => !used.has(n));
  const map = {};
  for (const x of lists.flat()) {
    if (!/^スタッフ\d+$/.test(x.name)) continue;
    map[x.name] = map[x.name] || free.shift() || STAFF_NAMES[0];
    x.name = map[x.name];
  }
  return s;
}
export function parseSave(text) {
  try {
    const o = JSON.parse(text);
    if (!o || o.v !== SAVE_VERSION || typeof o.money !== 'number' || !Array.isArray(o.stations)) return null;
    const base = createState(o.seed);
    return renameOldStaff({ ...base, ...o, debt: typeof o.debt === 'number' ? o.debt : 0, branches: o.branches && typeof o.branches === 'object' ? o.branches : {}, regulars: { ...(o.genre && o.genre !== 'washoku' ? {} : base.regulars), ...o.regulars }, log: Array.isArray(o.log) ? o.log : base.log,
      reports: Array.isArray(o.reports) ? o.reports : [], lastCrew: Array.isArray(o.lastCrew) ? o.lastCrew : [], boosts: { ...base.boosts, ...o.boosts }, town: { picked: o.town && Array.isArray(o.town.picked) ? o.town.picked : [], built: o.town && Array.isArray(o.town.built) ? o.town.built : [] }, festival: o.festival && typeof o.festival.last === 'number' ? o.festival : base.festival, asks: o.asks && Array.isArray(o.asks.list) ? { ...newAsks(), ...o.asks } : newAsks(), today: null });
  } catch { return null; }
}

// あしたの支度：夜の画面の いちばん上に出す 3行（料理・人・お願い）。
// state は ok（緑）・warn（黄・開店はできるが 気づいてほしい）・ng（赤・このままだと 損をする）・none（灰・用事がない）
export function prepCheck(s) {
  const g = genreOf(s);
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && s.known.includes(id) && canCook(s, id));
  const total = on.reduce((a, [id]) => a + (s.prep[id] || 0), 0);
  const due = asksDue(s, g);
  const short = due.filter((a) => !s.menu[a.dish] || !s.menu[a.dish].on || (s.prep[a.dish] || 0) < a.n);
  // きのう 売り切れた料理で、仕込みを 増やしていないもの。何日も続いていたら 赤
  const mine = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === g);
  const last = mine[mine.length - 1];
  const soldOut = last && last.day === s.day - 1
    ? on.filter(([id]) => last.soldOutAt[id] != null && (s.prep[id] || 0) <= (last.sold[id] || 0)).map(([id]) => id) : [];
  let streak = 0;
  for (let i = mine.length - 1; i >= 0 && soldOut.length && mine[i].day === s.day - 1 - streak && soldOut.some((id) => mine[i].soldOutAt[id] != null); i--) streak += 1;
  let food;
  if (!on.length) food = { state: 'ng', text: 'メニューに 出す料理が ない' };
  else if (total === 0) food = { state: 'ng', text: '仕込みが 0食' };
  else if (streak >= PREP_WARN.soldOutDays) food = { state: 'ng', text: `${DISHES[soldOut[0]].name}が ${streak}日 続けて 売り切れ（仕込み ${s.prep[soldOut[0]] || 0}食）` };
  else if (short.length) food = { state: 'warn', text: `お願いの ${DISHES[short[0].dish].name}が 足りない（${short[0].n}食）` };
  else if (soldOut.length) food = { state: 'warn', text: `きのう 売り切れた料理が ある（${soldOut.map((id) => DISHES[id].name).join('・')}）` };
  else food = { state: 'ok', text: `${on.length}品・仕込み ${total}食` };
  // 人：立つ店は あなたが回す（屋台のうちは ひとりで ふつう）。立たない店は 仕込み係と ホール係が 要る
  const others = shopsOf(s).filter((x) => x !== g);
  const shut = others.filter((x) => !crewPlan(s, x).open);
  let crew;
  if (shut.length) crew = { state: 'ng', text: `${shut.map((x) => `${GENRES[x].no}号店`).join('・')}が 休み（${crewPlan(s, shut[0]).why}）`, shop: shut[0] };
  else if (s.staff.length) crew = { state: 'ok', text: `${s.staff.map((x) => `${x.name}さん`).join('・')}${others.length ? `・ほか${others.length}店も 回る` : ''}` };
  else crew = { state: s.stage === 0 ? 'ok' : 'warn', text: others.length ? `あなた ひとりで 回す・ほか${others.length}店は バイトで` : 'あなた ひとりで 回す' };
  // ほかの店の お願い：店長の いない店で 仕込みが 足りないと 届かない
  const otherShort = others.filter((x) => !shopInfo(s, x).manager).flatMap((x) => {
    const sh = shopInfo(s, x);
    return asksDue(s, x).filter((a) => !sh.menu[a.dish] || !sh.menu[a.dish].on || (sh.prep[a.dish] || 0) < a.n).map((a) => ({ ...a, no: GENRES[x].no }));
  });
  const ak = s.asks;
  const ask = otherShort.length ? { state: 'warn', text: `${otherShort[0].no}号店の お願い ${DISHES[otherShort[0].dish].name}が 足りない（${otherShort[0].n}食）`, shop: otherShort[0].shop }
    : ak.offer ? { state: 'warn', text: '届いた お願いに 返事を していない' }
    : ak.list.length ? { state: 'ok', text: `受けた お願い ${ak.list.length}件${due.length ? `・あした ${due.reduce((a, x) => a + x.n, 0)}食` : ''}` }
      : { state: 'none', text: 'いまは ない' };
  return { food, crew, ask };
}
