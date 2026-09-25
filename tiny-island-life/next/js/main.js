// 画面の組み立て：時間を流す・保存する・タップと指の操作を受ける。ゲームのルールは sim.js にしか書かない。

import { CONFIG } from './config.js';
import { T, SIZES, PIER, PIERS, OX, OY, AREAS, areaById, center, placements, footprint, canPlace, landBounds } from './grid.js';
import {
  createGame, step, catchUp, isNight, dayOf, formatClock, actionsFor, applyAction,
  describeResident, favoriteText, seatCount, WEATHER_LABEL, buildingById, cafeLabel, nearestCafeSteps, cafes,
  migrate, everyone, personById, openPort, nextBoat, boatNow, clockOf, adoptPet, describePet, shopLabel,
  labelOf, nextGoal, unlockNow, nameBaby, parentsOf, portsOf, portById, closeOf, fastForwardNow, movePlaces, canMoveTo, moveBuilding, isWinter, inSeason,
  capacityOf, houseUpgradeCost, houseLift, houses, fishingLeft, wantsRoomHouses,
  dailyBonus, claimDailyBonus, canCallBoat, callExtraBoat, adsLeft, nameResident, placeLabel, seasonOf,
} from './sim.js';
import { createRenderer, lookOf, setTheme, setHouseSkin, HOUSE_SKINS } from './render.js';
import { owns, buy, chosenHouseSkin, chooseHouseSkin, canBuy } from './purchases.js';
import { ICONS } from './icons.js';
import { currentStep, report, skipTutorial, busyCafeNow } from './tutorial.js';
import { setupKeepAwake, awakeStatus } from './awake.js';
import { openFishing, fishingNow } from './fishing.js';
import { showRewardedAd } from './ads.js';

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
  // 夜の早送りは、島のお店が全部 閉まってから（D299）
  const rate = DAY_RATE * (fastForwardNow(state) ? CONFIG.nightSpeed : 1) * speed;
  const events = step(state, realDt * rate);
  for (const e of events) {
    if (e.type === 'newday') {
      toast(`Day ${e.entry.day} の日記が届きました`);
      $('diary-dot').hidden = false;
    } else if (e.type === 'arrived') {
      toast(`${e.name}が島に引っ越してきました`);
      renderQuest();
    } else if (e.type === 'stray') {
      toast(`${e.near}のあたりに、${e.label}が迷い込んできたようです`);
    } else if (e.type === 'boat') {
      const where = e.port && e.port !== 'main' ? `${areaById(e.port).name}の港に` : '';
      toast(`${where}船が着きました。観光客が ${e.n}人 降りてきました`);
    } else if (e.type === 'portOpen') {
      setTimeout(() => toast('港がひらきました。船が来るようになります'), 3000);
      renderQuest();
    } else if (e.type === 'married') {
      toast(`${e.a}と${e.b}が結婚しました`);
    } else if (e.type === 'unlock' && e.id !== 'port') {
      setTimeout(() => toast(e.done), 3000);
      renderQuest();
    }
  }
  // 赤ちゃんが生まれていたら、名前をつけるカードを出す
  if (state.naming?.length && !selected && !placing && $('sheet').hidden) select({ kind: 'baby', id: state.naming[0] });
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
    selectedBuildingId: selected?.kind === 'building' ? selected.id : null,
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
  $('day').textContent = `Day ${dayOf(state.t)}・${seasonOf(state).name}`;
  syncTheme();
// 家の色（D314）。?house= があれば見本として使う
setHouseSkin(new URLSearchParams(location.search).get('house') || chosenHouseSkin());
  $('clock').textContent = formatClock(state.t);
  $('coin').textContent = state.coin.toLocaleString();
  // いま住んでいる人の数（D310）。引っ越してくる途中の人は数えない
  $('pop').textContent = `${state.residents.filter((r) => r.state !== 'PENDING').length}人`;
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
  // 港（桟橋と、その先に着く船のあたり）
  for (const port of portsOf(state)) {
    const pier = center(PIERS[port.id]);
    const [dx, dy] = areaById(port.id).pier.dir;
    const along = (p.x - pier.x) * dx + (p.y - pier.y) * dy;
    const side = dx ? p.y - pier.y - 16 : p.x - pier.x - 16;
    if (along > -14 && along < 80 && Math.abs(side) < 40) return select({ kind: 'port', id: port.id });
  }
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
  // まず、指の下に「描かれている」建物（屋根・看板の はみ出しを含む）。重なったら手前（下）に描かれた方
  // D310：前は余白込みの範囲で「真ん中が近い方」を選んでいて、釣り堀のふちを押すと隣の家が選ばれた
  let hit = null;
  for (const b of state.buildings) {
    const s = SIZES[b.type];
    const top = b.type === 'house' ? 14 + houseLift(b) : 8;
    if (p.x < b.c * T || p.x > (b.c + s.w) * T || p.y < b.r * T - top || p.y > (b.r + s.h) * T) continue;
    if (!hit || b.r + s.h > hit.r + SIZES[hit.type].h) hit = b;
  }
  if (hit) return hit;
  // 何も描かれていないところは、少し広めに拾う（指は30pxのマスには小さすぎる）
  let best = null;
  for (const b of state.buildings) {
    const s = SIZES[b.type];
    const x0 = b.c * T - HIT_PAD;
    const x1 = (b.c + s.w) * T + HIT_PAD;
    const y0 = b.r * T - HIT_PAD - ROOF_PAD - (b.type === 'house' ? houseLift(b) : 0);
    const y1 = (b.r + s.h) * T + HIT_PAD;
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    // 重なったら、真ん中がいちばん近い建物
    const d = Math.hypot(p.x - (b.c + s.w / 2) * T, p.y - (b.r + s.h / 2) * T);
    if (!best || d < best.d) best = { b, d };
  }
  return best?.b || null;
}

