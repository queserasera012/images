// 画面の組み立て：時間を流す・保存する・タップを受ける。ゲームのルールは sim.js にしか書かない。

import { CONFIG } from './config.js';
import { PARK, CAFE, SEATS } from './world.js';
import {
  createGame, step, catchUp, isNight, dayOf, formatClock, actionsFor, applyAction,
  describeResident, favoriteText, seatCount, WEATHER_LABEL,
} from './sim.js';
import { createRenderer, lookOf } from './render.js';
import { ICONS } from './icons.js';

const SAVE_KEY = 'til.save.v1';
const OPENS_KEY = 'til.opens.v1';
const DEBUG = new URLSearchParams(location.search).has('debug');
const DAY_RATE = (16 * 60) / CONFIG.daySecondsReal; // 昼のあいだ、現実1秒あたり何分 進むか

const $ = (id) => document.getElementById(id);
const canvas = $('island');
const renderer = createRenderer(canvas);

let state = load() || createGame();
let firstRun = !state.savedAt;
let selected = null; // { kind: 'resident'|'cafe'|'park'|'house', id }
let speed = 1;
let lastFrame = performance.now();
let hiddenAt = null;

// ---------------------------------------------------------------- 保存

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
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
    }
  }
  renderer.draw(state, now / 1000, selected?.kind === 'resident' ? selected.id : null);
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

// ---------------------------------------------------------------- タップ

canvas.addEventListener('click', (ev) => {
  const p = renderer.toWorld(ev.clientX, ev.clientY);
  const hitResident = state.residents
    .filter((r) => r.visible)
    .map((r) => ({ r, d: Math.hypot(r.x - p.x, r.y - 12 - p.y) }))
    .filter((x) => x.d < 20)
    .sort((a, b) => a.d - b.d)[0];
  if (hitResident) return select({ kind: 'resident', id: hitResident.r.id });

  const cafeTop = CAFE.y - CAFE.h / 2 - 14;
  const cafeBottom = Math.max(...SEATS.map((s) => s.y)) + 12;
  if (p.x > CAFE.x - CAFE.w / 2 - 70 && p.x < CAFE.x + CAFE.w / 2 && p.y > cafeTop && p.y < cafeBottom) {
    return select({ kind: 'cafe' });
  }
  if (Math.hypot(p.x - PARK.x, (p.y - PARK.y) / 0.82) < PARK.r + 8) return select({ kind: 'park' });
  const house = state.houses.find((h) => Math.hypot(h.x - p.x, h.y - p.y) < 28);
  if (house) return select({ kind: 'house', id: house.id });
  select(null);
});

function select(s) {
  selected = s;
  $('card').hidden = !s;
  if (s) renderCard();
}

function dot(r) {
  return `<i class="dot" style="background:${lookOf(r).shirt}"></i>`;
}

function who(ids) {
  const list = ids.map((id) => state.residents.find((r) => r.id === id)).filter(Boolean);
  if (list.length === 0) return 'だれもいない';
  return `<span class="who">${list.map((r) => `<span>${dot(r)}${r.name}</span>`).join('')}</span>`;
}

function renderCard() {
  const card = $('card');
  let html = '';
  if (selected.kind === 'resident') {
    const r = state.residents.find((x) => x.id === selected.id);
    if (!r || !r.visible) return select(null);
    html = `<h3>${dot(r)}${r.name}</h3><div class="sub">${favoriteText(r)}</div><div class="now">いまは、${describeResident(state, r)}</div>`;
  } else if (selected.kind === 'cafe') {
    const seated = state.cafe.seats.filter(Boolean);
    html = `<h3>カフェ Lv${state.cafe.level}</h3><div class="sub">席は ${seatCount(state)} つ。${fmt(CONFIG.cafe.open)}から${fmt(CONFIG.cafe.close)}まで</div>`;
    html += `<div class="now">座っている：${who(seated)}</div>`;
    html += `<div>外で待っている：${who(state.cafe.queue)}</div>`;
  } else if (selected.kind === 'park') {
    const here = state.residents.filter((r) => r.state === 'PARK').map((r) => r.id);
    html = `<h3>公園</h3><div class="sub">${state.park.roof ? '東屋がある' : '屋根はない'}</div>`;
    html += `<div class="now">いま：${who(here)}</div>`;
  } else if (selected.kind === 'house') {
    const living = state.residents.filter((r) => r.homeId === selected.id && r.state !== 'PENDING').map((r) => r.id);
    const free = CONFIG.houseCapacity - state.residents.filter((r) => r.homeId === selected.id).length;
    html = `<h3>家</h3><div class="sub">${free > 0 ? `あと ${free}人 住める` : '満室'}</div>`;
    html += `<div class="now">住んでいる：${who(living)}</div>`;
  }
  if (card.innerHTML !== html) card.innerHTML = html;
}

