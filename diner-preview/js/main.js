// 時間を流す・画面に描く・タップを sim に渡す・保存。ルールはここに書かない。
import * as S from './sim.js';
import { personSVG, LOOK_COUNT } from './people.js';
import { stationSVG } from './kitchen-art.js';
import { exteriorSVG } from './exterior.js';
import { foodSVG } from './food-art.js';
import { DAY, DISHES, STATIONS, STAFF, INGREDIENTS, TRIAL_COST, REGULARS, WEATHER, STAGES, ADS, GENRES, BRANCH_LATER, EVENTS, FAST, GUEST } from './config.js';

const SAVE_KEY = 'diner.proto.v1';
const UI_KEY = 'diner.proto.ui.v1';
const DEBUG = new URLSearchParams(location.search).has('debug');
const $ = (id) => document.getElementById(id);
const yen = (n) => `${n < 0 ? '−' : ''}¥${Math.abs(Math.round(n)).toLocaleString('ja-JP')}`;

if (new URLSearchParams(location.search).has('new') && confirm('セーブを消して 1日目から はじめますか？')) {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(UI_KEY); } catch { /* */ }
  history.replaceState(null, '', location.pathname);
}
let s = load() || S.createState();
let ui = loadUi();
// チュートリアル：はじめて遊ぶ人だけ（とちゅうの セーブには出さない）
if (ui.tut == null) ui.tut = s.day === 1 && s.phase === 'night' ? 0 : 99;
let paused = false;
let fast = false;
let lastEv = 0;
let tab = 'look';

function load() { try { const t = localStorage.getItem(SAVE_KEY); return t ? S.parseSave(t) : null; } catch { return null; } }
function save() { try { localStorage.setItem(SAVE_KEY, S.serialize(s)); } catch { /* 保存できなくても遊べる */ } }
function loadUi() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || { hint: 0 }; } catch { return { hint: 0 }; } }
function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* */ } }

// ---- 小さな道具 ----
function sync(box, items, key, create, update) {
  const map = box._map || (box._map = new Map());
  const seen = new Set();
  let prev = null;
  for (const it of items) {
    const k = key(it);
    seen.add(k);
    let el = map.get(k);
    if (!el) { el = create(it); el.dataset.k = k; map.set(k, el); }
    update(el, it);
    const want = prev ? prev.nextSibling : box.firstChild;
    if (el !== want) box.insertBefore(el, want);
    prev = el;
  }
  for (const [k, el] of map) if (!seen.has(k)) { el.remove(); map.delete(k); }
}
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function toast(text) {
  const t = $('toast'); t.textContent = text; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 1400);
}
// タップは押した瞬間に受ける（描き直しで要素が入れかわっても取りこぼさない）
function onTap(el, fn) { el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; fn(e); }); }

function guestEl() { return h('div', 'guest'); }
// 表情が変わったときだけ描き直す
function paintGuest(el, g, mood) {
  const key = `${g.look}|${mood}`;
  if (el._k === key) return;
  el._k = key;
  const keep = [...el.querySelectorAll('.bubble,.tag')];
  el.innerHTML = personSVG(g.look % LOOK_COUNT, mood);
  for (const k of keep) el.append(k);
}
const staffLook = (x) => [...x.name].reduce((a, c) => a + c.charCodeAt(0), 0) % LOOK_COUNT;
function moodOf(today, g) {
  if (g.state === 'eating') return today.t - g.servedAt < 1.2 ? 'happy' : 'eat';
  const p = S.patienceLeft(today, g);
  return p < 0.3 ? 'angry' : p < 0.6 ? 'wait' : 'idle';
}
const ringColor = (p) => (p > 0.5 ? 'var(--mint)' : p > 0.25 ? 'var(--yolk)' : 'var(--red)');

// ---- 上の帯 ----
function renderTop() {
  $('dayChip').textContent = `${s.today ? s.day : (s.phase === 'report' ? s.day - 1 : s.day)}日目`;
  $('money').innerHTML = `${yen(s.money)}${s.debt ? `<small>ツケ ${yen(s.debt)}</small>` : ''}`;
  $('rep').textContent = '★'.repeat(S.stars(s.rep));
  const t = s.today ? s.today.t : 0;
  $('clockFill').style.width = `${Math.min(100, (t / DAY.seconds) * 100)}%`;
  $('clockText').textContent = s.today
    ? `${S.fmtClock(S.clockOf(t))} ${WEATHER.find((w) => w.id === s.today.weather).icon}${s.today.event ? ` ${EVENTS.list.find((e) => e.id === s.today.event).icon}` : ''}`
    : s.phase === 'report' ? '閉店' : '準備中';
}

