// あなたの運動（ミニゲーム・D373）。ビーチバレー場・サーフィンの浜・カーリング場・アイスホッケー場のカードの「あなたも遊ぶ」から開く。
//
// どれも「タイミングで押す」だけ。子どもも遊べる。遊ぶのは何回でも。
// その島のお金が出るのは 腕のときだけ（島ごとに1日3回まで・sim.js の playSport）：
//   ビーチバレー（ラリー）   … 球が足もとの輪に来たら押す。続いた回数（8回で お金）
//   サーフィン               … 波が いちばん高くなったところで押す。5本のうち乗れた数（4本で）
//   カーリング               … 力 → 向き の順に押して止める。3投の点（6点で）
//   アイスホッケー（シュート）… キーパーの いないところを押す。5本のうち入った数（4本で）
// 判定は ここの関数（test から呼べる）、お金は sim.js が決める。紙の大きさは どのゲームも同じ（D306）

import { playSport, sportLeft, gameCoin, moneyOf } from './sim.js';
import { CONFIG } from './config.js';

const SIZE = 280;
const C = { ink: '#3d5a80', white: '#ffffff', red: '#e56b6f', mustard: '#f2b84b', sky: '#62b6cb', muted: 'rgba(61,90,128,0.45)' };

// ---------------------------------------------------------------- 判定（test から呼ぶ）

// ラリー：球と輪のずれ（px）。輪の中なら返せる。続くほど 輪が せまくなる
export const VOLLEY = { hitY: 222, zone: 20, minZone: 11 };
export const volleyHit = (ballY, rally) => Math.abs(ballY - VOLLEY.hitY) <= Math.max(VOLLEY.minZone, VOLLEY.zone - rally);

// サーフィン：波の高さ（0〜1）。いちばん高いところ（0.86 より上）で押せたら乗れる
export const SURF = { waves: 5, ride: 0.86 };
export const surfRide = (h) => h >= SURF.ride;

// カーリング：石の止まった場所 → 点。ハウス（的）の まんなかからの近さ
export const CURL = { cx: 140, cy: 62, rings: [12, 24, 38], start: 250 };
export function curlPoints(x, y) {
  const d = Math.hypot(x - CURL.cx, y - CURL.cy);
  return d <= CURL.rings[0] ? 3 : d <= CURL.rings[1] ? 2 : d <= CURL.rings[2] ? 1 : 0;
}
// 力（0〜1）と向き（−1〜1）→ 止まる場所。力 0.82 くらいで ちょうど まんなか
export const curlStop = (power, dir) => ({ x: CURL.cx + dir * 70, y: CURL.start - power * ((CURL.start - CURL.cy) / 0.82) });

// シュート：ねらった場所と、球が着いたときの キーパーの場所。キーパーの手の届く はばの外なら入る
export const HOCKEY = { shots: 5, reach: 30, goalL: 50, goalR: 230, goalY: 44 };
export const hockeyGoal = (aimX, keeperX) => aimX >= HOCKEY.goalL && aimX <= HOCKEY.goalR && Math.abs(aimX - keeperX) > HOCKEY.reach;

// ---------------------------------------------------------------- 画面

const TITLE = { volley: 'ビーチバレー', surf: 'サーフィン', curling: 'カーリング', hockey: 'アイスホッケー' };
const UNIT = { volley: '回', surf: '本', curling: '点', hockey: '本' };
const HOW = {
  volley: '球が 足もとの輪に来たら 押す',
  surf: '波が いちばん高くなったら 押す',
  curling: '力 → 向き の順に 押して止める',
  hockey: 'キーパーの いないところを 押す',
};

let cur = null;
export const sportOpen = () => !!cur;
export const sportNow = () => (cur ? { game: cur.game, phase: cur.phase, score: cur.score } : null); // 画面テスト用（?debug）