function select(s) {
  // 名前をつけずに閉じたら、最初の名前のままにする
  if (selected?.kind === 'baby' && s?.id !== selected.id) {
    nameBaby(state, selected.id, '');
    save();
  }
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

let lastCardHtml = '';

// リワード広告（D309）：臨時の観光船。呼べないときは理由を短く
function boatAdRow(id) {
  const left = adsLeft(state, 'boat');
  if (canCallBoat(state, id)) {
    return `<button id="btn-adboat" data-port="${id}" class="card-act" type="button">${ICONS.ad}広告を見て、臨時の船を呼ぶ<span class="cost">今日あと ${left}回</span></button>`;
  }
  const A = CONFIG.ads.boat;
  const port = portById(state, id);
  const coming = port?.today.some((b) => b.extra && state.t < b.depart);
  const text = coming
    ? `臨時の船が来ています（今日あと ${left}回 呼べる）`
    : `臨時の船：${left ? `${fmt(A.from)}〜${fmt(A.until)}に呼べる` : '今日は おしまい'}`;
  return `<div class="card-note">${text}</div>`;
}

// リワード広告（D309）：朝の日記の上乗せ
function bonusRow() {
  const coin = dailyBonus(state);
  return coin > 0 ? `<button class="ad-btn" type="button" data-ad="bonus">${ICONS.ad}広告を見て、昨日の売上に +${coin} Coin</button>` : '';
}
function renderCard() {
  const card = $('card');
  let html = '';
  const at = (t) => fmt(Math.floor(clockOf(t)));
  if (selected.kind === 'baby') {
    const baby = state.residents.find((x) => x.id === selected.id);
    if (!baby) return select(null);
    if (card.dataset.stray === baby.id) return; // 名前を入力中は描き直さない
    card.dataset.stray = baby.id;
    const [p1, p2] = parentsOf(state, baby);
    lastCardHtml = '';
    card.innerHTML = `<h3>赤ちゃんが生まれました</h3><div class="sub">${p1 && p2 ? `${p1.name}と${p2.name}の子ども` : '島の子ども'}</div>
      <div class="adopt"><input id="baby-name" type="text" maxlength="8" value="${baby.name}" aria-label="名前" />
      <button id="btn-baby" type="button" data-baby="${baby.id}">この名前にする</button></div>`;
    return;
  }
  if (selected.kind === 'pet') {
    const pet = state.pets.find((x) => x.id === selected.id);
    if (!pet) return select(null);
    const label = CONFIG.pets[pet.kind].label;
    if (!pet.adopted) {
      if (card.dataset.stray === pet.id) return; // 名前を入力中は描き直さない
      card.dataset.stray = pet.id;
      lastCardHtml = '';
      card.innerHTML = `<h3>${label}</h3><div class="sub">どこからか迷い込んできたようです</div>
        <div class="adopt"><input id="pet-name" type="text" maxlength="8" value="${CONFIG.pets[pet.kind].name}" aria-label="名前" />
        <button id="btn-adopt" type="button" data-pet="${pet.id}">この名前で家族にする</button></div>`;
      return;
    }
    const owner = state.residents.find((r) => r.id === pet.ownerId);
    html = `<h3>${pet.name}</h3><div class="sub">${owner ? `${owner.name}の家の${label}` : label}</div><div class="now">いまは、${describePet(state, pet)}</div>`;
  } else if (selected.kind === 'resident') {
    const r = personById(state, selected.id);
    if (r && selected.renaming) {
      // 名前を変える（D310）。入力中は描き直さない
      if (card.dataset.stray === `rename:${r.id}`) return;
      card.dataset.stray = `rename:${r.id}`;
      lastCardHtml = '';
      card.innerHTML = `<h3>${dot(r)}名前を変える</h3><div class="sub">いまの名前：${r.name}</div>
        <div class="adopt"><input id="res-name" type="text" maxlength="8" value="${r.name}" aria-label="名前" />
        <button id="btn-rename" type="button">この名前にする</button></div>`;
      return;
    }
    if (!r || !r.visible) return select(null);
    const parents = parentsOf(state, r);
    const spouse = r.spouseId && personById(state, r.spouseId);
    const sub = r.tourist
      ? `船で来た人。${at(r.departAt)}の船で帰る`
      : r.age && parents.length === 2
        ? `${parents[0].name}と${parents[1].name}の子ども`
        : favoriteText(r) + (spouse ? `。${spouse.name}と結婚している` : '');
    html = `<h3>${dot(r)}${r.name}</h3><div class="sub">${sub}</div><div class="now">いまは、${describeResident(state, r)}</div>`;
    if (!r.tourist) html += `<button id="btn-rename-open" class="card-btn" type="button">名前を変える</button>`;
  } else if (selected.kind === 'port' && selected.id && selected.id !== 'main') {
    const port = portById(state, selected.id);
    const b = boatNow(state, port);
    const next = nextBoat(state, port);
    const sub = b?.phase === 'docked' ? `船が来ています。${at(b.depart)}に出航` : next ? `次の船は ${at(next.arrive)}ごろ` : '今日の船は、もう来ません';
    const pier = PIERS[port.id];
    const onIsland = state.visitors.filter((v) => v.visible && v.pier === pier).length;
    html = `<h3>${areaById(port.id).name}の港</h3><div class="sub">${sub}</div><div class="now">この港から来た観光客：${onIsland}人</div>`;
    html += boatAdRow(port.id);
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
      html += boatAdRow('main');
    }
  } else {
    const b = buildingById(state, selected.id);
    if (b.type === 'cafe') {
      const seated = b.seats.filter(Boolean);
      const hours = b.bar ? `${fmt(CONFIG.cafe.open)}から${fmt(closeOf(b))}まで（${fmt(CONFIG.cafe.close)}からはバー）` : `${fmt(CONFIG.cafe.open)}から${fmt(closeOf(b))}まで`;
      html = `<h3>${cafeLabel(state, b)} Lv${b.level}</h3><div class="sub">席は ${seatCount(b)} つ。${hours}</div>`;
      html += `<div class="now">座っている：${who(seated)}</div>`;
      html += `<div>外で待っている：${who(b.queue)}</div>`;
    } else if (b.type === 'pond') {
      // 釣り堀（D304）：住民の様子と、あなたの釣り
      const V = CONFIG.pond;
      const left = fishingLeft(state);
      const log = CONFIG.pond.game.fish.filter((f) => state.fishLog?.[f.id]).map((f) => `${f.name} ${state.fishLog[f.id]}`);
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">釣り座 ${seatCount(b)}つ。${fmt(V.open)}から${fmt(V.close)}まで</div>`;
      html += `<div class="now">釣りをしている：${who(b.seats.filter(Boolean))}</div>`;
      html += `<div>あなたが釣った魚：${log.length ? log.join('・') : 'まだ いない'}</div>`;
      html += `<button id="btn-fish" class="card-act" type="button">${ICONS.fish}釣りをする<span class="cost">${left > 0 ? `今日の Coin あと ${left}回` : '今日の Coin は おしまい'}</span></button>`;
    } else if (b.type === 'company') {
      // 会社（D319）
      const C = CONFIG.company;
      const inside = state.residents.filter((r) => r.state === 'WORK' && r.destId === b.id).map((r) => r.id);
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">${seatCount(b)}人 が勤める（家の近い人から）。${fmt(C.go)}ごろ出勤、お昼は近くのカフェ、${fmt(C.close)}まで。1人 1日 ${C.pay} Coin</div>`;
      html += `<div class="now">いま働いている：${who(inside)}</div>`;
      html += `<div>勤めている人：${who(b.staff || [])}</div>`;
    } else if (b.type === 'pool') {
      // プール（D319）：夏だけ開く
      const V = CONFIG.pool;
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">一度に ${seatCount(b)}人。夏だけ ${fmt(V.open)}から${fmt(V.close)}まで</div>`;
      html += inSeason(state, 'pool')
        ? `<div class="now">泳いでいる：${who(b.seats.filter(Boolean))}</div><div>外で待っている：${who(b.queue)}</div>`
        : `<div class="now">いまは お休み。夏になると ひらきます（維持費も夏だけ）</div>`;
    } else if (b.type === 'super' || b.type === 'planetarium' || b.type === 'petshop' || b.type === 'stand' || b.type === 'aquarium') {
      const V = CONFIG[b.type];
      const inside = b.seats.filter(Boolean);
      const unit = b.type === 'planetarium' ? `${seatCount(b)}席` : b.type === 'stand' ? '持ち帰り' : `一度に ${seatCount(b)}人 まで`;
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">${unit}。${fmt(V.open)}から${fmt(V.close)}まで</div>`;
      html += `<div class="now">${{ planetarium: '星を見ている', stand: '注文している', aquarium: '魚を見ている' }[b.type] || '買い物中'}：${who(inside)}</div>`;
      html += `<div>外で待っている：${who(b.queue)}</div>`;
    } else if (b.type === 'ski') {
      // スキー場（D318）：冬だけ開く
      const V = CONFIG.ski;
      const winter = isWinter(state);
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">一度に ${seatCount(b)}人。冬だけ ${fmt(V.open)}から${fmt(V.close)}まで</div>`;
      html += winter
        ? `<div class="now">滑っている：${who(b.seats.filter(Boolean))}</div><div>外で待っている：${who(b.queue)}</div>`
        : `<div class="now">いまは お休み。冬になると 山が雪で白くなり、ひらきます（維持費も冬だけ）</div>`;
    } else if (b.type === 'kinder') {
      const K = CONFIG.kinder;
      html = `<h3>${labelOf(state, b)} Lv${b.level}</h3><div class="sub">${seatCount(b)}人まで。朝 ${fmt(K.open)}から${fmt(K.close)}まで。1人 ${K.fee} Coin</div>`;
      html += `<div class="now">いま：${who(b.seats.filter(Boolean))}</div>`;
      html += `<div>今日 来た子：${state.today.kinder?.went || 0}人</div>`;
    } else if (b.type === 'shop') {
      const max = CONFIG.shop.levels[b.level - 1].stock;
      const here = everyone(state).filter((r) => r.state === 'SHOP' && r.destId === b.id).map((r) => r.id);
      html = `<h3>${shopLabel(state, b)} Lv${b.level}</h3><div class="sub">今日の品物 ${b.stock} / ${max}個。毎朝 入荷。${fmt(CONFIG.shop.open)}から${fmt(CONFIG.shop.close)}まで</div>`;
      html += `<div class="now">見ている人：${who(here)}</div>`;
    } else if (b.type === 'park') {
      const here = state.residents.filter((r) => r.state === 'PARK' && r.destId === b.id).map((r) => r.id);
      html = `<h3>公園</h3><div class="sub">${b.roof ? '東屋がある' : '屋根はない'}</div>`;
      html += `<div class="now">いま：${who(here)}</div>`;
    } else if (b.type !== 'house') {
      // 知らない種類の建物を「家」と出さない（D310）
      html = `<h3>${labelOf(state, b)}</h3>`;
    } else {
      const living = state.residents.filter((r) => r.homeId === b.id && r.state !== 'PENDING').map((r) => r.id);
      const free = capacityOf(b) - state.residents.filter((r) => r.homeId === b.id).length;
      const steps = nearestCafeSteps(state, b);
      const kind = { 1: '家', 2: '2階建ての家', 3: 'アパート' }[b.level || 1];
      html = `<h3>${kind}</h3><div class="sub">${free > 0 ? `あと ${free}人 住める` : '満室'}${steps !== null ? `。カフェまで道で ${steps}マス` : ''}</div>`;
      html += `<div class="now">住んでいる：${who(living)}</div>`;
      if (wantsRoomHouses(state).includes(b.id)) html += `<div class="card-warn">この家の家族は、もう少し広い家に住みたいようです</div>`;
    }
  }
  if (selected.kind === 'building') html += `<button id="btn-move" class="card-btn" type="button">${ICONS.move}動かす</button>`;
  if (selected.kind === 'building' && buildingById(state, selected.id)?.type === 'house') {
    // 家を広げる（D303）。押せないときも出しておく（理由が分かるように）
    const h = buildingById(state, selected.id);
    const cost = houseUpgradeCost(h);
    const next = CONFIG.house.levels[h.level || 1];
    html += cost === null
      ? `<div class="card-note">これ以上は広げられない（${capacityOf(h)}人まで）</div>`
      : `<button id="btn-upgrade" class="card-act" type="button" ${state.coin < cost ? 'disabled' : ''}>${ICONS.house_up}${next.level === 3 ? 'アパートにする' : '2階建てにする'}（${next.capacity}人まで）<span class="cost">${ICONS.coin}${cost.toLocaleString()}</span></button>` +
        (state.coin < cost ? `<div class="card-note">Coin が あと ${(cost - state.coin).toLocaleString()} 足りません</div>` : '');
  }
  delete card.dataset.stray;
  // 前に書いた文字列と比べる（SVG は innerHTML で読み直すと書き方が変わり、毎コマ描き直してボタンが押せなくなる）
  if (lastCardHtml !== html || !card.innerHTML) {
    card.innerHTML = html;
    lastCardHtml = html;
  }
}

