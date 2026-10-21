// 時間を流す・画面に描く・タップを sim に渡す・保存。ルールはここに書かない。
import * as S from './sim.js';
import { personSVG, LOOK_COUNT } from './people.js';
import { stationSVG } from './kitchen-art.js';
import { exteriorSVG, festivalSVG } from './exterior.js';
import { foodSVG } from './food-art.js';
import { DAY, DISHES, STATIONS, STAFF, INGREDIENTS, TRIAL_COST, REGULARS, WEATHER, STAGES, ADS, GENRES, BRANCH_LATER, EVENTS, FAST, GUEST, TOWN, MANAGER, ASK, STORIES, STORY_AT, BUILD, FESTIVAL, DECO } from './config.js';

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
let tab = 'prep';

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
// 押したらすぐ反応する。ただし スクロールする紙と夜の欄の中では click で受ける（スクロールしたら押さない）
function onTap(el, fn) {
  if (!el.closest('#overlay, #night')) { el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; fn(e); }); return; }
  // 紙と夜の画面は ふつうの click。指を動かしたら（スクロールしたら）ブラウザが click を出さない
  el.addEventListener('click', (e) => fn(e));
}

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
  const tb = `<span>売上<b>${yen(st.sales)}</b></span><span>食べた<b>${st.served}</b>人</span><span>帰った<b>${st.left.queue + st.left.wait + st.left.soldOut + st.left.pricey + (st.left.full || 0)}</b>人</span>`;
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
    else if (ev.type === 'full') float('いっぱいだ…', null, 'say');
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
  if (r.left.full) rows.push([`店の前が いっぱいで 引き返した ${r.left.full}人`, null]);
  if (r.lostSales) rows.push(['売り逃した（帰った人のぶん）', -r.lostSales]);
  for (const [id, min] of Object.entries(r.soldOutAt)) rows.push([`${DISHES[id].name}が売り切れ ${S.fmtClock(min)}`, null]);
  for (const [id, n] of r.waste) rows.push([`${DISHES[id].name}の食材を捨てた ${n}食分`, -n * S.dishCost(s, id, r.day)]);
  if (r.credit) rows.push([`お金が足りず、${yen(r.credit)}を ツケにした`, null]);
  if (r.repaid) rows.push([`ツケを ${yen(r.repaid)} 返した`, null, true]);
  if (r.debt) rows.push([`ツケの残り ${yen(r.debt)}`, null]);
  for (const id of r.usual) rows.push([`${REGULARS.find((x) => x.id === id).name}が「いつもの」を頼んだ`, null, true]);
  for (const n of r.notes) rows.push([n.text, null, n.good]);
  for (const t of r.stories || []) rows.push([t, null, true]);
  for (const a of r.townAsks || r.asks || []) {
    const at = a.shop && a.shop !== (r.shop || 'washoku') ? `${GENRES[a.shop].short || GENRES[a.shop].name}から ` : '';
    rows.push(a.ok ? [`お願い：${a.who}の ${a.what}に ${at}${DISHES[a.dish].name} ${a.n}食を 届けた`, a.pay]
      : [`お願い：${a.who}の ${a.what}に ${at}届けられなかった（${a.why}）`, null]);
  }
  if (r.closedOut) rows.push([`閉店で入れなかった ${r.closedOut}人`, null]);
  if (!rows.length) rows.push(['大きな出来事は なかった', null, true]);

  const delta = Math.round(r.repDelta * 10) / 10;
  const canAd = live && !r.adDone && r.profit > 0 && S.adLeft(s) > 0;
  const crew = (r.crew || []).map((x) => `${x.name}さん`).join('・');
  return `
    <div class="paper${live ? ' live' : ''}">
      <div class="stamp ${r.profit > 0 ? 'black' : 'red'}">${r.profit > 0 ? '黒字' : '赤字'}</div>
      <h2>${r.day}日目の日報 <span style="font-size:18px">${w.icon}</span>${r.festival ? '<span class="evtag">商店街まつり</span>' : ''}${r.event ? `<span class="evtag">${EVENTS.list.find((e) => e.id === r.event).name}</span>` : ''}</h2>
      <div class="headline">
        <div><b>${r.served}<small>/${r.guests}人</small></b><small>食べていった人</small></div>
        <div><b>${yen(r.sales)}</b><small>売上</small></div>
        <div><b class="${delta >= 0 ? 'plus' : 'minus'}">${delta >= 0 ? '+' : ''}${delta}</b><small>評判</small></div>
      </div>
      <div class="lines">
        ${rows.map(([t, v, good], i) => `<div class="row" style="animation-delay:${0.15 + i * 0.08}s"><span>${t}</span><b class="${v != null ? (v < 0 ? 'minus' : 'plus') : good ? 'plus' : ''}">${v != null ? yen(v) : good ? '♪' : ''}</b></div>`).join('')}
        <div class="row" style="animation-delay:${0.15 + rows.length * 0.08}s"><span>仕入れ</span><b class="minus">${yen(-r.prepCost)}</b></div>
        <div class="row" style="animation-delay:${0.23 + rows.length * 0.08}s"><span>${r.manager ? '店長と ' : ''}アルバイト代${crew ? `<small class="crew">${crew}（この日だけ）</small>` : ''}</span><b class="minus">${yen(-r.wage)}</b></div>
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
  const total = r.profit + r.branches.reduce((a, b) => a + (b.profit || 0), 0);
  return `<div class="branches"><small>ほかの店（アルバイトで回した）</small>${rows}<div class="row total"><span>全部の店の もうけ</span><b class="${total >= 0 ? 'plus' : 'minus'}">${yen(total)}</b></div></div>`;
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
// 夜の準備は 4つ（2026-10-20 オーナー：タブが増えて分かりにくい → 料理・お店・人・レシピ）
// 下のタブの絵（線の太さと色は 人や台の絵と同じ）
const TI = 'viewBox="0 0 32 32" class="ti" aria-hidden="true"';
const TL = 'stroke="#2a2350" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
const TAB_ICON = {
  town: `<svg ${TI}><path d="M2 24 H30" ${TL}/><rect x="4" y="12" width="9" height="12" fill="#fff6e0" ${TL}/><path d="M3 13 L8.5 6 L14 13Z" fill="#ff4f5e" ${TL}/><rect x="18" y="14" width="10" height="10" fill="#e3f6ee" ${TL}/><path d="M17 15 L23 9 L29 15Z" fill="#2fd39e" ${TL}/><rect x="7" y="18" width="3" height="6" fill="#e9a25f" ${TL}/></svg>`,
  prep: `<svg ${TI}><ellipse cx="16" cy="22" rx="13" ry="5" fill="#fff" ${TL}/><path d="M6 20 C6 10 26 10 26 20Z" fill="#ffd23f" ${TL}/><path d="M11 15 l3 -2 l3 2 l3 -2" fill="none" stroke="#e8302e" stroke-width="2" stroke-linecap="round"/></svg>`,
  shop: `<svg ${TI}><rect x="6" y="14" width="20" height="14" fill="#fff6e0" ${TL}/><path d="M3 15 L9 6 H23 L29 15Z" fill="#ff4f5e" ${TL}/><rect x="13" y="19" width="6" height="9" fill="#e9a25f" ${TL}/></svg>`,
  staff: `<svg ${TI}><path d="M6 29 C6 21 26 21 26 29Z" fill="#2fd39e" ${TL}/><circle cx="16" cy="14" r="7" fill="#ffd9bf" ${TL}/><path d="M9 9 C9 3 23 3 23 9 Z" fill="#fff" ${TL}/><circle cx="13.5" cy="15" r="1" fill="#2a2350"/><circle cx="18.5" cy="15" r="1" fill="#2a2350"/></svg>`,
  book: `<svg ${TI}><path d="M4 7 C9 5 13 6 16 8 C19 6 23 5 28 7 V26 C23 24 19 25 16 27 C13 25 9 24 4 26Z" fill="#fff" ${TL}/><path d="M16 8 V27" ${TL}/><path d="M7 11 h6 M7 15 h6 M19 11 h6 M19 15 h6" stroke="#ff9f43" stroke-width="2" stroke-linecap="round"/></svg>`,
};
// 夜のタブは 3つ（2026-10-21 案1）：支度（料理・人・レシピ）／ お店（姿・広げる・設備・飾る・記録）／ 町（商店街）
const TABS = [['prep', '支度'], ['shop', 'お店'], ['town', '町']];
const SEASON_TAG = { cheap: '<span class="plus">（いま 安い）</span>', dear: '<span class="minus">（いま 高い）</span>' };
function renderNight() {
  const ns = S.nextStage(s);
  // あしたの貼り紙：天気と 出来事
  const fw = S.weatherOf(s), fe = S.eventOf(s);
  const fest = S.festivalTomorrow(s);
  const se = S.seasonOf(s), seNew = S.seasonStarts(s.day);
  $('notice').innerHTML = `<b>あしたは ${fw.icon} ${fw.name}</b>${seNew ? `<span class="ev">${se.icon} ${se.name}に なった<small>${se.text}</small></span>` : `<span class="season">${se.icon} ${se.name}</span>`}${fest ? '<span class="ev">🏮 商店街まつり<small>全部の店に 人が多く来る</small></span>' : ''}${fe ? `<span class="ev">${fe.icon} ${fe.name}<small>${fe.text}</small></span>` : ''}`;
  $('notice').classList.toggle('has-ev', !!fe || fest);
  // 2行目：あした立つ店（店が2つ以上なら 押すと 町タブへ）
  const shopsAll = S.shopsOf(s);
  const otherN = shopsAll.length - 1;
  $('notice').insertAdjacentHTML('beforeend', `<button class="shopline" id="shopLine" ${otherN ? '' : 'disabled'}><b>${otherN ? `${GENRES[S.genreOf(s)].no}号店 ` : ''}${GENRES[S.genreOf(s)].name}</b><span>${S.stageOf(s).name}・評判 ${Math.round(s.rep)}</span>${otherN ? `<em>ほか${otherN}店 ›</em>` : ''}</button>`);
  if (otherN) onTap($('shopLine'), () => { tab = 'town'; renderNight(); });
  // 町の人のお願い：貼り紙の右に。届いたら 光る。受けたものは 件数を見せる
  const ak = s.asks;
  if (ak.offer || ak.list.length) {
    $('notice').insertAdjacentHTML('beforeend', `<button class="askchip ${ak.offer ? 'new' : ''}" id="askChip"><span>📮</span>${ak.offer ? 'お願いが届いた' : `お願い ${ak.list.length}件`}</button>`);
    onTap($('askChip'), () => askSheet());
  }
  // あしたの支度：3行（料理・人・お願い）。赤い行だけ 直せば 開店できる（案1・2026-10-21）
  const pc = S.prepCheck(s);
  const MARK = { ok: '✓', warn: '!', ng: '!', none: '' };
  const rows = [['food', '料理と 仕込み', 'みる'], ['crew', '人', pc.crew.shop ? 'よぶ' : 'みる'], ['ask', '町の人の お願い', pc.ask.state === 'none' ? '' : 'よむ']]
    .map(([k, nm, go]) => `<button class="todo ${pc[k].state}" data-todo="${k}"><i>${MARK[pc[k].state]}</i><span class="t"><b>${nm}</b><small>${pc[k].text}</small></span><span class="jump">${go ? `${go} ›` : ''}</span></button>`).join('');
  $('prepList').innerHTML = `<div class="sec">あしたの支度</div>${rows}`;
  for (const b of $('prepList').querySelectorAll('[data-todo]')) onTap(b, () => {
    const k = b.dataset.todo;
    if (k === 'ask') { if (pc.ask.state !== 'none') askSheet(); return; }
    if (k === 'crew' && pc.crew.shop) { crewSheet(pc.crew.shop, () => renderNight()); return; }
    tab = 'prep'; renderNight();
    scrollNightTo($('panel').querySelector(k === 'crew' ? '#sec-staff' : '#sec-cook'));
  });
  const townDot = !!S.townOffer(s) || (S.nextBranch(s) && S.nextBranch(s).ready);
  $('tabs').innerHTML = TABS.map(([id, nm]) => `<button class="tab ${id === tab ? 'on' : ''}" data-tab="${id}">${TAB_ICON[id]}<span>${nm}</span>${(id === 'shop' && ns && ns.ready) || (id === 'town' && townDot) ? '<i class="dot"></i>' : ''}</button>`).join('');
  // タブを押しても スクロールの位置は 動かさない（上に送るのは「跳ねる」で 不評・2026-10-21 オーナー）
  for (const b of $('tabs').children) onTap(b, () => { tab = b.dataset.tab; renderNight(); });
  const p = $('panel');
  p.innerHTML = PANELS[tab]();
  for (const el of p.querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
  if (tab === 'town') wireTown(p);
  // あしたの作戦（広告）は 開店ボタンのすぐ下に出す（2026-10-20 オーナー：押してほしいので タブの外へ）
  $('boostsTop').innerHTML = `${boostBtn('market', '仕入れ 半額')}${boostBtn('flyer', `チラシ 客＋${Math.round((ADS.flyerMul - 1) * 100)}%`)}`;
  for (const el of $('boostsTop').querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
  const cost = S.prepCost(s);
  $('openBtn').textContent = `開店する！（仕入れ ${yen(cost)}）`;
}

// 夜の画面（#night）の中の要素が 上に来るまで 送る
function scrollNightTo(el) {
  if (!el) return;
  const n = $('night');
  n.scrollTop = el.getBoundingClientRect().top - n.getBoundingClientRect().top + n.scrollTop - 6;
}
const dueText = (d) => (d === s.day ? 'あした' : d === s.day + 1 ? 'あさって' : `${d}日目`);
const shopShort = (g) => (S.shopsOf(s).length > 1 ? `${GENRES[g].short || GENRES[g].name}・` : '');
// お願いの紙：届いたお願い（受ける・ことわる）と、受けたお願い
function askSheet() {
  const render = () => {
    const a = s.asks, o = a.offer;
    const card = (x) => `<div class="card ask"><div class="ic face">${personSVG(x.look || 0, 'happy')}</div><div class="txt"><b>${x.who}<small>${x.reg ? '常連さん' : ''}</small></b>
      <small>${x.what}に、<b>${shopShort(x.shop)}${DISHES[x.dish].name}を ${x.n}食</b>。${x.due - s.day < 2 ? `${dueText(x.due)}（${x.due}日目）` : dueText(x.due)}の 朝に 取りに来る</small>
      <small>届けると ${yen(S.askPay(x))}</small></div></div>`;
    const offer = o ? `<div class="sec">届いた お願い</div>${card(o)}
      <p class="asknote">受けると、その日の 朝に ${GENRES[o.shop].name}の 仕込みから ${o.n}食を 渡す。仕込みが 足りないと 届けられない。返事をしないと あしたの夜に 消える</p>
      <div class="askbtns"><button class="chunky" data-ans="0">ことわる</button><button class="chunky red" data-ans="1" ${a.list.length >= S.askMax(s) ? 'disabled' : ''}>${a.list.length >= S.askMax(s) ? `受けられるのは ${S.askMax(s)}件まで` : '受ける'}</button></div>` : '';
    const list = a.list.slice().sort((x, y) => x.due - y.due).map(card).join('');
    return `<h3>町の人の お願い</h3>${offer}${list ? `<div class="sec">受けた お願い</div>${list}` : ''}
      <p class="asknote">これまでに 届けた お願い ${a.done}件</p><button class="big go" data-close>とじる</button>`;
  };
  const close = overlay(render(), () => { save(); renderNight(); });
  const wire = () => {
    const o = $('overlay');
    for (const b of o.querySelectorAll('[data-ans]')) onTap(b, () => { S.answerAsk(s, b.dataset.ans === '1'); save(); if (!s.asks.offer && !s.asks.list.length) { close(); return; } redraw(); });
    for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
  };
  const redraw = () => { $('overlay').firstElementChild.innerHTML = render(); wire(); };
  wire();
}

// 商店街の地図：上が 自分の店（ここに立つ・バイトを呼ぶ）、下が となりの店（人気店が 増えるたびに 1つ呼べる）
const SHOP_SLOTS = 5;
// 商店街：町タブの中身（前は 紙だった。2026-10-21 案1で タブに）
function townHTML() {
  const sel = ui.townSel && S.shopsOf(s).includes(ui.townSel) ? ui.townSel : S.genreOf(s);
  const shops = S.shopsOf(s);
  const nb = S.nextBranch(s);
  const slots = Array.from({ length: SHOP_SLOTS }, (_, i) => {
    const g = shops.at(i);
    if (g) {
      const plan = g === S.genreOf(s) ? null : S.crewPlan(s, g);
      const sub = plan ? (S.shopInfo(s, g).manager ? '店長' : plan.open ? `バイト${plan.staff.length}人` : '休み') : 'あした立つ';
      return `<button class="lot shop ${g === sel ? 'sel' : ''} ${g === S.genreOf(s) ? 'here' : ''} ${plan && !plan.open ? 'shut' : ''}" data-sel="${g}"><em>${i + 1}号店</em><b>${GENRES[g].short}</b><small>${sub}</small></button>`;
    }
    const next = nb && i === shops.length;
    return `<div class="lot empty"><em>${i + 1}号店</em><b>空き家</b><small>${next && nb.ready ? '出せる' : ''}</small></div>`;
  }).join('');
  const nbs = S.neighbors(s);
  const lots = Array.from({ length: TOWN.lots }, (_, i) => {
    const n = nbs.at(i);
    return n ? `<div class="lot nb"><b>${n.short || n.name}</b></div>` : '<div class="lot empty"><b>空き地</b></div>';
  }).join('');
  const built = S.builtOf(s);
  const things = [...nbs, ...built];
  const effects = things.length ? `<p class="nbfx">${things.map((n) => `<b>${n.name}</b>：${n.text}`).join('<br>')}</p>` : '';
  const builtRow = built.length ? `<div class="builtrow">${built.map((b) => `<span>${b.short}</span>`).join('')}</div>` : '';
  // えらんだ店の札
  let detail = '';
  if (shops.includes(sel)) {
    const here = sel === S.genreOf(s);
    const plan = here ? null : S.crewPlan(s, sel);
    const sh = S.shopInfo(s, sel);
    const st = here ? 'あした あなたが 立つ' : sh.manager ? '店長が 回す' : plan.open ? `アルバイト${plan.staff.length}人で 回す` : `${plan.why}ので 休み`;
    detail = `<div class="card pick ${here ? 'here' : ''} ${plan && !plan.open ? 'shut' : ''}"><div class="txt"><b>${GENRES[sel].no}号店 ${GENRES[sel].name}</b><small>${GENRES[sel].stageNames[sh.stage]}・評判 ${Math.round(sh.rep)}・${st}</small></div>
      ${here ? '' : `<div class="btns"><button class="chunky" data-crew="${sel}">バイトを呼ぶ</button><button class="chunky yel" data-go="${sel}">ここに立つ</button></div>`}</div>`;
  }
  // 商店街まつりと 町に建てるもの（2号店から）
  let spend = '';
  if (shops.length >= BUILD.from) {
    const f = S.canFestival(s);
    const fest = `<div class="card pick fest ${S.festivalTomorrow(s) ? 'here' : ''}"><div class="txt"><b>🏮 商店街まつり</b><small>${S.festivalTomorrow(s) ? 'あしたは まつり。全部の店に 人が多く来る' : `あしたを まつりにする。全部の店に 人が多く来る（${FESTIVAL.gap}日に1回まで）${f.ok ? '' : `・${f.why}`}`}</small></div>
      ${S.festivalTomorrow(s) ? '' : `<div class="btns"><button class="chunky red" data-fest="1" ${f.ok ? '' : 'disabled'}>${yen(FESTIVAL.price)}で 開く</button></div>`}</div>`;
    const builds = BUILD.list.filter((b) => !built.includes(b)).map((b) => {
      const c = S.canBuild(s, b.id);
      return `<div class="card pick build"><div class="txt"><b>${b.name}</b><small>${b.text}</small></div><div class="btns"><button class="chunky yel" data-build="${b.id}" ${c.ok ? '' : 'disabled'}>${yen(b.price)}</button></div></div>`;
    }).join('');
    spend = `<div class="sec">商店街まつり</div>${fest}${builds ? `<div class="sec">町に 建てる</div>${builds}` : ''}`;
  }
  const offer = S.townOffer(s);
  const ask = offer ? `<div class="sec">となりに 呼ぶ店を 1つ えらぶ</div>${offer.map((n) => `<div class="card pick offer"><div class="txt"><b>${n.name}</b><small>${n.text}</small></div><div class="btns"><button class="chunky yel" data-invite="${n.id}">呼ぶ</button></div></div>`).join('')}` : '';
  return `<div class="street"><div class="row shops">${slots}</div><div class="road">まちかど商店街</div><div class="row lots">${lots}</div>${builtRow}</div>
    ${effects}${detail}${ask}${spend}<p style="font-size:11.5px;color:var(--ink2);margin:0">あなたが立つのは 1日に1店。立たない店は アルバイトだけで回す。店が 町の人気店に なるたびに、となりに 店を1つ 呼べる</p>`;
}
function wireTown(o) {
  for (const b of o.querySelectorAll('[data-sel]')) onTap(b, () => { ui.townSel = b.dataset.sel; saveUi(); renderNight(); });
  for (const b of o.querySelectorAll('[data-go]')) onTap(b, () => { if (S.switchShop(s, b.dataset.go).ok) { ui.pick = []; ui.townSel = null; save(); renderNight(); toast(`あしたは ${GENRES[b.dataset.go].name}に立つ`); } });
  for (const b of o.querySelectorAll('[data-crew]')) onTap(b, () => crewSheet(b.dataset.crew, () => renderNight()));
  for (const b of o.querySelectorAll('[data-build]')) onTap(b, () => { const r = S.build(s, b.dataset.build); if (r.ok) { save(); renderNight(); renderTop(); toast(`町に ${r.name}が できた`); } });
  for (const b of o.querySelectorAll('[data-fest]')) onTap(b, () => { if (S.holdFestival(s).ok) { save(); renderNight(); renderTop(); toast('あしたは 商店街まつり'); } });
  for (const b of o.querySelectorAll('[data-invite]')) onTap(b, () => { const r = S.inviteNeighbor(s, b.dataset.invite); if (r.ok) { save(); renderNight(); toast(`となりに ${r.name}が 開いた`); if (s.faceDay && !s.faceSeen) faceScene(); } });
}

// ほかの店の アルバイトを、店を切り替えずに 呼ぶ
function crewSheet(genre, back) {
  const render = () => {
    // atShop が しまってある店を 入れ替えるので、描くたびに 読み直す
    const sh = S.shopInfo(s, genre);
    const now = sh.staff.map((x) => `<div class="card"><div class="ic face">${personSVG(staffLook(x), 'happy', { chef: true })}</div><div class="txt"><b>${x.name}さん</b><small>${x.role === 'hall' ? 'ホール係' : `${STATIONS[x.role].name}`}・${yen(STAFF[x.role].wage)}</small></div><button class="chunky" data-fire="${x.id}">呼ばない</button></div>`).join('');
    const again = S.canRehireAt(s, genre) ? `<button class="chunky yel wide" data-rehire="1">きのうと同じ人を呼ぶ（${sh.lastCrew.map((x) => `${x.name}さん`).join('・')}）</button>` : '';
    const roles = ['board', 'stove', 'fryer', 'hall'].map((r) => {
      const c = S.canHireAt(s, genre, r);
      return `<div class="card"><div class="ic">${{ board: '🔪', stove: '🔥', fryer: '🫕', hall: '🛎️' }[r]}</div><div class="txt"><b>${STAFF[r].name}</b><small>1日 ${yen(STAFF[r].wage)}${c.ok ? '' : `・${c.why}`}</small></div>
        <button class="chunky mint" data-hire="${r}" ${c.ok ? '' : 'disabled'}>あした呼ぶ</button></div>`;
    }).join('');
    const plan = S.crewPlan(s, genre);
    const mgr = `<div class="card mgr ${sh.manager ? 'on' : ''}"><div class="txt"><b>店長 ${sh.manager ? 'がいる' : 'は いない'}</b><small>1日 ${yen(MANAGER.wage)} ＋ その店の 売上の ${Math.round(MANAGER.rate * 100)}%。貼り紙を読んで 仕込みを 決め、仕込み係と ホール係が いなければ 呼ぶ</small></div><button class="chunky ${sh.manager ? '' : 'mint'}" data-mgr="${sh.manager ? 0 : 1}">${sh.manager ? '帰す' : '置く'}</button></div>`;
    return `<h3>${GENRES[genre].no}号店 ${GENRES[genre].name}の アルバイト</h3>${mgr}
      <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:${plan.open ? 'var(--ink2)' : 'var(--red)'}">${plan.open ? (sh.manager ? `あしたは 店長が 回す。足りない係は 店長が 呼ぶ` : `あしたは ${plan.staff.length}人で回る。仕込み係と ホール係が いれば 回る`) : `${plan.why}ので 休みになる。仕込み係と ホール係が 要る`}</p>
      ${again}${now ? `<div class="sec">あした来る人</div>${now}` : ''}<div class="sec">呼ぶ</div>${roles}
      <button class="big go" data-close>とじる</button>`;
  };
  const close = overlay(render(), () => { save(); renderNight(); if (back) back(); });
  const wire = () => {
    const o = $('overlay');
    for (const b of o.querySelectorAll('[data-hire]')) onTap(b, () => { S.hireAt(s, genre, b.dataset.hire); redraw(); });
    for (const b of o.querySelectorAll('[data-fire]')) onTap(b, () => { S.fireAt(s, genre, b.dataset.fire); redraw(); });
    for (const b of o.querySelectorAll('[data-rehire]')) onTap(b, () => { S.rehireAt(s, genre); redraw(); });
    for (const b of o.querySelectorAll('[data-mgr]')) onTap(b, () => { S.setManager(s, genre, b.dataset.mgr === '1'); redraw(); });
    for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
  };
  const redraw = () => { $('overlay').firstElementChild.innerHTML = render(); wire(); };
  wire();
}

const BRANCH_ORDER_LEN = Object.keys(GENRES).length;
const PANELS = {
  lookParts() {
    const st = S.stageOf(s);
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
    return {
      top: `<div class="exwrap">${exteriorSVG(s)}<div class="exname">${S.shopsOf(s).length > 1 ? `${GENRES[S.genreOf(s)].no}号店 ` : ''}${st.name}</div><div class="exfacts">席 ${s.seats}・台 ${s.stations.length}・評判 ${Math.round(s.rep)}</div></div>`,
      bottom: `<button class="chunky wide" data-do="records">記録を みる（日報・あゆみ）</button>`,
      records: `<h3>記録</h3>${reports ? `<div class="sec">これまでの日報 <small>（タップで ひらく）</small></div><div class="days">${reports}</div>` : ''}
      <div class="sec">あゆみ</div><ol class="ayumi">${log}</ol>
      <div class="sec">やり直す</div><button class="chunky wide" data-do="reset">はじめから やり直す</button>
      <button class="big go" data-close>とじる</button>`,
    };
  },
  // 支度：料理と仕込み → 人 → レシピ帳 を 1本に（支度の行から 飛んでくる）
  prep() {
    return `<div class="sec" id="sec-cook">料理と 仕込み</div>${PANELS.cook()}<div class="sec" id="sec-staff">人</div>${PANELS.staff()}<div class="sec" id="sec-book">レシピ帳</div>${PANELS.book()}`;
  },
  town: () => townHTML(),
  // 料理：メニューと仕込みを 1枚に（料理ごとに 出す・値段・仕込み）
  cook() {
    const last = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === S.genreOf(s)).pop();
    const rows = s.known.map((id) => {
      const d = DISHES[id], m = s.menu[id];
      const cook = S.canCook(s, id);
      const sold = last ? last.sold[id] || 0 : null;
      const out = last && last.soldOutAt && last.soldOutAt[id] != null;
      const info = !cook ? `${d.steps.filter(([t]) => !s.stations.some((x) => x.type === t)).map(([t]) => STATIONS[t].name).join('・')}が無いので作れない`
        : `ふつう ${yen(Math.round(S.fairPrice(s, id) / 10) * 10)}・食材 ${yen(S.dishCost(s, id))}${SEASON_TAG[S.seasonTag(s, id)] || ''}${sold != null && m.on ? `・<span class="${out ? 'minus' : ''}">きのう ${sold}食${out ? '（売り切れ）' : ''}</span>` : ''}`;
      const asks = s.asks.list.filter((a) => a.shop === S.genreOf(s) && a.dish === id).sort((a, b) => a.due - b.due)
        .map((a) => `<span class="asktag">📮 ${dueText(a.due)} お願い ${a.n}食</span>`).join('');
      return `<div class="card dish ${m.on ? '' : 'off'}">
        <div class="ic">${foodSVG(id)}</div>
        <div class="txt"><b>${d.name}${s.signature === id ? '<span class="meibutsu">名物</span>' : ''}${S.seasonTag(s, id) === 'hot' ? '<span class="meibutsu shun">旬</span>' : ''}</b><small>${info}</small>${asks}</div>
        <button class="switch ${m.on ? 'on' : ''}" data-do="toggle" data-arg="${id}" aria-label="メニューに出す"></button>
        ${m.on && cook ? `<div class="ctl"><label>値段</label><div class="stepper"><button data-do="price-" data-arg="${id}">−</button><span>${yen(m.price)}</span><button data-do="price+" data-arg="${id}">＋</button></div>
          <label>仕込み</label><div class="stepper"><button data-do="prep-" data-arg="${id}">−</button><span>${s.prep[id] || 0}食</span><button data-do="prep+" data-arg="${id}">＋</button></div></div>` : ''}
      </div>`;
    }).join('');
    const pd = S.priceDemand(s);
    const level = pd < 0.95 ? '高め（来る人が減る）' : pd > 1.02 ? '安め（来る人が少し増える）' : 'ふつう';
    return `<p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">いまの店の値段は <b>${level}</b>。高いほど 来る人が減る</p>${rows}
