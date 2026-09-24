// 画面の組み立て：時間を流す・保存する・タップと指の操作を受ける。ゲームのルールは sim.js にしか書かない。

import { CONFIG } from './config.js';
import { T, SIZES, PIER, center, placements, footprint, canPlace } from './grid.js';
import {
  createGame, step, catchUp, isNight, dayOf, formatClock, actionsFor, applyAction,
  describeResident, favoriteText, seatCount, WEATHER_LABEL, buildingById, cafeLabel, nearestCafeSteps, cafes,
  migrate, everyone, personById, openPort, nextBoat, boatNow, clockOf, adoptPet, describePet, shopLabel,
} from './sim.js';
import { createRenderer, lookOf } from './render.js';
import { ICONS } from './icons.js';
import { currentStep, report, skipTutorial, busyCafeNow } from './tutorial.js';

// 🚨 前の版（3日テスト中）と同じサイトに置くので、保存の名前を分ける（D289）
const SAVE_KEY = 'til.grid.save.v1';
const OPENS_KEY = 'til.grid.opens.v1';
const DEBUG = new URLSearchParams(location.search).has('debug');
const DAY_RATE = (16 * 60) / CONFIG.daySecondsReal; // 昼のあいだ、現実1秒あたり何分 進むか

const $ = (id) => document.getElementById(id);
const canvas = $('island');
const renderer = createRenderer(canvas);

let state = load() || createGame();
let firstRun = !state.savedAt;
let selected = null; // { kind: 'resident'|'building', id }
let placing = null; // { action, type, cells, ghost }
let speed = 1;
let lastFrame = performance.now();
let hiddenAt = null;
const pokes = new Map(); // タップした住民 → 時刻（跳ねる演出だけ。ルールには関係ない）
let busyStage = null; // 「カフェが混んでいます」の段階：null → 'watch' → 'ask'
let busyAt = 0;

// ---------------------------------------------------------------- 保存

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.version === 2 ? migrate(s) : null;
  } catch {
    return null;
  }
}

function save() {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // 保存できない環境（プライベートブラウズ等）でも遊べるようにする
  }
}

function recordOpen() {
  try {
    const opens = JSON.parse(localStorage.getItem(OPENS_KEY) || '[]');
    opens.push(new Date().toISOString());
    localStorage.setItem(OPENS_KEY, JSON.stringify(opens.slice(-200)));
  } catch {
    // 記録できなくても遊べる
  }
}

// ---------------------------------------------------------------- 留守のあいだ

function returnAfter(seconds) {
  if (seconds < 3) return;
  const events = catchUp(state, seconds * DAY_RATE);
  const days = events.filter((e) => e.type === 'newday');
  if (days.length > 0) showMorning(days.map((e) => e.entry));
  save();
}

// ---------------------------------------------------------------- ループ

function frame(now) {
  const realDt = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;
  const rate = DAY_RATE * (isNight(state.t) ? CONFIG.nightSpeed : 1) * speed;
  const events = step(state, realDt * rate);
  for (const e of events) {
    if (e.type === 'newday') {
      toast(`Day ${e.entry.day} の日記が届きました`);
      $('diary-dot').hidden = false;
    } else if (e.type === 'arrived') {
      toast(`${e.name}が島に引っ越してきました`);
      renderQuest();
    } else if (e.type === 'stray') {
      toast(`${e.near}のあたりに、${e.kind === 'cat' ? 'ねこ' : 'いぬ'}が迷い込んできたようです`);
    } else if (e.type === 'boat') {
      toast(`船が着きました。観光客が ${e.n}人 降りてきました`);
    } else if (e.type === 'portOpen') {
      setTimeout(() => toast('港がひらきました。船が来るようになります'), 3000);
      renderQuest();
    }
  }
  const quest = currentStep(state);
  if (quest?.id === 'busy_cafe') {
    if (busyStage === null && busyCafeNow(state)) {
      busyStage = 'watch';
      busyAt = now;
      renderQuest();
    } else if (busyStage === 'watch' && now - busyAt > 12000) {
      busyStage = 'ask';
      renderQuest();
    }
  }
  renderer.draw(state, now / 1000, {
    selectedId: selected?.kind === 'resident' ? selected.id : null,
    pokes,
    placing,
    cafeLabel: (b) => cafeLabel(state, b),
  });
  updateHud();
  if (selected) renderCard();
  requestAnimationFrame(frame);
}