export function openSport({ game, getState, onChange, close: onClose }) {
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
    root.querySelector('.game-left').textContent = left > 0 ? `今日の ${money()}（${gameCoin(state, CONFIG.sports.coin)}）：あと ${left}回` : `今日の ${money()} は おしまい`;
  };
  const again = (show) => (root.querySelector('.game-again').hidden = !show);
  const later = (fn, ms) => cur.timers.push(setTimeout(() => cur && fn(), ms));
  const loop = (fn) => {
    const tick = (now) => {
      if (!cur) return;
      fn(now);
      cur.raf = requestAnimationFrame(tick);
    };
    cur.raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(cur.raf);
    for (const t of cur.timers) clearTimeout(t);
    cur.timers = [];
  };

  function finish(text) {
    stop();
    cur.phase = 'done';
    const res = playSport(getState(), game, { score: cur.score });
    const need = `${CONFIG.sports.skill[game]}${UNIT[game]}`;
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

  // ---------------------------------------------------------------- ラリー（ビーチバレー）
  // 球は 相手の手（上）から 足もとの輪（下）へ山なりに来る。返すたびに 少し速くなる
  const V = { from: 38, dur: 1300, t0: 0, x0: 140, x1: 140, up: false };
  function volleyServe(now) {
    V.t0 = now;
    V.up = false;
    V.x0 = V.x1;
    V.x1 = 80 + Math.random() * 120;
    V.dur = Math.max(560, 1300 * Math.pow(0.93, cur.score));
  }
  function volleyBall(now) {
    const k = Math.min(1.25, (now - V.t0) / V.dur);
    const y = V.up ? VOLLEY.hitY - (VOLLEY.hitY - V.from) * k : V.from + (VOLLEY.hitY - V.from) * k;
    const x = V.up ? V.x1 + (V.x0 - V.x1) * k : V.x0 + (V.x1 - V.x0) * Math.min(1, k);
    const lift = Math.sin(Math.min(1, k) * Math.PI) * 30;
    return { x, y, lift, k };
  }
  // ---------------------------------------------------------------- サーフィン
  const S = { t0: 0, dur: 1500, wave: 0, rode: [] };
  const surfHeight = (now) => Math.max(0, Math.sin(Math.min(1, (now - S.t0) / S.dur) * Math.PI));
  // ---------------------------------------------------------------- カーリング
  const K = { step: 'power', power: 0, dir: 0, t0: 0, stones: [], slide: null };
  const swing = (now, period) => (Math.sin(((now - K.t0) / period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  // ---------------------------------------------------------------- シュート（アイスホッケー）
  const H = { shot: 0, fly: null, results: [], speed: 1 };
  const keeperX = (now) => 140 + Math.sin(now / (520 / H.speed)) * 62 + Math.sin(now / (190 / H.speed)) * 14;

  function start() {
    stop();
    cur.score = 0;
    cur.phase = 'play';
    again(false);
    const now = performance.now();
    if (game === 'volley') {
      V.x1 = 140;
      volleyServe(now);
      msg(HOW.volley);
    } else if (game === 'surf') {
      Object.assign(S, { t0: now + 400, dur: 1500, wave: 0, rode: [] });
      msg(HOW.surf);
    } else if (game === 'curling') {
      Object.assign(K, { step: 'power', t0: now, stones: [], slide: null });
      msg('力：押して止める');
    } else {
      Object.assign(H, { shot: 0, fly: null, results: [], speed: 1 });
      msg(HOW.hockey);
    }
    loop(frame);
  }

  function frame(now) {
    if (game === 'volley') {
      const b = volleyBall(now);
      if (!b.up && b.k >= 1.2) {
        cur.score = cur.score; // 取れなかった
        finish(`ラリー ${cur.score}回`);
        return;
      }
      if (V.up && b.k >= 1) volleyServe(now);
    } else if (game === 'surf') {
      if (now - S.t0 > S.dur) {
        if (S.rode.length === S.wave) S.rode.push(false);
        S.wave += 1;
        if (S.wave >= SURF.waves) {
          finish(`${SURF.waves}本のうち ${cur.score}本 乗れた`);
          return;
        }
        S.t0 = now + 350;
        S.dur = 1500 - S.wave * 90;
      }
    } else if (game === 'curling') {
      if (K.step === 'slide' && now - K.slide.t0 > 1100) {
        K.stones.push(K.slide.to);
        cur.score += curlPoints(K.slide.to.x, K.slide.to.y);
        K.slide = null;
        if (K.stones.length >= 3) {
          finish(`3投で ${cur.score}点`);
          return;
        }
        K.step = 'power';
        K.t0 = now;
        msg(`${K.stones.length + 1}投目　力：押して止める`);
      }
    } else if (H.fly && now - H.fly.t0 > 380) {
      const goal = hockeyGoal(H.fly.x, keeperX(H.fly.t0 + 380));
      H.results.push(goal);
      if (goal) cur.score += 1;
      H.fly = null;
      H.shot += 1;
      H.speed = 1 + H.shot * 0.12;
      msg(goal ? 'ゴール！' : 'とめられた');
      if (H.shot >= HOCKEY.shots) {
        finish(`${HOCKEY.shots}本のうち ${cur.score}本 入った`);
        return;
      }
    }
    draw(now);
  }

  function tap(ev) {
    if (cur.phase === 'ready') return start();
    if (cur.phase !== 'play') return;
    const now = performance.now();
    if (game === 'volley') {
      if (V.up) return;
      const b = volleyBall(now);
      if (volleyHit(b.y, cur.score)) {
        cur.score += 1;
        V.up = true;
        V.t0 = now;
        V.dur = Math.max(520, V.dur * 0.97);
        msg(`ラリー ${cur.score}回`);
      } else finish(b.y < VOLLEY.hitY ? `早かった　ラリー ${cur.score}回` : `ラリー ${cur.score}回`);
    } else if (game === 'surf') {
      if (S.rode.length > S.wave || now < S.t0) return;
      const ok = surfRide(surfHeight(now));
      S.rode.push(ok);
      if (ok) cur.score += 1;
      msg(ok ? '乗れた！' : surfHeight(now) < 0.5 ? 'まだ 波が低い' : 'もう少し 高いところで');
    } else if (game === 'curling') {
      if (K.step === 'power') {
        K.power = swing(now, 1100);
        K.step = 'dir';
        K.t0 = now;
        msg('向き：押して止める');
      } else if (K.step === 'dir') {
        K.dir = swing(now, 900) * 2 - 1;
        K.step = 'slide';
        K.slide = { t0: now, to: curlStop(K.power, K.dir) };
        msg('');
      }
    } else if (!H.fly) {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * SIZE;
      H.fly = { t0: now, x: Math.max(20, Math.min(260, x)) };
    }
  }

  function draw(now) {
    if (game === 'volley') {
      bg('#bfe9f5', '#f7e7cf');
      ctx.fillStyle = '#f7e7cf';
      ctx.fillRect(0, 120, SIZE, 160);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(260, 110);
      ctx.stroke();
      ctx.strokeStyle = C.muted;
      ctx.lineWidth = 1;
      for (let x = 24; x < 260; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 104);
        ctx.lineTo(x, 116);
        ctx.stroke();
      }
      const zone = Math.max(VOLLEY.minZone, VOLLEY.zone - cur.score);
      const b = cur.phase === 'play' ? volleyBall(now) : { x: 140, y: VOLLEY.hitY, lift: 0 };
      ctx.strokeStyle = 'rgba(242,184,75,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(V.up ? V.x1 : V.x1, VOLLEY.hitY + 8, zone + 8, zone / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      dot(b.x, b.y + 10, 5, 'rgba(61,90,128,0.2)');
      dot(b.x, b.y - b.lift, 9, C.white);
      ctx.strokeStyle = C.mustard;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y - b.lift, 9, 0, Math.PI * 2);
      ctx.stroke();
      text(`${cur.score}`, 140, 150, 34, 'rgba(61,90,128,0.25)');
    } else if (game === 'surf') {
      bg('#bfe9f5', '#3fb6c9');
      const h = cur.phase === 'play' && now >= S.t0 ? surfHeight(now) : 0;
      const top = 240 - h * 170;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, 240 - SURF.ride * 170 - 6, SIZE, 12);
      ctx.fillStyle = '#2a9cb6';
      ctx.beginPath();
      ctx.moveTo(0, 280);
      ctx.lineTo(0, 250);
      ctx.quadraticCurveTo(120, 250, 170, top);
      ctx.quadraticCurveTo(205, top - 18, 230, top + 20);
      ctx.quadraticCurveTo(250, 250, 280, 250);
      ctx.lineTo(280, 280);
      ctx.fill();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(170, top);
      ctx.quadraticCurveTo(205, top - 18, 230, top + 20);
      ctx.stroke();
      const riding = S.rode[S.wave];
      const sx = 150;
      const sy = riding ? top - 4 : 252;
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 4, 16, 3.5, riding ? -0.4 : 0, 0, Math.PI * 2);
      ctx.fill();
      dot(sx, sy - 14, 4.5, '#f3cfb0');
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + 2);
      ctx.lineTo(sx, sy - 9);
      ctx.lineTo(sx + 4, sy + 2);
      ctx.stroke();
      for (let k = 0; k < SURF.waves; k++) dot(96 + k * 22, 24, 6, S.rode[k] === true ? C.mustard : S.rode[k] === false ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)');
    } else if (game === 'curling') {
      bg('#e8f3fa', '#f4f9fc');
      for (const [r, col] of [[CURL.rings[2], '#62b6cb'], [CURL.rings[1], '#ffffff'], [CURL.rings[0], '#e56b6f'], [4, '#ffffff']]) dot(CURL.cx, CURL.cy, r, col);
      ctx.strokeStyle = 'rgba(229,107,111,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(240, 140);
      ctx.stroke();
      const stone = (x, y) => {
        dot(x + 1.5, y + 2, 10, 'rgba(61,90,128,0.2)');
        dot(x, y, 10, '#9aa2aa');
        dot(x, y, 6.5, '#b7bec6');
        ctx.fillStyle = C.red;
        ctx.fillRect(x - 3, y - 7, 6, 5);
      };
      for (const s of K.stones) stone(s.x, s.y);
      if (K.slide) {
        const k = Math.min(1, (now - K.slide.t0) / 1100);
        const e = 1 - (1 - k) * (1 - k);
        stone(CURL.cx + (K.slide.to.x - CURL.cx) * e, CURL.start + (K.slide.to.y - CURL.start) * e);
      } else if (cur.phase === 'play') {
        stone(CURL.cx, CURL.start);
        // 力のメーター（左）・向きの矢印
        const p = K.step === 'power' ? swing(now, 1100) : K.power;
        ctx.fillStyle = 'rgba(61,90,128,0.12)';
        ctx.fillRect(16, 90, 14, 170);
        ctx.fillStyle = K.step === 'power' ? C.mustard : C.muted;
        ctx.fillRect(16, 260 - p * 170, 14, p * 170);
        ctx.fillStyle = C.red;
        ctx.fillRect(12, 260 - 0.82 * 170, 22, 2);
        if (K.step === 'dir') {
          const d = swing(now, 900) * 2 - 1;
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(CURL.cx, CURL.start - 14);
          ctx.lineTo(CURL.cx + d * 40, CURL.start - 60);
          ctx.stroke();
        }
      } else if (cur.phase === 'ready') stone(CURL.cx, CURL.start);
      text(`${cur.score}点`, 240, 250, 16);
    } else {
      bg('#f4f9fc', '#d7e3ec');
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3;
      ctx.strokeRect(HOCKEY.goalL, HOCKEY.goalY - 26, HOCKEY.goalR - HOCKEY.goalL, 30);
      ctx.strokeStyle = 'rgba(61,90,128,0.2)';
      ctx.lineWidth = 1;
      for (let x = HOCKEY.goalL + 10; x < HOCKEY.goalR; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, HOCKEY.goalY - 26);
        ctx.lineTo(x, HOCKEY.goalY + 4);
        ctx.stroke();
      }
      const kx = cur.phase === 'play' ? keeperX(now) : 140;
      ctx.fillStyle = C.ink;
      ctx.fillRect(kx - HOCKEY.reach + 6, HOCKEY.goalY - 2, (HOCKEY.reach - 6) * 2, 10);
      dot(kx, HOCKEY.goalY - 8, 8, '#f3cfb0');
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(kx, HOCKEY.goalY - 10, 8, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(140, 150, 22, 0, Math.PI * 2);
      ctx.stroke();
      let px = 140;
      let py = 240;
      if (H.fly) {
        const k = Math.min(1, (now - H.fly.t0) / 380);
        px = 140 + (H.fly.x - 140) * k;
        py = 240 + (HOCKEY.goalY - 240) * k;
      }
      ctx.fillStyle = '#1f2a36';
      ctx.beginPath();
      ctx.ellipse(px, py, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < HOCKEY.shots; k++) dot(96 + k * 22, 266, 6, H.results[k] === true ? C.mustard : H.results[k] === false ? 'rgba(61,90,128,0.25)' : 'rgba(61,90,128,0.08)');
    }
    if (cur.phase === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
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