$('card').addEventListener('click', (ev) => {
  if (ev.target.closest('#btn-rename-open')) {
    selected = { ...selected, renaming: true };
    renderCard();
    $('res-name')?.focus();
    return;
  }
  if (ev.target.closest('#btn-rename')) {
    const res = nameResident(state, selected.id, $('res-name').value);
    toast(res.message);
    if (res.ok) {
      selected = { kind: 'resident', id: selected.id };
      delete $('card').dataset.stray;
      renderCard();
      save();
    }
    return;
  }
  const adBoat = ev.target.closest('#btn-adboat');
  if (adBoat) {
    const id = adBoat.dataset.port;
    showRewardedAd({
      onReward: () => {
        const res = callExtraBoat(state, id);
        toast(res.message);
        renderCard();
        save();
      },
    });
    return;
  }
  if (ev.target.closest('#btn-fish')) {
    select(null);
    openFishing({
      getState: () => state,
      onChange: () => save(),
      close: () => save(),
    });
    return;
  }
  if (ev.target.closest('#btn-upgrade')) {
    const res = applyAction(state, 'house_upgrade', { id: selected?.id });
    toast(res.message);
    if (res.ok) {
      renderCard();
      save();
    }
    return;
  }
  if (ev.target.closest('#btn-move')) {
    const b = buildingById(state, selected?.id);
    if (b) startMoving(b);
    return;
  }
  const nb = ev.target.closest('#btn-baby');
  if (nb) {
    const res = nameBaby(state, nb.dataset.baby, $('baby-name').value);
    toast(res.message);
    select(null);
    save();
    return;
  }
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
  const use = ev.target.closest('[data-skin-use]');
  if (use) {
    chooseHouseSkin(use.dataset.skinUse);
    setHouseSkin(use.dataset.skinUse);
    return openBuild();
  }
  const buySkin = ev.target.closest('[data-skin-buy]');
  if (buySkin) {
    const id = buySkin.dataset.skinBuy;
    buy({
      id: `house:${id}`,
      title: `家の色「${HOUSE_SKINS[id].name}」`,
      price: SKIN_PRICE,
      onDone: () => {
        chooseHouseSkin(id);
        setHouseSkin(id);
        toast(`家の色を「${HOUSE_SKINS[id].name}」にしました`);
        openBuild();
      },
    });
    return;
  }
  const home = ev.target.closest('[data-house]');
  if (home) {
    // その家へ移動して、家のカードを開く
    const h = buildingById(state, home.dataset.house);
    $('sheet').hidden = true;
    if (h) {
      renderer.focus((h.c + 0.5) * T, (h.r + 0.5) * T);
      select({ kind: 'building', id: h.id });
    }
    return;
  }
  const adBonus = ev.target.closest('[data-ad="bonus"]');
  if (adBonus) {
    showRewardedAd({
      onReward: () => {
        const res = claimDailyBonus(state);
        toast(res.message);
        adBonus.remove();
        save();
      },
    });
    return;
  }
  const tab = ev.target.closest('[data-tab]');
  if (tab) {
    buildTab = tab.dataset.tab;
    return openBuild();
  }
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const action = actionsFor(state).find((a) => a.id === btn.dataset.action);
  if (!action) return;
  if (action.place) {
    $('sheet').hidden = true;
    return startPlacing(action);
  }
  if (action.pick === 'house') {
    $('sheet').hidden = true;
    return startPicking(action);
  }
  const res = applyAction(state, action.id);
  toast(res.message);
  if (res.ok) {
    $('sheet').hidden = true;
    // 広げた土地・つくった港を見せる
    const area = action.id.startsWith('expand:') || action.id.startsWith('harbor:') ? areaById(action.id.split(':')[1]) : null;
    if (area) renderer.focus(area.cx, area.cy);
    save();
  }
});