`;
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
    const perk = S.perkOf(s).text ? `<p style="margin:0 0 6px;font-size:12px;font-weight:800;color:var(--ink2)">この店の 強み：<b>${S.perkOf(s).text}</b></p>` : '';
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
          <small style="font-weight:800;color:var(--ink2)">${GENRES[nb.genre].blurb}。料理も 食材も 常連さんも 別。${GENRES[nb.genre].stageNames[nb.startStage]}から始まる</small>
          <small style="font-weight:800;color:var(--ink2)">あなたが立てるのは 1日に1店。もう1店は アルバイトだけで回す</small>
          ${nb.ready ? '' : `<small style="font-weight:800">${nb.needName}</small>`}
          <button class="chunky ${nb.ready ? 'red' : ''}" style="margin-top:6px" data-do="branch" ${nb.ready && nb.affordable ? '' : 'disabled'}>${nb.ready ? `${yen(nb.price)}で 出す` : 'まだ出せない'}</button>
        </div>`;
    } else if (BRANCH_LATER.length) branch = `<div class="sec">${BRANCH_ORDER_LEN + 1}号店から（準備中）</div><p class="later">${BRANCH_LATER.join("・")}… 試作はここまで</p>`;
    const lp = PANELS.lookParts();
    const dc = S.canDecorate(s);
    const lv = DECO.levels[s.deco || 0];
    const deco = `<div class="sec">店を飾る</div>
      <div class="card"><div class="ic">🎏</div><div class="txt"><b>${lv ? lv.name : '飾りは ぜんぶ そろった'}<small class="lvl">${s.deco || 0}/${DECO.levels.length}</small></b><small>飾るほど、ふつうより 高めの値段でも 客が離れにくい（1段で ${Math.round(S.priceUpOf(s) * 100)}%）${lv && !dc.ok ? `・${dc.why}` : ''}</small></div>
        ${lv ? `<button class="chunky yel" data-do="deco" ${dc.ok ? '' : 'disabled'}>${yen(lv.price)}</button>` : ''}</div>
      <div class="card" style="flex-direction:column;align-items:stretch"><div class="txt"><b>名物料理${s.signature ? `：${DISHES[s.signature].name}` : ''}</b><small>名物にした料理は よく頼まれ、来る人も 少し増える。1品だけ。変えるときも ${yen(DECO.signaturePrice)}</small></div>
        <div class="chips">${s.known.filter((id) => S.canCook(s, id)).map((id) => `<button class="${s.signature === id ? 'on' : ''}" data-do="sig" data-arg="${id}" ${s.signature === id || s.money < DECO.signaturePrice ? 'disabled' : ''}>${DISHES[id].name}</button>`).join('')}</div></div>`;
    return `${lp.top}${stage}${branch}<div class="sec">${S.stageOf(s).name}の設備</div>${perk}${items}${deco}${lp.bottom}`;
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
      ${now ? `<div class="sec">あした来る人</div>${now}` : ''}<div class="sec">あしたの アルバイトを呼ぶ</div>${roles}${regularCards()}`;
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
// 常連さん：来た回数と、ここまでの話（まだの話は 伏せる）
function regularCards() {
  const regs = S.regularsOf(s);
  if (!regs.length) return '';
  const cards = regs.map((r) => {
    const rs = s.regulars[r.id];
    const seen = rs.visits > 0;
    const told = (STORIES[r.id] || []).slice(0, rs.story || 0).map((c) => `<li>${typeof c === 'string' ? c : c.text}</li>`).join('');
    const next = (STORIES[r.id] || [])[rs.story || 0] ? '<li class="more">…</li>' : '';
    return `<div class="card reg ${seen ? '' : 'unseen'}"><div class="ic face">${seen ? personSVG(r.look, 'happy') : '？'}</div><div class="txt"><b>${seen ? r.name : '？？？'}</b>
      <small>${seen ? `好物 ${DISHES[r.fav].name}・来た回数 ${rs.visits}` : 'まだ 来たことがない'}</small>${seen ? `<ul class="story">${told}${next}</ul>` : ''}</div></div>`;
  }).join('');
  return `<div class="sec">常連さん</div>${cards}`;
}
function boostBtn(kind, label) {
  const on = s.boosts[kind];
  if (on) return `<span class="chunky mint">${label} ✓ あした効く</span>`;
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
    case 'deco': { const r = S.decorate(s); if (r.ok) toast(`${r.name}！`); break; }
    case 'sig': { const r = S.setSignature(s, arg); if (r.ok) toast(`${DISHES[arg].name}を 名物にした`); break; }
    case 'hire': { const r = S.hire(s, arg); if (r.ok) toast(`${r.name}さんが あした1日 来てくれる`); break; }
    case 'fire': S.fire(s, arg); break;
    case 'rehire': { const r = S.rehire(s); if (r.ok) toast(`${r.n}人 来てくれる`); break; }
    case 'records': {
      overlay(PANELS.lookParts().records, null);
      for (const el of $('overlay').querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
      return;
    }
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
        ui.pick = []; ui.townSel = null;
        const h = r.home;
        const line = h.open ? `${GENRES[h.genre].no}号店は ${h.crew.length > 3 ? `${h.crew.slice(0, 2).map((n) => `${n}さん`).join('・')}ほか ${h.crew.length}人` : h.crew.map((n) => `${n}さん`).join('・')}で 回る` : `${GENRES[h.genre].no}号店は 仕込み係と ホール係を 呼ばないと 休みになる（店の札の「バイトを呼ぶ」から）`;
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
// 商店街の顔：1度だけの場面。そのあとも 同じ店で 続く
function faceScene() {
  const t = S.townTotals(s);
  const people = S.shopsOf(s).flatMap((g) => S.regularsOf({ genre: g }).filter((r) => S.shopInfo(s, g).regulars[r.id].visits > 0).map((r) => r.look));
  for (let i = 0; people.length < 14; i++) people.push((i * 5 + 3) % 12);
  overlay(`<div class="facescene">${festivalSVG(s, people)}
    <h2>商店街の顔</h2>
    <p>まちかど食堂から はじまった 通りに、5つの店と 5つの となりの店が 並んだ。お祭りの夜、常連さんも 町の人も 通りに 出てきた。</p>
    <div class="facestats"><div><b>${t.days}</b><small>日目</small></div><div><b>${yen(t.sales)}</b><small>5店の 売上の合計</small></div>
      <div><b>${t.asks}</b><small>届けた お願い</small></div><div><b>${t.regulars}<small>人</small></b><small>来てくれた 常連さん</small></div></div>
    <p class="sub">店は このまま 続く。あしたも 町の人が 来る。</p>
    <button class="big go" data-close>あしたの 準備へ</button></div>`, () => { S.faceSeen(s); save(); renderNight(); }, 'sheet bare');
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
  { phase: 'night', mode: 'tap', place: 'bottom', target: () => $('prepList'), text: '<b>あしたの支度</b>：料理・人・お願い の3行。<b>赤い行</b>があれば 押して直す。ぜんぶ 緑なら そのまま 開店できる' },
  { phase: 'night', mode: 'tap', place: 'top', enter: nightTab('prep'), target: () => document.querySelector('.tab[data-tab="prep"]'), text: '<b>支度</b>：出す料理・値段・あした何食 仕込むか。高くすると 来る人は減る。下に アルバイト（あした<b>1日だけ</b>）と レシピ帳' },
  { phase: 'night', mode: 'tap', place: 'top', enter: nightTab('shop'), target: () => document.querySelector('.tab[data-tab="shop"]'), text: '<b>お店</b>：店の姿・席や台を増やす・飾る。売上と評判が たまると 店を広げられる' },
  { phase: 'night', mode: 'tap', place: 'top', enter: nightTab('town'), target: () => document.querySelector('.tab[data-tab="town"]'), text: '<b>町</b>：商店街。店が増えたら ここで あした立つ店を えらぶ。となりに 店を呼んだり、町に 建てたりも ここ' },
  { phase: 'night', mode: 'act', target: () => $('openBtn'), text: '決めたら 開店！ あとは 自由に やってみよう', done: () => s.phase === 'service' },
];
// あとから1回だけ出す案内（チュートリアルが 終わってから。見たら ui.hints に残す）
const HINTS = [
  { id: 'fast', phase: 'service', mode: 'tap', hold: true, ready: () => !$('fastBtn').hidden, target: () => $('fastBtn'),
    text: `仕込み係と ホール係が そろったので <b>▶▶ 早送り</b>が 使える。<br>押すと 営業が ${FAST}倍の速さで進む。もう1回 押すと ふつうに戻る` },
];
let coachStep = -1;
const curHint = () => (ui.tut >= TUT.length ? HINTS.find((h) => !(ui.hints || {})[h.id] && h.phase === s.phase && h.ready()) : null);
function nextTut() {
  const h = ui.tut >= TUT.length && curHint();
  if (h) ui.hints = { ...(ui.hints || {}), [h.id]: 1 }; else ui.tut += 1;
  saveUi(); coachStep = -1;
}
function updateCoach() {
  const c = $('coach');
  const st = TUT[ui.tut] || curHint();
  const visible = st && st.phase === s.phase && $('overlay').hidden && (!st.ready || st.ready());
  // 画面が切りかわって終わる手（開店・夜の準備へ）は、切りかわった先でも 終わったと分かる
  const finished = st && st.done && (st.phase === s.phase ? st.done() : !st.ready && st.done());
  if (finished) { nextTut(); return false; }
  if (!visible) { c.hidden = true; return false; }
  const key = st.id ? `h:${st.id}` : ui.tut;
  if (coachStep !== key) {
    coachStep = key;
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
  const st = TUT[ui.tut] || curHint();
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
  if (s.phase === 'night') { renderNight(); if (s.faceDay && !s.faceSeen) faceScene(); }
  if (s.phase === 'service') renderService();
  renderTop();
}

// 開店中は 画面を スリープさせない（Screen Wake Lock・Safari 16.4 / Chrome）。一時停止と 閉店で 離す。
// 画面を切り替えて戻ってきたら ブラウザが 離しているので 取り直す。Expo 版では expo-keep-awake を 同じ範囲で使う
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && !paused && s.phase === 'service' && navigator.wakeLock && !document.hidden) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch { wakeLock = null; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const hold = updateCoach();
  if (s.phase === 'service' && !paused && !hold) {
    S.tick(s, dt * (fast ? FAST : 1));
    if (s.phase !== 'service') { save(); show(); keepAwake(false); }
    else renderService();
    renderTop();
  } else if (s.phase === 'service' && hold) renderService();
  const awake = s.phase === 'service' && !paused;
  if (awake !== !!wakeLock) keepAwake(awake);
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else keepAwake(true); });


show();
requestAnimationFrame(frame);
