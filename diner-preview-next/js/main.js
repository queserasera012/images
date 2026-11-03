// 時間を流す・画面に描く・タップを sim に渡す・保存。ルールはここに書かない。
import * as S from './sim.js';
import { personSVG, LOOK_COUNT } from './people.js';
import { stationSVG } from './kitchen-art.js';
import { exteriorSVG, festivalSVG, townSVG, rivalSVG } from './exterior.js';
import { foodSVG } from './food-art.js';
import { initLang, setLang, getLang, LANGS, missing } from './i18n.js';
import { DAY, DEMAND, DISHES, STATIONS, STAFF, INGREDIENTS, TRIAL_COST, REGULARS, WEATHER, STAGES, ADS, GENRES, BRANCH_ORDER, BRANCH_LATER, EVENTS, FAST, GUEST, TOWN, MANAGER, ASK, STORIES, STORY_AT, BUILD, FESTIVAL, DECO, STANCES, RIVAL, STORE, SALE } from './config.js';

const SAVE_KEY = 'diner.proto.v1';
const UI_KEY = 'diner.proto.ui.v1';
const DEBUG = new URLSearchParams(location.search).has('debug');
const $ = (id) => document.getElementById(id);
initLang(); if (DEBUG) window.__i18nMissing = missing; // 英語のときは 画面に出た日本語を その場で訳す（js/i18n.js）
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
let tab = null; // 開いている紙（料理・人・レシピ・お店・町）。null は 閉じている

function load() { try { const t = localStorage.getItem(SAVE_KEY); return t ? S.parseSave(t) : null; } catch { return null; } }
function save(force = false) {
  let text = null;
  s.savedAt = Date.now(); // iCloud で どちらが新しいかを くらべる（native/cloud-rules.js）
  try { text = S.serialize(s); localStorage.setItem(SAVE_KEY, text); } catch { /* 保存できなくても遊べる */ }
  if (NATIVE && text) native('backup', { data: text, force }); // アプリでは 写しも持つ（localStorage が消えても戻せる・iCloud）
}
// アプリの中（native/App.js の WebView）で動いているとき：広告・画面をつけたまま・セーブの写しを アプリに頼む
const NATIVE = typeof window !== 'undefined' && !!window.__DINER_NATIVE;
const waiting = {};
let askId = 0;
function native(type, extra = {}) {
  const id = ++askId;
  return new Promise((resolve) => {
    waiting[id] = resolve;
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, ...extra })); } catch { delete waiting[id]; resolve(false); }
    if (['backup', 'awake', 'notify', 'feel', 'volume'].includes(type)) { delete waiting[id]; resolve(true); } // 答えを待たない頼み
  });
}
if (NATIVE) window.__dinerNativeReply = (id, result) => { const r = waiting[id]; delete waiting[id]; if (r) r(result); };

