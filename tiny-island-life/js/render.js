// 描画。state を読んで絵を置くだけ。state は書き換えない。
// 見た目の方針は docs/DESIGN.md（切り絵のジオラマ・絵文字は使わない）。

import { WORLD, ISLAND, PARK, ROOF, CAFE, SEATS, HOUSE_SLOTS, STROLL_POINTS, ARRIVAL, MENU_BOARD } from './world.js';
import { clockOf, seatCount } from './sim.js';

export const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

export const PALETTE = {
  sea: '#3aa6b9',
  seaDeep: '#2e8a9c',
  sand: '#f2d8a7',
  sandDark: '#e3c38b',
  grass: '#8cc084',
  grassDark: '#6fa56a',
  grassLight: '#a4d098',
  ink: '#3d5a80',
  mustard: '#f2b84b',
  white: '#ffffff',
  shadow: 'rgba(20, 60, 70, 0.28)',
  problem: '#c8553d',
};

// 住民の見た目（名前ごと）。ルールには関係ないので sim.js ではなくここに置く
export const LOOKS = {
  ユウタ: { shirt: '#3d5a80', hair: '#3b2a20', style: 'short', skin: '#f3cfb0' },
  アヤ: { shirt: '#f28aa0', hair: '#6b3f2a', style: 'long', skin: '#f6d6bb' },
  ケンジ: { shirt: '#f2b84b', hair: '#2b2b33', style: 'cap', skin: '#e9bf99' },
  ミナ: { shirt: '#2a9d8f', hair: '#4a2e20', style: 'pigtails', skin: '#f6d6bb' },
  ソラ: { shirt: '#62b6cb', hair: '#7a4b2c', style: 'short', skin: '#f3cfb0' },
  ハルカ: { shirt: '#9c89b8', hair: '#c9c4cf', style: 'bun', skin: '#f1cdb0' },
  ダイチ: { shirt: '#6a994e', hair: '#3b2a20', style: 'short', skin: '#d9a982' },
  リコ: { shirt: '#f4a259', hair: '#e8c170', style: 'bob', skin: '#f6d6bb' },
  タロウ: { shirt: '#8d6a4f', hair: '#e6e2dc', style: 'bald', skin: '#efc7a6' },
  ノゾミ: { shirt: '#e56b9f', hair: '#5a3825', style: 'pigtails', skin: '#f6d6bb' },
};
const DEFAULT_LOOK = { shirt: '#3d5a80', hair: '#3b2a20', style: 'short', skin: '#f3cfb0' };
export const lookOf = (r) => LOOKS[r.name] || DEFAULT_LOOK;

const ROOF_COLORS = ['#3d5a80', '#f2b84b', '#2a9d8f', '#9c89b8', '#3d5a80', '#f2b84b'];
const PLAZA = STROLL_POINTS[0];
const SHRUBS = [
  { x: 36, y: 330, r: 11 }, { x: 352, y: 410, r: 12 }, { x: 108, y: 566, r: 10 },
  { x: 302, y: 84, r: 11 }, { x: 344, y: 520, r: 10 }, { x: 30, y: 190, r: 9 }, { x: 268, y: 590, r: 9 },
];
const ROCKS = [{ x: 368, y: 250 }, { x: 22, y: 420 }, { x: 290, y: 612 }];
const PARK_TREES = [
  { x: 262, y: 190, r: 16 }, { x: 326, y: 250, r: 18 }, { x: 250, y: 256, r: 12 }, { x: 330, y: 186, r: 11 },
];
const FLOWERS = Array.from({ length: 14 }, (_, i) => ({
  x: PARK.x + Math.cos(i * 2.4) * (18 + (i % 4) * 9),
  y: PARK.y + Math.sin(i * 2.4) * (14 + (i % 3) * 8),
  c: i % 3 === 0 ? '#f28aa0' : i % 3 === 1 ? '#ffffff' : '#f2b84b',
}));

function phaseOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h / 159;
}

// 島のふち（楕円をすこし揺らした形）
function islandRadius(a) {
  return 1.035 + 0.035 * Math.sin(3 * a + 1) + 0.022 * Math.sin(5 * a + 2) + 0.012 * Math.sin(9 * a);
}

