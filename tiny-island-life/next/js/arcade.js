// ゲームセンター（D331）。ゲームセンターのカードの「ゲームで遊ぶ」から開く。
//
// 4つのゲーム：神経衰弱（3×3）・クレーンゲーム・じゃんけん・もぐらたたき。どれも簡単で、子どもも遊べる。
// 遊ぶのは無料。勝つと Coin（4つ合わせて1日3回まで・sim.js の playArcade）。クレーンゲームは景品を集める。
// 紙の大きさは どのゲームでも同じ（D306：大きさが変わるとストレス）

import { playArcade, arcadeLeft } from './sim.js';
import { CONFIG } from './config.js';

const SIZE = 280;
const GAMES = [
  { id: 'memory', name: '神経衰弱', icon: '🃏', note: '同じ絵を2まいそろえる' },
  { id: 'crane', name: 'クレーンゲーム', icon: '🧸', note: 'ぬいぐるみをつかむ' },
  { id: 'janken', name: 'じゃんけん', icon: '✊', note: '島の人と しょうぶ' },
  { id: 'mole', name: 'もぐらたたき', icon: '🔨', note: '15びょうで 8ぴき' },
];

let cur = null;

export const arcadeOpen = () => !!cur;
// 画面テスト用（?debug）
export const arcadeNow = () => (cur ? { game: cur.game, phase: cur.phase } : null);