// ---- ショップ（アプリ内課金）・大売り出しの券・お願いの手紙・お知らせ（2026-11-03 オーナー決定）----
// 広告なしパス：ストアが 持っているかを 覚えている（復元できる）。券：買った合計は アプリ（native/cloud.js）、使った数は セーブ（s.sale.used）
const store = { noAds: !!ui.noAds, bought: Number(ui.bought) || 0, prices: {} };
function takeStore(r) {
  if (!r) return;
  if (Array.isArray(r.owned) && r.ok !== false) store.noAds = r.owned.includes(STORE.noAds);
  if (Number.isFinite(r.tickets)) store.bought = r.tickets;
  ui.noAds = store.noAds; ui.bought = store.bought; saveUi();
}
function refreshStore() {
  if (!NATIVE) return;
  native('iap', { op: 'owned' }).then((r) => { takeStore(r); renderTop(); });
  native('iap', { op: 'products', skus: [STORE.noAds, STORE.ticket] }).then((r) => {
    if (r && r.products) for (const p of r.products) if (p.price) store.prices[p.id] = p.price;
  });
}
// アプリからの知らせ：買う画面の外で 券が 届いた（買う途中で 落ちて 次の起動で 届いた など）
if (NATIVE) window.__dinerNativeEvent = (name, data) => {
  if (name === 'tickets' && Number.isFinite(data) && data > store.bought) { store.bought = data; ui.bought = data; saveUi(); toast('大売り出しの券が 届いた'); renderTop(); }
};
// 手紙の しるし：夕方6時で 1日が かわる（6時より前は きのうの手紙）
function letterKeyNow(d = new Date()) {
  const t = new Date(d);
  if (t.getHours() < 18) t.setDate(t.getDate() - 1);
  return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
}
// お知らせ（D506）：端末の中だけで予約。夕方6時に 1日1回、7日先までは 毎日、そのあとは 週に1回（8週）。開くたびに 入れ直す。
// お願いが 受けられないうち（4日目まで・受けた お願いが いっぱい）は 入れない（届かない手紙を 知らせない）
function scheduleNotify() {
  if (!NATIVE) return;
  const items = [];
  if (ui.notify && s.day >= ASK.fromDay && s.asks.list.length < S.askMax(s)) {
    const en = getLang() === 'en';
    const title = en ? 'Diner Street' : 'Diner Street';
    const body = en ? 'A request letter from someone in town has arrived.' : '町の人から お願いの手紙が 届いています';
    const t = new Date(); t.setHours(18, 0, 0, 0);
    if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
    for (let i = 0; i < 15; i++) {
      items.push({ at: t.getTime(), title, body });
      t.setDate(t.getDate() + (i < 6 ? 1 : 7));
    }
  }
  native('notify', { items });
}
function checkLetter() {
  if (s.phase !== 'night' || ui.tut < 99 && s.day < 3) return;
  if (!S.letterOffer(s, letterKeyNow())) return;
  save();
  const after = () => { if (NATIVE && !ui.notifyAsked) notifyPrompt(askSheet); else askSheet(); };
  overlay(`<h3>お願いの手紙</h3><div class="letterart">${MAIL_SVG}</div>
    <p>町の人から 手紙が 届いた。手紙は 毎日 夕方6時に 1通 届く。</p><button class="big go" data-close>よむ</button>`, after);
}
function notifyPrompt(then) {
  const close = overlay(`<h3>手紙の お知らせ</h3><p>手紙が 届く 夕方6時に、1日1回 お知らせを 出せます。7日 開かない日が 続いたら、週に1回に へらします。あとから 記録の紙で 変えられます。</p>
    <button class="big go" id="nfNext">次へ</button><button class="chunky wide" data-close>いまは しない</button>`, () => { ui.notifyAsked = true; saveUi(); then(); });
  onTap($('nfNext'), () => {
    native('notify-ask').then((r) => { ui.notify = !!(r && r.granted); ui.notifyAsked = true; saveUi(); scheduleNotify(); close(); });
  });
}
function buy(sku) {
  if (!NATIVE) { toast('ウェブの 試作では 買えません'); return; }
  native('iap', { op: 'buy', sku }).then((r) => {
    takeStore(r);
    if (r && r.ok) toast(sku === STORE.noAds ? '広告なしパスを 買った' : '大売り出しの券を 3枚 買った');
    else if (!(r && r.cancelled)) toast('買えなかった（あとで もう一度）');
    renderTop(); shopSheet();
  });
}
function shopSheet() {
  const wasPaused = paused; paused = true;
  const left = S.saleLeft(s, store.bought), today = S.saleToday(s);
  const price = (sku, def) => store.prices[sku] || def;
  const use = s.phase !== 'night' ? '<small class="saleinfo">夜の 準備の あいだに 使えます</small>'
    : today ? '<small class="saleinfo on">あしたは 大売り出し</small>'
    : `<button class="chunky red" id="saleUse" ${left > 0 ? '' : 'disabled'}>あしたに 使う</button>`;
  const close = overlay(`<h3>ショップ</h3>
    <div class="product"><div class="txt"><b>広告なしパス</b><small>広告を 見なくても、広告の ごほうびが もらえる（1日 ${ADS.perDay}回まで）。1回 買えば ずっと</small></div>
      ${store.noAds ? '<button class="chunky" disabled>持っている</button>' : `<button class="chunky yel" data-buy="${STORE.noAds}">${price(STORE.noAds, '¥980')}</button>`}</div>
    <div class="product"><div class="txt"><b>大売り出しの券（3枚）</b><small>使った日は、ぜんぶの店で お客さんが ${Math.round((SALE.nMul - 1) * 100)}% ふえます（1日1枚まで）。</small>
      <small>3号店を 出すと、通りの 向かいに ライバル店が 来ます。ライバルに ねらわれている店では、効き目が 半分に なります。</small></div>
      <button class="chunky yel" data-buy="${STORE.ticket}">${price(STORE.ticket, '¥250')}</button></div>
    <div class="card saleleft"><div class="txt"><b>のこり ${left}枚</b></div>${use}</div>
    <p class="asknote">券の のこりは iCloud で ほかの 端末と 合わせます。iCloud を 使っていない 端末で アプリを 消すと、のこりの 券も 消えます。</p>
    ${NATIVE ? '<button class="chunky wide" id="restore">購入を 復元する</button>' : '<p class="asknote">ウェブの 試作では 買えません（アプリで 買えます）。</p>'}
    ${DEBUG && !NATIVE ? '<button class="chunky" id="dbgTicket">（試し）券を 3枚 足す</button><button class="chunky" id="dbgNoAds">（試し）広告なしパスを 切りかえ</button>' : ''}
    <button class="big go" data-close>とじる</button>`, () => { paused = wasPaused; });
  const o = $('overlay');
  for (const b of o.querySelectorAll('[data-buy]')) onTap(b, () => buy(b.dataset.buy));
  if ($('saleUse')) onTap($('saleUse'), () => {
    if (S.useSale(s, store.bought).ok) { save(); toast('あしたは 大売り出し'); renderNight(); close(); }
  });
  if ($('restore')) onTap($('restore'), () => native('iap', { op: 'restore' }).then((r) => { takeStore(r); toast(store.noAds ? '広告なしパスを 復元した' : '復元できる 購入は ありません'); shopSheet(); }));
  if ($('dbgTicket')) onTap($('dbgTicket'), () => { store.bought += 3; ui.bought = store.bought; saveUi(); shopSheet(); });
  if ($('dbgNoAds')) onTap($('dbgNoAds'), () => { store.noAds = !store.noAds; ui.noAds = store.noAds; saveUi(); shopSheet(); });
}

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
  if (!el.closest('#overlay, #night, #psheet')) { el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; fn(e); }); return; }
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
  $('repStars').textContent = '★'.repeat(S.stars(s.rep));
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

  // 早送り：ボタンは いつも見せて、仕込み係と ホール係が いる日と 売り切れたあとだけ 押せる
  const canFast = S.canFast(s);
  $('fastBtn').hidden = false;
  $('fastBtn').disabled = !canFast;
  if (!canFast) fast = false;
  $('fastBtn').classList.toggle('on', fast);

  const st = today.stats;
  const tb = `<span>売上<b>${yen(st.sales)}</b></span><span>食べた<b>${st.served}人</b></span><span>帰った<b>${st.left.queue + st.left.wait + st.left.soldOut + st.left.pricey + (st.left.full || 0)}人</b></span>`;
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
    // 英語の表で 鍵が分かれるよう、ほかの店から 届けたときは 文の形を 別にする
    const from = a.shop && a.shop !== (r.shop || 'washoku') ? GENRES[a.shop].short || GENRES[a.shop].name : '';
    const dish = DISHES[a.dish].name;
    rows.push(a.ok ? [from ? `お願い：${a.who}の ${a.what}に ${from}から ${dish} ${a.n}食を 届けた` : `お願い：${a.who}の ${a.what}に ${dish} ${a.n}食を 届けた`, a.pay]
      : [from ? `お願い：${a.who}の ${a.what}に ${from}から 届けられなかった（${a.why}）` : `お願い：${a.who}の ${a.what}に 届けられなかった（${a.why}）`, null]);
  }
  if (r.rival) rows.push([`${r.rival.name}の ${S.tacticOf(r.rival.id).name}で 客を 取られた ${r.rival.lost}人${r.rival.dodged ? '（かわした）' : ''}`, null]);
  if (r.closedOut) rows.push([`閉店で入れなかった ${r.closedOut}人`, null]);
  if (r.managerNote) rows.push([r.managerNote, null, true]);
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
      : `<span>${b.served}/${b.guests}人・売上 ${yen(b.sales)}${b.left ? `・帰った ${b.left}人` : ''}${b.rival && b.rival.lost ? `・${b.rival.name}に ${b.rival.lost}人` : ''}</span><b class="${b.profit >= 0 ? 'plus' : 'minus'}">${yen(b.profit)}</b>`;
    return `<button class="brow" data-bshop="${b.shop}" data-bday="${r.day}" ${b.closed ? 'disabled' : ''}><em>${g.no}号店 ${g.name}${b.closed ? '' : '<small>（タップで日報）</small>'}</em><div class="row">${body}</div>${b.managerNote ? `<small class="mnote">${b.managerNote}</small>` : ''}</button>`;
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
  if (NATIVE && r.profit > 0 && !r.felt) { r.felt = true; native('feel', { name: 'coin' }); }
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
  cook: `<svg ${TI}><ellipse cx="16" cy="22" rx="13" ry="5" fill="#fff" ${TL}/><path d="M6 20 C6 10 26 10 26 20Z" fill="#ffd23f" ${TL}/><path d="M11 15 l3 -2 l3 2 l3 -2" fill="none" stroke="#e8302e" stroke-width="2" stroke-linecap="round"/></svg>`,
  shop: `<svg ${TI}><rect x="6" y="14" width="20" height="14" fill="#fff6e0" ${TL}/><path d="M3 15 L9 6 H23 L29 15Z" fill="#ff4f5e" ${TL}/><rect x="13" y="19" width="6" height="9" fill="#e9a25f" ${TL}/></svg>`,
  staff: `<svg ${TI}><path d="M6 29 C6 21 26 21 26 29Z" fill="#2fd39e" ${TL}/><circle cx="16" cy="14" r="7" fill="#ffd9bf" ${TL}/><path d="M9 9 C9 3 23 3 23 9 Z" fill="#fff" ${TL}/><circle cx="13.5" cy="15" r="1" fill="#2a2350"/><circle cx="18.5" cy="15" r="1" fill="#2a2350"/></svg>`,
  book: `<svg ${TI}><path d="M4 7 C9 5 13 6 16 8 C19 6 23 5 28 7 V26 C23 24 19 25 16 27 C13 25 9 24 4 26Z" fill="#fff" ${TL}/><path d="M16 8 V27" ${TL}/><path d="M7 11 h6 M7 15 h6 M19 11 h6 M19 15 h6" stroke="#ff9f43" stroke-width="2" stroke-linecap="round"/></svg>`,
};
// 夜のタブは 3つ（2026-10-21 案1）：支度（料理・人・レシピ）／ お店（姿・広げる・設備・飾る・記録）／ 町（商店街）
const TABS = [['cook', '料理'], ['staff', '人'], ['book', 'レシピ'], ['shop', 'お店'], ['town', '町']];
const SEASON_TAG = { cheap: '<span class="plus">（いま 安い）</span>', dear: '<span class="minus">（いま 高い）</span>' };
function renderNight() {
  const ns = S.nextStage(s);
  renderHero();
  // ライバル店：今週 ねらわれている店と 勝負の人数（1本の ゲージ）
  const rv = S.rivalOf(s), rw = rv && s.rival.week;
  if (rw) {
    const tc = S.tacticOf(rw.tactic);
    $('rivalBar').innerHTML = `<button class="rivalbar2" id="rivalLine"><span class="rvart">${rivalSVG(rv.look, s.rival.power)}</span>
      <span class="rvt"><b>VS ${rv.short} ${tc.icon} ${tc.name}</b><em>${GENRES[rw.shop].no}号店 ${rw.served}/${rw.goal}人・あと${rw.end - s.day + 1}日</em>
      ${hpBar(s.rival.power, rw, 'rvgauge')}</span></button>`;
    onTap($('rivalLine'), () => rivalSheet());
  } else $('rivalBar').innerHTML = '';
  // あしたの支度：料理・人・お願い の 絵のボタン3つ（案A）＋ 店長の ひとこと（案C・2026-11-03 オーナー）
  const pc = S.prepCheck(s);
  const MARK = { ok: '✓', warn: '!', ng: '!', none: '' };
  const firstDish = (pc.food.fix && pc.food.fix[0][0]) || Object.keys(s.menu).find((id) => s.menu[id].on && s.known.includes(id)) || s.known[0];
  const ART = { food: foodSVG(firstDish), crew: personSVG(3, 'happy', { chef: true }), ask: MAIL_SVG };
  $('prepList').innerHTML = [['food', '料理'], ['crew', '人'], ['ask', 'お願い']]
    .map(([k, nm]) => `<button class="qbtn ${pc[k].state}" data-todo="${k}"><span class="qart">${ART[k]}</span><b>${nm}</b>${MARK[pc[k].state] ? `<i>${MARK[pc[k].state]}</i>` : ''}</button>`).join('');
  for (const b of $('prepList').querySelectorAll('[data-todo]')) onTap(b, () => {
    const k = b.dataset.todo;
    if (k === 'ask') { if (s.asks.offer || s.asks.list.length) askSheet(); else toast('いまは お願いが ない'); return; }
    if (k === 'crew' && pc.crew.shop) { crewSheet(pc.crew.shop, () => renderNight()); return; }
    openSheet(k === 'crew' ? 'staff' : 'cook');
  });
  renderSay(pc);
  const townDot = !!S.townOffer(s) || (S.nextBranch(s) && S.nextBranch(s).ready);
  const dotOf = (id) => (id === 'shop' && ns && ns.ready) || (id === 'town' && townDot);
  // ホームの下：レシピ・お店・町は ボタンから 紙（モーダル）で開く（2026-11-03 オーナー「縦に長すぎる」）
  $('homeRow').innerHTML = [['book', 'レシピ帳'], ['shop', 'お店'], ['town', '町']]
    .map(([id, nm]) => `<button class="hbtn" data-open="${id}">${TAB_ICON[id]}<span>${nm}</span>${dotOf(id) ? '<i class="dot"></i>' : ''}</button>`).join('');
  for (const b of $('homeRow').children) onTap(b, () => openSheet(b.dataset.open));
  const sh = $('psheet');
  sh.hidden = !tab;
  if (tab) {
    $('tabs').innerHTML = TABS.map(([id, nm]) => `<button class="tab ${id === tab ? 'on' : ''}" data-tab="${id}">${TAB_ICON[id]}<span>${nm}</span>${dotOf(id) ? '<i class="dot"></i>' : ''}</button>`).join('');
    for (const b of $('tabs').children) onTap(b, () => openSheet(b.dataset.tab));
    const p = $('panel');
    p.innerHTML = PANELS[tab]();
    for (const el of p.querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
    if (tab === 'town') wireTown(p);
    for (const b of p.querySelectorAll('[data-crew]')) onTap(b, () => crewSheet(b.dataset.crew, () => renderNight()));
  }
  // あしたの作戦（広告）は 開店ボタンのすぐ下に出す（2026-10-20 オーナー：押してほしいので タブの外へ）
  $('boostsTop').innerHTML = `${boostBtn('market', '仕入れ 半額')}${boostBtn('flyer', `チラシ 客＋${Math.round((ADS.flyerMul - 1) * 100)}%`)}`;
  for (const el of $('boostsTop').querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
  const cost = S.prepCost(s);
  $('openBtn').innerHTML = `開店！<small>仕入れ ${yen(cost)}</small>`;
}

// 紙を開く（別の紙なら 上から）・閉じる
function openSheet(id, sel) {
  const same = tab === id;
  tab = id; renderNight();
  const p = $('panel');
  if (sel) scrollNightTo(p.querySelector(sel));
  else if (!same) p.scrollTop = 0;
}
function closeSheet() { if (tab) { tab = null; renderNight(); } }

const MAIL_SVG = '<svg viewBox="0 0 50 40" aria-hidden="true"><rect x="3" y="5" width="44" height="30" rx="4" fill="#fff" stroke="#2a2350" stroke-width="2.5"/><path d="M4 7l21 16 21-16" fill="none" stroke="#2a2350" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="12" rx="3" fill="#ffd23f" stroke="#2a2350" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#2a2350" stroke-width="2.4"/><circle cx="12" cy="16" r="1.8" fill="#2a2350"/></svg>';

// ---- 店先（ホームの上半分）：店の絵を 横に並べ、両どなりを のぞかせる。まだの店は 鍵（2026-11-03 オーナー）
let heroKey = '', heroHere = '';
function renderHero() {
  const here = S.genreOf(s), mine = S.shopsOf(s), nb = S.nextBranch(s);
  const fw = S.weatherOf(s), fe = S.eventOf(s), fest = S.festivalTomorrow(s);
  const se = S.seasonOf(s), seNew = S.seasonStarts(s.day);
  const key = JSON.stringify([s.day, mine.map((g) => { const x = S.shopInfo(s, g); return [g, x.stage, Math.round(x.rep), x.staff.length, x.deco, !!x.manager, x.totalSales >= 150000]; }), nb && [nb.genre, nb.ready], S.saleToday(s), fw.id, fe && fe.id, fest, s.town && s.town.picked]);
  const box = $('hero');
  if (key !== heroKey) {
    heroKey = key;
    const stick = [];
    if (S.saleToday(s)) stick.push(['📣', '大売り出し', `全部の店で お客さんが ${Math.round((SALE.nMul - 1) * 100)}% ふえる`]);
    if (fest) stick.push(['🏮', '商店街まつり', '全部の店に 人が多く来る']);
    if (fe) stick.push([fe.icon, fe.name, fe.text]);
    if (seNew) stick.push([se.icon, `${se.name}に なった`, se.text]);
    const stk = `<span class="hstk"><button class="wchip" data-say="あしたは ${fw.name}">${fw.icon}<span>あした ${fw.name}</span></button>
        ${stick.slice(0, 2).map(([ic, nm, tx], i) => `<button class="estk e${i}" data-say="${nm}：${tx}"><span>${ic}</span>${nm}</button>`).join('')}</span>`;
    const cards = heroShops().map((g) => {
      const own = mine.includes(g), G = GENRES[g];
      if (own) {
        const x = S.shopInfo(s, g);
        return `<div class="hcard" data-shop="${g}" data-own="1"><span class="hart">${exteriorSVG(x)}</span>${x.manager ? '<span class="hbadge">店長</span>' : ''}</div>`;
      }
      const next = nb && nb.genre === g;
      return `<div class="hcard locked ${next && nb.ready ? 'ready' : ''}" data-shop="${g}"><span class="hart">${exteriorSVG({ ...S.createShop(g), totalSales: 0 })}</span>
        <span class="hlock">${next && nb.ready ? '<b>出せる！</b>' : LOCK_SVG}</span></div>`;
    }).join('');
    box.innerHTML = `<div class="hstrip" id="hstrip">${cards}</div><div class="hrib" id="hrib"></div><template id="hstkT">${stk}</template>`;
    heroHere = '';
    const strip = $('hstrip');
    for (const c of strip.querySelectorAll('.hcard')) onTap(c, (e) => { const b = e.target.closest('[data-say]'); if (b) toast(b.dataset.say); else heroPick(c.dataset.shop, true); });
    let tm = 0;
    strip.addEventListener('scroll', () => { clearTimeout(tm); tm = setTimeout(() => heroSettle(), 140); paintRib(heroFocus()); }, { passive: true });
  }
  // 立つ店が 変わっただけなら 描き直さない（描き直すと 横の位置が 0 に戻り、一瞬 ズレて見えた・2026-11-03）
  const strip = $('hstrip'), cur = strip.querySelector(`[data-shop="${here}"]`);
  if (heroHere !== here) {
    heroHere = here;
    for (const c of strip.children) c.classList.toggle('here', c === cur);
    const old = strip.querySelector('.hstk'), t = $('hstkT');
    const stk = old || t.content.firstElementChild.cloneNode(true);
    cur.appendChild(stk);
  }
  // 指で 送って そこに 止まっているなら 動かさない。ずれているときだけ 真ん中へ（なめらかにせず その場で）
  if (heroFocus() !== here) {
    strip.style.scrollSnapType = 'none';
    strip.scrollLeft = cur.offsetLeft - (strip.clientWidth - cur.clientWidth) / 2;
    requestAnimationFrame(() => { strip.style.scrollSnapType = ''; });
  }
  paintRib(here);
}
// 並べるのは 出した店と 次の1店だけ（先の店まで 見せない・2026-11-03 オーナー）
function heroShops() { const mine = S.shopsOf(s), nb = S.nextBranch(s); return BRANCH_ORDER.filter((g) => mine.includes(g) || (nb && nb.genre === g)); }
function heroFocus() {
  const strip = $('hstrip'), mid = strip.scrollLeft + strip.clientWidth / 2;
  let best = null, d = 1e9;
  for (const c of strip.children) { const x = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if (x < d) { d = x; best = c.dataset.shop; } }
  return best;
}
function paintRib(g) {
  const own = S.shopsOf(s).includes(g), G = GENRES[g], nb = S.nextBranch(s);
  // 鍵の店を 見ている間は 下の ボタンも 全部 鍵（押せるように 見えて まぎらわしい・2026-11-03 オーナー）
  $('night').classList.toggle('lockview', !own);
  const dots = heroShops().map((x) => `<i class="${x === g ? 'on' : ''} ${S.shopsOf(s).includes(x) ? '' : 'lk'}"></i>`).join('');
  let sub;
  if (own) { const x = S.shopInfo(s, g); sub = `${G.stageNames[x.stage]}・評判 ${Math.round(x.rep)}${g === S.genreOf(s) ? '・あした ここに立つ' : ''}`; }
  else if (nb && nb.genre === g) sub = nb.ready ? `${yen(nb.price)}で 出せる` : nb.needName;
  $('hrib').innerHTML = `<b>${G.no}号店 ${own || (nb && nb.genre === g) ? G.name : '？？？'}</b><small>${sub}</small><span class="hdots">${dots}</span>`;
}
// 指を はなして 止まったら：自分の店なら そこに立つ。鍵の店は 見せるだけ
function heroSettle() {
  const g = heroFocus();
  if (g && g !== S.genreOf(s) && S.shopsOf(s).includes(g)) heroPick(g, false);
}
function heroPick(g, tapped) {
  if (S.shopsOf(s).includes(g)) {
    if (g === S.genreOf(s)) return;
    if (S.switchShop(s, g).ok) { ui.pick = []; ui.townSel = null; save(); renderNight(); toast(`あしたは ${GENRES[g].name}に立つ`); }
    return;
  }
  if (!tapped) return;
  const nb = S.nextBranch(s);
  if (nb && nb.genre === g) openSheet('shop', '.branchcard');
  else toast('前の店を 出すと 見えてくる');
}

// 店長の ひとこと：直すことを 1つずつ。押せば その場で 直る（案C）
let saySkip = { day: 0, keys: [] };
function sayItems(pc) {
  const out = [];
  const f = pc.food;
  if (f.state !== 'ok') {
    if (f.fix) {
      const [id, to] = f.fix[0], d = DISHES[id];
      const soldOut = !/お願い/.test(f.text);
      out.push({ k: `food:${id}`, st: f.state, art: foodSVG(id), text: soldOut ? `きのう ${f.fix.map(([x]) => DISHES[x].name).join('・')}が 売り切れました` : `お願いの ${d.name}が 足りません`,
        btn: f.fix.length > 1 ? 'まとめて 増やす' : `${s.prep[id] || 0}→${to}食に`, act: () => { S.applyPrepFix(s, f.fix); save(); toast('仕込みを 増やした'); } });
    } else out.push({ k: 'food', st: f.state, art: foodSVG(Object.keys(s.menu)[0]), text: f.text, btn: '支度を ひらく', act: () => { openSheet('cook'); return 'stay'; } });
  }
  const c = pc.crew;
  if (c.state === 'ng') out.push({ k: 'crew', st: c.state, art: personSVG(3, 'happy', { chef: true }), text: c.text, btn: 'バイトを呼ぶ', act: () => { crewSheet(c.shop, () => renderNight()); return 'stay'; } });
  else if (c.state === 'warn') out.push({ k: 'crew', st: c.state, art: personSVG(3, 'happy', { chef: true }), text: 'あしたは ひとりで 回します', btn: '人を みる', act: () => { openSheet('staff'); return 'stay'; } });
  const a = pc.ask;
  if (s.asks.offer) out.push({ k: 'ask', st: 'warn', art: MAIL_SVG, text: 'お願いが 届いています', btn: 'よむ', act: () => { askSheet(); return 'stay'; } });
  else if (a.state === 'warn' && a.shop) out.push({ k: 'ask', st: 'warn', art: MAIL_SVG, text: a.text, btn: '町で みる', act: () => { ui.townSel = a.shop; openSheet('town'); return 'stay'; } });
  return out;
}
function renderSay(pc) {
  if (saySkip.day !== s.day) saySkip = { day: s.day, keys: [] };
  const all = sayItems(pc), list = all.filter((x) => !saySkip.keys.includes(x.k));
  const box = $('sayBox');
  if (!list.length) { box.innerHTML = ''; return; }
  const it = list[0];
  box.innerHTML = `<div class="say ${it.st}"><span class="sayguy">${personSVG(4, 'happy', { chef: true })}</span>
    <div class="saybub"><p>${it.text}</p><div class="sayrow"><span class="sayart">${it.art}</span><button class="chunky yel" id="sayDo">${it.btn}</button></div>
    <div class="saynext">${list.length > 1 ? `<span>あと${list.length - 1}つ</span>` : '<span></span>'}<button id="saySkip">このまま</button></div></div></div>`;
  onTap($('sayDo'), () => { const r = it.act(); if (r !== 'stay') renderNight(); });
  onTap($('saySkip'), () => { saySkip.keys.push(it.k); renderNight(); });
}

// 夜の画面（#night）の中の要素が 上に来るまで 送る
function scrollNightTo(el) {
  if (!el) return;
  const n = el.closest('#panel') || $('night');
  n.scrollTop = el.getBoundingClientRect().top - n.getBoundingClientRect().top + n.scrollTop - 6;
}
const dueText = (d) => (d === s.day ? 'あした' : d === s.day + 1 ? 'あさって' : `${d}日目`);
const shopShort = (g) => (S.shopsOf(s).length > 1 ? `${GENRES[g].short || GENRES[g].name}・` : '');
// ---- ライバル店 ----
const pctOf = (x) => Math.round(x * 100);
function rivalTacticText(rv, w) {
  const tc = S.tacticOf(w.tactic), shop = `${GENRES[w.shop].no}号店`;
  const st = Math.min(0.9, tc.steal * rv.power), low = st * tc.low;
  const dish = w.dish ? DISHES[w.dish].name : '人気の料理';
  if (tc.id === 'cheap') return `${shop}の 向かいで 全品 2割引き。店の 値段が 平均で ふつうの ${pctOf(tc.priceLine)}% より 高いと 客を ${pctOf(st)}% 取られる（それより 安ければ ${pctOf(low)}%）`;
  if (tc.id === 'copy') return `${shop}の ${dish}を まねて 安く出す。${dish}が 頼まれにくくなり、${dish}に 頼っていた分だけ 客が 減る。${dish}を ふつうの ${pctOf(tc.priceLine)}% 以下にするか メニューから外すと 取られにくい`;
  if (tc.id === 'night') return `${shop}の 向かいで 夜（17時から）だけ 割引き。夜の 客を ${pctOf(st)}% 取られる。あなたが 立つ日は 店主の顔で ${pctOf(low)}% で すむ`;
  return `テレビで 宣伝。この週は 町じゅうの 全部の店で 客を ${pctOf(st)}% 取られる。評判 ${tc.repGuard} 以上の店は ${pctOf(low)}% で すむ。勝負は ${shop}`;
}
// ライバルの 体力（＝勢い）。0 で 撤退。今週 さばいた分だけ 削れていく見込みを 明るい色で 重ねる（2026-11-03 オーナー：減っていく方が 倒している感じ）
function hpBar(power, w, cls) {
  const dmg = w ? RIVAL.step * Math.min(1, w.served / Math.max(1, w.goal)) : 0;
  const left = Math.max(0, power - dmg);
  return `<span class="${cls} hp"><i class="hpgo" style="width:${power}%"></i><i class="hpnow" style="width:${left}%"></i><span>体力 ${Math.round(left)}</span></span>`;
}
function rivalSheet() {
  const rv = S.rivalOf(s), w = rv && s.rival.week;
  if (!w) return;
  const tc = S.tacticOf(w.tactic);
  const sh = S.shopInfo(s, w.shop);
  const dodged = S.rivalDodged(sh, { ...tc, dish: w.dish }, w.shop === S.genreOf(s));
  const p = s.rival.power;
  const close = overlay(`<h3>${rv.name}</h3><div class="rivalwrap">${rivalSVG(rv.look, p)}</div>
    <div class="sec">${rv.short}の 体力</div>${hpBar(p, w, 'rivalbar')}
    <p class="asknote">体力を 0 に すると 撤退（${yen(rv.prize)}と 全部の店の 評判 +${RIVAL.winRep}）。1週間ごとに 勝つと −${RIVAL.step}、負けると ＋${RIVAL.step}。今週 さばくほど ゲージが 減って見え、目標の人数に 届くと その分が 本当に 削れる。100 まで 戻されると ねらわれた店の 評判が ${RIVAL.hitRep} 下がる</p>
    <div class="sec">今週の 手：${tc.icon} ${tc.name}（${w.start}〜${w.end}日目）</div>
    <div class="card" style="flex-direction:column;align-items:stretch"><small style="font-weight:800;line-height:1.6">${rivalTacticText(rv, w)}</small></div>
    <div class="sec">勝負：${GENRES[w.shop].no}号店 ${GENRES[w.shop].name}</div>
    <div class="card" style="flex-direction:column;align-items:stretch"><b style="font:800 18px/1.3 var(--pop)">${w.served} / ${w.goal}人 <small style="font-size:12px;color:var(--ink2)">あと${w.end - s.day + 1}日</small></b>
      <small style="font-weight:800;color:var(--ink2)">この週に ${w.goal}人（先週の ${pctOf(rv.goalMul)}%）を さばけば 勝ち。これまでに 取られた客 ${w.lost}人</small>
      <small style="font-weight:800;margin-top:4px;color:${dodged ? 'var(--mint-d)' : 'var(--red-d)'}">あしたの ${GENRES[w.shop].no}号店：${dodged ? 'いまの ままなら 取られにくい' : 'いまの ままだと 取られる'}</small></div>
    <button class="big go" data-close>とじる</button>`, () => renderNight());
  void close;
}
// 夜の画面を 開いたときの 場面：週の結果 → ライバルが 来た
function rivalScenes() {
  if (!s.rival || !$('overlay').hidden) return;
  const res = s.rival.result;
  if (res) {
    S.rivalResultSeen(s); save();
    const tc = S.tacticOf(res.tactic);
    const head = res.event === 'retreat' ? `${res.name}が 撤退した！` : res.win ? `${res.name}に 勝った！` : `${res.name}に 負けた…`;
    const tail = res.event === 'retreat' ? `<br>${yen(res.prize)}と 全部の店の 評判 +${RIVAL.winRep}。${RIVAL.gap}日ほどで 次の店が 来る`
      : res.event === 'hit' ? `<br>${GENRES[res.shop].no}号店の 客を 取られて 評判が ${RIVAL.hitRep} 下がった` : '';
    const body = `<div class="celebrate">${head}<small class="cel-sub">${tc.icon} ${tc.name}・${GENRES[res.shop].no}号店で ${res.served} / ${res.goal}人（取られた客 ${res.lost}人）<br>体力 ${res.from} → ${res.to}${tail}</small></div><button class="big go" data-close>つぎへ</button>`;
    overlay(body, () => { renderNight(); rivalScenes(); });
    return;
  }
  const rv = S.rivalOf(s);
  if (rv && !s.rival.seen) {
    S.rivalSeen(s); save();
    const w = s.rival.week;
    overlay(`<h3>通りの 向かいに ${rv.name}が 開いた</h3><div class="rivalwrap">${rivalSVG(rv.look, s.rival.power)}</div>
      <p class="asknote" style="font-size:13px">全国チェーンの 店。<b>1週間ごとに あなたの店を 1つ ねらって</b>、安売り・まねメニュー・夜の割引・テレビの宣伝 の どれかを 打ってくる。</p>
      <p class="asknote" style="font-size:13px">ねらわれた店が その週に <b>先週の ${pctOf(rv.goalMul)}% の客</b>を さばけば 勝ち。勝つたびに 相手の 体力が 削れ、0 に すると 撤退する。負け続けて 100 になると、その店の 評判が 大きく 下がる。</p>
      ${w ? `<div class="card" style="flex-direction:column;align-items:stretch"><b>${S.tacticOf(w.tactic).icon} 今週は ${GENRES[w.shop].no}号店に ${S.tacticOf(w.tactic).name}</b><small style="font-weight:800;line-height:1.6">${rivalTacticText(rv, w)}</small></div>` : ''}
      <p class="asknote">いまの 様子は 店の絵の下の「VS ${rv.short}」を 押すと 見られる</p>
      <button class="big go" data-close>受けて立つ</button>`, () => renderNight());
  }
}

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
      const manager = !!(plan && S.shopInfo(s, g).manager);
      const sub = plan ? (manager ? '店長が 回す' : plan.open ? `バイト${plan.staff.length}人` : '休み') : 'あした立つ';
      return { genre: g, look: GENRES[g].look, sub, sel: g === sel, here: g === S.genreOf(s), shut: !!(plan && !plan.open), manager };
    }
    return { empty: true, ready: !!(nb && i === shops.length && nb.ready) };
  });
  const nbs = S.neighbors(s);
  const built = S.builtOf(s);
  const things = [...nbs, ...built];
  const effects = things.length ? `<p class="nbfx">${things.map((n) => `<b>${n.name}</b>：${n.text}`).join('<br>')}</p>` : '';
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
  return `<div class="street">${townSVG(slots, nbs, built)}</div>
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
      return `<div class="card"><div class="ic">${{ board: '🔪', stove: '🔥', fryer: '🫕', hall: '🛎️' }[r]}</div><div class="txt"><b>${STAFF[r].name}</b><small>1日 ${yen(STAFF[r].wage)}${c.ok ? '' : `<span>・${c.why}</span>`}</small></div>
        <button class="chunky mint" data-hire="${r}" ${c.ok ? '' : 'disabled'}>あした呼ぶ</button></div>`;
    }).join('');
    const plan = S.crewPlan(s, genre);
    const mgr = `<div class="card mgr ${sh.manager ? 'on' : ''}"><div class="txt"><b>店長 ${sh.manager ? 'がいる' : 'は いない'}</b><small>1日 ${yen(MANAGER.wage)} ＋ その店の 売上の ${Math.round(MANAGER.rate * 100)}%。貼り紙を読んで 仕込みを 決め、仕込み係と ホール係が いなければ 呼ぶ。決めたことは 日報に 書く</small></div><button class="chunky ${sh.manager ? '' : 'mint'}" data-mgr="${sh.manager ? 0 : 1}">${sh.manager ? '帰す' : '置く'}</button></div>`
      + (sh.manager ? `<div class="sec">店長の 方針</div><div class="card" style="flex-direction:column;align-items:stretch"><div class="chips">${Object.entries(STANCES).map(([id, st]) => `<button class="${S.stanceOf(sh) === id ? 'on' : ''}" data-stance="${id}">${st.name}</button>`).join('')}</div><small style="font-weight:800;color:var(--ink2);margin-top:6px">${STANCES[S.stanceOf(sh)].text}</small></div>` : '');
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
    for (const b of o.querySelectorAll('[data-stance]')) onTap(b, () => { S.setStance(s, genre, b.dataset.stance); redraw(); });
    for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
  };
  const redraw = () => { $('overlay').firstElementChild.innerHTML = render(); wire(); };
  wire();
}

const BRANCH_ORDER_LEN = Object.keys(GENRES).length;
const PANELS = {
  lookParts(rshop = S.genreOf(s)) {
    const st = S.stageOf(s);
    // 記録の日報は 店ごとに 切りかえて 見る（前は 立っている店の分しか 出なかった・2026-10-27 オーナー）
    const shops = S.shopsOf(s);
    const chips = shops.length > 1 ? `<div class="chips rshops">${shops.map((g) => `<button class="${g === rshop ? 'on' : ''}" data-rshop="${g}">${GENRES[g].no}号店 ${GENRES[g].short}</button>`).join('')}</div>` : '';
    const days = s.reports.filter((r) => !r.closed && (r.shop || 'washoku') === rshop).reverse();
    const top = Math.max(1, ...days.map((r) => Math.abs(r.profit + (r.adBonus || 0))));
    const reports = days.map((r) => {
      const p = r.profit + (r.adBonus || 0);
      const w = WEATHER.find((x) => x.id === r.weather);
      return `<button class="dayrow" data-do="report" data-arg="${r.day}" data-shop="${r.shop || 'washoku'}">
        <span class="d"><em>${r.day}日目</em> ${w ? w.icon : ''}</span>
        <span class="bar ${p >= 0 ? 'up' : 'down'}"><i style="width:${Math.max(4, (Math.abs(p) / top) * 100)}%"></i></span>
        <b class="${p >= 0 ? 'plus' : 'minus'}">${yen(p)}</b></button>`;
    }).join('');
    const log = s.log.slice().reverse().map((e) => `<li class="k-${e.kind}"><small><em>${e.day}日目</em></small>${e.text}</li>`).join('');
    return {
      top: `<div class="exwrap">${exteriorSVG(s)}<div class="exname">${S.shopsOf(s).length > 1 ? `${GENRES[S.genreOf(s)].no}号店 ` : ''}${st.name}</div><div class="exfacts">席 ${s.seats}・台 ${s.stations.length}・評判 ${Math.round(s.rep)}</div></div>`,
      bottom: `<button class="chunky wide" data-do="records">記録を みる（日報・あゆみ）</button>`,
      records: `<h3>記録</h3>${reports || chips ? `<div class="sec">これまでの日報 <small>（タップで ひらく）</small></div>${chips}<div class="days">${reports || '<p class="asknote">まだ 日報が ない（アルバイトだけで 回した日は 休みの日を 除いて ここに 入る）</p>'}</div>` : ''}
      <div class="sec">あゆみ</div><ol class="ayumi">${log}</ol>
      <div class="sec">ことば <small>Language</small></div><div class="langs">${LANGS.map((l) => `<button class="chunky ${getLang() === l.id ? 'yel' : ''}" data-do="lang" data-arg="${l.id}">${l.label}</button>`).join('')}</div>
      ${NATIVE ? `<div class="sec">手紙の お知らせ</div><div class="langs"><button class="chunky ${ui.notify ? 'yel' : ''}" data-do="notify" data-arg="1">出す</button><button class="chunky ${ui.notify ? '' : 'yel'}" data-do="notify" data-arg="0">出さない</button></div>` : ''}
      <div class="sec">やり直す</div><button class="chunky wide" data-do="reset">はじめから やり直す</button>
      <button class="big go" data-close>とじる</button>`,
    };
  },
  // 支度：料理と仕込み → 人 → レシピ帳 を 1本に（支度の行から 飛んでくる）
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
        <div class="card stagecard" style="flex-direction:column;align-items:stretch;background:${ns.ready ? '#fff4c2' : '#fffdf6'}">
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
    const deco = `<div class="sec decosec">店を飾る</div>
      <div class="card"><div class="ic">🎏</div><div class="txt"><b>${lv ? lv.name : '飾りは ぜんぶ そろった'}<small class="lvl">${s.deco || 0}/${DECO.levels.length}</small></b><small>飾るほど、ふつうより 高めの値段でも 客が離れにくい（1段で ${Math.round(S.priceUpOf(s) * 100)}%）${lv && !dc.ok ? `・${dc.why}` : ''}</small></div>
        ${lv ? `<button class="chunky yel" data-do="deco" ${dc.ok ? '' : 'disabled'}>${yen(lv.price)}</button>` : ''}</div>
      <div class="card" style="flex-direction:column;align-items:stretch"><div class="txt"><b>名物料理${s.signature ? `：${DISHES[s.signature].name}` : ''}</b><small>名物にした料理は よく頼まれ、来る人も 少し増える。1品だけ。変えるときも ${yen(DECO.signaturePrice)}</small></div>
        <div class="chips">${s.known.filter((id) => S.canCook(s, id)).map((id) => `<button class="${s.signature === id ? 'on' : ''}" data-do="sig" data-arg="${id}" ${s.signature === id || s.money < DECO.signaturePrice ? 'disabled' : ''}>${DISHES[id].name}</button>`).join('')}</div></div>`;
    // 店の絵は ホームに 大きく出ているので ここでは出さない。席や台を 先に（2026-11-03 オーナー）
    return `<div class="sec">${S.stageOf(s).name}の設備</div>${perk}${items}${stage}${branch}${deco}${lp.bottom}`;
  },
  staff() {
    const st = S.stageOf(s);
    const now = s.staff.map((x) => `<div class="card"><div class="ic face">${personSVG(staffLook(x), 'happy', { chef: true })}</div><div class="txt"><b>${x.name}さん<span class="oneday">あした1日だけ</span></b><small>${x.role === 'hall' ? 'ホール係・料理を運ぶ' : `${STATIONS[x.role].name}を受け持つ`}・${yen(STAFF[x.role].wage)}</small></div>
      <button class="chunky" data-do="fire" data-arg="${x.id}">呼ばない</button></div>`).join('');
    const again = S.canRehire(s) ? `<button class="chunky yel wide" data-do="rehire">きのうと同じ人を呼ぶ（${s.lastCrew.map((x) => `${x.name}さん`).join('・')}）</button>` : '';
    const roles = ['board', 'stove', 'fryer', 'hall'].map((r) => {
      const c = S.canHire(s, r);
      const desc = r === 'hall' ? '受け渡し台の料理を運ぶ' : `${STATIONS[r].name}の料理を進める`;
      return `<div class="card"><div class="ic">${{ board: '🔪', stove: '🔥', fryer: '🫕', hall: '🛎️' }[r]}</div><div class="txt"><b>${STAFF[r].name}</b><small>${desc}・1日 ${yen(STAFF[r].wage)}${c.ok ? '' : `<span>・${c.why}</span>`}</small></div>
        <button class="chunky mint" data-do="hire" data-arg="${r}" ${c.ok ? '' : 'disabled'}>あした呼ぶ</button></div>`;
    }).join('');
    // どの店の 人なのかを 先に書く。ほかの店は 下に並べて そこから呼ぶ（2026-11-03 オーナー：3号店に呼んだつもりが 立つ店に入っていた）
    const G = GENRES[S.genreOf(s)];
    const card = (g) => {
      const sh = S.shopInfo(s, g), plan = S.crewPlan(s, g);
      const st = sh.manager ? '店長が 回す' : plan.open ? `アルバイト${plan.staff.length}人で 回る` : `${plan.why}ので 休み`;
      return `<div class="card ${plan.open ? '' : 'shut'}"><div class="txt"><b>${GENRES[g].no}号店 ${GENRES[g].name}</b><small style="${plan.open ? '' : 'color:var(--red)'}">${st}</small></div><button class="chunky ${plan.open ? '' : 'mint'}" data-crew="${g}">バイトを呼ぶ</button></div>`;
    };
    const rest = S.shopsOf(s).filter((g) => g !== S.genreOf(s));
    const shut = rest.filter((g) => !S.crewPlan(s, g).open).map(card).join(''), others = rest.filter((g) => S.crewPlan(s, g).open).map(card).join('');
    return `${shut ? `<div class="sec" style="color:var(--red);margin-top:0">休みになる店</div>${shut}` : ''}
      <h3 class="staffwho" style="${shut ? 'margin-top:16px' : ''}">${G.no}号店 ${G.name}の アルバイト<small>あした あなたが 立つ店</small></h3>
      <div class="note-oneday"><b>アルバイトは 1日だけ</b>あした1日 来てくれて、閉店したら帰る。続けて来てほしいときは 毎晩 呼び直す。アルバイト代は 閉店のときに払う。</div>
      <p style="margin:0;font-size:12px;font-weight:800;color:var(--ink2)">任せた持ち場は ひとりでに進み、料理も少し速い。雇えるのは 台の数 ＋ ホール1人 まで（いま ${s.stations.length + 1}人）。</p>
      ${again}
      ${now ? `<div class="sec">あした来る人</div>${now}` : ''}<div class="sec">あしたの アルバイトを呼ぶ</div>${roles}${others ? `<div class="sec">ほかの店の アルバイト</div>${others}` : ''}${regularCards()}`;
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

function doNight(what, arg, el) {
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
      const close = overlay(PANELS.lookParts().records, null);
      const wire = () => {
        const o = $('overlay');
        for (const b of o.querySelectorAll('[data-close]')) onTap(b, close);
        for (const el of o.querySelectorAll('[data-do]')) onTap(el, () => doNight(el.dataset.do, el.dataset.arg, el));
        for (const el of o.querySelectorAll('[data-rshop]')) onTap(el, () => { o.firstElementChild.innerHTML = PANELS.lookParts(el.dataset.rshop).records; wire(); });
      };
      wire();
      return;
    }
    case 'report': {
      const shop = (el && el.dataset.shop) || S.genreOf(s);
      const r = s.reports.find((x) => String(x.day) === arg && (x.shop || 'washoku') === shop);
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
        if (NATIVE && !ui.reviewAsked && S.shopsOf(s).length === 2) { ui.reviewAsked = true; saveUi(); setTimeout(() => native('review'), 3000); } // 評価のお願い：2号店を 出した夜に 1回（Apple の窓だけ）
        celebrate(`${r.name}を 出した！\n<small class="cel-sub">あしたは ${GENRES[S.genreOf(s)].no}号店に立つ。<br>${line}</small>`);
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
    case 'ad': showAd(() => { S.watchAd(s, arg); save(); renderNight(); renderTop(); }, arg); return;
    case 'lang': setLang(arg); scheduleNotify(); doNight('records'); return;
    case 'notify':
      if (arg === '1') native('notify-ask').then((r) => { ui.notify = !!(r && r.granted); ui.notifyAsked = true; saveUi(); scheduleNotify(); if (!ui.notify) toast('iPhone の 設定で お知らせを 許可してください'); doNight('records'); });
      else { ui.notify = false; saveUi(); scheduleNotify(); doNight('records'); }
      return;
    case 'reset': {
      overlay(`<h3>はじめから やり直す</h3><p>いまの お店・お金・日報は ぜんぶ消えて、1日目の屋台から はじまります。</p>
        <button class="chunky red wide" id="resetYes">消して 1日目から</button><button class="big go" data-close>やめる</button>`);
      onTap($('resetYes'), () => {
        // 使った 券の数は 持ちこす（やり直して 券が もどらないように）。言葉・購入の写しも 残す
        const fresh = S.createState(); fresh.sale = { used: s.sale.used, day: 0 };
        try { localStorage.setItem(SAVE_KEY, S.serialize(fresh)); localStorage.setItem(UI_KEY, JSON.stringify({ hint: 0, noAds: ui.noAds, bought: ui.bought, notify: ui.notify, notifyAsked: ui.notifyAsked, reviewAsked: ui.reviewAsked })); } catch { /* */ }
        if (NATIVE) native('backup', { data: S.serialize(fresh), force: true });
        location.reload();
      });
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
function showAd(done, placement = 'profit') {
  if (store.noAds) { done(); toast('ごほうびを受け取った'); return; } // 広告なしパス
  const wasPaused = paused; paused = true;
  if (NATIVE) {
    native('rewarded', { placement }).then((ok) => {
      paused = wasPaused;
      if (ok) { done(); toast('ごほうびを受け取った'); } else toast('広告を 出せなかった（あとで もう一度）');
    });
    return;
  }
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
      <div><b>${t.asks}</b><small>届けた お願い</small></div><div><b>${t.regulars}人</b><small>来てくれた 常連さん</small></div></div>
    <p class="sub">店は このまま 続く。あしたも 町の人が 来る。</p>
    <button class="big go" data-close>あしたの 準備へ</button></div>`, () => { S.faceSeen(s); save(); renderNight(); }, 'sheet bare');
}
function celebrate(text) {
  if (NATIVE) native('feel', { name: 'build' });
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
// ---- 上の帯のボタン（2026-11-03 オーナー）：日にち → 記録・お金 → 使い道・評判 → 店ごとの評判・ショップ ----
const topOk = () => { if (s.phase === 'service') { toast('営業が 終わってから 見られる'); return false; } return true; };
onTap($('dayChip'), () => { if (topOk()) doNight('records'); });
onTap($('money'), () => { if (topOk()) moneySheet(); });
onTap($('rep'), () => { if (topOk()) repSheet(); });
// お金の使い道：いま 使えるものと、あと いくらで 使えるか。押すと その紙へ
function moneySheet() {
  const G = GENRES[S.genreOf(s)], rows = [];
  const row = (sec, name, price, ok, why, go) => rows.push({ sec, name, price, ok, why, go });
  const need = (p) => (s.money >= p ? '' : `あと ${yen(p - s.money)}`);
  const here = `${G.no}号店 ${G.name}`;
  const items = ['seat', 'board', 'stove', 'fryer'].map((k) => ({ k, c: S.canBuy(s, k), p: S.shopPrice(s, k) }));
  const nm = { seat: '席を1つ増やす', board: 'まな板を増やす', stove: 'コンロを増やす', fryer: '揚げ場を置く' };
  for (const it of items) if (it.c.ok || /足りない/.test(it.c.why || '')) row(here, nm[it.k], it.p, it.c.ok, it.c.ok ? '' : need(it.p), () => openSheet('shop'));
  const ns = S.nextStage(s);
  if (ns) row(here, `${ns.name}に 広げる`, ns.price, ns.ready && ns.affordable, !ns.ready ? '売上と 評判が 届いたら' : need(ns.price), () => openSheet('shop', '.stagecard'));
  const lv = DECO.levels[s.deco || 0];
  if (lv) row(here, `店を飾る：${lv.name}`, lv.price, S.canDecorate(s).ok, need(lv.price), () => openSheet('shop', '.decosec'));
  if (!s.signature) row(here, '名物料理を 決める', DECO.signaturePrice, s.money >= DECO.signaturePrice, need(DECO.signaturePrice), () => openSheet('shop', '.decosec'));
  const nb = S.nextBranch(s);
  if (nb) row('店を出す', `${nb.no}号店 ${nb.name}`, nb.price, nb.ready && nb.affordable, !nb.ready ? nb.needName : need(nb.price), () => openSheet('shop', '.branchcard'));
  if (S.shopsOf(s).length >= BUILD.from) {
    if (!S.festivalTomorrow(s)) { const f = S.canFestival(s); row('町', '商店街まつり（あした）', FESTIVAL.price, f.ok, f.ok ? '' : f.why, () => openSheet('town', '.fest')); }
    for (const b of BUILD.list.filter((x) => !S.builtOf(s).includes(x))) row('町', `${b.name}を 建てる`, b.price, S.canBuild(s, b.id).ok, need(b.price), () => openSheet('town', '.build'));
  } else row('町', '商店街まつり・町に 建てる', null, false, `${BUILD.from}号店を 出したら`, null);
  const secs = [...new Set(rows.map((r) => r.sec))];
  const body = secs.map((sec) => `<div class="sec">${sec}</div>${rows.map((r, i) => r.sec !== sec ? '' : `<button class="card mrow ${r.ok ? 'ok' : ''}" data-mi="${i}" ${r.go ? '' : 'disabled'}><div class="txt"><b>${r.name}</b><small>${r.ok ? '使える' : r.why}</small></div>${r.price != null ? `<span class="mprice">${yen(r.price)}</span>` : ''}</button>`).join('')}`).join('');
  const close = overlay(`<h3>お金の使い道</h3><div class="mbig"><small>いま 持っている お金</small><b>${yen(s.money)}</b>${s.debt ? `<em>ツケ ${yen(s.debt)}（あしたの 売上から 先に 返す）</em>` : ''}</div>${body}<button class="big go" data-close>とじる</button>`, null);
  for (const b of $('overlay').querySelectorAll('[data-mi]')) onTap(b, () => { const r = rows[+b.dataset.mi]; if (!r.go) return; if (s.phase !== 'night') { toast('夜の準備で 使える'); return; } close(); r.go(); });
}
// 店ごとの評判：きのうからの変化と、評判で 何が変わるか（2026-11-03 オーナー）
function repDelta(g) {
  const x = S.shopInfo(s, g);
  const r = [...s.reports].reverse().find((y) => (y.shop || 'washoku') === g && y.day === s.day - 1 && !y.closed && typeof y.rep === 'number');
  if (!r) return null;
  return Math.round(x.rep - (r.rep - (r.repDelta || 0)));
}
function repNext(g) {
  const x = S.shopInfo(s, g), G = GENRES[g], st = STAGES[x.stage + 1];
  if (st && x.rep < st.unlock.rep) return `${st.unlock.rep} で ${G.stageNames[x.stage + 1]}に 広げられる（売上も 要る）`;
  const tv = RIVAL.tactics.find((y) => y.id === 'ad');
  if (s.rival && x.rep < tv.repGuard) return `${tv.repGuard} で ライバルの テレビの宣伝を かわせる`;
  return '';
}
function repSheet() {
  const list = S.shopsOf(s).map((g) => {
    const x = S.shopInfo(s, g), r = Math.round(x.rep), G = GENRES[g], d = repDelta(g), nx = repNext(g);
    const dl = d == null ? '<em class="rd z">きのう 休み</em>' : `<em class="rd ${d > 0 ? 'up' : d < 0 ? 'dn' : 'z'}">きのうから ${d > 0 ? '▲' : d < 0 ? '▼' : '±'}${Math.abs(d)}</em>`;
    const base = Math.round((DEMAND.base + x.rep * DEMAND.perRep) * (DEMAND.stageMul[x.stage] || 1));
    return `<div class="card repcard ${g === S.genreOf(s) ? 'here' : ''}"><div class="txt"><b>${G.no}号店 ${G.name}${g === S.genreOf(s) ? '<span class="oneday">あした 立つ</span>' : ''}</b><small>${G.stageNames[x.stage]}・1日に 来る人の もと 約${base}人</small>
      <div class="meter"><i style="width:${r}%"></i></div>${nx ? `<small class="rnext">次：${nx}</small>` : ''}</div><div class="repv"><span class="stars">${'★'.repeat(S.stars(x.rep))}<i>${'★'.repeat(5 - S.stars(x.rep))}</i></span><b>${r}</b>${dl}</div></div>`;
  }).join('');
  const tv = RIVAL.tactics.find((y) => y.id === 'ad');
  overlay(`<h3>お店の評判</h3>${list}
    <div class="sec">評判が 上がると</div>
    ${[
      ['👥', 'お客さんが 増える', `評判は 町の うわさ。10 上がるごとに、1日に 来る人が 約${Math.round(DEMAND.perRep * 10)}人 増える。店が 大きいほど よく効き、町の人気店なら 約${Math.round(DEMAND.perRep * 10 * DEMAND.stageMul[2])}人。いちばん 大きい 効き目`],
      ['🏠', '店を 広げられる', `小さな店に するには 評判 ${STAGES[1].unlock.rep}、町の人気店に するには ${STAGES[2].unlock.rep} が 要る（売上の合計も 要る）`],
      ['📺', 'ライバルに 強くなる', `ライバルが テレビの宣伝を 打ってきた週、評判 ${tv.repGuard} 以上の店は 客を ほとんど 取られない`],
      ['⭐', '★が 増える', '20 ごとに ★が 1つ 増える。★5 は 80 から'],
    ].map(([ic, h, tx]) => `<div class="card rgood"><div class="ic">${ic}</div><div class="txt"><b>${h}</b><small>${tx}</small></div></div>`).join('')}
    <div class="sec">上がる・下がる</div>
    <div class="card rupdn"><div class="txt"><b class="up">▲ 上がる</b><small>料理を 早く出す（待たせないほど 多く）・町の人の お願いを 届ける・商店街まつり・ライバルを 撤退させる（全部の店）</small>
      <b class="dn">▼ 下がる</b><small>待たせて 帰した・売り切れで 頼めなかった・高すぎて やめた・お願いを 届けられなかった・ライバルに 負け続けた</small>
      <b>↺ 高いと 戻る</b><small>80 を 超えると、何もしなくても 毎日 少しずつ 下がる（高いほど 大きく）。高い評判は 毎日 早く出して 保つもの。評判は 店ごとに 別</small></div></div>
    <button class="big go" data-close>とじる</button>`, null);
}
onTap($('walletBtn'), () => shopSheet());
onTap($('fastBtn'), () => { fast = !fast; $('fastBtn').classList.toggle('on', fast); toast(fast ? `早送り ×${FAST}` : 'ふつうの速さ'); });
onTap($('pauseBtn'), () => {
  paused = true;
  overlay(`<h3>ひと休み</h3><p>営業の途中で閉じると、この日は開店前から やり直しになります。</p>
    ${DEBUG ? '<button class="chunky" id="dbgEnd">（試し）すぐ閉店する</button><button class="chunky" id="dbgMoney">（試し）＋¥50,000・評判＋20</button>' : ''}
    <button class="big go" data-close>営業にもどる</button>
    ${s.today && s.today.snap ? (s.today.t <= DAY.undoUntil ? '<button class="chunky wide" id="backPrep" style="margin-top:10px">開店前に もどって 準備から やり直す</button>'
      : '<p style="margin:10px 0 0;font-size:12px;font-weight:800;color:var(--ink2);text-align:center">開店前に もどれるのは 12時まで</p>') : ''}`, () => { paused = false; });
  // 間違えて 開店したとき：開店前の 写しに 戻す（仕入れも 戻る・2026-11-03 オーナー）
  const bp = $('backPrep');
  if (bp) onTap(bp, () => { s = S.parseSave(s.today.snap); $('overlay').hidden = true; paused = false; fast = false; $('fastBtn').classList.remove('on'); keepAwake(false); save(); renderTop(); show(); toast('開店前に もどった'); });
  const d = $('dbgEnd');
  if (d) onTap(d, () => { $('overlay').hidden = true; paused = false; s.today.t = DAY.seconds; });
  const m = $('dbgMoney');
  if (m) onTap(m, () => { s.money += 50000; s.totalSales += 50000; s.rep = Math.min(100, s.rep + 20); renderTop(); });
});

onTap($('psClose'), () => closeSheet());
$('psheet').addEventListener('click', (e) => { if (e.target === $('psheet')) closeSheet(); });
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
const noSheet = () => closeSheet();
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
  { phase: 'night', mode: 'tap', place: 'bottom', target: () => $('prepList'), text: '<b>あしたの支度</b>：料理・人・お願い。<b>！</b>が付いたら 下で 店長が 言うので、ボタン1つで 直せる。何も なければ そのまま 開店できる' },
  { phase: 'night', mode: 'tap', place: 'bottom', enter: noSheet, target: () => document.querySelector('.qbtn[data-todo="food"]'), text: '<b>料理</b>：出す料理・値段・あした何食 仕込むか。高くすると 来る人は減る。<b>人</b>は アルバイト（あした<b>1日だけ</b>）' },
  { phase: 'night', mode: 'tap', place: 'top', enter: noSheet, target: () => document.querySelector('.hbtn[data-open="shop"]'), text: '<b>お店</b>：席や台を増やす・飾る。売上と評判が たまると 店を広げられる。<b>レシピ帳</b>で 新しい料理を 試す' },
  { phase: 'night', mode: 'tap', place: 'top', enter: noSheet, target: () => document.querySelector('.hbtn[data-open="town"]'), text: '<b>町</b>：商店街。店が増えたら ここで あした立つ店を えらぶ。となりに 店を呼んだり、町に 建てたりも ここ' },
  // 最後は 画面を 押さえない（前は 開店ボタンだけ 光らせて「開店しか できない」ように 見えた・2026-10-26 オーナー）
  { phase: 'night', mode: 'tap', place: 'top', enter: noSheet, target: () => $('openBtn'), text: '案内は ここまで。<b>料理</b>で 品数や 仕込みを 変えてから 開店しても、そのまま 開店しても いい。あとは 自由に やってみよう' },
];
// あとから1回だけ出す案内（チュートリアルが 終わってから。見たら ui.hints に残す）
// 2号店を出した夜：店長の役割と 方針（1回だけ・2026-10-21 オーナー「チュートリアルみたいに」）
const homeShop = () => S.shopsOf(s).find((g) => g !== S.genreOf(s));
const twoShops = () => S.shopsOf(s).length >= 2;
const showHome = (sel) => () => { ui.townSel = homeShop(); openSheet('town', sel); };
const HINTS = [
  { id: 'mgr1', phase: 'night', mode: 'card', ready: twoShops, enter: showHome('.townmap'),
    text: '店が 2つに なった！<br>あなたが 立てるのは <b>1日に 1店</b>。立たない店は アルバイトだけで 回る。そこで <b>店長</b>の 出番' },
  { id: 'mgr2', phase: 'night', mode: 'tap', ready: twoShops, enter: showHome('.townmap'), target: () => document.querySelector('.townmap [data-sel]:not(.here)') || document.querySelector('.townmap'),
    text: '商店街の地図で 店を タップすると 下に 札が出る。<b>ここに立つ</b>で あした立つ店を 変えられる' },
  { id: 'mgr3', phase: 'night', mode: 'tap', ready: twoShops, enter: showHome('.card.pick'), target: () => document.querySelector('.card.pick [data-crew]') || document.querySelector('.townmap'),
    text: `<b>バイトを呼ぶ</b>の 中に 店長がいる。1日 ${yen(MANAGER.wage)}＋その店の 売上の ${Math.round(MANAGER.rate * 100)}%で、<b>貼り紙を読んで 仕込みを決め</b>、足りない 仕込み係と ホール係を 呼ぶ。決めたことは 日報に 書く` },
  { id: 'mgr4', phase: 'night', mode: 'card', ready: twoShops,
    text: `店長には <b>方針</b>を 決められる。<br><b>${STANCES.sales.name}</b>：仕込み多め・値段 +5%<br><b>${STANCES.rep.name}</b>：丁寧に運ぶ・評判が 落ちにくいが もうけは 減る<br><b>${STANCES.lean.name}</b>：きのう売れた数 ちょうど・余らないが 売り切れる<br>何を 大事にするかは あなたが 決める` },
  { id: 'fast', phase: 'service', mode: 'tap', hold: true, ready: () => S.canFast(s), target: () => $('fastBtn'),
    text: () => `${S.crewOk(s.staff) ? '仕込み係と ホール係が そろった' : '売り切れて もう 作るものが ない'}ので <b>▶▶ 早送り</b>が 使える。<br>押すと 営業が ${FAST}倍の速さで進む。もう1回 押すと ふつうに戻る。売り切れたあとと、仕込み係と ホール係が いる日に 押せる` },
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
  if (s.phase !== 'night') { tab = null; $('psheet').hidden = true; }
  for (const id of ['queue', 'seats', 'tickets', 'kitchen', 'pass']) { const b = $(id); b.innerHTML = ''; b._map = null; }
  if (s.phase === 'report') renderReport();
  if (s.phase === 'night') { renderNight(); if (s.faceDay && !s.faceSeen) faceScene(); else { rivalScenes(); if ($('overlay').hidden) checkLetter(); } }
  if (s.phase === 'service') renderService();
  renderTop();
}

// 開店中は 画面を スリープさせない（Screen Wake Lock・Safari 16.4 / Chrome）。一時停止と 閉店で 離す。
// 画面を切り替えて戻ってきたら ブラウザが 離しているので 取り直す。Expo 版では expo-keep-awake を 同じ範囲で使う
let wakeLock = null;
async function keepAwake(on) {
  if (NATIVE) { // アプリでは expo-keep-awake（native/App.js）
    const want = on && !paused && s.phase === 'service';
    if (want !== !!wakeLock) { wakeLock = want || null; native('awake', { on: want }); }
    return;
  }
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(true); scheduleNotify(); } else { keepAwake(true); if (s.phase === 'night') { checkLetter(); renderNight(); } }
});


refreshStore();
show();
if (window.__dinerCloudNote) toast('iCloud から 店を 読みこみました');
scheduleNotify();
requestAnimationFrame(frame);