// ---- 営業 ----
function renderService() {
  const today = s.today;
  $('shopName').textContent = S.stageOf(s).name;
  const mb = Object.entries(s.menu).filter(([id, m]) => m.on && S.canCook(s, id))
    .map(([id, m]) => `<span class="${(today.stock[id] || 0) > 0 ? '' : 'out'}" title="${DISHES[id].name}"><i>${foodSVG(id)}</i>${m.price}</span>`).join('');
  if ($('menuboard')._h !== mb) {
    $('menuboard').innerHTML = mb; $('menuboard')._h = mb;
    $('menuboard').classList.toggle('many', (mb.match(/<span/g) || []).length > 8);
  }

  // 入口の列
  const q = S.queueOf(today);
  const shown = q.slice(0, GUEST.lineShown);
  sync($('queue'), [...shown, ...(q.length > shown.length ? [{ more: q.length - shown.length }] : [])], (g) => (g.more ? 'more' : g.id),
    (g) => (g.more ? h('div', 'more') : (() => { const e = guestEl(); e.classList.add('enter'); return e; })()),
    (el, g) => {
      if (g.more) { el.textContent = `+${g.more}`; return; }
      const m = moodOf(today, g);
      paintGuest(el, g, m);
      el.classList.toggle('angry', m === 'angry');
    });

  // 席
  const seats = [];
  for (let i = 0; i < s.seats; i++) seats.push(i);
  // 席が増えたら 2段にして、人を小さくする（場面の高さは変えない）
  const rows = s.seats > 5 ? 2 : 1;
  const cols = Math.ceil(s.seats / rows);
  $('seats').style.setProperty('--cols', Math.max(4, cols));
  $('seats').dataset.size = cols > 6 ? 's' : rows > 1 ? 'm' : 'l';
  sync($('seats'), seats, (i) => i, () => h('div', 'seat'), (el, i) => {
    const g = S.seatOf(today, i);
    const key = g ? `${g.id}` : '';
    if (el.dataset.g !== key) {
      el.dataset.g = key;
      el.innerHTML = '';
      el.classList.toggle('empty', !g);
      if (g) {
        const ge = guestEl(); ge.classList.add('enter');
        el.append(ge);
        if (g.reg) el.append(h('div', 'tag', REGULARS.find((r) => r.id === g.reg).name.replace('さん', '')));
      }
    }
    if (!g) return;
    const ge = el.querySelector('.guest');
    const mood = moodOf(today, g);
    paintGuest(ge, g, mood);
    const p = S.patienceLeft(today, g);
    ge.classList.toggle('angry', mood === 'angry');
    // 吹き出し：頼んだ料理と、あとどれだけ待てるか（まわりの輪）
    let b = el.querySelector('.bubble');
    if (g.state === 'seated' && g.dish) {
      if (!b) { b = h('div', 'bubble', `<span>${foodSVG(g.dish)}</span>`); ge.append(b); }
      b.style.setProperty('--p', Math.max(0, p)); b.style.setProperty('--rc', ringColor(p));
    } else if (b) b.remove();
  });

  // 注文の札（作りはじめる前の札だけ）
  const tickets = today.jobs.filter((j) => j.state === 'ticket');
  const box = $('tickets');
  sync(box, tickets.length ? tickets.slice(0, 8) : [{ none: 1 }], (j) => (j.none ? 'none' : j.id),
    (j) => {
      if (j.none) return h('div', 'empty-note', today.guests.length ? 'いまの札は ぜんぶ作っている' : 'お客さんを待っている…');
      const e = h('button', 'ticket', `<span class="ic">${foodSVG(j.dish)}</span><span class="nm">${DISHES[j.dish].name}</span><span class="bar"><i></i></span>`);
      e.dataset.job = j.id;
      onTap(e, () => act(S.tapTicket(s, j.id), e));
      return e;
    },
    (el, j) => {
      if (j.none) return;
      const g = today.guests.find((x) => x.id === j.guest);
      const p = g ? S.patienceLeft(today, g) : 1;
      const bar = el.querySelector('.bar i');
      bar.style.width = `${Math.max(0, p) * 100}%`; bar.style.setProperty('--rc', ringColor(p));
      el.classList.toggle('urgent', p < 0.3);
    });

  // 厨房
  // 台は 流れの順（まな板 → コンロ → 揚げ場）に並べる。4つまでは1段、それより多いと2段
  const order = Object.keys(STATIONS);
  const stations = [...s.stations].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const n = stations.length;
  $('kitchen').style.setProperty('--cols', n <= 4 ? n : Math.ceil(n / 2));
  $('kitchen').dataset.rows = n <= 4 ? 1 : 2;
  sync($('kitchen'), stations, (st) => st.id, (st) => {
    const e = h('button', `station ${st.type}`);
    onTap(e, () => act(S.tapStation(s, st.id), e));
    return e;
  }, (el, st) => {
    const jobId = today.slots[st.id];
    const job = jobId != null ? today.jobs.find((j) => j.id === jobId) : null;
    const staff = S.staffOf(s, st.id);
    const state = job ? job.state : 'idle';
    const sig = `${state}|${job ? job.id : ''}|${staff ? staff.name : ''}`;
    if (el.dataset.sig !== sig) {
      el.dataset.sig = sig;
      el.className = `station ${st.type} ${state === 'cook' ? 'cooking' : state}`;
      const lbl = `<span class="lbl">${STATIONS[st.type].name}</span>`;
      const art = stationSVG(st.type, state === 'cook' ? 'cook' : state === 'ready' ? 'ready' : 'idle');
      const chef = staff ? `<span class="chef">${personSVG(staffLook(staff), 'idle', { chef: true })}<b>${staff.name}<small>バイト</small></b></span>` : '';
      if (!job) el.innerHTML = `${art}${lbl}${chef}`;
      else if (state === 'cook') el.innerHTML = `${art}${lbl}${chef}<span class="food">${foodSVG(job.dish)}</span><span class="prog"><i></i></span>`;
      else {
        const steps = DISHES[job.dish].steps;
        const next = job.step + 1 < steps.length ? `${STATIONS[steps[job.step + 1][0]].name}へ` : '台へ出す';
        el.innerHTML = `${art}${lbl}${chef}<span class="food">${foodSVG(job.dish)}</span><span class="done">できた！${staff ? '' : `→${next}`}</span>`;
      }
    }
    if (job && state === 'cook') el.querySelector('.prog i').style.width = `${Math.min(100, (job.prog / DISHES[job.dish].steps[job.step][1]) * 100)}%`;
  });

  // 受け渡し台
  const plates = today.jobs.filter((j) => j.state === 'pass');
  const slots = [...plates];
  while (slots.length < S.stageOf(s).pass) slots.push({ slot: slots.length });
  sync($('pass'), slots, (j) => (j.slot != null ? `s${j.slot}` : j.id), (j) => {
    if (j.slot != null) return h('div', 'slot');
    const e = h('button', 'plate', foodSVG(j.dish));
    onTap(e, () => act(S.tapPass(s, j.id), e));
    return e;
  }, () => {});
  // 受け渡し台の ホール係
  const hall = s.staff.find((x) => x.role === 'hall');
  const hsig = hall ? hall.name : '';
  if ($('passChef').dataset.sig !== hsig) {
    $('passChef').dataset.sig = hsig;
    $('passChef').innerHTML = hall ? `${personSVG(staffLook(hall), 'idle', { chef: true })}<b>${hall.name}<small>バイト</small></b>` : '';
  }

  // 早送り：仕込み係と ホール係がいる日だけ
  const canFast = S.crewOk(s.staff);
  $('fastBtn').hidden = !canFast;
  if (!canFast) fast = false;
  $('fastBtn').classList.toggle('on', fast);

  const st = today.stats;
  const tb = `<span>売上<b>${yen(st.sales)}</b></span><span>食べた<b>${st.served}</b>人</span><span>帰った<b>${st.left.queue + st.left.wait + st.left.soldOut + st.left.pricey}</b>人</span>`;
  if ($('todaybar')._h !== tb) { $('todaybar').innerHTML = tb; $('todaybar')._h = tb; }
  renderFx();
}

function act(res, el) {
  if (res.ok) return;
  if (res.why) toast(res.why);
  if (el) { el.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); }
}

function posOfSeat(seat) {
  const root = $('service').getBoundingClientRect();
  const el = seat != null ? $('seats').children[seat] : $('queue');
  if (!el) return { x: root.width / 2, y: 80 };
  const r = el.getBoundingClientRect();
  return { x: r.left - root.left + r.width / 2, y: r.top - root.top + 4 };
}
function float(text, seat, cls = '') {
  const p = posOfSeat(seat);
  const e = h('div', `float ${cls}`, text);
  e.style.left = `${p.x}px`; e.style.top = `${p.y}px`;
  $('fx').append(e);
  setTimeout(() => e.remove(), 1200);
}
const LEAVE_SAY = { queue: '待てない…', wait: 'まだ…？', soldOut: '売り切れ…', pricey: '高いなぁ' };
function renderFx() {
  for (const ev of s.today.events) {
    if (ev.id <= lastEv) continue;
    lastEv = ev.id;
    if (ev.type === 'pay') float(`+${yen(ev.amount)}`, ev.seat);
    else if (ev.type === 'leave') float(LEAVE_SAY[ev.reason], ev.reason === 'queue' ? null : ev.seat, 'say');
    else if (ev.type === 'order' && ev.usual) float('いつもの！', ev.seat, 'say');
    else if (ev.type === 'serve' && ev.fast) float('はやい！', ev.seat, 'say');
  }
}