$('btn-build').addEventListener('click', () => openBuild());

// 見た目（D314）：家の色。買ったものは島をやり直しても残る
const SKIN_PRICE = '¥160（仮）';
function miniHouse(skin) {
  return `<svg viewBox="0 0 64 30" width="64" height="30" aria-hidden="true">${[0, 1, 2]
    .map((k) => {
      const x = 4 + k * 20;
      const roof = skin.roofs[k % skin.roofs.length];
      const wall = skin.walls[k % skin.walls.length];
      return `<rect x="${x}" y="13" width="16" height="14" rx="1.5" fill="${wall}" stroke="rgba(61,90,128,.25)"/><path d="M${x - 2} 14 L${x + 8} 5 L${x + 18} 14 Z" fill="${roof}"/><rect x="${x + 6}" y="19" width="4" height="8" rx="2" fill="${skin.door}"/>`;
    })
    .join('')}</svg>`;
}
function lookHtml() {
  const now = chosenHouseSkin();
  const rows = Object.entries(HOUSE_SKINS)
    .map(([id, skin]) => {
      const key = `house:${id}`;
      const btn = now === id
        ? '<span class="skin-now">使っている</span>'
        : owns(key)
          ? `<button class="skin-use" type="button" data-skin-use="${id}">使う</button>`
          : canBuy()
            ? `<button class="skin-buy" type="button" data-skin-buy="${id}">${SKIN_PRICE}</button>`
            : '<span class="skin-now">準備中</span>';
      return `<div class="skin-row">${miniHouse(skin)}<span class="skin-name">${skin.name}</span>${btn}</div>`;
    })
    .join('');
  return `<p class="lead">家の屋根・壁・戸の色。島の家が みんな変わる。買った色は、島をやり直しても残る</p><div class="skins">${rows}</div>`;
}

