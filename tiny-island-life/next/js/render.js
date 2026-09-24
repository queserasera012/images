// 描画。state を読んで絵を置くだけ。state は書き換えない。
// 見た目の方針は docs/DESIGN.md（切り絵のジオラマ・絵文字は使わない）。格子版（D289）。

import { T, COLS, ROWS, WORLD, ISLAND, SIZES, MAP, PIER, islandRadius, idx, center, neighbors, isRoad, occupied } from './grid.js';
import { clockOf, seatCount, seatPositions, queueSlot } from './sim.js';

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

const ROOF_COLORS = ['#3d5a80', '#f2b84b', '#2a9d8f', '#9c89b8'];

function phaseOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h / 159;
}

// マスごとの決まった乱数（木や花の置き場所）
const hash = (i) => {
  let x = (i + 1) * 2654435761;
  x ^= x >>> 13;
  return ((x * 1274126177) >>> 0) / 4294967296;
};

// 交差点（道が3方向以上につながるマス）の一部に街灯を立てる
const LAMPS = MAP.map((k, i) => (k === 'road' && neighbors(i).filter(isRoad).length >= 3 && hash(i) < 0.5 ? i : -1)).filter((i) => i >= 0);

function islandPath(ctx, k = 1, grow = 0, dx = 0, dy = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const f = islandRadius(a) * k;
    const x = ISLAND.cx + dx + Math.cos(a) * (ISLAND.rx * f + grow);
    const y = ISLAND.cy + dy + Math.sin(a) * (ISLAND.ry * f + grow);
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
  const view = { w: 0, h: 0, dpr: 1 };
  const cam = { x: 6.5 * T, y: 11 * T, zoom: 1 };
  const drops = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.7 + Math.random() * 0.6 }));
  let ground = null;
  let pokes = null; // タップされた住民（id → タップした時刻）。ぴょんと跳ねて ハートを出す
  const GROUND_RES = 3; // 地面は一度だけ高い解像度で描いておく

  const minZoom = () => Math.min(1, (view.w / WORLD.w) * 1.02);
  const maxZoom = 1.7;

  function clampCam() {
    cam.zoom = Math.max(minZoom(), Math.min(maxZoom, cam.zoom));
    const hw = view.w / 2 / cam.zoom;
    const hh = view.h / 2 / cam.zoom;
    const clampAxis = (v, half, size) => (half * 2 >= size ? size / 2 : Math.max(half - 20, Math.min(size - half + 20, v)));
    cam.x = clampAxis(cam.x, hw, WORLD.w);
    cam.y = clampAxis(cam.y, hh, WORLD.h);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.w = rect.width;
    view.h = rect.height;
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    // 最初は 13マスぶんの幅が見えるくらい
    if (!view.started) {
      cam.zoom = Math.min(1.15, view.w / (13 * T));
      view.started = true;
    }
    clampCam();
    if (!ground) ground = buildGround();
  }

  const ox = () => view.w / 2 - cam.x * cam.zoom;
  const oy = () => view.h / 2 - cam.y * cam.zoom;

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - ox()) / cam.zoom, y: (clientY - rect.top - oy()) / cam.zoom };
  }

  function tileAt(clientX, clientY) {
    const p = toWorld(clientX, clientY);
    return { c: Math.floor(p.x / T), r: Math.floor(p.y / T) };
  }

  function panBy(dx, dy) {
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    clampCam();
  }

  function zoomAt(factor, clientX, clientY) {
    const before = toWorld(clientX, clientY);
    cam.zoom *= factor;
    clampCam();
    const after = toWorld(clientX, clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    clampCam();
  }

  function focus(x, y) {
    cam.x = x;
    cam.y = y;
    clampCam();
  }

  // ---------------------------------------------------------------- 動かない地面（島・道・桟橋）

  function buildGround() {
    const off = document.createElement('canvas');
    off.width = WORLD.w * GROUND_RES;
    off.height = WORLD.h * GROUND_RES;
    const g = off.getContext('2d');
    g.scale(GROUND_RES, GROUND_RES);

    // 島の影（ずらした紙）→ 浅瀬 → 砂 → 芝
    g.fillStyle = PALETTE.seaDeep;
    islandPath(g, 1, 10, 6, 8);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    islandPath(g, 1, 12);
    g.fill();
    g.fillStyle = PALETTE.sand;
    islandPath(g, 1, 4);
    g.fill();
    g.fillStyle = PALETTE.grassDark;
    islandPath(g, 0.885, 0, 3, 4);
    g.fill();
    g.fillStyle = PALETTE.grass;
    islandPath(g, 0.885);
    g.fill();

    // 桟橋
    const pier = center(PIER);
    g.fillStyle = PALETTE.shadow;
    g.fillRect(pier.x - 9 + 3, pier.y + 3, 18, 56);
    g.fillStyle = '#b98b5e';
    g.fillRect(pier.x - 9, pier.y, 18, 56);
    g.strokeStyle = 'rgba(80,50,30,0.25)';
    g.lineWidth = 1;
    for (let y = pier.y + 6; y < pier.y + 56; y += 7) {
      g.beginPath();
      g.moveTo(pier.x - 9, y);
      g.lineTo(pier.x + 9, y);
      g.stroke();
    }

    // 道：マスをつないだ帯。先に濃い砂で影、上に明るい砂
    const W = 20;
    const band = (color, d) => {
      g.fillStyle = color;
      for (let i = 0; i < MAP.length; i++) {
        if (!isRoad(i)) continue;
        const p = center(i);
        roundRect(g, p.x - W / 2 + d, p.y - W / 2 + d, W, W, 7);
        g.fill();
        if (isRoad(i + 1) && (i + 1) % COLS !== 0) g.fillRect(p.x + d, p.y - W / 2 + d, T, W);
        if (isRoad(i + COLS)) g.fillRect(p.x - W / 2 + d, p.y + d, W, T);
      }
    };
    band(PALETTE.sandDark, 2);
    band(PALETTE.sand, 0);
    return off;
  }

  // ---------------------------------------------------------------- 部品

  function tree(x, y, r, time) {
    const s = Math.sin(time * 1.3 + x) * 0.6;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 2, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x - 1.5, y - r * 0.6, 3, r * 0.6);
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

  // 空いている土地の飾り（建物を建てると消える）
  function decor(used, time) {
    for (let i = 0; i < MAP.length; i++) {
      if (MAP[i] !== 'land' || used.has(i)) continue;
      const h = hash(i);
      const p = center(i);
      if (h < 0.16) tree(p.x + (h - 0.08) * 60, p.y + 8, 9 + h * 20, time);
      else if (h < 0.3) shrub(p.x - 4 + h * 20, p.y + 6, 7, time);
      else if (h < 0.5) {
        ctx.fillStyle = h < 0.4 ? '#f28aa0' : '#ffffff';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(p.x - 6 + k * 6, p.y - 4 + ((k * 7) % 9), 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function paperShadow(draw) {
    ctx.save();
    ctx.translate(2.5, 3);
    ctx.fillStyle = PALETTE.shadow;
    draw(true);
    ctx.restore();
    draw(false);
  }

  function house(b, n) {
    const x = b.c * T + T / 2;
    const y = b.r * T + 9;
    const roof = ROOF_COLORS[n % ROOF_COLORS.length];
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x - 12, y, 24, 18, 2);
      ctx.fill();
      if (!shadow) ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 15, y + 2);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x + 15, y + 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x - 3, y + 8, 6, 10, [3, 3, 0, 0]);
    ctx.fill();
  }

  function houseWindow(b, lit) {
    const x = b.c * T + T / 2;
    const y = b.r * T + 9;
    ctx.fillStyle = lit ? '#ffd66b' : '#cfe6ee';
    roundRect(ctx, x + 5, y + 4, 5, 5, 1);
    ctx.fill();
    roundRect(ctx, x - 10, y + 4, 5, 5, 1);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.26)';
      ctx.beginPath();
      ctx.arc(x, y + 8, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function park(b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.park.w * T;
    const h = SIZES.park.h * T;
    ctx.fillStyle = PALETTE.grassDark;
    roundRect(ctx, x0 + 5, y0 + 6, w - 6, h - 6, 16);
    ctx.fill();
    ctx.fillStyle = PALETTE.grassLight;
    roundRect(ctx, x0 + 3, y0 + 3, w - 6, h - 6, 16);
    ctx.fill();
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = k % 3 === 0 ? '#f28aa0' : k % 3 === 1 ? '#ffffff' : '#f2b84b';
      ctx.beginPath();
      ctx.arc(x0 + 14 + ((k * 37) % (w - 28)), y0 + 16 + ((k * 53) % (h - 30)), 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x0 + w / 2 - 14, y0 + h - 22, 28, 5);
    tree(x0 + 18, y0 + 26, 12, time);
    tree(x0 + w - 18, y0 + h - 18, 13, time);
    tree(x0 + w - 22, y0 + 24, 9, time);
    if (b.roof) {
      const gx = x0 + 30;
      const gy = y0 + h - 22;
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.ellipse(gx + 3, gy + 8, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6a4f';
      ctx.fillRect(gx - 12, gy - 8, 3, 16);
      ctx.fillRect(gx + 9, gy - 8, 3, 16);
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.moveTo(gx - 19, gy - 6);
      ctx.lineTo(gx, gy - 20);
      ctx.lineTo(gx + 19, gy - 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  function cafe(b, label, showLabel) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.cafe.w * T;
    // テラス（ウッドデッキ）
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 3 + 3, y0 + T + 2 + 3, w - 6, 2 * T - 6, 8);
    ctx.fill();
    ctx.fillStyle = '#e9c89b';
    roundRect(ctx, x0 + 3, y0 + T + 2, w - 6, 2 * T - 6, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(141,106,79,0.22)';
    ctx.lineWidth = 1;
    for (let y = y0 + T + 11; y < y0 + 3 * T - 6; y += 9) {
      ctx.beginPath();
      ctx.moveTo(x0 + 8, y);
      ctx.lineTo(x0 + w - 8, y);
      ctx.stroke();
    }
    // 建物
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 4, y0 + 2, w - 8, T + 2, 3);
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 1, y0 - 3, w - 2, 7, 3);
    ctx.fill();
    const n = 8;
    const sw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? PALETTE.white : PALETTE.mustard;
      ctx.beginPath();
      ctx.moveTo(x0 + 4 + sw * i, y0 + 3);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 3);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 10);
      ctx.arc(x0 + 4 + sw * (i + 0.5), y0 + 10, sw / 2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stars = b.level > 1 ? ' ' + '★'.repeat(b.level - 1) : '';
    ctx.fillText(`CAFE${stars}`, x0 + w / 2 + 8, y0 + 22);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 10, y0 + 16, 11, T - 12, [5, 5, 0, 0]);
    ctx.fill();
    // 椅子と丸テーブル
    const seats = seatPositions(b);
    for (let i = 0; i < seatCount(b); i++) {
      const s = seats[i];
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.arc(s.x + 12, s.y - 1, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(s.x + 10, s.y - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.mustard;
      ctx.beginPath();
      ctx.arc(s.x + 10, s.y - 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6a4f';
      roundRect(ctx, s.x - 5, s.y - 6, 10, 7, 2.5);
      ctx.fill();
    }
    // 列の先頭の黒板
    const q = queueSlot(b, 0);
    const mx = q.x + 16;
    const my = q.y - 2;
    ctx.fillStyle = '#8d6a4f';
    roundRect(ctx, mx - 6, my - 14, 12, 14, 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(mx - 4, my - 12, 8, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(mx - 2.5, my - 10, 5, 1.1);
    ctx.fillRect(mx - 2.5, my - 7, 3.5, 1.1);
    // カフェが2軒以上なら名札
    if (showLabel) {
      ctx.font = `700 10px ${FONT}`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = PALETTE.ink;
      roundRect(ctx, x0 + w / 2 - tw / 2, y0 - 20, tw, 15, 7.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(label, x0 + w / 2, y0 - 12);
    }
  }

  function lamp(i, lit) {
    const p = center(i);
    const x = p.x + 12;
    const y = p.y - 8;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - 1, y - 18, 2, 18);
    ctx.fillStyle = lit ? '#ffd66b' : PALETTE.white;
    ctx.beginPath();
    ctx.arc(x, y - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.22)';
      ctx.beginPath();
      ctx.arc(x, y - 16, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------- 住民（前の版から そのまま）

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
    } else if (kind === 'heart') {
      ctx.fillStyle = '#e56b9f';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 3.5);
      ctx.bezierCurveTo(cx - 6, cy - 1, cx - 3, cy - 5.5, cx, cy - 2.5);
      ctx.bezierCurveTo(cx + 3, cy - 5.5, cx + 6, cy - 1, cx, cy + 3.5);
      ctx.fill();
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
    // タップされたら、ぴょんと跳ねる
    const poked = pokes?.get(r.id);
    const since = poked === undefined ? 99 : time - poked;
    if (since < 1.2) bob += Math.abs(Math.sin((since / 1.2) * Math.PI * 2)) * 8;
    // 立ち止まっているときは、ときどき振り返る
    let facing = r.facing;
    if (!moving && Math.sin(time * 0.6 + ph * 3) > 0.9) facing = -facing;

    person(r, r.x, r.y, { bob, stride, facing, seated: r.state === 'SEATED' });

    let b = r.bubble;
    if (!b && since < 2) b = 'heart';
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
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of state.buildings) {
      if (b.type !== 'house') continue;
      if (!state.residents.some((r) => r.homeId === b.id && r.state === 'SLEEP')) continue;
      const x = b.c * T + T / 2;
      const y = b.r * T;
      const k = (time * 0.5) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.fillText('z', x + 10 + k * 4, y - 2 - k * 10);
      ctx.fillText('z', x + 15 + k * 4, y - 9 - k * 10);
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

  // 建てる場所を選んでいるとき：置けるマスを明るく、選んだ場所に建物の影を出す
  function drawPlacing(state, placing, time) {
    const pulse = 0.55 + Math.sin(time * 4) * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (const i of placing.cells) {
      const x = (i % COLS) * T;
      const y = Math.floor(i / COLS) * T;
      roundRect(ctx, x + 2, y + 2, T - 4, T - 4, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (placing.ghost) {
      const s = SIZES[placing.type];
      const x = placing.ghost.c * T;
      const y = placing.ghost.r * T;
      ctx.fillStyle = 'rgba(242, 184, 75, 0.45)';
      ctx.strokeStyle = PALETTE.mustard;
      ctx.lineWidth = 3;
      roundRect(ctx, x + 1, y + 1, s.w * T - 2, s.h * T - 2, 8);
      ctx.fill();
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- 1コマ

  function draw(state, time, ui = {}) {
    pokes = ui.pokes || null;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, 0, view.w, view.h);

    const toWorldSpace = () => {
      ctx.setTransform(view.dpr * cam.zoom, 0, 0, view.dpr * cam.zoom, view.dpr * ox(), view.dpr * oy());
    };

    toWorldSpace();
    // 波
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + time * 5) % (WORLD.w + 200)) - 100;
      const y = ((i * 151) % (WORLD.h + 200)) - 100;
      ctx.beginPath();
      ctx.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    if (ground) ctx.drawImage(ground, 0, 0, WORLD.w, WORLD.h);

    const clock = clockOf(state.t);
    const night = clock >= 19 * 60 || clock < 6 * 60;
    const used = occupied(state.buildings);
    decor(used, time);

    const cafeList = state.buildings.filter((b) => b.type === 'cafe');
    let houseN = 0;
    // 奥（上）から順に描く
    for (const b of [...state.buildings].sort((a, c) => a.r - c.r)) {
      if (b.type === 'house') house(b, houseN++);
      else if (b.type === 'park') park(b, time);
      else if (b.type === 'cafe') cafe(b, ui.cafeLabel ? ui.cafeLabel(b) : 'カフェ', cafeList.length > 1);
    }
    for (const i of LAMPS) lamp(i, false);
    if (ui.placing) drawPlacing(state, ui.placing, time);

    // 天気と時間帯の色は住民より下にかける（主役を色あせさせない）
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const weatherTint = state.weather === 'rain' ? 'rgba(40, 60, 90, 0.22)' : state.weather === 'cloudy' ? 'rgba(90, 110, 125, 0.14)' : null;
    for (const c of [weatherTint, lighting(clock)]) {
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, view.w, view.h);
    }

    toWorldSpace();
    for (const b of state.buildings) {
      if (b.type !== 'house') continue;
      const home = state.residents.some((r) => r.homeId === b.id && !r.visible && r.state !== 'PENDING');
      houseWindow(b, night && home);
    }
    if (night) for (const i of LAMPS) lamp(i, true);
    const people = state.residents.filter((r) => r.visible).sort((a, b) => a.y - b.y);
    for (const r of people) drawResident(state, r, time, r.id === ui.selectedId);
    drawSleep(state, time);

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
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

  function toClient(x, y) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ox() + x * cam.zoom, y: rect.top + oy() + y * cam.zoom };
  }

  return { resize, draw, toWorld, toClient, tileAt, panBy, zoomAt, focus };
}
