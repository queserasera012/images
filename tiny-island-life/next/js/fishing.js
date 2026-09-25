// あなたの釣り（ミニゲーム・D304）。釣り堀のカードの「釣りをする」から開く。
//
// 浮きを見て待つ → 魚がかかると、大きな円がだんだん小さくなる → 円が明るい輪に重なったらタップ。
// 輪の真ん中ぴったりなら「ぴったり」（大物も釣れる）、輪の中なら「よい」、外なら のがす。
// どの魚が釣れるか・Coin は sim.js（landFish）が決める。ここは判定と絵だけ。

import { landFish, fishingLeft } from './sim.js';

export const RING = { r: 30, half: 7, perfect: 3 }; // 輪の真ん中の半径・幅の半分・ぴったりの幅
export const START_R = 120;

// タップした瞬間の円の半径 → 'perfect' | 'good' | 'miss'
export function judge(r) {
  const d = Math.abs(r - RING.r);
  if (d <= RING.perfect) return 'perfect';
  if (d <= RING.half) return 'good';
  return 'miss';
}

const SIZE = 280;
const C = {
  water: '#62b6cb',
  waterDeep: '#3aa6b9',
  ink: '#3d5a80',
  ring: 'rgba(255,255,255,0.55)',
  mustard: '#f2b84b',
  red: '#e76f51',
  white: '#ffffff',
};

let game = null;

export function openFishing({ getState, onChange, close: onClose }) {
  if (game) return;
  const root = document.createElement('div');
  root.className = 'game';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="釣り">
    <div class="game-head"><b>釣り堀</b><span class="game-left"></span><button class="game-x" type="button" aria-label="とじる">×</button></div>
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

  game = { root, ctx, phase: 'wait', t0: 0, waitMs: 0, dur: 0, r: START_R, result: null, raf: 0 };

  const msg = (text) => (root.querySelector('.game-msg').textContent = text);
  const showLeft = () => {
    const left = fishingLeft(getState());
    root.querySelector('.game-left').textContent = left > 0 ? `今日の Coin：あと ${left}回` : '今日の Coin は おしまい';
  };

  function cast() {
    game.phase = 'wait';
    game.t0 = performance.now();
    game.waitMs = 900 + Math.random() * 1800;
    game.dur = 1400 + Math.random() * 700; // 魚によって 速さが違う
    game.r = START_R;
    game.result = null;
    root.querySelector('.game-again').hidden = true;
    msg('浮きを見ていてください');
    showLeft();
  }

  function finish(grade, text) {
    game.phase = 'done';
    const res = landFish(getState(), grade);
    game.result = res;
    if (res.fish) {
      const coin = res.coin ? `　+${res.coin} Coin` : '';
      msg(`${res.fish.name}が釣れた！${coin}${res.first ? '（はじめての魚）' : ''}`);
    } else {
      msg(text);
    }
    showLeft();
    root.querySelector('.game-again').hidden = false;
    onChange?.(res);
  }

  function tap() {
    if (game.phase === 'wait') return finish('miss', '早すぎました。魚が にげてしまいました');
    if (game.phase !== 'bite') return;
    const grade = judge(game.r);
    finish(grade, game.r > RING.r ? 'まだ早かったようです' : '少し遅かったようです');
  }

  function frame(now) {
    game.raf = requestAnimationFrame(frame);
    const t = (now - game.t0) / 1000;
    if (game.phase === 'wait' && now - game.t0 >= game.waitMs) {
      game.phase = 'bite';
      game.t0 = now;
      msg('かかった！ 輪に重なったらタップ');
    }
    if (game.phase === 'bite') {
      const k = (now - game.t0) / game.dur;
      game.r = START_R * (1 - k);
      if (game.r <= 4) finish('miss', 'にげられました');
    }
    draw(ctx, game, t, now);
  }

  root.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.game-x')) return close();
    if (ev.target.closest('.game-again')) return cast();
    if (ev.target === canvas) {
      ev.preventDefault();
      tap();
    }
  });

  function close() {
    cancelAnimationFrame(game.raf);
    root.remove();
    game = null;
    onClose?.();
  }

  cast();
  game.raf = requestAnimationFrame(frame);
}

export const fishingOpen = () => !!game;
// 画面テスト用（?debug）：いまの段階と円の大きさ
export const fishingNow = () => (game ? { phase: game.phase, r: game.r } : null);

function draw(ctx, g, t, now) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  // 水面
  ctx.fillStyle = C.water;
  ctx.beginPath();
  ctx.roundRect(0, 0, SIZE, SIZE, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = ((i * 67 + now / 90) % (SIZE + 40)) - 20;
    const y = (i * 53) % SIZE;
    ctx.beginPath();
    ctx.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  // 蓮の葉
  ctx.fillStyle = '#6a994e';
  for (const [x, y, r] of [[40, 50, 14], [236, 222, 17], [226, 60, 11]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0.35, Math.PI * 2 - 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // 明るい輪（ここに重なったらタップ）
  ctx.strokeStyle = C.ring;
  ctx.lineWidth = RING.half * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, RING.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, RING.r, 0, Math.PI * 2);
  ctx.stroke();

  // 小さくなっていく円
  if (g.phase === 'bite') {
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, g.r), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 浮き（待っている間は ゆらゆら、かかったら ぴくぴく沈む）
  const bob = g.phase === 'wait' ? Math.sin(t * 2.4) * 2 : g.phase === 'bite' ? Math.sin(t * 30) * 2.5 + 3 : 0;
  ctx.fillStyle = 'rgba(20,60,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 9, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(cx, cy + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(cx, cy + bob, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.fillRect(cx - 1, cy + bob - 16, 2, 9);

  if (g.phase === 'bite') {
    ctx.fillStyle = C.white;
    ctx.font = '700 22px "Zen Maru Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', cx + 18, cy - 18);
  }

  // 釣れた魚
  if (g.phase === 'done' && g.result?.fish) {
    const big = g.result.fish.big;
    const s = big ? 1.6 : 1.1;
    ctx.save();
    ctx.translate(cx, cy - 6);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    const color = { kingyo: '#e76f51', koi: '#f2b84b', ookoi: '#f28c3c', nijimasu: '#9c89b8', namazu: '#6b705c' }[g.result.fish.id] || '#8a9aa8';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(26, -9);
    ctx.lineTo(26, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(-10, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-10.5, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
