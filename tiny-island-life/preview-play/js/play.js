// 施設のあそび（ミニゲーム・2026-10-18）。プラネタリウム・プール・水族館・小学校・大学・会社のカードの「あなたも遊ぶ」から開く。
//
// 運動（sports.js）と同じく「見て押す」だけ。子どもも遊べる。遊ぶのは何回でも。
// コインが出るのは 腕のときだけで、運動と同じ数え方（sim.js の playSport・島ごとに 合わせて1日3回まで）。
// 施設ごとに3回にすると 施設の数だけ稼げて、日記の売上の見え方が崩れるため：
//   プラネタリウム（流れ星）… 流れ星を押して つかまえる。10こ のうち つかまえた数（7こで コイン）
//   プール（飛び込み）       … くるっと回って 頭が下になったら押す。5回のうち きれいに入った数（4回で）
//   水族館（魚さがし）       … 上の「この魚」と同じ魚を押す。8回のうち みつけた数（6ひきで）
//   小学校（たし算）         … こたえを3つから押す。10問のうち あった数（8問で）
//   大学（おぼえる）         … 光った順に押す。おぼえられた長さ（5こで）
//   会社（書類の仕分け）     … 青い書類は左、赤い書類は右を押す。15まいのうち あった数（12まいで）
// 判定は ここの関数（test から呼べる）、コインは sim.js が決める。紙の大きさは どのゲームも同じ（D306）

import { playSport, sportLeft, gameCoin, moneyOf, dayNow, backAt } from './sim.js';
import { CONFIG } from './config.js';

const SIZE = 280;
const C = { ink: '#3d5a80', white: '#ffffff', red: '#e56b6f', mustard: '#f2b84b', sky: '#62b6cb', sea: '#3aa6b9', green: '#8cc084', sand: '#f2d8a7', skin: '#f3cfb0', muted: 'rgba(61,90,128,0.45)' };

export const PLAY_GAMES = ['planetarium', 'pool', 'aquarium', 'school', 'college', 'company'];

// ---------------------------------------------------------------- 判定（test から呼ぶ）

// 流れ星：押した場所と 星の近さ
export const SHOOT = { stars: 10, r: 30 };
export const starHit = (tx, ty, sx, sy) => Math.hypot(tx - sx, ty - sy) <= SHOOT.r;

// 飛び込み：止めたときの向き（度）。0 = 頭が上、180 = 頭が下。180 から clean 度の中なら きれいに入る
export const DIVE = { dives: 5, clean: 40, spin: 1000, fly: 1600 };
export function diveClean(deg) {
  const a = ((deg % 360) + 360) % 360;
  return Math.abs(a - 180) <= DIVE.clean;
}

// 魚さがし：色3つ × しま あり／なし。押した場所に いちばん近い魚（r の中）
export const FISH = { rounds: 8, per: 4, time: 6000, r: 32, lanes: [112, 152, 192, 232] };
export const sameFish = (a, b) => a.color === b.color && a.stripe === b.stripe;
export function fishAt(fishes, x, y) {
  let best = -1;
  let near = FISH.r;
  fishes.forEach((f, i) => {
    const d = Math.hypot(f.x - x, f.y - y);
    if (d <= near) {
      near = d;
      best = i;
    }
  });
  return best;
}

// たし算：こたえは 2〜10（小1 で習う たし算）。えらぶのは3つ
export const MATH = { questions: 10, time: 7000, max: 10 };
export const CHOICE = { y: 222, xs: [60, 140, 220], r: 34 };
export function mathQuestion(rand = Math.random) {
  const answer = 2 + Math.floor(rand() * (MATH.max - 1));
  const a = 1 + Math.floor(rand() * (answer - 1));
  const near = [answer - 1, answer + 1, answer - 2, answer + 2].filter((n) => n >= 1);
  const pick = [];
  while (pick.length < 2) {
    const n = near.splice(Math.floor(rand() * near.length), 1)[0];
    pick.push(n);
  }
  const choices = [answer, ...pick];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { a, b: answer - a, answer, choices };
}
export const choiceAt = (x, y) => CHOICE.xs.findIndex((cx) => Math.hypot(x - cx, y - CHOICE.y) <= CHOICE.r);