export function openArcade({ getState, onChange, close: onClose }) {
  if (cur) return;
  const root = document.createElement('div');
  root.className = 'game arcade';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="ゲームセンター">
    <div class="game-head"><b class="arcade-title">ゲームセンター</b><span class="game-left"></span><button class="game-x" type="button" aria-label="とじる">×</button></div>
    <div class="arcade-stage"></div>
    <p class="game-msg"></p>
    <div class="game-buttons arcade-buttons">
      <button class="arcade-menu-btn" type="button" hidden>ほかのゲーム</button>
      <button class="game-again" type="button" hidden>もう一度</button>
    </div>
  </div>`;
  document.body.appendChild(root);
  const stage = root.querySelector('.arcade-stage');
  cur = { root, stage, game: null, phase: 'menu', timers: [], raf: 0 };

  const msg = (text) => (root.querySelector('.game-msg').textContent = text);
  const title = (text) => (root.querySelector('.arcade-title').textContent = text);
  const showLeft = () => {
    const left = arcadeLeft(getState());
    root.querySelector('.game-left').textContent = left > 0 ? `今日の Coin：あと ${left}回` : '今日の Coin は おしまい';
  };
  const buttons = (again, menu) => {
    root.querySelector('.game-again').hidden = !again;
    root.querySelector('.arcade-menu-btn').hidden = !menu;
  };
  const stop = () => {
    for (const t of cur.timers) clearTimeout(t);
    cur.timers = [];
    cancelAnimationFrame(cur.raf);
  };
  const later = (fn, ms) => cur.timers.push(setTimeout(() => cur && fn(), ms));

  // 勝ち負けを sim に渡す（Coin・景品）
  function finish(won, text, prizeId = null) {
    cur.phase = 'done';
    const res = playArcade(getState(), cur.game, won, prizeId);
    const extra = res.prize ? `　${res.prize.name}を手に入れた！` : res.coin ? `　+${res.coin} Coin` : '';
    msg(`${text}${extra}`);
    showLeft();
    buttons(true, true);
    onChange?.(res);
  }

  // ---------------------------------------------------------------- メニュー
  function menu() {
    stop();
    cur.game = null;
    cur.phase = 'menu';
    title('ゲームセンター');
    const prizes = getState().prizes || {};
    const got = CONFIG.arcade.game.prizes.filter((p) => prizes[p.id]).map((p) => p.icon).join('');
    stage.innerHTML = `<div class="arcade-menu">${GAMES.map((g) => `<button type="button" data-game="${g.id}"><span class="arcade-icon">${g.icon}</span><b>${g.name}</b><small>${g.note}</small></button>`).join('')}</div>`;
    msg(got ? `集めた景品：${got}` : '遊ぶゲームを えらんでください');
    buttons(false, false);
    showLeft();
  }

  // ---------------------------------------------------------------- 神経衰弱（3×3）：4組と、まんなかの星1まい
  function memory() {
    const pics = ['🐶', '🐱', '🐰', '🦊'];
    const cards = [...pics, ...pics].sort(() => Math.random() - 0.5);
    cards.splice(4, 0, '⭐'); // まんなかは星（めくるだけ）
    stage.innerHTML = `<div class="memory">${cards.map((c, i) => `<button type="button" data-i="${i}" class="${c === '⭐' ? 'star' : ''}"><span>${c}</span></button>`).join('')}</div>`;
    const open = [];
    let pairs = 0;
    let busy = false;
    msg('同じ絵を2まい めくってください');
    stage.onclick = (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b || busy || cur.phase === 'done' || b.classList.contains('up')) return;
      b.classList.add('up');
      if (b.classList.contains('star')) return;
      open.push(b);
      if (open.length < 2) return;
      const [x, y] = open.splice(0);
      if (cards[x.dataset.i] === cards[y.dataset.i]) {
        pairs += 1;
        x.classList.add('match');
        y.classList.add('match');
        if (pairs === pics.length) {
          stage.querySelector('.star')?.classList.add('up');
          finish(true, 'ぜんぶ そろった！');
        }
        else msg(`そろった！ あと ${pics.length - pairs}組`);
        return;
      }
      busy = true;
      later(() => {
        x.classList.remove('up');
        y.classList.remove('up');
        busy = false;
      }, 700);
    };
  }

  // ---------------------------------------------------------------- クレーンゲーム：左右に動くクレーンを、タップで下ろす
  function crane() {
    stage.innerHTML = `<canvas class="crane" width="${SIZE}" height="${SIZE}"></canvas>`;
    const canvas = stage.querySelector('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const all = CONFIG.arcade.game.prizes;
    const pile = [0, 1, 2].map((k) => ({ ...all[Math.floor(Math.random() * all.length)], x: 60 + k * 80 + (Math.random() - 0.5) * 20 }));
    const s = { x: 40, dir: 1, y: 40, phase: 'move', got: null, t0: performance.now() };
    msg('ぬいぐるみの上で タップ');
    const TOP = 40;
    const FLOOR = 222;
    function frame(now) {
      cur.raf = requestAnimationFrame(frame);
      if (s.phase === 'move') {
        s.x += s.dir * 2.1;
        if (s.x > SIZE - 30 || s.x < 30) s.dir *= -1;
      } else if (s.phase === 'down') {
        s.y += 3.2;
        if (s.y >= FLOOR - 22) {
          s.phase = 'up';
          const hit = pile.find((p) => !p.gone && Math.abs(p.x - s.x) < 17);
          if (hit) {
            s.got = hit;
            hit.gone = true;
          }
        }
      } else if (s.phase === 'up') {
        s.y -= 2.6;
        if (s.y <= TOP) {
          s.phase = 'end';
          cancelAnimationFrame(cur.raf);
          draw();
          if (s.got) finish(true, 'つかめた！', s.got.id);
          else finish(false, 'おしい！ つかめませんでした');
          return;
        }
      }
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = '#fbe3ec';
      ctx.beginPath();
      ctx.roundRect(0, 0, SIZE, SIZE, 18);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(14, 14, SIZE - 28, SIZE - 28);
      ctx.fillStyle = '#e8c9d6';
      ctx.fillRect(14, FLOOR, SIZE - 28, SIZE - FLOOR - 14);
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of pile) if (!p.gone) ctx.fillText(p.icon, p.x, FLOOR - 16);
      // クレーン
      ctx.strokeStyle = '#3d5a80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 22);
      ctx.lineTo(SIZE - 14, 22);
      ctx.moveTo(s.x, 22);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.fillStyle = '#f2b84b';
      ctx.fillRect(s.x - 12, 16, 24, 10);
      ctx.strokeStyle = '#3d5a80';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const open = s.phase === 'move' || s.phase === 'down' ? 12 : 7;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - open, s.y + 14);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + open, s.y + 14);
      ctx.stroke();
      if (s.got) ctx.fillText(s.got.icon, s.x, s.y + 26);
    }
    canvas.onpointerdown = (ev) => {
      ev.preventDefault();
      if (s.phase === 'move') {
        s.phase = 'down';
        msg('…');
      }
    };
    cur.raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- じゃんけん：あいこなら もう一度
  function janken() {
    const hands = [
      { id: 'g', icon: '✊', name: 'グー' },
      { id: 'c', icon: '✌️', name: 'チョキ' },
      { id: 'p', icon: '✋', name: 'パー' },
    ];
    const beats = { g: 'c', c: 'p', p: 'g' };
    const people = getState().residents.filter((r) => !r.age);
    const foe = people.length ? people[Math.floor(Math.random() * people.length)].name : '島の人';
    stage.innerHTML = `<div class="janken"><div class="janken-foe"><small>${foe}</small><span class="janken-hand">❔</span></div><div class="janken-me">${hands.map((h) => `<button type="button" data-h="${h.id}">${h.icon}<small>${h.name}</small></button>`).join('')}</div></div>`;
    msg(`${foe}と じゃんけん。どれを出す？`);
    stage.onclick = (ev) => {
      const b = ev.target.closest('[data-h]');
      if (!b || cur.phase === 'done') return;
      const me = b.dataset.h;
      const them = hands[Math.floor(Math.random() * 3)];
      stage.querySelector('.janken-hand').textContent = them.icon;
      for (const x of stage.querySelectorAll('[data-h]')) x.classList.toggle('picked', x === b);
      if (them.id === me) return msg(`あいこ！（${them.name}） もう一度 えらんでね`);
      if (beats[me] === them.id) finish(true, `かった！ ${foe}は ${them.name}`);
      else finish(false, `まけた… ${foe}は ${them.name}`);
    };
  }

  // ---------------------------------------------------------------- もぐらたたき（3×3）：15秒で8ひき
  function mole() {
    const NEED = 8;
    const SEC = 15;
    stage.innerHTML = `<div class="mole">${Array.from({ length: 9 }, (_, i) => `<button type="button" data-i="${i}"><span></span></button>`).join('')}</div>`;
    const holes = [...stage.querySelectorAll('[data-i]')];
    let hits = 0;
    const end = performance.now() + SEC * 1000;
    msg(`もぐらを たたいて！ 0 / ${NEED}`);
    const pop = () => {
      if (cur.phase === 'done') return;
      const left = Math.ceil((end - performance.now()) / 1000);
      if (left <= 0) {
        for (const h of holes) h.classList.remove('up');
        if (hits >= NEED) finish(true, `${hits}ひき たたけた！`);
        else finish(false, `${hits}ひき（あと ${NEED - hits}ひき）`);
        return;
      }
      const free = holes.filter((h) => !h.classList.contains('up'));
      const h = free[Math.floor(Math.random() * free.length)];
      if (h) {
        h.classList.add('up');
        h.firstChild.textContent = '🐹';
        later(() => h.classList.remove('up'), 850);
      }
      later(pop, 520 + Math.random() * 260);
    };
    stage.onpointerdown = (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b || !b.classList.contains('up') || cur.phase === 'done') return;
      ev.preventDefault();
      b.classList.remove('up');
      hits += 1;
      msg(`もぐらを たたいて！ ${hits} / ${NEED}`);
    };
    later(pop, 400);
  }

  const START = { memory, crane, janken, mole };
  function start(id) {
    stop();
    stage.onclick = null;
    stage.onpointerdown = null;
    cur.game = id;
    cur.phase = 'play';
    title(GAMES.find((g) => g.id === id).name);
    buttons(false, true);
    START[id]();
  }

  root.addEventListener('click', (ev) => {
    if (ev.target.closest('.game-x')) return close();
    const g = ev.target.closest('[data-game]');
    if (g) return start(g.dataset.game);
    if (ev.target.closest('.game-again')) return start(cur.game);
    if (ev.target.closest('.arcade-menu-btn')) return menu();
  });

  function close() {
    stop();
    root.remove();
    cur = null;
    onClose?.();
  }

  menu();
}