// 住民の一覧（D311・ご家族の声「どの家に誰が住んでいるか分かると見やすい」「その家をタップすると そこへジャンプ」）
const HOUSE_KIND = { 1: '家', 2: '2階建て', 3: 'アパート' };
function openResidents() {
  if (placing) return;
  const living = state.residents.filter((r) => r.state !== 'PENDING');
  const coming = state.residents.length - living.length;
  const want = new Set(wantsRoomHouses(state));
  // 北から南へ、西から東へ
  const list = houses(state).slice().sort((a, b) => a.r - b.r || a.c - b.c);
  const rows = list.map((h) => {
    const here = state.residents.filter((r) => r.homeId === h.id);
    const names = here
      .map((r) => {
        const tag = r.state === 'PENDING' ? '（今日 引っ越してくる）' : r.age === 'baby' ? '（赤ちゃん）' : r.age === 'kid' ? '（子ども）' : '';
        return `<span>${dot(r)}${r.name}<i class="tag">${tag}</i></span>`;
      })
      .join('');
    return `<button class="home-row" type="button" data-house="${h.id}">${ICONS.house_build}
      <span class="body"><span class="top">${HOUSE_KIND[h.level || 1]}・${placeLabel(h)}<span class="n">${here.length} / ${capacityOf(h)}人</span></span>
      <span class="who">${names || '<i class="tag">空き家</i>'}</span>
      ${want.has(h.id) ? '<span class="warn">もう少し広い家に住みたいようです</span>' : ''}</span>
      <span class="go">›</span></button>`;
  });
  const sub = `家 ${list.length}軒${coming ? `・今日 ${coming}人 引っ越してくる` : ''}`;
  openSheet(`<h2>島の人たち（${living.length}人）</h2><p class="lead">${sub}。家を押すと、その家へ</p><div class="homes">${rows.join('')}</div>`);
}
$('hud-pop').addEventListener('click', () => openResidents());