// おぼえる：4まいの板（左上・右上・左下・右下）。2こ から はじめて、1こずつ のびる
export const MEMO = { start: 2, max: 12, w: 104, on: 520, off: 220, pads: [{ x: 30, y: 36 }, { x: 146, y: 36 }, { x: 30, y: 152 }, { x: 146, y: 152 }] };
export const padAt = (x, y) => MEMO.pads.findIndex((p) => x >= p.x && x <= p.x + MEMO.w && y >= p.y && y <= p.y + MEMO.w);

// 書類の仕分け：左半分を押すと青の箱（0）、右半分で赤の箱（1）
export const SORT = { papers: 15, top: 40, land: 196 };
export const sortSide = (x) => (x < SIZE / 2 ? 0 : 1);

// ---------------------------------------------------------------- 画面

const TITLE = { planetarium: '流れ星', pool: '飛び込み', aquarium: '魚さがし', school: 'たし算', college: 'おぼえる', company: '書類の仕分け' };
export const PLAY_TITLE = TITLE;
export const PLAY_UNIT = { planetarium: 'こ', pool: '回', aquarium: 'ひき', school: '問', college: 'こ', company: 'まい' };
const HOW = {
  planetarium: '流れ星を 押して つかまえる',
  pool: 'くるっと回って 頭が下になったら 押す',
  aquarium: '上の魚と 同じ魚を 押す',
  school: 'こたえを 押す',
  college: '光った順に 押す',
  company: '青い書類は 左、赤い書類は 右を押す',
};

let cur = null;
export const playOpen = () => !!cur;
export const playNow = () => (cur ? { game: cur.game, phase: cur.phase, score: cur.score } : null); // 画面テスト用（?debug）