function islandPath(ctx, grow = 0, dx = 0, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const k = islandRadius(a);
    const x = ISLAND.cx + dx + Math.cos(a) * (ISLAND.rx * k + grow);
    const y = ISLAND.cy + dy + Math.sin(a) * (ISLAND.ry * k + grow);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
  const drops = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.7 + Math.random() * 0.6 }));
  let ground = null; // 動かないもの（海・島・道）を先に描いておく

  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.w = rect.width;
    view.h = rect.height;
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    view.scale = Math.min(rect.width / WORLD.w, rect.height / WORLD.h) * 0.97;
    view.ox = (rect.width - WORLD.w * view.scale) / 2;
    view.oy = (rect.height - WORLD.h * view.scale) / 2;
    ground = buildGround();
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.ox) / view.scale,
      y: (clientY - rect.top - view.oy) / view.scale,
    };
  }

  // ---------------------------------------------------------------- 動かない地面

  function buildGround() {
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const g = off.getContext('2d');
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    // 海と、紙のざらつき
    g.fillStyle = PALETTE.sea;
    g.fillRect(0, 0, view.w, view.h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < (view.w * view.h) / 90; i++) {
      g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(10,60,80,0.05)';
      g.fillRect(rnd() * view.w, rnd() * view.h, 1.4, 1.4);
    }

    g.save();
    g.translate(view.ox, view.oy);
    g.scale(view.scale, view.scale);

    // 島の影（紙を1枚ずらした影）→ 浅瀬 → 砂 → 芝
    g.fillStyle = PALETTE.seaDeep;
    islandPath(g, 12, 6, 8);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    islandPath(g, 14);
    g.fill();
    g.fillStyle = PALETTE.sand;
    islandPath(g, 6);
    g.fill();
    g.fillStyle = PALETTE.grassDark;
    islandPath(g, -10, 3, 4);
    g.fill();
    g.fillStyle = PALETTE.grass;
    islandPath(g, -12);
    g.fill();

    // 道（ゆるく曲げる）
    g.strokeStyle = PALETTE.sand;
    g.lineWidth = 11;
    g.lineCap = 'round';
    const road = (a, b, bend = 14) => {
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.08 + bend * 0.2;
      const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.08;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();
    };
    for (const h of HOUSE_SLOTS) road({ x: h.x, y: h.y + 24 }, PLAZA);
    road(PLAZA, { x: PARK.x - 40, y: PARK.y + 20 });
    road(PLAZA, { x: 170, y: 478 });
    road({ x: 170, y: 478 }, ARRIVAL, 0);
    road({ x: 170, y: 478 }, { x: 70, y: 440 }, 0);

    // 広場
    g.fillStyle = PALETTE.sandDark;
    g.beginPath();
    g.ellipse(PLAZA.x + 3, PLAZA.y + 18, 44, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALETTE.sand;
    g.beginPath();
    g.ellipse(PLAZA.x, PLAZA.y + 14, 44, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(61,90,128,0.12)';
    g.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      g.beginPath();
      g.ellipse(PLAZA.x, PLAZA.y + 14, 44 - i * 13, 28 - i * 8, 0, 0, Math.PI * 2);
      g.stroke();
    }

    // 岩
    for (const r of ROCKS) {
      g.fillStyle = PALETTE.shadow;
      g.beginPath();
      g.ellipse(r.x + 2, r.y + 3, 9, 6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#b8c4c8';
      g.beginPath();
      g.ellipse(r.x, r.y, 9, 6, 0, 0, Math.PI * 2);
      g.fill();
    }

    // 公園の芝（すこし明るい1枚）
    g.fillStyle = PALETTE.grassDark;
    g.beginPath();
    g.ellipse(PARK.x + 3, PARK.y + 4, PARK.r + 6, (PARK.r + 6) * 0.82, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALETTE.grassLight;
    g.beginPath();
    g.ellipse(PARK.x, PARK.y, PARK.r + 6, (PARK.r + 6) * 0.82, 0, 0, Math.PI * 2);
    g.fill();
    for (const f of FLOWERS) {
      g.fillStyle = f.c;
      g.beginPath();
      g.arc(f.x, f.y, 1.8, 0, Math.PI * 2);
      g.fill();
    }

    // カフェのウッドデッキ
    g.fillStyle = PALETTE.shadow;
    roundRect(g, 160 + 3, 482 + 4, 186, 76, 10);
    g.fill();
    g.fillStyle = '#e9c89b';
    roundRect(g, 160, 482, 186, 76, 10);
    g.fill();
    g.strokeStyle = 'rgba(141,106,79,0.25)';
    g.lineWidth = 1;
    for (let y = 492; y < 556; y += 10) {
      g.beginPath();
      g.moveTo(166, y);
      g.lineTo(340, y);
      g.stroke();
    }

    g.restore();
    return off;
  }

  // ---------------------------------------------------------------- 部品

  function paperShadow(draw) {
    ctx.save();
    ctx.translate(2.5, 3);
    ctx.fillStyle = PALETTE.shadow;
    draw(true);
    ctx.restore();
    draw(false);
  }

  function tree(x, y, r, time, sway = 0.6) {
    const s = Math.sin(time * 1.3 + x) * sway;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 3, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x - 2, y - r * 0.6, 4, r * 0.6);
    ctx.fillStyle = '#5e9c57';
    ctx.beginPath();
    ctx.arc(x + s, y - r * 0.9, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7db86e';
    ctx.beginPath();
    ctx.arc(x + s - r * 0.28, y - r * 1.12, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  function shrub(x, y, r, time) {
    const s = Math.sin(time * 1.1 + y) * 0.5;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e9c57';
    ctx.beginPath();
    ctx.arc(x - r * 0.45 + s, y - r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45 + s, y - r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + s, y - r * 0.8, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  function house(h, idx) {
    const { x, y } = h;
    const roof = ROOF_COLORS[idx % ROOF_COLORS.length];
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x - 17, y - 1, 34, 24, 2);
      ctx.fill();
      if (!shadow) ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 1);
      ctx.lineTo(x, y - 19);
      ctx.lineTo(x + 22, y + 1);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x - 4, y + 10, 8, 13, [4, 4, 0, 0]);
    ctx.fill();
  }

  function houseWindow(h, lit) {
    ctx.fillStyle = lit ? '#ffd66b' : '#cfe6ee';
    roundRect(ctx, h.x + 7, h.y + 5, 7, 7, 1.5);
    ctx.fill();
    ctx.fillStyle = lit ? '#ffd66b' : '#cfe6ee';
    roundRect(ctx, h.x - 14, h.y + 5, 7, 7, 1.5);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.28)';
      ctx.beginPath();
      ctx.arc(h.x, h.y + 10, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function cafe(state) {
    const { x, y, w, h } = CAFE;
    const left = x - w / 2;
    const top = y - h / 2;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, left, top, w, h, 3);
      ctx.fill();
    });
    // 屋根
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, left - 4, top - 8, w + 8, 10, 3);
    ctx.fill();
    // 日よけ（からしと白の縞・下は波）
    const n = 10;
    const sw = w / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? PALETTE.white : PALETTE.mustard;
      ctx.beginPath();
      ctx.moveTo(left + sw * i, top + 2);
      ctx.lineTo(left + sw * (i + 1), top + 2);
      ctx.lineTo(left + sw * (i + 1), top + 12);
      ctx.arc(left + sw * (i + 0.5), top + 12, sw / 2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    // 看板
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stars = state.cafe.level > 1 ? ' ' + '★'.repeat(state.cafe.level - 1) : '';
    ctx.fillText(`CAFE${stars}`, x + 14, y + 8);
    // 入口
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, left + 10, y + 2, 16, h / 2 - 2, [8, 8, 0, 0]);
    ctx.fill();
    // テラス席：椅子と小さな丸テーブル
    const count = seatCount(state);
    for (let i = 0; i < count; i++) {
      const s = SEATS[i];
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.arc(s.x + 13, s.y - 1, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(s.x + 11, s.y - 3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.mustard;
      ctx.beginPath();
      ctx.arc(s.x + 11, s.y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6a4f';
      roundRect(ctx, s.x - 6, s.y - 6, 12, 8, 2.5);
      ctx.fill();
    }
    // 列の先頭の看板（黒板）
    const m = MENU_BOARD;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, m.x - 7 + 2, m.y - 16 + 2, 14, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#8d6a4f';
    roundRect(ctx, m.x - 7, m.y - 16, 14, 16, 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(m.x - 5, m.y - 14, 10, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(m.x - 3, m.y - 11, 6, 1.2);
    ctx.fillRect(m.x - 3, m.y - 8, 4, 1.2);
  }

  function gazebo() {
    const { x, y } = ROOF;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 10, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x - 14, y - 8, 3, 18);
    ctx.fillRect(x + 11, y - 8, 3, 18);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 6);
    ctx.lineTo(x, y - 22);
    ctx.lineTo(x + 22, y - 6);
    ctx.closePath();
    ctx.fill();
  }

  function lamp(x, y, lit) {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - 1, y - 22, 2, 22);
    ctx.fillStyle = lit ? '#ffd66b' : PALETTE.white;
    ctx.beginPath();
    ctx.arc(x, y - 24, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------- 住民

  function hair(look, hx, hy, f) {
    ctx.fillStyle = look.hair;
    switch (look.style) {
      case 'long':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.6, Math.PI, 0);
        ctx.lineTo(hx + 6.6, hy + 6);
        ctx.lineTo(hx - 6.6, hy + 6);
        ctx.closePath();
        ctx.fill();
        return;
      case 'pigtails':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx - 7, hy + 1, 2.6, 0, Math.PI * 2);
        ctx.arc(hx + 7, hy + 1, 2.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'bun':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy - 7.5, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'cap':
        ctx.fillStyle = PALETTE.problem;
        ctx.beginPath();
        ctx.arc(hx, hy - 1.5, 6.6, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(hx + (f > 0 ? 0 : -9), hy - 2, 9, 2.2);
        return;
      case 'bob':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.8, Math.PI * 0.95, Math.PI * 2.05);
        ctx.lineTo(hx + 6.8, hy + 3);
        ctx.lineTo(hx - 6.8, hy + 3);
        ctx.closePath();
        ctx.fill();
        return;
      case 'bald':
        ctx.beginPath();
        ctx.arc(hx - 5.5, hy, 1.8, 0, Math.PI * 2);
        ctx.arc(hx + 5.5, hy, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'short':
      default:
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI * 1.05, Math.PI * 1.95);
        ctx.lineTo(hx + 4, hy - 3);
        ctx.lineTo(hx - 5, hy - 2);
        ctx.closePath();
        ctx.fill();
    }
  }

  function person(r, x, y, { bob = 0, stride = 0, facing = 1, seated = false }) {
    const look = lookOf(r);
    const by = y - bob;
    // 影
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1, 7.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 白いふち（シール）
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x - 8, by - 18.5, 16, 16.5, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, by - 22, 8.3, 0, Math.PI * 2);
    ctx.fill();

    // 足
    if (!seated) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 4 + stride, by - 5, 3, 5 + bob);
      ctx.fillRect(x + 1 - stride, by - 5, 3, 5 + bob);
    }
    // 胴体
    ctx.fillStyle = look.shirt;
    roundRect(ctx, x - 6.2, by - 16.5, 12.4, 12.5, 5);
    ctx.fill();
    // 頭
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(x, by - 22, 6.3, 0, Math.PI * 2);
    ctx.fill();
    hair(look, x, by - 22, facing);
    // 目（向いている方へ寄る）
    ctx.fillStyle = PALETTE.ink;
    const ex = x + facing * 1.6;
    ctx.beginPath();
    ctx.arc(ex - 2.2, by - 21.3, 0.95, 0, Math.PI * 2);
    ctx.arc(ex + 2.2, by - 21.3, 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  function bubble(kind, x, y) {
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x - 9 + 1.5, y - 16 + 2, 18, 15, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x - 9, y - 16, 18, 15, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 2);
    ctx.lineTo(x - 6, y + 3);
    ctx.lineTo(x + 2, y - 2);
    ctx.fill();
    const cx = x;
    const cy = y - 8.5;
    if (kind === 'sweat') {
      ctx.fillStyle = '#62b6cb';
      for (const [dx, s] of [[-3, 1], [3, 0.8]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 1.5, 2.4 * s, 0, Math.PI);
        ctx.lineTo(cx + dx, cy - 3.5 * s);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === 'lost') {
      ctx.fillStyle = PALETTE.problem;
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 1, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'closed') {
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 3);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.moveTo(cx + 3, cy - 3);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.stroke();
    } else if (kind === 'arrive') {
      ctx.fillStyle = PALETTE.mustard;
      roundRect(ctx, cx - 4.5, cy - 2.5, 9, 6.5, 1.5);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 1.8, cy - 4.5, 3.6, 2);
    }
  }

  function drawResident(state, r, time, selected) {
    const ph = phaseOf(r.id);
    const moving = Math.hypot(r.tx - r.x, r.ty - r.y) > 0.5 && state.t >= r.pauseUntil;
    let bob = 0;
    let stride = 0;
    if (moving) {
      bob = Math.abs(Math.sin(time * 10 + ph)) * 2.2;
      stride = Math.sin(time * 10 + ph) * 1.4;
    } else if (r.state === 'PARK') {
      bob = Math.pow(Math.max(0, Math.sin(time * 2.2 + ph)), 14) * 6;
    } else {
      bob = (Math.sin(time * 2 + ph) + 1) * 0.5;
    }
    // 立ち止まっているときは、ときどき振り返る
    let facing = r.facing;
    if (!moving && Math.sin(time * 0.6 + ph * 3) > 0.9) facing = -facing;

    person(r, r.x, r.y, { bob, stride, facing, seated: r.state === 'SEATED' });

    let b = r.bubble;
    if (!b && r.state === 'QUEUE' && state.t - r.queuedAt > r.patience * 0.6) b = 'sweat';
    if (b) bubble(b, r.x + 11, r.y - 30 - Math.sin(time * 3 + ph) * 1.2);

    if (selected) {
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(r.name).width + 12;
      const ty = r.y - (b ? 56 : 42);
      ctx.fillStyle = PALETTE.shadow;
      roundRect(ctx, r.x - w / 2 + 1.5, ty - 8 + 2, w, 16, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      roundRect(ctx, r.x - w / 2, ty - 8, w, 16, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(r.name, r.x, ty + 0.5);
    }
  }

  function drawSleep(state, time) {
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const h of state.houses) {
      const sleeping = state.residents.some((r) => r.homeId === h.id && r.state === 'SLEEP');
      if (!sleeping) continue;
      const k = (time * 0.5) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.fillText('z', h.x + 16 + k * 5, h.y - 16 - k * 12);
      ctx.fillText('z', h.x + 22 + k * 5, h.y - 24 - k * 12);
    }
  }

  function lighting(clock) {
    const hr = clock / 60;
    if (hr >= 22 || hr < 5) return 'rgba(18, 28, 72, 0.52)';
    if (hr < 6.5) return `rgba(18, 28, 72, ${(0.52 * (6.5 - hr)) / 1.5})`;
    if (hr >= 20) return `rgba(18, 28, 72, ${0.22 + (0.3 * (hr - 20)) / 2})`;
    if (hr >= 17.5) return `rgba(242, 140, 60, ${(0.16 * (hr - 17.5)) / 2.5})`;
    return null;
  }

  // ---------------------------------------------------------------- 1コマ

  function draw(state, time, selectedId) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (ground) ctx.drawImage(ground, 0, 0, view.w, view.h);

    // 波（小さな白い弧が流れる）
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = ((i * 83 + time * 5) % (view.w + 30)) - 15;
      const y = (i * 131) % view.h;
      ctx.beginPath();
      ctx.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    const clock = clockOf(state.t);
    const night = clock >= 19 * 60 || clock < 6 * 60;

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    for (const s of SHRUBS) shrub(s.x, s.y, s.r, time);
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(PARK.x - 16, PARK.y + 20, 32, 5);
    for (const t of PARK_TREES) tree(t.x, t.y, t.r, time);
    if (state.park.roof) gazebo();
    state.houses.forEach((h, i) => house(h, i));
    cafe(state);
    lamp(PLAZA.x + 30, PLAZA.y + 6, false);
    ctx.restore();

    // 天気と時間帯の色は住民より下にかける（主役を色あせさせない）
    const weatherTint = state.weather === 'rain' ? 'rgba(40, 60, 90, 0.22)' : state.weather === 'cloudy' ? 'rgba(90, 110, 125, 0.14)' : null;
    for (const c of [weatherTint, lighting(clock)]) {
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, view.w, view.h);
    }

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    for (const h of state.houses) {
      const home = state.residents.some((r) => r.homeId === h.id && !r.visible && r.state !== 'PENDING');
      houseWindow(h, night && home);
    }
    if (night) lamp(PLAZA.x + 30, PLAZA.y + 6, true);
    const people = state.residents.filter((r) => r.visible).sort((a, b) => a.y - b.y);
    for (const r of people) drawResident(state, r, time, r.id === selectedId);
    drawSleep(state, time);
    ctx.restore();

    if (state.weather === 'rain') {
      ctx.strokeStyle = 'rgba(235, 245, 255, 0.6)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (const d of drops) {
        const y = (d.y * view.h + time * 380 * d.s) % view.h;
        const x = (d.x * view.w + time * 60 * d.s) % view.w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2.5, y - 9);
        ctx.stroke();
      }
    }
  }

  return { resize, draw, toWorld };
}