// つくる：「新しく建てる」と「広げる」のタブ（D296）。新しく建てるものは ほぼ一定、広げるものは建物の数だけ増える
let buildTab = 'new';
// 「新しく建てる」「広げる」「島」（島を広げる・港を増やす・D298）
const tabOf = (a) => a.tab || (a.place ? 'new' : 'grow');

function openBuild(focusId) {
  if (placing) return;
  const all = actionsFor(state);
  if (focusId) {
    const target = all.find((a) => a.id.startsWith(focusId));
    if (target) buildTab = tabOf(target);
  }
  const list = all.filter((a) => tabOf(a) === buildTab);
  // 建てられるものを上に、まだひらいていないものは下に
  list.sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
  const items = list
    .map((a) => {
      const short = a.cost - state.coin;
      return `<button class="action" type="button" data-action="${a.id}" ${short > 0 || a.locked ? 'disabled' : ''}>
        ${ICONS[a.icon]}
        <span class="text">${a.title}<span class="detail">${a.detail}</span></span>
        <span><span class="cost">${ICONS.coin}${a.cost.toLocaleString()}</span>${short > 0 && !a.locked ? `<span class="need">あと ${short.toLocaleString()}</span>` : ''}</span>
      </button>`;
    })
    .join('');
  const count = (tab) => all.filter((a) => tabOf(a) === tab && !a.locked).length;
  const badge = (tab) => (count(tab) ? `<span class="n">${count(tab)}</span>` : '');
  const tabs = `<div class="tabs" role="tablist">
    <button type="button" role="tab" data-tab="new" aria-selected="${buildTab === 'new'}">建てる</button>
    <button type="button" role="tab" data-tab="grow" aria-selected="${buildTab === 'grow'}">広げる${badge('grow')}</button>
    <button type="button" role="tab" data-tab="island" aria-selected="${buildTab === 'island'}">島${badge('island')}</button>
    <button type="button" role="tab" data-tab="look" aria-selected="${buildTab === 'look'}">見た目</button>
  </div>`;
  if (buildTab === 'look') return openSheet(`<h2>つくる</h2>${tabs}${lookHtml()}`);
  const empty = { new: 'いま建てられるものはありません', grow: 'まだ広げられるものはありません', island: '島は これ以上 広げられません' }[buildTab];
  openSheet(`<h2>つくる</h2>${tabs}${items || `<p class="lead">${empty}</p>`}`);
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
  openSheet(`<h2>島の日記</h2>${bonusRow()}${entries ? `<div class="notebook">${entries}</div>` : '<p class="lead">まだ日記はありません。1日が終わると、ここに届きます。</p>'}`);
});

function showMorning(entries) {
  for (const e of entries) e.read = true;
  tutorial('read_diary');
  $('diary-dot').hidden = true;
  openSheet(`<div class="morning">${ICONS.sunrise}<h2>おはようございます</h2><p class="lead">昨日の島では、こんなことがありました</p></div>${bonusRow()}<div class="notebook">${entries.map(entryHtml).join('')}</div>`);
}

// ---------------------------------------------------------------- 建てる場所を選ぶ

function startPlacing(action) {
  const spots = placements(action.place, state.buildings);
  if (spots.length === 0) return toast('建てられる場所がありません');
  beginPlacing({ action, type: action.place }, spots, `${action.title}：明るいところをタップ`, 'ここに建てる');
}

// 建物を動かす（D299）。建てるときと同じ画面で、行き先を選ぶ
const NAME_OF = { house: '家', park: '公園' };
function startMoving(b) {
  const spots = movePlaces(state, b.id);
  if (spots.length === 0) return toast('動かせる場所がありません');
  const name = NAME_OF[b.type] || labelOf(state, b);
  beginPlacing({ action: { title: `${name}を動かす`, cost: 0 }, type: b.type, move: b.id, from: { c: b.c, r: b.r } }, spots, `${name}を動かす：明るいところをタップ`, 'ここに動かす');
}

// 広げる家を島の上で選ぶ（D303）
function startPicking(action) {
  const spots = houses(state).filter((h) => houseUpgradeCost(h) !== null).map((h) => ({ c: h.c, r: h.r, id: h.id }));
  if (spots.length === 0) return toast('広げられる家がありません');
  beginPlacing({ action, type: 'house', pick: spots }, spots, '家を広げる：明るい家をタップ', '広げる');
}

function beginPlacing(p, spots, title, okLabel) {
  const cells = new Set();
  for (const s of spots) for (const t of footprint(p.type, s.c, s.r)) cells.add(t);
  placing = { ...p, cells: [...cells], ghost: null, okLabel };
  select(null);
  $('place-title').textContent = title;
  $('place-ok').disabled = true;
  $('place-ok').textContent = okLabel;
  $('placebar').hidden = false;
  $('bar').hidden = true;
  document.body.classList.add('placing');
}