// ---- 日報 ----
const PERIOD = { lunch: '昼', day: '昼すぎ', dinner: '夜' };
// 日報の紙（その日の閉店のあと と、外観のタブから見返すとき で同じ形）
function reportPaper(r, { live = false } = {}) {
  const w = WEATHER.find((x) => x.id === r.weather);
  const rows = [];
  const when = Object.entries(r.leftBy).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${PERIOD[k]} ${n}人`).join('・');
  if (r.left.queue) rows.push([`席が空かず 入口で帰った ${r.left.queue}人`, null]);
  if (r.left.wait) rows.push([`料理が来ず 席を立った ${r.left.wait}人`, null]);
  if (r.left.queue || r.left.wait) rows.push([`（帰ったのは ${when}）`, null]);
  if (r.left.soldOut) rows.push([`食べたい物が売り切れで帰った ${r.left.soldOut}人`, null]);
  if (r.left.pricey) rows.push([`メニューを見て帰った ${r.left.pricey}人`, null]);
  if (r.lostSales) rows.push(['売り逃した（帰った人のぶん）', -r.lostSales]);
  for (const [id, min] of Object.entries(r.soldOutAt)) rows.push([`${DISHES[id].name}が売り切れ ${S.fmtClock(min)}`, null]);
  for (const [id, n] of r.waste) rows.push([`${DISHES[id].name}の食材を捨てた ${n}食分`, -n * DISHES[id].cost]);
  if (r.credit) rows.push([`お金が足りず、${yen(r.credit)}を ツケにした`, null]);
  if (r.repaid) rows.push([`ツケを ${yen(r.repaid)} 返した`, null, true]);
  if (r.debt) rows.push([`ツケの残り ${yen(r.debt)}`, null]);
  for (const id of r.usual) rows.push([`${REGULARS.find((x) => x.id === id).name}が「いつもの」を頼んだ`, null, true]);
  for (const n of r.notes) rows.push([n.text, null, n.good]);
  if (r.closedOut) rows.push([`閉店で入れなかった ${r.closedOut}人`, null]);
  if (!rows.length) rows.push(['大きな出来事は なかった', null, true]);

  const delta = Math.round(r.repDelta * 10) / 10;
  const canAd = live && !r.adDone && r.profit > 0 && S.adLeft(s) > 0;
  const crew = (r.crew || []).map((x) => `${x.name}さん`).join('・');
  return `
    <div class="paper${live ? ' live' : ''}">
      <div class="stamp ${r.profit > 0 ? 'black' : 'red'}">${r.profit > 0 ? '黒字' : '赤字'}</div>
      <h2>${r.day}日目の日報 <span style="font-size:18px">${w.icon}</span>${r.event ? `<span class="evtag">${EVENTS.list.find((e) => e.id === r.event).name}</span>` : ''}</h2>
      <div class="headline">
        <div><b>${r.served}<small>/${r.guests}人</small></b><small>食べていった人</small></div>
        <div><b>${yen(r.sales)}</b><small>売上</small></div>
        <div><b class="${delta >= 0 ? 'plus' : 'minus'}">${delta >= 0 ? '+' : ''}${delta}</b><small>評判</small></div>
      </div>
      <div class="lines">
        ${rows.map(([t, v, good], i) => `<div class="row" style="animation-delay:${0.15 + i * 0.08}s"><span>${t}</span><b class="${v != null ? 'minus' : good ? 'plus' : ''}">${v != null ? yen(v) : good ? '♪' : ''}</b></div>`).join('')}
        <div class="row" style="animation-delay:${0.15 + rows.length * 0.08}s"><span>仕入れ</span><b class="minus">${yen(-r.prepCost)}</b></div>
        <div class="row" style="animation-delay:${0.23 + rows.length * 0.08}s"><span>アルバイト代${crew ? `<small class="crew">${crew}（この日だけ）</small>` : ''}</span><b class="minus">${yen(-r.wage)}</b></div>
        ${r.rent ? `<div class="row" style="animation-delay:${0.31 + rows.length * 0.08}s"><span>家賃</span><b class="minus">${yen(-r.rent)}</b></div>` : ''}
      </div>
      ${branchLines(r)}
      <div class="profit"><span>${r.branches && r.branches.length ? 'この店の もうけ' : 'きょうのもうけ'}</span><b class="${r.profit >= 0 ? 'plus' : 'minus'}" ${live ? 'id="profitNum"' : ''}>${yen(live ? 0 : r.profit + (r.adBonus || 0))}</b></div>
      ${r.adBonus ? `<div class="plus" style="font-weight:800;text-align:right">広告のごほうび ${yen(r.adBonus)}</div>` : ''}
      <div class="report-actions">
        ${canAd ? `<button class="chunky yel ad" id="adProfit">広告を見て もうけを ${ADS.profitMul}倍に（のこり${S.adLeft(s)}回）</button>` : ''}
        ${live ? '<button class="big go" id="toNight">夜の準備へ</button>' : '<button class="big go" data-close>とじる</button>'}
      </div>
    </div>`;
}
// 立たなかった店の その日（アルバイトだけで回した）
function branchLines(r) {
  if (!r.branches || !r.branches.length) return '';
  const rows = r.branches.map((b) => {
    const g = GENRES[b.shop];
    const body = b.closed ? `<span>${b.why || '人がいない'}ので 休み</span><b></b>`
      : `<span>${b.served}/${b.guests}人・売上 ${yen(b.sales)}${b.left ? `・帰った ${b.left}人` : ''}</span><b class="${b.profit >= 0 ? 'plus' : 'minus'}">${yen(b.profit)}</b>`;
    return `<button class="brow" data-bshop="${b.shop}" data-bday="${r.day}" ${b.closed ? 'disabled' : ''}><em>${g.no}号店 ${g.name}${b.closed ? '' : '<small>（タップで日報）</small>'}</em><div class="row">${body}</div></button>`;
  }).join('');
  return `<div class="branches"><small>ほかの店（アルバイトで回した）</small>${rows}</div>`;
}
function wireBranchRows(root) {
  for (const b of root.querySelectorAll('[data-bshop]')) onTap(b, () => {
    const r = s.reports.find((x) => String(x.day) === b.dataset.bday && (x.shop || 'washoku') === b.dataset.bshop);
    if (r) overlay(reportPaper(r), null, 'sheet bare');
  });
}
function renderReport() {
  const r = s.lastReport;
  $('report').innerHTML = reportPaper(r, { live: true });
  wireBranchRows($('report'));
  countUp($('profitNum'), r.profit + (r.adBonus || 0));
  const ad = $('adProfit');
  if (ad) onTap(ad, () => showAd(() => { S.watchAd(s, 'profit'); save(); renderReport(); }));
  onTap($('toNight'), () => { S.toNight(s); save(); show(); });
}
function countUp(el, to) {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 900);
    el.textContent = yen(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- 夜の準備 ----
const TABS = [['look', '外観'], ['menu', 'メニュー'], ['prep', '仕込み'], ['shop', '設備'], ['staff', 'バイト'], ['book', 'レシピ']];
function renderNight() {
  const ns = S.nextStage(s);
  $('nightTitle').textContent = `${s.day}日目の準備`;
  $('nightSub').textContent = `${S.stageOf(s).name}・評判 ${Math.round(s.rep)}`;
  // あしたの貼り紙：天気と 出来事
  const fw = S.weatherOf(s), fe = S.eventOf(s);
  $('notice').innerHTML = `<b>あしたは ${fw.icon} ${fw.name}</b>${fe ? `<span class="ev">${fe.icon} ${fe.name}<small>${fe.text}</small></span>` : ''}`;
  $('notice').classList.toggle('has-ev', !!fe);
  const shops = S.shopsOf(s);
  $('shops').hidden = shops.length < 2;
  $('shops').innerHTML = shops.map((g) => {
    const here = g === S.genreOf(s);
    const plan = S.crewPlan(s, g);
    const sub = here ? 'あした あなたが立つ' : plan.open ? `アルバイト${plan.staff.length}人で回す` : `${plan.why}ので 休み`;
    return `<div class="shopbtn ${here ? 'on' : ''} ${!here && !plan.open ? 'shut' : ''}" data-shop="${g}"><em>${GENRES[g].no}号店</em><b>${GENRES[g].name}</b><small>${sub}</small>
      ${here ? '' : `<span class="shopacts"><button class="mini" data-crew="${g}">バイトを呼ぶ</button><button class="mini" data-go="${g}">ここに立つ</button></span>`}</div>`;
  }).join('');
  for (const b of $('shops').querySelectorAll('[data-go]')) onTap(b, (e) => { e.stopPropagation(); if (S.switchShop(s, b.dataset.go).ok) { ui.pick = []; save(); renderNight(); toast(`あしたは ${GENRES[b.dataset.go].name}に立つ`); } });
  for (const b of $('shops').querySelectorAll('[data-crew]')) onTap(b, (e) => { e.stopPropagation(); crewSheet(b.dataset.crew); });
  $('tabs').innerHTML = TABS.map(([id, nm]) => `<button class="tab ${id === tab ? 'on' : ''}" data-tab="${id}">${nm}${id === 'shop' && ns && ns.ready ? '<i class="dot"></i>' : ''}</button>`).join('');
  for (const b of $('tabs').children) onTap(b, () => { tab = b.dataset.tab; renderNight(); });
  const p = $('panel');
  const keep = p.scrollTop;
  p.innerHTML = PANELS[tab]();
  p.scrollTop = keep;
  for (const el of p.querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
  const cost = S.prepCost(s);
  $('openBtn').textContent = `開店する！（仕入れ ${yen(cost)}）`;
}

// ほかの店の アルバイトを、店を切り替えずに 呼ぶ
function crewSheet(genre) {
  const sh = S.shopInfo(s, genre);
  const render = () => {
    const now = sh.staff.map((x) => `<div class="card"><div class="ic face">${personSVG(staffLook(x), 'happy', { chef: true })}</div><div class="txt"><b>${x.name}さん</b><small>${x.role === 'hall' ? 'ホール係' : `${STATIONS[x.role].name}`}・${yen(STAFF[x.role].wage)}</small></div><button class="chunky" data-fire="${x.id}">呼ばない</button></div>`).join('');
    const again = S.canRehireAt(s, genre) ? `<button class="chunky yel wide" data-rehire="1">きのうと同じ人を呼ぶ（${sh.lastCrew.map((x) => `${x.name}さん`).join('・')}）</button>` : '';
    const roles = ['board', 'stove', 'fryer', 'hall'].map((r) => {
      const c = S.canHireAt(s, genre, r);
      return `<div class="card"><div class="ic">${{ board: '🔪', stove: '🔥', fryer: '🫕', hall: '🛎️' }[r]}</div><div class="txt"><b>${STAFF[r].name}</b><small>1日 ${yen(STAFF[r].wage)}${c.ok ? '' : `・${c.why}`}</small></div>
        <button class="chunky mint" data-hire="${r}" ${c.ok ? '' : 'disabled'}>あした呼ぶ</button></div>`;
    }).join('');
    const plan = S.crewPlan(s, genre);
    return `<h3>${GENRES[genre].no}号店 ${GENRES[genre].name}の アルバイト</h3>
      <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:${plan.open ? 'var(--ink2)' : 'var(--red)'}">${plan.open ? `あしたは ${plan.staff.length}人で回る。仕込み係と ホール係が いれば 回る` : `${plan.why}ので 休みになる。仕込み係と ホール係が 要る`}</p>
      ${again}${now ? `<div class="sec">あした来る人</div>${now}` : ''}<div class="sec">呼ぶ</div>${roles}
      <button class="big go" data-close>とじる</button>`;
  };
  const close = overlay(render(), () => { save(); renderNight(); });
  const wire = () => {
    const o = $('overlay');
    for (const b of o.querySelectorAll('[data-hire]')) onTap(b, () => { S.hireAt(s, genre, b.dataset.hire); redraw(); });
    for (const b of o.querySelectorAll('[data-fire]')) onTap(b, () => { S.fireAt(s, genre, b.dataset.fire); redraw(); });
    for (const b of o.querySelectorAll('[data-rehire]')) onTap(b, () => { S.rehireAt(s, genre); redraw(); });
    for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
  };
  const redraw = () => { $('overlay').firstElementChild.innerHTML = render(); wire(); };
  wire();
}

const BRANCH_ORDER_LEN = Object.keys(GENRES).length;
const PANELS = {
  look() {
    const st = S.stageOf(s), ns = S.nextStage(s);
    const facts = [['席', `${s.seats}`], ['台', `${s.stations.length}`], ['スタッフ', `${s.staff.length}人`], ['評判', `${Math.round(s.rep)}`]]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
    let next = '';
    if (ns) {
      const a = Math.min(1, s.totalSales / ns.unlock.totalSales), b = Math.min(1, s.rep / ns.unlock.rep);
      next = `<div class="sec">つぎの姿：${ns.name}</div>
        <div class="ghost">${exteriorSVG(s, s.stage + 1)}${ns.ready ? '<span class="ok">広げられる！</span>' : '<span>？</span>'}</div>
        <small style="font-weight:800">売上の合計 ${yen(s.totalSales)} / ${yen(ns.unlock.totalSales)}</small><div class="meter"><i style="width:${a * 100}%"></i></div>
        <small style="font-weight:800">評判 ${Math.round(s.rep)} / ${ns.unlock.rep}</small><div class="meter"><i style="width:${b * 100}%"></i></div>
        ${ns.ready ? '<small style="font-weight:800;color:var(--ink2)">「設備」のタブから 広げられる</small>' : ''}`;
    }
    const days = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === S.genreOf(s)).reverse();
    const top = Math.max(1, ...days.map((r) => Math.abs(r.profit + (r.adBonus || 0))));
    const reports = days.map((r) => {
      const p = r.profit + (r.adBonus || 0);
      const w = WEATHER.find((x) => x.id === r.weather);
      return `<button class="dayrow" data-do="report" data-arg="${r.day}" data-shop="${r.shop || 'washoku'}">
        <span class="d"><em>${r.day}</em>日目 ${w ? w.icon : ''}</span>
        <span class="bar ${p >= 0 ? 'up' : 'down'}"><i style="width:${Math.max(4, (Math.abs(p) / top) * 100)}%"></i></span>
        <b class="${p >= 0 ? 'plus' : 'minus'}">${yen(p)}</b></button>`;
    }).join('');
    const log = s.log.slice().reverse().map((e) => `<li class="k-${e.kind}"><small><em>${e.day}</em>日目</small>${e.text}</li>`).join('');
    return `<div class="exwrap">${exteriorSVG(s)}<div class="exname">${S.shopsOf(s).length > 1 ? `${GENRES[S.genreOf(s)].no}号店 ` : ''}${st.name}</div></div>
      <div class="facts">${facts}</div>
      ${next}
      ${reports ? `<div class="sec">これまでの日報 <small>（タップで ひらく）</small></div><div class="days">${reports}</div>` : ''}
      <div class="sec">あゆみ</div><ol class="ayumi">${log}</ol>
      <div class="sec">やり直す</div><button class="chunky wide" data-do="reset">はじめから やり直す</button>`;
  },
  menu() {
    const rows = s.known.map((id) => {
      const d = DISHES[id], m = s.menu[id];
      const cook = S.canCook(s, id);
      return `<div class="card ${m.on ? '' : 'off'}">
        <div class="ic">${foodSVG(id)}</div>
        <div class="txt"><b>${d.name}</b><small>${cook ? `ふつうの値段 ${yen(d.base)}・食材 ${yen(d.cost)}` : `${d.steps.filter(([t]) => !s.stations.some((x) => x.type === t)).map(([t]) => STATIONS[t].name).join('・')}が無いので作れない`}</small></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <button class="switch ${m.on ? 'on' : ''}" data-do="toggle" data-arg="${id}" aria-label="メニューに出す"></button>
          <div class="stepper"><button data-do="price-" data-arg="${id}">−</button><span>${yen(m.price)}</span><button data-do="price+" data-arg="${id}">＋</button></div>
        </div></div>`;
    }).join('');
    const pd = S.priceDemand(s);
    const level = pd < 0.95 ? '高め（来る人が減る）' : pd > 1.02 ? '安め（来る人が少し増える）' : 'ふつう';
    return `<p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">値段を上げると1人の売上は増えるが、来る人も頼む人も減る。<br>いまの店の値段は <b>${level}</b></p>${rows}`;
  },
  prep() {
    const last = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === S.genreOf(s)).pop();
    const rows = Object.entries(s.menu).filter(([id, m]) => m.on && S.canCook(s, id)).map(([id]) => {
      const d = DISHES[id];
      const sold = last ? last.sold[id] || 0 : null;
      return `<div class="card"><div class="ic">${foodSVG(id)}</div>
        <div class="txt"><b>${d.name}</b><small>${sold != null ? `きのう ${sold}食 売れた` : 'はじめての営業'}・1食 ${yen(d.cost)}</small></div>
        <div class="stepper"><button data-do="prep-" data-arg="${id}">−</button><span>${s.prep[id] || 0}食</span><button data-do="prep+" data-arg="${id}">＋</button></div></div>`;
    }).join('');
    return `<p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">足りないと売り切れる。余った食材は閉店後に捨てる。</p>${rows}
      <div class="sec">あしたの作戦</div>
      <div class="boosts">
        ${boostBtn('market', `仕入れを半額に`)}
        ${boostBtn('flyer', `チラシで お客さん＋${Math.round((ADS.flyerMul - 1) * 100)}%`)}
      </div>`;
  },
  shop() {
    const ns = S.nextStage(s);
    const items = ['seat', 'board', 'stove', 'fryer'].map((k) => {
      const c = S.canBuy(s, k);
      const have = k === 'seat' ? `いま ${s.seats}席` : `いま ${s.stations.filter((x) => x.type === k).length}つ`;
      const ic = { seat: '🪑', board: '🔪', stove: '🔥', fryer: '🫕' }[k];
      const nm = { seat: '席を1つ増やす', board: 'まな板を増やす', stove: 'コンロを増やす', fryer: '揚げ場を置く' }[k];
      return `<div class="card"><div class="ic">${ic}</div><div class="txt"><b>${nm}</b><small>${have}${c.ok ? '' : `・${c.why}`}</small></div>
        <button class="chunky yel" data-do="buy" data-arg="${k}" ${c.ok ? '' : 'disabled'}>${yen(S.shopPrice(s, k))}</button></div>`;
    }).join('');
    let stage = '';
    if (ns) {
      const a = Math.min(1, s.totalSales / ns.unlock.totalSales), b = Math.min(1, s.rep / ns.unlock.rep);
      stage = `<div class="sec">お店を広げる</div>
        <div class="card" style="flex-direction:column;align-items:stretch;background:${ns.ready ? '#fff4c2' : '#fffdf6'}">
          <b style="font-family:var(--pop);font-size:16px">${ns.name}に する</b>
          <small style="font-weight:800;color:var(--ink2)">席 ${ns.maxSeats}まで・台 ${ns.maxStations}つまで・スタッフ ${ns.maxStaff}人まで</small>
          <small style="font-weight:800">売上の合計 ${yen(s.totalSales)} / ${yen(ns.unlock.totalSales)}</small><div class="meter"><i style="width:${a * 100}%"></i></div>
          <small style="font-weight:800">評判 ${Math.round(s.rep)} / ${ns.unlock.rep}</small><div class="meter"><i style="width:${b * 100}%"></i></div>
          <button class="chunky ${ns.ready ? 'red' : ''}" style="margin-top:6px" data-do="expand" ${ns.ready && ns.affordable ? '' : 'disabled'}>${ns.ready ? `${yen(ns.price)}で 広げる` : 'まだ広げられない'}</button>
        </div>`;
    }
    const nb = S.nextBranch(s);
    let branch = '';
    if (nb) {
      branch = `<div class="sec">${nb.no}号店を出す</div>
        <div class="card branchcard" style="flex-direction:column;align-items:stretch;background:${nb.ready ? '#ffe4e0' : '#fffdf6'}">
          <div class="exmini">${exteriorSVG({ ...S.createShop(nb.genre), totalSales: 0 })}</div>
          <b style="font-family:var(--pop);font-size:16px">${nb.name}</b>
          <small style="font-weight:800;color:var(--ink2)">中華の店。料理も 食材も 常連さんも 別。${GENRES[nb.genre].stageNames[nb.startStage]}から始まる</small>
          <small style="font-weight:800;color:var(--ink2)">あなたが立てるのは 1日に1店。もう1店は アルバイトだけで回す</small>
          ${nb.ready ? '' : `<small style="font-weight:800">${nb.needName}</small>`}
          <button class="chunky ${nb.ready ? 'red' : ''}" style="margin-top:6px" data-do="branch" ${nb.ready && nb.affordable ? '' : 'disabled'}>${nb.ready ? `${yen(nb.price)}で 出す` : 'まだ出せない'}</button>
        </div>`;
    } else branch = `<div class="sec">${BRANCH_ORDER_LEN + 1}号店から（準備中）</div><p class="later">${BRANCH_LATER.join('・')}… 試作はここまで</p>`;
    return `${stage}${branch}<div class="sec">${S.stageOf(s).name}の設備</div>${items}`;
  },
  staff() {
    const st = S.stageOf(s);
    const now = s.staff.map((x) => `<div class="card"><div class="ic face">${personSVG(staffLook(x), 'happy', { chef: true })}</div><div class="txt"><b>${x.name}さん<span class="oneday">あした1日だけ</span></b><small>${x.role === 'hall' ? 'ホール係・料理を運ぶ' : `${STATIONS[x.role].name}を受け持つ`}・${yen(STAFF[x.role].wage)}</small></div>
      <button class="chunky" data-do="fire" data-arg="${x.id}">呼ばない</button></div>`).join('');
    const again = S.canRehire(s) ? `<button class="chunky yel wide" data-do="rehire">きのうと同じ人を呼ぶ（${s.lastCrew.map((x) => `${x.name}さん`).join('・')}）</button>` : '';
    const roles = ['board', 'stove', 'fryer', 'hall'].map((r) => {
      const c = S.canHire(s, r);
      const desc = r === 'hall' ? '受け渡し台の料理を運ぶ' : `${STATIONS[r].name}の料理を進める`;
      return `<div class="card"><div class="ic">${{ board: '🔪', stove: '🔥', fryer: '🫕', hall: '🛎️' }[r]}</div><div class="txt"><b>${STAFF[r].name}</b><small>${desc}・1日 ${yen(STAFF[r].wage)}${c.ok ? '' : `・${c.why}`}</small></div>
        <button class="chunky mint" data-do="hire" data-arg="${r}" ${c.ok ? '' : 'disabled'}>あした呼ぶ</button></div>`;
    }).join('');
    return `<div class="note-oneday"><b>アルバイトは 1日だけ</b>あした1日 来てくれて、閉店したら帰る。続けて来てほしいときは 毎晩 呼び直す。アルバイト代は 閉店のときに払う。</div>
      <p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">任せた持ち場は ひとりでに進み、料理も少し速い。雇えるのは 台の数 ＋ ホール1人 まで（いま ${s.stations.length + 1}人）。</p>
      ${again}
      ${now ? `<div class="sec">あした来る人</div>${now}` : ''}<div class="sec">あしたの アルバイトを呼ぶ</div>${roles}`;
  },
  book() {
    ui.pick = ui.pick || [];
    // 段ごとに 見つけた数を出す。まだ届かない段は 鍵つき
    const genre = S.genreOf(s), ing = S.ingredientsOf(s);
    const book = STAGES.map((_, i) => {
      const st = S.stageOf(s, i);
      const list = Object.entries(DISHES).filter(([, d]) => d.combo && (d.shop || 'washoku') === genre && d.stage === i);
      if (!list.length) return '';
      const got = list.filter(([id]) => s.known.includes(id)).length;
      const open = s.stage >= i;
      const cells = list.map(([id, d]) => (s.known.includes(id) ? `<div><span>${foodSVG(id)}</span>${d.name}${d.steps.length > 2 ? '<em>3工程</em>' : ''}</div>`
        : `<div class="unk"><span>${open ? '？' : '🔒'}</span>${open ? '？？？' : ''}</div>`)).join('');
      return `<div class="book-st ${open ? '' : 'locked'}"><b>${st.name}の レシピ <small>${got}/${list.length}</small></b>${open ? '' : `<small>${st.name}に なると 試作できる</small>`}<div class="book">${cells}</div></div>`;
    }).join('');
    const chips = Object.entries(INGREDIENTS).filter(([k]) => k in ing).map(([k, nm]) => (ing[k] > s.stage
      ? `<button class="lock" disabled>🔒 ${nm}</button>`
      : `<button class="${ui.pick.includes(k) ? 'on' : ''}" data-do="pick" data-arg="${k}">${nm}</button>`)).join('');
    const tried = s.tried.length ? `<small style="font-weight:800;color:var(--ink2)">試した組み合わせ：${s.tried.map((k) => k.split('+').map((x) => INGREDIENTS[x]).join('＋')).join('、')}</small>` : '';
    return `<p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">食材を2つ えらんで 試作すると、新しい料理が見つかることがある。</p>
      ${book}
      <div class="sec">試作する</div><div class="chips">${chips}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chunky red" data-do="trial" ${ui.pick.length === 2 ? '' : 'disabled'}>${s.boosts.freeTrial ? '無料で 試作する' : `${yen(TRIAL_COST)}で 試作する`}</button>
        ${s.boosts.freeTrial ? '' : boostBtn('freeTrial', '試作を1回 無料に')}
      </div>${tried}`;
  },
};
function boostBtn(kind, label) {
  const on = s.boosts[kind];
  if (on) return `<span class="chunky mint">${label}：あした効く ✓</span>`;
  return `<button class="chunky yel ad" data-do="ad" data-arg="${kind}" ${S.adLeft(s) ? '' : 'disabled'}>${label}</button>`;
}