let shownWeather = null;
function updateHud() {
  if (shownWeather !== state.weather) {
    $('weather').innerHTML = ICONS[state.weather];
    shownWeather = state.weather;
  }
  $('day').textContent = `Day ${dayOf(state.t)}`;
  $('clock').textContent = formatClock(state.t);
  $('coin').textContent = state.coin.toLocaleString();
}

// ---------------------------------------------------------------- 指の操作（ドラッグで動かす・2本指で拡大縮小・タップ）

const pointers = new Map();
let dragMoved = 0;
let pinchDist = 0;

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 1) dragMoved = 0;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
});

canvas.addEventListener('pointermove', (ev) => {
  const prev = pointers.get(ev.pointerId);
  if (!prev) return;
  const cur = { x: ev.clientX, y: ev.clientY };
  pointers.set(ev.pointerId, cur);
  if (pointers.size === 1) {
    dragMoved += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    renderer.panBy(cur.x - prev.x, cur.y - prev.y);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0) renderer.zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
    pinchDist = d;
    dragMoved = 999; // 2本指の操作はタップにしない
  }
});

function endPointer(ev) {
  if (!pointers.has(ev.pointerId)) return;
  pointers.delete(ev.pointerId);
  if (pointers.size === 0 && dragMoved < 12 && ev.type === 'pointerup') tap(ev.clientX, ev.clientY);
  if (pointers.size < 2) pinchDist = 0;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener(
  'wheel',
  (ev) => {
    ev.preventDefault();
    renderer.zoomAt(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX, ev.clientY);
  },
  { passive: false },
);

function tap(clientX, clientY) {
  if (placing) return tapWhilePlacing(clientX, clientY);
  const p = renderer.toWorld(clientX, clientY);
  const pet = (state.pets || [])
    .map((x) => ({ x, d: Math.hypot(x.x - p.x, x.y - 8 - p.y) }))
    .filter((o) => o.d < 18)
    .sort((a, b) => a.d - b.d)[0];
  if (pet) {
    pokes.set(pet.x.id, performance.now() / 1000);
    return select({ kind: 'pet', id: pet.x.id });
  }
  const hit = everyone(state)
    .filter((r) => r.visible)
    .map((r) => ({ r, d: Math.hypot(r.x - p.x, r.y - 12 - p.y) }))
    .filter((x) => x.d < 18)
    .sort((a, b) => a.d - b.d)[0];
  if (hit) {
    pokes.set(hit.r.id, performance.now() / 1000);
    tutorial('tap_resident');
    return select({ kind: 'resident', id: hit.r.id });
  }
  const pier = center(PIER);
  if (Math.abs(p.x - (pier.x + 16)) < 40 && p.y > pier.y - 14 && p.y < pier.y + 80) return select({ kind: 'port' });
  const b = buildingAt(p);
  if (b) {
    if (b.type === 'cafe') tutorial('tap_cafe');
    return select({ kind: 'building', id: b.id });
  }
  select(null);
}

// 建物のタップ判定。マスより少し広く取る（指は30pxのマスには小さすぎる・屋根はマスの上にはみ出している）
const HIT_PAD = 10;
const ROOF_PAD = 16;
function buildingAt(p) {
  let best = null;
  for (const b of state.buildings) {
    const s = SIZES[b.type];
    const x0 = b.c * T - HIT_PAD;
    const x1 = (b.c + s.w) * T + HIT_PAD;
    const y0 = b.r * T - HIT_PAD - ROOF_PAD;
    const y1 = (b.r + s.h) * T + HIT_PAD;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    // 重なったら、真ん中がいちばん近い建物
    const d = Math.hypot(p.x - (b.c + s.w / 2) * T, p.y - (b.r + s.h / 2) * T);
    if (!best || d < best.d) best = { b, d };
  }
  return best?.b || null;
}

function select(s) {
  selected = s;
  delete $('card').dataset.stray;
  $('card').hidden = !s;
  document.body.classList.toggle('card-open', !!s);
  if (s) renderCard();
}

// ---------------------------------------------------------------- カード（起きていることだけ。解決策は書かない）

function dot(r) {
  return `<i class="dot" style="background:${lookOf(r).shirt}"></i>`;
}

function who(ids) {
  const list = ids.map((id) => personById(state, id)).filter(Boolean);
  if (list.length === 0) return 'だれもいない';
  return `<span class="who">${list.map((r) => `<span>${dot(r)}${r.name}</span>`).join('')}</span>`;
}

function fmt(clock) {
  return `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
}

function renderCard() {
  const card = $('card');
  let html = '';
  const at = (t) => fmt(Math.floor(clockOf(t)));
  if (selected.kind === 'pet') {
    const pet = state.pets.find((x) => x.id === selected.id);
    if (!pet) return select(null);
    const label = pet.kind === 'cat' ? 'ねこ' : 'いぬ';
    if (!pet.adopted) {
      if (card.dataset.stray === pet.id) return; // 名前を入力中は描き直さない
      card.dataset.stray = pet.id;
      card.innerHTML = `<h3>${label}</h3><div class="sub">どこからか迷い込んできたようです</div>
        <div class="adopt"><input id="pet-name" type="text" maxlength="8" value="${CONFIG.pets[pet.kind].name}" aria-label="名前" />
        <button id="btn-adopt" type="button" data-pet="${pet.id}">この名前で家族にする</button></div>`;
      return;
    }
    const owner = state.residents.find((r) => r.id === pet.ownerId);
    html = `<h3>${pet.name}</h3><div class="sub">${owner ? `${owner.name}の家の${label}` : label}</div><div class="now">いまは、${describePet(state, pet)}</div>`;
  } else if (selected.kind === 'resident') {
    const r = personById(state, selected.id);
    if (!r || !r.visible) return select(null);
    const sub = r.tourist ? `船で来た人。${at(r.departAt)}の船で帰る` : favoriteText(r);
    html = `<h3>${dot(r)}${r.name}</h3><div class="sub">${sub}</div><div class="now">いまは、${describeResident(state, r)}</div>`;
  } else if (selected.kind === 'port') {
    const N = CONFIG.port.unlockPopulation;
    if (!state.port.open) {
      html = `<h3>港</h3><div class="sub">住民が ${N}人 になると、船が来るようになります</div><div class="now">いまの住民：${state.residents.length}人</div>`;
    } else {
      const b = boatNow(state);
      const next = nextBoat(state);
      const sub = b?.phase === 'docked' ? `船が来ています。${at(b.depart)}に出航` : next ? `次の船は ${at(next.arrive)}ごろ` : '今日の船は、もう来ません';
      const onIsland = state.visitors.filter((v) => v.visible).length;
      html = `<h3>港</h3><div class="sub">${sub}</div><div class="now">島にいる観光客：${onIsland}人</div><div>今日来た観光客：${state.today.tourists}人</div>`;
    }
  } else {
    const b = buildingById(state, selected.id);
    if (b.type === 'cafe') {
      const seated = b.seats.filter(Boolean);
      html = `<h3>${cafeLabel(state, b)} Lv${b.level}</h3><div class="sub">席は ${seatCount(b)} つ。${fmt(CONFIG.cafe.open)}から${fmt(CONFIG.cafe.close)}まで</div>`;
      html += `<div class="now">座っている：${who(seated)}</div>`;
      html += `<div>外で待っている：${who(b.queue)}</div>`;
    } else if (b.type === 'shop') {
      const max = CONFIG.shop.levels[b.level - 1].stock;
      const here = everyone(state).filter((r) => r.state === 'SHOP' && r.destId === b.id).map((r) => r.id);
      html = `<h3>${shopLabel(state, b)} Lv${b.level}</h3><div class="sub">今日の品物 ${b.stock} / ${max}個。毎朝 入荷。${fmt(CONFIG.shop.open)}から${fmt(CONFIG.shop.close)}まで</div>`;
      html += `<div class="now">見ている人：${who(here)}</div>`;
    } else if (b.type === 'park') {
      const here = state.residents.filter((r) => r.state === 'PARK' && r.destId === b.id).map((r) => r.id);
      html = `<h3>公園</h3><div class="sub">${b.roof ? '東屋がある' : '屋根はない'}</div>`;
      html += `<div class="now">いま：${who(here)}</div>`;
    } else {
      const living = state.residents.filter((r) => r.homeId === b.id && r.state !== 'PENDING').map((r) => r.id);
      const free = CONFIG.houseCapacity - state.residents.filter((r) => r.homeId === b.id).length;
      const steps = nearestCafeSteps(state, b);
      html = `<h3>家</h3><div class="sub">${free > 0 ? `あと ${free}人 住める` : '満室'}${steps !== null ? `。カフェまで道で ${steps}マス` : ''}</div>`;
      html += `<div class="now">住んでいる：${who(living)}</div>`;
    }
  }
  delete card.dataset.stray;
  if (card.innerHTML !== html) card.innerHTML = html;
}

$('card').addEventListener('click', (ev) => {
  const btn = ev.target.closest('#btn-adopt');
  if (!btn) return;
  const res = adoptPet(state, btn.dataset.pet, $('pet-name').value);
  toast(res.message);
  if (res.ok) {
    pokes.set(btn.dataset.pet, performance.now() / 1000);
    delete $('card').dataset.stray;
    renderCard();
    save();
  }
});

// ---------------------------------------------------------------- シート（つくる・日記）

function openSheet(html) {
  const sheet = $('sheet');
  const body = sheet.querySelector('.sheet-body');
  body.innerHTML = `<div class="sheet-top"><button class="close x" type="button" aria-label="とじる">${ICONS.close}</button></div>${html}`;
  body.scrollTop = 0;
  sheet.hidden = false;
  select(null);
}

$('sheet').addEventListener('click', (ev) => {
  if (ev.target.id === 'sheet' || ev.target.closest('.close')) {
    $('sheet').hidden = true;
    return;
  }
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const action = actionsFor(state).find((a) => a.id === btn.dataset.action);
  if (!action) return;
  if (action.place) {
    $('sheet').hidden = true;
    return startPlacing(action);
  }
  const res = applyAction(state, action.id);
  toast(res.message);
  if (res.ok) {
    $('sheet').hidden = true;
    save();
  }
});

$('btn-build').addEventListener('click', () => openBuild());

function openBuild(focusId) {
  if (placing) return;
  const items = actionsFor(state)
    .map((a) => {
      const short = a.cost - state.coin;
      return `<button class="action" type="button" data-action="${a.id}" ${short > 0 || a.locked ? 'disabled' : ''}>
        ${ICONS[a.icon]}
        <span class="text">${a.title}<span class="detail">${a.detail}</span></span>
        <span><span class="cost">${ICONS.coin}${a.cost.toLocaleString()}</span>${short > 0 && !a.locked ? `<span class="need">あと ${short.toLocaleString()}</span>` : ''}</span>
      </button>`;
    })
    .join('');
  openSheet(`<h2>つくる</h2>${items || '<p class="lead">いまつくれるものはありません</p>'}`);
  if (focusId) {
    const el = [...document.querySelectorAll('.action')].find((x) => x.dataset.action.startsWith(focusId));
    if (el) el.classList.add('focus');
  }
}

function entryHtml(e) {
  const lines = e.lines.map((l) => `<p class="${l.kind}">${l.text}</p>`).join('');
  return `<div class="entry"><h3>Day ${e.day}${ICONS[e.weather]}${WEATHER_LABEL[e.weather]}</h3>${lines}</div>`;
}

$('btn-diary').addEventListener('click', () => {
  if (placing) return;
  $('diary-dot').hidden = true;
  for (const e of state.diary) e.read = true;
  const entries = [...state.diary].reverse().map(entryHtml).join('');
  if (state.diary.length) tutorial('read_diary');
  openSheet(`<h2>島の日記</h2>${entries ? `<div class="notebook">${entries}</div>` : '<p class="lead">まだ日記はありません。1日が終わると、ここに届きます。</p>'}`);
});

function showMorning(entries) {
  for (const e of entries) e.read = true;
  tutorial('read_diary');
  $('diary-dot').hidden = true;
  openSheet(`<div class="morning">${ICONS.sunrise}<h2>おはようございます</h2><p class="lead">昨日の島では、こんなことがありました</p></div><div class="notebook">${entries.map(entryHtml).join('')}</div>`);
}

// ---------------------------------------------------------------- 建てる場所を選ぶ

function startPlacing(action) {
  const spots = placements(action.place, state.buildings);
  if (spots.length === 0) return toast('建てられる場所がありません');
  const cells = new Set();
  for (const s of spots) for (const t of footprint(action.place, s.c, s.r)) cells.add(t);
  placing = { action, type: action.place, cells: [...cells], ghost: null };
  select(null);
  $('place-title').textContent = `${action.title}：明るいところをタップ`;
  $('place-ok').disabled = true;
  $('place-ok').textContent = `ここに建てる`;
  $('placebar').hidden = false;
  $('bar').hidden = true;
  document.body.classList.add('placing');
}

function tapWhilePlacing(clientX, clientY) {
  const { c, r } = renderer.tileAt(clientX, clientY);
  const s = SIZES[placing.type];
  // タップしたマスが建物の真ん中に来る置き方を優先し、だめなら そのマスを含む置き方を探す
  const tries = [[c - Math.floor((s.w - 1) / 2), r - Math.floor((s.h - 1) / 2)]];
  for (let dr = 0; dr < s.h; dr++) for (let dc = 0; dc < s.w; dc++) tries.push([c - dc, r - dr]);
  const ok = tries.find(([cc, rr]) => canPlace(placing.type, cc, rr, state.buildings));
  if (!ok) {
    placing.ghost = null;
    $('place-ok').disabled = true;
    return toast('そこには建てられません');
  }
  placing.ghost = { c: ok[0], r: ok[1] };
  $('place-ok').disabled = state.coin < placing.action.cost;
  $('place-ok').innerHTML = `ここに建てる ${ICONS.coin}${placing.action.cost.toLocaleString()}`;
}

function endPlacing() {
  placing = null;
  $('placebar').hidden = true;
  $('bar').hidden = false;
  document.body.classList.remove('placing');
}

$('place-cancel').addEventListener('click', endPlacing);
$('place-ok').addEventListener('click', () => {
  if (!placing?.ghost) return;
  const res = applyAction(state, placing.action.id, placing.ghost);
  toast(res.message);
  if (res.ok) {
    const type = placing.type;
    endPlacing();
    if (type === 'house') tutorial('build_house');
    save();
  }
});

// ---------------------------------------------------------------- やること（チュートリアル・D290）

function tutorial(trigger) {
  const res = report(state, trigger);
  if (!res) return;
  busyStage = null;
  if (res.reward > 0) setTimeout(() => toast(`できました　+${res.reward} Coin`), 400);
  if (res.finished) setTimeout(() => toast('ここからは、島を自由に育ててください'), 3300);
  renderQuest();
  save();
}

function renderQuest() {
  const el = $('quest');
  const step = currentStep(state);
  if (!step) {
    // チュートリアルのあとは「次の目標」だけを小さく出す（港がひらくまで）
    const N = CONFIG.port.unlockPopulation;
    if (state.port.open) {
      el.hidden = true;
      return;
    }
    el.innerHTML = `<div class="quest-head"><b>目標：港をひらく</b><span class="reward">${state.residents.length} / ${N}人</span></div><p>住民が ${N}人 になると、港に船が来るようになります</p>`;
    el.hidden = false;
    return;
  }
  if (step.id === 'busy_cafe' && busyStage === null) {
    el.hidden = true;
    return;
  }
  const reward = step.reward ? `<span class="reward">${ICONS.coin}+${step.reward}</span>` : '';
  let html = `<div class="quest-head"><b>${step.title}</b>${reward}</div>`;
  if (step.id === 'busy_cafe' && busyStage === 'ask') {
    html += `<p>${step.ask}</p><div class="choices">${step.choices.map((c) => `<button type="button" data-choice="${c.id}">${c.label}</button>`).join('')}</div>`;
  } else {
    html += `<p>${step.body}</p>`;
  }
  if (step.id !== 'busy_cafe') html += `<button class="skip" type="button">とばす</button>`;
  el.innerHTML = html;
  el.hidden = false;
}

$('quest').addEventListener('click', (ev) => {
  if (ev.target.closest('.skip')) {
    skipTutorial(state);
    renderQuest();
    save();
    return;
  }
  const choice = ev.target.closest('[data-choice]')?.dataset.choice;
  if (!choice) return;
  tutorial('busy_cafe');
  if (choice !== 'nothing') openBuild(choice);
});

// ---------------------------------------------------------------- お知らせ

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  el.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = 0;
    setTimeout(() => (el.hidden = true), 600);
  }, 2600);
}

// ---------------------------------------------------------------- テスト用パネル（?debug）

function renderDebug() {
  let opens = [];
  try {
    opens = JSON.parse(localStorage.getItem(OPENS_KEY) || '[]');
  } catch {
    opens = [];
  }
  const byDate = {};
  for (const o of opens) {
    const d = new Date(o).toLocaleDateString('ja-JP');
    byDate[d] = (byDate[d] || 0) + 1;
  }
  $('debug').innerHTML = `
    <button data-dbg="away">留守にする（翌朝まで進める）</button>
    <button data-dbg="speed">速さ ×${speed === 1 ? 10 : 1} にする</button>
    <button data-dbg="rain">今日を雨にする</button>
    <button data-dbg="coin">Coin +500</button>
    <button data-dbg="port">港をひらく</button>
    <button data-dbg="reset">最初からやり直す</button>
    <pre>起動の記録（日付: 回数）\n${Object.entries(byDate).map(([d, n]) => `${d}: ${n}`).join('\n') || '—'}</pre>`;
}

if (DEBUG) {
  // 画面テスト用（?debug のときだけ）：マスの画面上の位置
  window.__til = {
    tileToClient: (c, r) => renderer.toClient((c + 0.5) * T, (r + 0.5) * T),
    placements: (t) => placements(t, state.buildings),
    pets: () => state.pets.map((p) => ({ id: p.id, kind: p.kind, adopted: p.adopted, state: p.state, ...renderer.toClient(p.x, p.y - 8) })),
    clock: () => clockOf(state.t),
    shops: () => state.buildings.filter((b) => b.type === 'shop').map((b) => ({ id: b.id, stock: b.stock, ...renderer.toClient((b.c + 1) * T, (b.r + 1) * T) })),
    setStock: (n) => state.buildings.filter((b) => b.type === 'shop').forEach((b) => (b.stock = n)),
    setTutorial: (n) => {
      state.tutorial = { step: n, skipped: false };
      busyStage = null;
      renderQuest();
    },
  };
  $('debug').hidden = false;
  renderDebug();
  $('debug').addEventListener('click', (ev) => {
    const k = ev.target.dataset.dbg;
    if (k === 'away') returnAfter(1e7);
    if (k === 'speed') speed = speed === 1 ? 10 : 1;
    if (k === 'rain') state.weather = 'rain';
    if (k === 'coin') state.coin += 500;
    if (k === 'port') {
      openPort(state);
      renderQuest();
    }
    if (k === 'reset' && confirm('島を最初からやり直しますか？')) {
      state = createGame();
      firstRun = true;
      busyStage = null;
      renderQuest();
      save();
    }
    renderDebug();
  });
}

// ---------------------------------------------------------------- 起動

window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    save();
  } else {
    const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
    hiddenAt = null;
    if (away >= 60) recordOpen();
    returnAfter(away);
    lastFrame = performance.now();
  }
});
window.addEventListener('pagehide', save);
setInterval(save, 5000);

$('coin-icon').innerHTML = ICONS.coin;
document.querySelector('#btn-build .i').innerHTML = ICONS.build;
document.querySelector('#btn-diary .i').innerHTML = ICONS.diary;
renderer.resize();
{
  // 最初はカフェのあたりを見せる
  const c = cafes(state)[0];
  if (c) renderer.focus((c.c + 1.5) * T, (c.r + 0.5) * T);
}
recordOpen();
if (state.savedAt) returnAfter((Date.now() - state.savedAt) / 1000);
if (firstRun && !currentStep(state)) {
  const hint = $('hint');
  hint.hidden = false;
  setTimeout(() => {
    hint.style.opacity = 0;
    setTimeout(() => (hint.hidden = true), 700);
  }, 6000);
}
if (firstRun) save();
if (state.diary.some((e) => !e.read)) $('diary-dot').hidden = false;
renderQuest();
updateHud();
requestAnimationFrame(frame);