function tapWhilePlacing(clientX, clientY) {
  if (placing.pick) {
    // 広げる家を選ぶ：屋根を押しても選べるように、島の上の建物の当たり判定を使う（D310）
    const hb = buildingAt(renderer.toWorld(clientX, clientY));
    const h = hb && placing.pick.find((x) => x.id === hb.id);
    if (!h) {
      placing.ghost = null;
      $('place-ok').disabled = true;
      return toast('明るい家をタップしてください');
    }
    const cost = houseUpgradeCost(hb);
    placing.ghost = h;
    $('place-ok').disabled = state.coin < cost;
    $('place-ok').innerHTML = state.coin < cost ? `Coin が あと ${(cost - state.coin).toLocaleString()} 足りません` : `広げる ${ICONS.coin}${cost.toLocaleString()}`;
    return;
  }
  const { c, r } = renderer.tileAt(clientX, clientY);
  const s = SIZES[placing.type];
  // タップしたマスが建物の真ん中に来る置き方を優先し、だめなら そのマスを含む置き方を探す
  const tries = [[c - Math.floor((s.w - 1) / 2), r - Math.floor((s.h - 1) / 2)]];
  for (let dr = 0; dr < s.h; dr++) for (let dc = 0; dc < s.w; dc++) tries.push([c - dc, r - dr]);
  if (placing.pick) {
    const h = placing.pick.find((x) => x.c === c && x.r === r);
    if (!h) {
      placing.ghost = null;
      $('place-ok').disabled = true;
      return toast('明るい家をタップしてください');
    }
    const cost = houseUpgradeCost(buildingById(state, h.id));
    placing.ghost = h;
    $('place-ok').disabled = state.coin < cost;
    $('place-ok').innerHTML = `広げる ${ICONS.coin}${cost.toLocaleString()}`;
    return;
  }
  const fits = ([cc, rr]) => (placing.move ? canMoveTo(state, placing.move, cc, rr) : canPlace(placing.type, cc, rr, state.buildings));
  const ok = tries.find(fits);
  if (!ok) {
    placing.ghost = null;
    $('place-ok').disabled = true;
    return toast(placing.move ? 'そこには動かせません' : 'そこには建てられません');
  }
  placing.ghost = { c: ok[0], r: ok[1] };
  if (placing.move) {
    $('place-ok').disabled = false;
    $('place-ok').textContent = placing.okLabel;
    return;
  }
  $('place-ok').disabled = state.coin < placing.action.cost;
  $('place-ok').innerHTML = `${placing.okLabel} ${ICONS.coin}${placing.action.cost.toLocaleString()}`;
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
  if (placing.pick) {
    const res = applyAction(state, 'house_upgrade', { id: placing.ghost.id });
    toast(res.message);
    if (res.ok) {
      endPlacing();
      save();
    }
    return;
  }
  if (placing.move) {
    const res = moveBuilding(state, placing.move, placing.ghost);
    toast(res.message);
    if (res.ok) {
      endPlacing();
      save();
    }
    return;
  }
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
    // チュートリアルのあとは「次の目標」だけを小さく出す（段階的な解放・D295）
    const g = nextGoal(state);
    if (!g) {
      el.hidden = true;
      return;
    }
    el.innerHTML = `<div class="quest-head"><b>目標：${g.goal}</b><span class="reward">${g.now} / ${g.need}${g.unit}</span>${FOLD}</div><p>${g.what}が ${g.need}${g.unit} になると、${g.note}</p>`;
    el.hidden = false;
    applyFold();
    return;
  }
  if (step.id === 'busy_cafe' && busyStage === null) {
    el.hidden = true;
    return;
  }
  const reward = step.reward ? `<span class="reward">${ICONS.coin}+${step.reward}</span>` : '';
  let html = `<div class="quest-head"><b>${step.title}</b>${reward}${FOLD}</div>`;
  if (step.id === 'busy_cafe' && busyStage === 'ask') {
    html += `<p>${step.ask}</p><div class="choices">${step.choices.map((c) => `<button type="button" data-choice="${c.id}">${c.label}</button>`).join('')}</div>`;
  } else {
    html += `<p>${step.body}</p>`;
  }
  if (step.id !== 'busy_cafe') html += `<button class="skip" type="button">とばす</button>`;
  el.innerHTML = html;
  el.hidden = false;
  applyFold();
}

// やること・目標の紙は たためる（D310：「チュートリアルが邪魔」）。たたむと1行だけ。開いた・たたんだは覚えておく
const FOLD_KEY = 'til.grid.questFold.v1';
const FOLD = '<button class="fold" type="button" aria-label="たたむ・ひらく"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
let questFolded = false;
try {
  questFolded = localStorage.getItem(FOLD_KEY) === '1';
} catch {
  questFolded = false;
}
function applyFold() {
  $('quest').classList.toggle('folded', questFolded);
}