function doNight(what, arg) {
  const m = s.menu[arg];
  switch (what) {
    case 'toggle': S.toggleMenu(s, arg); break;
    case 'price-': S.setPrice(s, arg, m.price - 50); break;
    case 'price+': S.setPrice(s, arg, m.price + 50); break;
    case 'prep-': S.setPrep(s, arg, (s.prep[arg] || 0) - 1); break;
    case 'prep+': S.setPrep(s, arg, (s.prep[arg] || 0) + 1); break;
    case 'buy': { const r = S.buy(s, arg); if (r.ok) toast('置いた！'); break; }
    case 'hire': { const r = S.hire(s, arg); if (r.ok) toast(`${r.name}さんが あした1日 来てくれる`); break; }
    case 'fire': S.fire(s, arg); break;
    case 'rehire': { const r = S.rehire(s); if (r.ok) toast(`${r.n}人 来てくれる`); break; }
    case 'report': {
      const r = s.reports.find((x) => String(x.day) === arg && (x.shop || 'washoku') === S.genreOf(s));
      if (r) overlay(reportPaper(r), null, 'sheet bare');
      return;
    }
    case 'expand': {
      const r = S.expand(s);
      const ing = S.ingredientsOf(s);
      const fresh = Object.entries(INGREDIENTS).filter(([k]) => ing[k] === s.stage).map(([, nm]) => nm).join('・');
      if (r.ok) celebrate(`${r.name}に なった！\n<small class="cel-sub">新しい食材：${fresh}<br>レシピ帳に 新しい料理が増えた</small>`);
      break;
    }
    case 'branch': {
      const r = S.openBranch(s);
      if (r.ok) {
        tab = 'look'; ui.pick = [];
        const h = r.home;
        const line = h.open ? `${GENRES[h.genre].no}号店は ${h.crew.map((n) => `${n}さん`).join('・')}で 回る` : `${GENRES[h.genre].no}号店は 仕込み係と ホール係を 呼ばないと 休みになる（店の札の「バイトを呼ぶ」から）`;
        celebrate(`${r.name}を 出した！\n<small class="cel-sub">あしたは 2号店に立つ。<br>${line}</small>`);
      }
      break;
    }
    case 'pick': {
      ui.pick = ui.pick.includes(arg) ? ui.pick.filter((x) => x !== arg) : [...ui.pick, arg].slice(-2);
      break;
    }
    case 'trial': {
      const r = S.tryRecipe(s, ui.pick[0], ui.pick[1]);
      ui.pick = [];
      if (!r.ok) toast(r.why);
      else if (r.found) celebrate(`新しい料理！\n<span class="big-food">${foodSVG(r.found)}</span>${DISHES[r.found].name}`);
      else toast('うーん、いまいち…');
      break;
    }
    case 'ad': showAd(() => { S.watchAd(s, arg); save(); renderNight(); renderTop(); }); return;
    case 'reset': {
      overlay(`<h3>はじめから やり直す</h3><p>いまの お店・お金・日報は ぜんぶ消えて、1日目の屋台から はじまります。</p>
        <button class="chunky red wide" id="resetYes">消して 1日目から</button><button class="big go" data-close>やめる</button>`);
      onTap($('resetYes'), () => { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(UI_KEY); } catch { /* */ } location.reload(); });
      return;
    }
  }
  save(); renderNight(); renderTop();
}