export function openPlay({ game, getState, onChange, close: onClose }) {
  if (cur || !TITLE[game]) return;
  const root = document.createElement('div');
  root.className = 'game sport';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="${TITLE[game]}">
    <div class="game-head"><b>${TITLE[game]}</b><span class="game-left"></span><button class="game-x" type="button" aria-label="とじる">×</button></div>
    <canvas width="${SIZE}" height="${SIZE}"></canvas>
    <p class="game-msg"></p>
    <div class="game-buttons"><button class="game-again" type="button" hidden>もう一度</button></div>
  </div>`;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  cur = { root, ctx, game, phase: 'ready', score: 0, raf: 0, timers: [] };

  const money = () => moneyOf(getState());
  const msg = (text) => (root.querySelector('.game-msg').textContent = text);
  const showLeft = () => {
    const state = getState();
    const left = sportLeft(state);
    root.querySelector('.game-left').textContent = left > 0 ? `${dayNow(state)} の${money()}（${gameCoin(state, CONFIG.sports.coin)}）あと ${left}回` : `${money()}は ${backAt(state)}`;
  };
  const again = (show) => (root.querySelector('.game-again').hidden = !show);
  const loop = (fn) => {
    const tick = (now) => {
      if (!cur) return;
      fn(now);
      if (cur?.phase === 'play') cur.raf = requestAnimationFrame(tick);
    };
    cur.raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(cur.raf);
    for (const t of cur.timers) clearTimeout(t);
    cur.timers = [];
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const r4 = () => Math.floor(Math.random() * 4);

  function finish(text) {
    stop();
    cur.phase = 'done';
    const res = playSport(getState(), game, { score: cur.score });
    const need = `${CONFIG.sports.skill[game]}${PLAY_UNIT[game]}`;
    const extra = res.coin ? `　+${res.coin} ${money()}` : !res.skilled ? `　（${need}で ${money()}）` : '';
    msg(`${text}${extra}`);
    showLeft();
    again(true);
    draw(performance.now());
    onChange?.(res);
  }

  // ---- 絵の部品
  const bg = (top, bottom) => {
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
  };
  const text = (s, x, y, size = 14, color = C.ink) => {
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px "Zen Maru Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  };
  const dot = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const box = (x, y, w, h, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  // 進み具合の点（○ まだ・からし できた・うすい できなかった）
  const dots = (results, total, y, on = C.mustard, off = 'rgba(61,90,128,0.25)', none = 'rgba(61,90,128,0.08)') => {
    const gap = Math.min(22, 220 / total);
    const x0 = 140 - (gap * (total - 1)) / 2;
    for (let k = 0; k < total; k++) dot(x0 + k * gap, y, Math.min(6, gap / 3), results[k] === true ? on : results[k] === false ? off : none);
  };

  // ---------------------------------------------------------------- 流れ星（プラネタリウム）
  // 夜空の小さな星（毎回 同じ並び）
  const SKY = Array.from({ length: 46 }, (_, i) => ({ x: (i * 97) % 271 + 5, y: (i * 61) % 236 + 6, r: i % 5 === 0 ? 1.6 : 1 }));
  const P = { n: 0, star: null, next: 0, results: [] };
  const starPos = (s, now) => {
    if (s.hitAt) return { x: s.hx, y: s.hy };
    const k = (now - s.t0) / s.dur;
    return { x: s.x0 + s.dx * k, y: s.y0 + s.dy * k };
  };
  function newStar(now) {
    const left = Math.random() < 0.5;
    P.star = { t0: now, x0: left ? rand(20, 90) : rand(190, 260), y0: rand(20, 60), dx: (left ? 1 : -1) * rand(110, 160), dy: rand(110, 160), dur: Math.max(1050, 1750 - P.n * 70) };
  }

  // ---------------------------------------------------------------- 飛び込み（プール）
  const D = { n: 0, t0: 0, frozen: null, landed: null, results: [] };
  const WATER = 206;
  const diveK = (now) => (now - D.t0) / DIVE.fly;
  const diveAngle = (now) => (D.frozen !== null ? D.frozen : Math.max(0, now - D.t0 - 120) / DIVE.spin * 360);
  const diverPos = (now) => {
    const k = Math.max(0, Math.min(1, diveK(now)));
    return { x: 74 + 96 * k, y: 80 - 150 * k + (WATER - 80 + 150) * k * k };
  };
  function nextDive(now) {
    D.t0 = now + 700;
    D.frozen = null;
    D.landed = null;
  }

  // ---------------------------------------------------------------- 魚さがし（水族館）
  const KINDS = [0, 1, 2].flatMap((color) => [false, true].map((stripe) => ({ color, stripe })));
  const FISH_COLORS = [C.red, C.mustard, C.white];
  const A = { round: 0, target: null, fishes: [], t0: 0, picked: null, results: [] };
  function newRound(now) {
    const target = KINDS[Math.floor(Math.random() * KINDS.length)];
    const others = KINDS.filter((k) => !sameFish(k, target)).sort(() => Math.random() - 0.5).slice(0, FISH.per - 1);
    const lanes = [...FISH.lanes].sort(() => Math.random() - 0.5);
    A.target = target;
    A.fishes = [target, ...others].map((k, i) => {
      const speed = rand(28, 52) + A.round * 4;
      return { ...k, x0: rand(20, 260), y: lanes[i], vx: Math.random() < 0.5 ? speed : -speed, x: 0 };
    });
    A.t0 = now;
    A.picked = null;
  }
  const moveFish = (now) => {
    for (const f of A.fishes) f.x = ((((f.x0 + (f.vx * (now - A.t0)) / 1000) % 300) + 300) % 300) - 10;
  };

  // ---------------------------------------------------------------- たし算（小学校）
  const M = { n: 0, q: null, t0: 0, picked: null, results: [] };
  function newQuestion(now) {
    M.q = mathQuestion();
    M.t0 = now;
    M.picked = null;
  }

  // ---------------------------------------------------------------- おぼえる（大学）
  const PAD_COLORS = [C.red, C.mustard, C.sky, C.green];
  const Q = { seq: [], show: true, t0: 0, input: 0, flash: null, wrong: null };
  function showSeq(now) {
    Q.show = true;
    Q.t0 = now + 600;
    Q.input = 0;
    msg('よく見て…');
  }
  const litPad = (now) => {
    if (Q.show) {
      const t = now - Q.t0;
      const i = Math.floor(t / (MEMO.on + MEMO.off));
      if (t >= 0 && i < Q.seq.length && t - i * (MEMO.on + MEMO.off) < MEMO.on) return Q.seq[i];
      return -1;
    }
    if (Q.flash && now - Q.flash.at < 260) return Q.flash.p;
    return -1;
  };

  // ---------------------------------------------------------------- 書類の仕分け（会社）
  const W = { n: 0, paper: null, next: 0, results: [] };
  const paperY = (p, now) => SORT.top + (SORT.land - SORT.top) * Math.min(1, (now - p.t0) / p.dur);
  function newPaper(now) {
    W.paper = { color: Math.random() < 0.5 ? 0 : 1, t0: now, dur: Math.max(1000, 2300 - W.n * 90), side: null, at: 0, fromY: 0 };
  }

  function start() {
    stop();
    cur.score = 0;
    cur.phase = 'play';
    again(false);
    const now = performance.now();
    msg(HOW[game]);
    if (game === 'planetarium') Object.assign(P, { n: 0, star: null, next: now + 600, results: [] });
    else if (game === 'pool') {
      Object.assign(D, { n: 0, results: [] });
      nextDive(now);
    } else if (game === 'aquarium') {
      Object.assign(A, { round: 0, results: [] });
      newRound(now);
    } else if (game === 'school') {
      Object.assign(M, { n: 0, results: [] });
      newQuestion(now);
    } else if (game === 'college') {
      Object.assign(Q, { seq: Array.from({ length: MEMO.start }, r4), flash: null, wrong: null });
      showSeq(now);
    } else Object.assign(W, { n: 0, paper: null, next: now + 500, results: [] });
    loop(frame);
  }

  function frame(now) {
    if (game === 'planetarium') {
      const s = P.star;
      if (!s && now >= P.next) {
        if (P.n >= SHOOT.stars) return finish(`${SHOOT.stars}こ のうち ${cur.score}こ つかまえた`);
        newStar(now);
      } else if (s && ((s.hitAt && now - s.hitAt > 420) || (!s.hitAt && now - s.t0 > s.dur))) {
        if (!s.hitAt) P.results.push(false);
        P.star = null;
        P.n += 1;
        P.next = now + 320;
      }
    } else if (game === 'pool') {
      const k = diveK(now);
      if (!D.landed && k >= 1) {
        const ok = D.frozen !== null && diveClean(D.frozen);
        if (D.frozen === null) D.frozen = diveAngle(now);
        D.landed = { at: now, ok };
        D.results.push(ok);
        if (ok) cur.score += 1;
        msg(ok ? 'きれいに入った！' : 'ばしゃーん');
      } else if (D.landed && now - D.landed.at > 950) {
        D.n += 1;
        if (D.n >= DIVE.dives) return finish(`${DIVE.dives}回のうち ${cur.score}回 きれいに入った`);
        nextDive(now);
        msg(HOW.pool);
      }
    } else if (game === 'aquarium') {
      if (!A.picked) moveFish(now);
      if (!A.picked && now - A.t0 > FISH.time) {
        A.picked = { at: now, ok: false, i: -1 };
        A.results.push(false);
        msg('時間切れ');
      } else if (A.picked && now - A.picked.at > 800) {
        A.round += 1;
        if (A.round >= FISH.rounds) return finish(`${FISH.rounds}回のうち ${cur.score}ひき みつけた`);
        newRound(now);
        msg(HOW.aquarium);
      }
    } else if (game === 'school') {
      if (!M.picked && now - M.t0 > MATH.time) {
        M.picked = { at: now, ok: false, i: -1 };
        M.results.push(false);
        msg(`時間切れ　こたえは ${M.q.answer}`);
      } else if (M.picked && now - M.picked.at > (M.picked.ok ? 650 : 1200)) {
        M.n += 1;
        if (M.n >= MATH.questions) return finish(`${MATH.questions}問のうち ${cur.score}問 せいかい`);
        newQuestion(now);
        msg(HOW.school);
      }
    } else if (game === 'college') {
      if (Q.show && now - Q.t0 >= Q.seq.length * (MEMO.on + MEMO.off)) {
        Q.show = false;
        msg('同じ順に 押す');
      }
      if (Q.wrong && now - Q.wrong > 700) return finish(cur.score ? `${cur.score}こ まで おぼえた` : 'もう一度 やってみよう');
    } else {
      const p = W.paper;
      if (!p && now >= W.next) {
        if (W.n >= SORT.papers) return finish(`${SORT.papers}まいのうち ${cur.score}まい あった`);
        newPaper(now);
      } else if (p && p.side === null && now - p.t0 >= p.dur) {
        p.side = -1;
        p.at = now;
        W.results.push(false);
        msg('間に合わなかった');
      } else if (p && p.side !== null && now - p.at > 360) {
        W.paper = null;
        W.n += 1;
        W.next = now + 160;
      }
    }
    draw(now);
  }

  function tap(ev) {
    if (cur.phase === 'ready') return start();
    if (cur.phase !== 'play') return;
    const now = performance.now();
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * SIZE;
    const y = ((ev.clientY - rect.top) / rect.height) * SIZE;
    if (game === 'planetarium') {
      const s = P.star;
      if (!s || s.hitAt) return;
      const at = starPos(s, now);
      if (!starHit(x, y, at.x, at.y)) return;
      Object.assign(s, { hitAt: now, hx: at.x, hy: at.y });
      cur.score += 1;
      P.results.push(true);
      msg('つかまえた！');
    } else if (game === 'pool') {
      const k = diveK(now);
      if (k < 0 || k >= 1 || D.frozen !== null) return;
      D.frozen = diveAngle(now);
    } else if (game === 'aquarium') {
      if (A.picked) return;
      moveFish(now);
      const i = fishAt(A.fishes, x, y);
      if (i < 0) return;
      const ok = sameFish(A.fishes[i], A.target);
      A.picked = { at: now, ok, i };
      A.results.push(ok);
      if (ok) cur.score += 1;
      msg(ok ? 'みつけた！' : 'ちがう魚だった');
    } else if (game === 'school') {
      if (M.picked) return;
      const i = choiceAt(x, y);
      if (i < 0) return;
      const ok = M.q.choices[i] === M.q.answer;
      M.picked = { at: now, ok, i };
      M.results.push(ok);
      if (ok) cur.score += 1;
      msg(ok ? 'せいかい！' : `こたえは ${M.q.answer}`);
    } else if (game === 'college') {
      if (Q.show || Q.wrong) return;
      const p = padAt(x, y);
      if (p < 0) return;
      Q.flash = { p, at: now };
      if (p !== Q.seq[Q.input]) {
        Q.wrong = now;
        msg('ちがった');
        return;
      }
      Q.input += 1;
      if (Q.input === Q.seq.length) {
        cur.score = Q.seq.length;
        if (Q.seq.length >= MEMO.max) {
          Q.wrong = now; // おしまい（ここまで ぜんぶ おぼえた）
          return;
        }
        msg(`${Q.seq.length}こ おぼえた！`);
        Q.seq.push(r4());
        Q.show = true;
        Q.t0 = now + 900;
        Q.input = 0;
        cur.timers.push(setTimeout(() => cur && Q.show && msg('よく見て…'), 700));
      }
    } else {
      const p = W.paper;
      if (!p || p.side !== null) return;
      const side = sortSide(x);
      const ok = side === p.color;
      Object.assign(p, { side, at: now, fromY: paperY(p, now) });
      W.results.push(ok);
      if (ok) cur.score += 1;
      msg(ok ? 'ぴったり' : 'ちがう箱だった');
    }
  }

  // ---------------------------------------------------------------- 絵
  function drawFish(f, x, y, size = 1, face = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(face * size, size);
    ctx.fillStyle = FISH_COLORS[f.color];
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-24, -9);
    ctx.lineTo(-24, 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (f.stripe) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = C.ink;
      ctx.fillRect(-6, -12, 4, 24);
      ctx.fillRect(3, -12, 4, 24);
      ctx.restore();
    }
    dot(9, -3, 2.4, C.ink);
    ctx.restore();
  }

  function draw(now) {
    const playing = cur.phase === 'play';
    if (game === 'planetarium') {
      bg('#1f2f52', '#3d5a80');
      for (const s of SKY) dot(s.x, s.y, s.r, 'rgba(255,255,255,0.7)');
      // ドームのふち（客席）
      ctx.fillStyle = '#2a3d63';
      ctx.beginPath();
      ctx.ellipse(140, 300, 190, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      const s = P.star;
      if (playing && s) {
        const at = starPos(s, now);
        if (s.hitAt) {
          const k = Math.min(1, (now - s.hitAt) / 420);
          ctx.strokeStyle = `rgba(242,184,75,${1 - k})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(at.x, at.y, 8 + k * 26, 0, Math.PI * 2);
          ctx.stroke();
          dot(at.x, at.y, 6, C.mustard);
        } else {
          const len = Math.hypot(s.dx, s.dy);
          const tx = at.x - (s.dx / len) * 46;
          const ty = at.y - (s.dy / len) * 46;
          const g = ctx.createLinearGradient(tx, ty, at.x, at.y);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(1, 'rgba(255,255,255,0.95)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(at.x, at.y);
          ctx.stroke();
          dot(at.x, at.y, 9, 'rgba(255,255,255,0.25)');
          dot(at.x, at.y, 4.5, C.white);
        }
      }
      dots(P.results, SHOOT.stars, 266, C.mustard, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.12)');
    } else if (game === 'pool') {
      bg('#dff1f7', '#bfe9f5');
      // プールの水とレーン
      ctx.fillStyle = C.sky;
      ctx.fillRect(0, WATER, SIZE, SIZE - WATER);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (const ly of [228, 252]) {
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(SIZE, ly);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // 飛び込み台
      ctx.fillStyle = C.ink;
      ctx.fillRect(14, 96, 6, WATER - 96);
      box(10, 92, 80, 7, 3, C.white);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 92, 80, 7);
      // 人
      const k = playing ? diveK(now) : -1;
      const standing = k < 0;
      const at = standing ? { x: 74, y: 80 } : diverPos(now);
      if (!(D.landed && now - D.landed.at > 80)) {
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate((standing ? 0 : diveAngle(now)) * (Math.PI / 180));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-3, 12);
        ctx.moveTo(0, 2);
        ctx.lineTo(3, 12);
        ctx.moveTo(0, -6);
        ctx.lineTo(-5, -16);
        ctx.moveTo(0, -6);
        ctx.lineTo(5, -16);
        ctx.stroke();
        box(-4, -7, 8, 11, 3, C.red);
        dot(0, -11, 4.5, C.skin);
        ctx.restore();
      }
      if (D.landed) {
        const t = Math.min(1, (now - D.landed.at) / 700);
        const big = D.landed.ok ? 0.5 : 1.3;
        ctx.strokeStyle = `rgba(255,255,255,${1 - t})`;
        ctx.lineWidth = 3;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(170 + side * 8 * big, WATER, (6 + t * 14) * big, side < 0 ? Math.PI : 1.5 * Math.PI, side < 0 ? 1.5 * Math.PI : 2 * Math.PI);
          ctx.stroke();
        }
      }
      text('頭が下で きれいに入る', 196, 40, 12, C.muted);
      dots(D.results, DIVE.dives, 268, C.mustard, 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)');
    } else if (game === 'aquarium') {
      bg('#bfe9f5', C.sea);
      // 水草
      ctx.fillStyle = 'rgba(140,192,132,0.8)';
      for (const x of [26, 44, 238, 256]) {
        ctx.beginPath();
        ctx.ellipse(x, 266, 6, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // お題
      box(84, 10, 112, 64, 14, 'rgba(255,255,255,0.9)');
      text('この魚', 140, 24, 12, C.muted);
      if (playing && A.target) drawFish(A.target, 140, 50, 1.1, 1);
      // 時間
      if (playing && !A.picked) {
        const left = Math.max(0, 1 - (now - A.t0) / FISH.time);
        box(84, 80, 112, 5, 2.5, 'rgba(255,255,255,0.35)');
        box(84, 80, 112 * left, 5, 2.5, C.mustard);
      }
      if (playing) {
        A.fishes.forEach((f, i) => {
          drawFish(f, f.x, f.y, 1.25, f.vx > 0 ? 1 : -1);
          if (A.picked && (A.picked.i === i || (sameFish(f, A.target) && !A.picked.ok))) {
            ctx.strokeStyle = sameFish(f, A.target) ? C.mustard : C.red;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 24, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }
      dots(A.results, FISH.rounds, 268, C.mustard, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.2)');
    } else if (game === 'school') {
      bg('#fbf3e4', C.sand);
      // 黒板
      box(18, 16, 244, 132, 10, '#c79a6a');
      box(26, 24, 228, 116, 6, '#4f7a64');
      if (playing && M.q) {
        text(`${M.q.a} ＋ ${M.q.b} ＝ ${M.picked ? M.q.answer : '？'}`, 140, 82, 38, C.white);
        if (!M.picked) {
          const left = Math.max(0, 1 - (now - M.t0) / MATH.time);
          box(40, 160, 200, 6, 3, 'rgba(61,90,128,0.12)');
          box(40, 160, 200 * left, 6, 3, C.mustard);
        }
        CHOICE.xs.forEach((cx, i) => {
          const n = M.q.choices[i];
          const right = M.picked && n === M.q.answer;
          const wrong = M.picked && M.picked.i === i && !M.picked.ok;
          dot(cx + 2, CHOICE.y + 3, CHOICE.r - 4, 'rgba(20,60,70,0.18)');
          dot(cx, CHOICE.y, CHOICE.r - 4, right ? C.mustard : wrong ? C.red : C.white);
          text(String(n), cx, CHOICE.y + 1, 26, right || wrong ? C.white : C.ink);
        });
      } else text('1 ＋ 2 ＝ ？', 140, 82, 38, 'rgba(255,255,255,0.6)');
      dots(M.results, MATH.questions, 268);
    } else if (game === 'college') {
      bg('#f4f9fc', '#e8f3fa');
      const lit = playing ? litPad(now) : -1;
      MEMO.pads.forEach((p, i) => {
        ctx.globalAlpha = lit === i ? 1 : 0.32;
        box(p.x, p.y, MEMO.w, MEMO.w, 18, PAD_COLORS[i]);
        ctx.globalAlpha = 1;
        if (lit === i) {
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, MEMO.w, MEMO.w, 18);
          ctx.stroke();
        }
      });
      if (playing && !Q.show) text(`${Q.input} / ${Q.seq.length}`, 140, 268, 13, C.muted);
      else if (playing) text(`${Q.seq.length}こ`, 140, 268, 13, C.muted);
    } else {
      bg('#f4f9fc', '#e8f3fa');
      // まんなかの線（左と右）
      ctx.strokeStyle = 'rgba(61,90,128,0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(140, 20);
      ctx.lineTo(140, 214);
      ctx.stroke();
      ctx.setLineDash([]);
      // 机と箱
      ctx.fillStyle = '#d9b48f';
      ctx.fillRect(0, 236, SIZE, 44);
      for (const [x, col] of [[20, C.sky], [160, C.red]]) {
        box(x, 214, 100, 28, 6, col);
        box(x + 8, 220, 84, 8, 3, 'rgba(255,255,255,0.4)');
      }
      text('←', 40, 120, 22, 'rgba(98,182,203,0.55)');
      text('→', 240, 120, 22, 'rgba(229,107,111,0.55)');
      const p = playing ? W.paper : null;
      const paper = (x, y, color, alpha = 1) => {
        ctx.globalAlpha = alpha;
        box(x - 22 + 2, y - 28 + 3, 44, 56, 4, 'rgba(20,60,70,0.18)');
        box(x - 22, y - 28, 44, 56, 4, C.white);
        box(x - 22, y - 28, 44, 12, 4, color ? C.red : C.sky);
        ctx.fillStyle = 'rgba(61,90,128,0.3)';
        for (let k = 0; k < 3; k++) ctx.fillRect(x - 14, y - 6 + k * 9, 28, 3);
        ctx.globalAlpha = 1;
      };
      if (p) {
        if (p.side === null) paper(140, paperY(p, now), p.color);
        else {
          const k = Math.min(1, (now - p.at) / 360);
          const tx = p.side === 0 ? 70 : p.side === 1 ? 210 : 140;
          paper(140 + (tx - 140) * k, (p.fromY || SORT.land) + (226 - (p.fromY || SORT.land)) * k, p.color, 1 - k * 0.6);
        }
      }
      text(`${Math.min(W.n + 1, SORT.papers)} / ${SORT.papers}`, 248, 18, 12, C.muted);
      text(`${cur.score}まい`, 36, 18, 12, C.muted);
    }
    if (cur.phase === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(40, 118, 200, 44);
      text('押して はじめる', 140, 140, 16);
    }
  }

  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    tap(ev);
  });
  root.querySelector('.game-again').addEventListener('click', () => start());
  const close = () => {
    stop();
    root.remove();
    cur = null;
    onClose?.();
  };
  root.querySelector('.game-x').addEventListener('click', close);
  root.addEventListener('click', (ev) => ev.target === root && close());

  msg(HOW[game]);
  showLeft();
  draw(performance.now());
}