$('quest').addEventListener('click', (ev) => {
  if (ev.target.closest('.fold') || (questFolded && ev.target.closest('.quest-head'))) {
    questFolded = !questFolded;
    try {
      localStorage.setItem(FOLD_KEY, questFolded ? '1' : '0');
    } catch {
      /* 保存できなくても たためる */
    }
    applyFold();
    return;
  }
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
    <button data-dbg="unlock">釣り堀・スーパー・プラネタリウムをひらく</button>
    <button data-dbg="pets">ペットを全部 迷い込ませる</button>
    <button data-dbg="expand">島を広げられるようにする（山の島の橋も）</button>
    <button data-dbg="wave1">会社・水族館・プールをひらく</button>
    <button data-dbg="family">結婚と出産を早める（留守2回で子ども）</button>
    <button data-dbg="reset">最初からやり直す</button>
    <pre>画面をつけたまま：${{ on: 'オン', off: 'オフ', unsupported: 'この端末では使えない' }[awakeStatus()]}</pre>
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
    adoptAll: () => state.pets.filter((p) => !p.adopted).forEach((p) => adoptPet(state, p.id, '')),
    wakePets: () => state.pets.forEach((p, i) => { p.state = 'SIT'; p.until = state.t + 999; p.tx = p.x = (OX + 8) * T + 20 + i * 26; p.ty = p.y = (OY + 11) * T + 12; p.facing = i % 2 ? -1 : 1; }),
    kids: () => state.residents.filter((r) => r.age).map((r) => ({ name: r.name, age: r.age, state: r.state, visible: r.visible, ...renderer.toClient(r.x, r.y - 10) })),
    building: (type) => state.buildings.filter((b) => b.type === type).map((b) => renderer.toClient((b.c + SIZES[b.type].w / 2) * T, (b.r + SIZES[b.type].h / 2) * T)),
    pier: (id) => renderer.toClient(center(PIERS[id]).x, center(PIERS[id]).y),
    focusTile: (c, r) => renderer.focus((c + 0.5) * T, (r + 0.5) * T),
    focusPier: (id) => renderer.focus(center(PIERS[id]).x + 40, center(PIERS[id]).y),
    fishing: () => fishingNow(),
    // スキー場の絵を見るため：席を住民で埋める（D318）
    advance: (m) => step(state, m),
    fillSki: () => state.buildings.filter((b) => b.type === 'ski').forEach((b) => b.seats.forEach((_, k) => (b.seats[k] = state.residents[k % state.residents.length].id))),
    markRoom: () => {
      const h = houses(state).find((x) => state.residents.filter((r) => r.homeId === x.id).length >= capacityOf(x));
      if (h) state.wantsRoom = [h.id];
      return h && renderer.toClient((h.c + 0.5) * T, (h.r + 0.5) * T);
    },
    zoom: (f) => renderer.zoomAt(f, innerWidth / 2, innerHeight / 2),
    dogState: () => state.pets.find((p) => p.kind === 'dog')?.state,
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
    if (k === 'pets') {
      // 迷い込む日時を今日の今にして、まだ来ていない子を全部 呼ぶ
      for (const kind of Object.keys(CONFIG.pets)) CONFIG.pets[kind] = { ...CONFIG.pets[kind], day: 1, clock: 0 };
    }
    if (k === 'expand') {
      unlockNow(state, 'expand');
      unlockNow(state, 'bridge');
      renderQuest();
    }
    if (k === 'wave1') {
      for (const id of ['pool', 'aquarium', 'company']) unlockNow(state, id);
      renderQuest();
    }
    if (k === 'family') {
      // 名前のある独身の2人を仲良しにして、結婚・出産・成長の日数を0にする
      const two = state.residents.filter((r) => !r.generic && !r.spouseId && !r.age).slice(0, 2);
      if (two.length === 2) state.affinity[[two[0].id, two[1].id].sort().join('|')] = 9999;
      Object.assign(CONFIG.family, { marryChance: 1, minDay: 0, birthAfterDays: 0, babyDays: 1 });
    }
    if (k === 'unlock') {
      unlockNow(state, 'port');
      unlockNow(state, 'pond');
      unlockNow(state, 'super');
      unlockNow(state, 'planetarium');
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
// 画面の上の表示（日付・目標の紙）の高さだけ、カメラが島を下げられるようにする（D323）
function measureTopInset() {
  const q = $('quest');
  const el = q.hidden ? $('hud') : q;
  renderer.setTopInset(el.getBoundingClientRect().bottom - $('island').getBoundingClientRect().top + 8);
}
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(measureTopInset);
  ro.observe($('quest'));
  ro.observe($('hud'));
}
window.addEventListener('resize', measureTopInset);
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
// 島のテーマ（D312）は季節で自動に変わる（D313）。URL の ?theme= があれば、そちらを見本として使う
const THEME_PARAM = new URLSearchParams(location.search).get('theme');
let shownTheme = null;
function syncTheme() {
  const id = THEME_PARAM || seasonOf(state).id;
  if (id !== shownTheme) {
    setTheme(id);
    shownTheme = id;
  }
}
syncTheme();
$('pop-icon').innerHTML = ICONS.people;
document.querySelector('#btn-build .i').innerHTML = ICONS.build;
document.querySelector('#btn-diary .i').innerHTML = ICONS.diary;
setupKeepAwake();
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