// ---- 重ねる画面 ----
function overlay(html, onBack, cls = 'sheet') {
  const o = $('overlay');
  o.innerHTML = `<div class="${cls}">${html}</div>`;
  o.hidden = false;
  const close = () => { o.hidden = true; o.innerHTML = ''; if (onBack) onBack(); };
  for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
  return close;
}
function showAd(done) {
  const wasPaused = paused; paused = true;
  let n = 2;
  const close = overlay(`<div class="adbox">広告<br><small style="font-family:var(--body);font-size:12px">（試作なので本物は出ません）</small><br><span id="adCount">${n}</span></div>`);
  const t = setInterval(() => {
    n -= 1;
    const c = $('adCount'); if (c) c.textContent = n;
    if (n <= 0) { clearInterval(t); close(); paused = wasPaused; done(); toast('ごほうびを受け取った'); }
  }, 1000);
}
function celebrate(text) {
  overlay(`<div class="celebrate">${text.replace('\n', '<br>')}</div><button class="big go" data-close>やったね</button>`);
  const colors = ['#ff4f5e', '#ffd23f', '#2fd39e', '#5ccdf2', '#6b4eff'];
  for (let i = 0; i < 40; i++) {
    const c = h('i', 'confetti');
    c.style.left = `${Math.random() * 100}vw`; c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    document.body.append(c);
    setTimeout(() => c.remove(), 2600);
  }
}
onTap($('walletBtn'), () => {
  const wasPaused = paused; paused = true;
  overlay(`<h3>お店のお財布</h3>
    <div class="product"><div class="txt"><b>広告なしパス</b><small>広告を見なくても、広告のごほうびを毎日もらえる</small></div><button class="chunky yel" disabled>¥980</button></div>
    <div class="product"><div class="txt"><b>レトロ喫茶の内装</b><small>見た目だけ変わる</small></div><button class="chunky yel" disabled>¥300</button></div>
    <div class="product"><div class="txt"><b>開店の応援パック</b><small>はじめの2週間だけ。コンロ1つと内装1つ</small></div><button class="chunky yel" disabled>¥480</button></div>
    <p style="color:var(--ink2);font-weight:800">試作なので まだ買えません。</p>
    <button class="big go" data-close>とじる</button>`, () => { paused = wasPaused; });
});
onTap($('fastBtn'), () => { fast = !fast; $('fastBtn').classList.toggle('on', fast); toast(fast ? `早送り ×${FAST}` : 'ふつうの速さ'); });
onTap($('pauseBtn'), () => {
  paused = true;
  overlay(`<h3>ひと休み</h3><p>営業の途中で閉じると、この日は開店前から やり直しになります。</p>
    ${DEBUG ? '<button class="chunky" id="dbgEnd">（試し）すぐ閉店する</button><button class="chunky" id="dbgMoney">（試し）＋¥50,000・評判＋20</button>' : ''}
    <button class="big go" data-close>営業にもどる</button>`, () => { paused = false; });
  const d = $('dbgEnd');
  if (d) onTap(d, () => { $('overlay').hidden = true; paused = false; s.today.t = DAY.seconds; });
  const m = $('dbgMoney');
  if (m) onTap(m, () => { s.money += 50000; s.totalSales += 50000; s.rep = Math.min(100, s.rep + 20); renderTop(); });
});