function fmt(clock) {
  return `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- シート（つくる・日記）

function openSheet(html) {
  const sheet = $('sheet');
  sheet.querySelector('.sheet-body').innerHTML = `${html}<button class="close" type="button">とじる</button>`;
  sheet.hidden = false;
  select(null);
}

$('sheet').addEventListener('click', (ev) => {
  if (ev.target.id === 'sheet' || ev.target.classList.contains('close')) {
    $('sheet').hidden = true;
    return;
  }
  const btn = ev.target.closest('[data-action]');
  if (btn) {
    const res = applyAction(state, btn.dataset.action);
    toast(res.message);
    if (res.ok) {
      $('sheet').hidden = true;
      save();
    }
  }
});

$('btn-build').addEventListener('click', () => {
  const items = actionsFor(state)
    .map((a) => {
      const short = a.cost - state.coin;
      return `<button class="action" type="button" data-action="${a.id}" ${short > 0 ? 'disabled' : ''}>
        ${ICONS[a.id]}
        <span class="text">${a.title}<span class="detail">${a.detail}</span></span>
        <span><span class="cost">${ICONS.coin}${a.cost.toLocaleString()}</span>${short > 0 ? `<span class="need">あと ${short.toLocaleString()}</span>` : ''}</span>
      </button>`;
    })
    .join('');
  openSheet(`<h2>つくる</h2>${items || '<p class="lead">いまつくれるものはありません</p>'}`);
});

function entryHtml(e) {
  const lines = e.lines.map((l) => `<p class="${l.kind}">${l.text}</p>`).join('');
  return `<div class="entry"><h3>Day ${e.day}${ICONS[e.weather]}${WEATHER_LABEL[e.weather]}</h3>${lines}</div>`;
}

$('btn-diary').addEventListener('click', () => {
  $('diary-dot').hidden = true;
  for (const e of state.diary) e.read = true;
  const entries = [...state.diary].reverse().map(entryHtml).join('');
  openSheet(`<h2>島の日記</h2>${entries ? `<div class="notebook">${entries}</div>` : '<p class="lead">まだ日記はありません。1日が終わると、ここに届きます。</p>'}`);
});

function showMorning(entries) {
  for (const e of entries) e.read = true;
  $('diary-dot').hidden = true;
  openSheet(`<div class="morning">${ICONS.sunrise}<h2>おはようございます</h2><p class="lead">昨日の島では、こんなことがありました</p></div><div class="notebook">${entries.map(entryHtml).join('')}</div>`);
}

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
    <button data-dbg="reset">最初からやり直す</button>
    <pre>起動の記録（日付: 回数）\n${Object.entries(byDate).map(([d, n]) => `${d}: ${n}`).join('\n') || '—'}</pre>`;
}

if (DEBUG) {
  $('debug').hidden = false;
  renderDebug();
  $('debug').addEventListener('click', (ev) => {
    const k = ev.target.dataset.dbg;
    if (k === 'away') returnAfter(1e7);
    if (k === 'speed') speed = speed === 1 ? 10 : 1;
    if (k === 'rain') state.weather = 'rain';
    if (k === 'coin') state.coin += 500;
    if (k === 'reset' && confirm('島を最初からやり直しますか？')) {
      state = createGame();
      firstRun = true;
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
if (document.fonts?.ready) document.fonts.ready.then(() => renderer.resize());
recordOpen();
if (state.savedAt) {
  returnAfter((Date.now() - state.savedAt) / 1000);
}
if (firstRun) {
  const hint = $('hint');
  hint.hidden = false;
  setTimeout(() => {
    hint.style.opacity = 0;
    setTimeout(() => (hint.hidden = true), 700);
  }, 6000);
  save();
}
if (state.diary.some((e) => !e.read)) $('diary-dot').hidden = false;
updateHud();
requestAnimationFrame(frame);