onTap($('openBtn'), () => {
  const on = Object.entries(s.menu).filter(([id, m]) => m.on && S.canCook(s, id));
  if (!on.length) { toast('メニューを1つは出そう'); return; }
  S.startDay(s);
  lastEv = 0;
  show();
});

// ---- チュートリアル ----
// card：まん中の札（つぎへ）／ tap：光らせた所の説明（どこを押しても つぎへ）／ act：光らせた所を 押すと進む
// hold：出ているあいだ 営業の時間を止める
const jobsIn = (st) => (s.today ? s.today.jobs.filter((j) => j.state === st) : []);
const nightTab = (id) => () => { if (tab !== id) { tab = id; renderNight(); } };
const TUT = [
  { phase: 'night', mode: 'card', text: 'ようこそ！ きょうから 屋台の店主です。<br>1日は <b>営業 → 日報 → 夜の準備</b> の くりかえし。何日でも 好きなだけ 遊べます。' },
  { phase: 'night', mode: 'act', target: () => $('openBtn'), text: 'メニューと仕込みは 用意してあります。まずは 開店してみよう！', done: () => s.phase === 'service' },
  { phase: 'service', mode: 'act', hold: true, ready: () => jobsIn('ticket').length > 0, target: () => document.querySelector('#tickets .ticket'),
    text: 'お客さんの注文が来た！<br><b>注文の札</b>をタップすると まな板で 作りはじめる。あとは 次の台へ ひとりでに進む', done: () => s.today.jobs.some((j) => j.state !== 'ticket') },
  { phase: 'service', mode: 'act', hold: true, ready: () => jobsIn('ready').some((j) => j.step + 1 >= DISHES[j.dish].steps.length), target: () => document.querySelector('#kitchen .station.ready'),
    text: () => {
      const j = jobsIn('ready')[0];
      const steps = DISHES[j.dish].steps;
      return j.step + 1 < steps.length ? `できた料理は 次の ${STATIONS[steps[j.step + 1][0]].name}へ ひとりでに移る。空いていなければ 待つ` : '<b>できた！</b>をタップして 受け渡し台に 出す';
    }, done: () => jobsIn('pass').length > 0 },
  { phase: 'service', mode: 'act', hold: true, ready: () => jobsIn('pass').length > 0, target: () => document.querySelector('#pass .plate'),
    text: '受け渡し台の <b>料理をタップ</b>すると お客さんに出せる', done: () => s.today.guests.some((g) => g.state === 'eating') },
  { phase: 'service', mode: 'tap', hold: true, target: () => document.querySelector('#seats .bubble') || $('seats'),
    text: '吹き出しの <b>まわりの輪</b>は 待てる時間。なくなる前に出さないと 帰ってしまう。<br>あとは 閉店まで くりかえし！' },
  { phase: 'report', mode: 'tap', target: () => document.querySelector('#report .lines'),
    text: '閉店すると <b>日報</b>が出る。書いてあるのは 起きたことと 損だけ。<br>はじめての日は たいてい赤字。あしたは 仕込みを「きのう売れた数」に合わせてみよう。そこから先は 自分で考える' },
  { phase: 'report', mode: 'act', target: () => $('toNight'), text: 'つぎは 夜の準備', done: () => s.phase === 'night' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: nightTab('menu'), target: () => document.querySelector('.tab[data-tab="menu"]'), text: '<b>メニュー</b>：出す料理と 値段。高くすると 1人の売上は増えるけど、頼む人は減る' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: nightTab('prep'), target: () => document.querySelector('.tab[data-tab="prep"]'), text: '<b>仕込み</b>：あした何食ぶん 用意するか。足りないと売り切れ、余ると捨てる' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: nightTab('shop'), target: () => document.querySelector('.tab[data-tab="shop"]'), text: '<b>設備</b>：席や 台を増やす。売上と評判が たまると 店を広げられる' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: nightTab('staff'), target: () => document.querySelector('.tab[data-tab="staff"]'), text: '<b>バイト</b>：あした<b>1日だけ</b>来てくれる人。持ち場を 任せられる' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: nightTab('look'), target: () => document.querySelector('.tab[data-tab="look"]'), text: '<b>外観</b>：お店の姿と これまでの日報。店が育つと 姿も変わる' },
  { phase: 'night', mode: 'act', target: () => $('openBtn'), text: '決めたら 開店！ あとは 自由に やってみよう', done: () => s.phase === 'service' },
];
let coachStep = -1;
function nextTut() { ui.tut += 1; saveUi(); coachStep = -1; }
function updateCoach() {
  const c = $('coach');
  const st = TUT[ui.tut];
  const visible = st && st.phase === s.phase && $('overlay').hidden && (!st.ready || st.ready());
  // 画面が切りかわって終わる手（開店・夜の準備へ）は、切りかわった先でも 終わったと分かる
  const finished = st && st.done && (st.phase === s.phase ? st.done() : !st.ready && st.done());
  if (finished) { nextTut(); return false; }
  if (!visible) { c.hidden = true; return false; }
  if (coachStep !== ui.tut) {
    coachStep = ui.tut;
    if (st.enter) st.enter();
    c.className = `coach ${st.mode}`;
    c.innerHTML = `<div class="ring"></div><div class="tip"><span class="guide">${personSVG(4, 'happy', { chef: true })}</span><p></p>${st.mode === 'card' ? '<button class="big go">つぎへ</button>' : st.mode === 'tap' ? '<small>タップで つぎへ</small>' : ''}</div>`;
    c._text = '';
  }
  c.hidden = false;
  const text = typeof st.text === 'function' ? st.text() : st.text;
  if (c._text !== text) { c.querySelector('p').innerHTML = text; c._text = text; }
  const ring = c.querySelector('.ring'), tip = c.querySelector('.tip');
  const el = st.target ? st.target() : null;
  if (el) {
    const r = el.getBoundingClientRect(), pad = 6;
    ring.hidden = false;
    Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const below = r.top + r.height / 2 < innerHeight / 2;
    tip.style.top = st.place === 'bottom' ? `${innerHeight - tip.offsetHeight - 110}px` : below ? `${Math.min(innerHeight - tip.offsetHeight - 12, r.bottom + 16)}px` : `${Math.max(12, r.top - tip.offsetHeight - 16)}px`;
  } else {
    ring.hidden = true;
    tip.style.top = `${(innerHeight - tip.offsetHeight) / 2}px`;
  }
  return !!st.hold;
}
onTap($('coach'), (e) => {
  const st = TUT[ui.tut];
  if (!st || $('coach').hidden) return;
  if (st.mode === 'tap' || (st.mode === 'card' && e.target.closest('button'))) { e.preventDefault(); nextTut(); }
});

// ---- 画面の切りかえと時間 ----
function show() {
  $('service').hidden = s.phase !== 'service';
  $('report').hidden = s.phase !== 'report';
  $('night').hidden = s.phase !== 'night';
  for (const id of ['queue', 'seats', 'tickets', 'kitchen', 'pass']) { const b = $(id); b.innerHTML = ''; b._map = null; }
  if (s.phase === 'report') renderReport();
  if (s.phase === 'night') renderNight();
  if (s.phase === 'service') renderService();
  renderTop();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const hold = updateCoach();
  if (s.phase === 'service' && !paused && !hold) {
    S.tick(s, dt * (fast ? FAST : 1));
    if (s.phase !== 'service') { save(); show(); }
    else renderService();
    renderTop();
  } else if (s.phase === 'service' && hold) renderService();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });


show();
requestAnimationFrame(frame);
