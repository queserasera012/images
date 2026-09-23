// 描画。state を読んで絵を置くだけ。state は書き換えない。

import { WORLD, ISLAND, PARK, ROOF, CAFE, SEATS, HOUSE_SLOTS, STROLL_POINTS, ARRIVAL } from './world.js';
import { clockOf, seatCount } from './sim.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const PLAZA = STROLL_POINTS[0];
const PALMS = [
  { x: 40, y: 330 }, { x: 350, y: 420 }, { x: 110, y: 560 }, { x: 300, y: 80 }, { x: 340, y: 520 },
];
const PARK_TREES = [
  { x: 262, y: 186, s: 30 }, { x: 322, y: 246, s: 34 }, { x: 258, y: 258, s: 26 },
];

function phaseOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h / 159;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
  const drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.w = rect.width;
    view.h = rect.height;
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    view.scale = Math.min(rect.width / WORLD.w, rect.height / WORLD.h);
    view.ox = (rect.width - WORLD.w * view.scale) / 2;
    view.oy = (rect.height - WORLD.h * view.scale) / 2;
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.ox) / view.scale,
      y: (clientY - rect.top - view.oy) / view.scale,
    };
  }

  function emoji(char, x, y, size, { rot = 0, flip = 1, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (flip < 0) ctx.scale(-1, 1);
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.fillStyle = '#000'; // 直前の半透明の色（影など）が絵文字に移らないように
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  function drawSea(time) {
    ctx.fillStyle = '#5ec6e8';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = ((i * 57 + time * 6) % (view.h + 40)) - 20;
      const x = (i * 97) % view.w;
      ctx.beginPath();
      ctx.arc(x, y, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }

  function drawIsland() {
    ctx.fillStyle = '#f3dfa6';
    ctx.beginPath();
    ctx.ellipse(ISLAND.cx, ISLAND.cy, ISLAND.rx + 10, ISLAND.ry + 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ed36a';
    ctx.beginPath();
    ctx.ellipse(ISLAND.cx, ISLAND.cy - 6, ISLAND.rx - 8, ISLAND.ry - 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 道
    ctx.strokeStyle = '#e8d49c';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    const road = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    for (const h of HOUSE_SLOTS) road({ x: h.x, y: h.y + 24 }, PLAZA);
    road(PLAZA, { x: PARK.x, y: PARK.y });
    road(PLAZA, { x: 200, y: 470 });
    road({ x: 200, y: 470 }, ARRIVAL);
    ctx.fillStyle = '#ecd9a6';
    ctx.beginPath();
    ctx.ellipse(PLAZA.x, PLAZA.y + 14, 42, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPark(state, time) {
    ctx.fillStyle = '#7cc25a';
    ctx.beginPath();
    ctx.ellipse(PARK.x, PARK.y, PARK.r + 6, (PARK.r + 6) * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    // ベンチ
    ctx.fillStyle = '#b07a4a';
    ctx.fillRect(PARK.x - 16, PARK.y + 18, 32, 6);
    for (const t of PARK_TREES) emoji('🌳', t.x, t.y + 14, t.s, { rot: Math.sin(time * 1.2 + t.x) * 0.03 });
    if (state.park.roof) emoji('🛖', ROOF.x, ROOF.y + 16, 34);
  }

  function drawCafe(state) {
    const { x, y, w, h } = CAFE;
    const left = x - w / 2;
    const top = y - h / 2;
    ctx.fillStyle = '#fbe9d0';
    ctx.fillRect(left, top, w, h);
    // 日よけ
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? '#fff' : '#e85d4a';
      ctx.fillRect(left + (w / stripes) * i, top - 12, w / stripes, 14);
    }
    ctx.fillStyle = '#6b4a2e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`☕ CAFE${state.cafe.level > 1 ? ' ' + '★'.repeat(state.cafe.level - 1) : ''}`, x, y - 4);
    // 入口
    ctx.fillStyle = '#8b6242';
    ctx.fillRect(left + 8, y + 6, 18, h / 2 - 6);
    // テラス席
    const n = seatCount(state);
    for (let i = 0; i < n; i++) {
      const s = SEATS[i];
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 2, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 2, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHouses(state) {
    for (const house of state.houses) emoji('🏠', house.x, house.y + 22, 42);
  }

  // 夜の窓あかり（暗くする色より上に描く）
  function drawWindows(state, night) {
    for (const house of state.houses) {
      const inside = state.residents.filter((r) => r.homeId === house.id && !r.visible && r.state !== 'PENDING');
      if (night && inside.length > 0) {
        ctx.fillStyle = 'rgba(255,220,120,0.55)';
        ctx.beginPath();
        ctx.arc(house.x, house.y + 4, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawResident(state, r, time, selected) {
    const ph = phaseOf(r.id);
    const moving = Math.hypot(r.tx - r.x, r.ty - r.y) > 0.5 && state.t >= r.pauseUntil;
    let bob;
    let rot = 0;
    if (moving) {
      bob = Math.abs(Math.sin(time * 9 + ph)) * 3;
      rot = Math.sin(time * 9 + ph) * 0.09;
    } else if (r.state === 'PARK') {
      // ときどき ぴょんと跳ねる
      bob = Math.pow(Math.max(0, Math.sin(time * 2.2 + ph)), 12) * 7 + Math.sin(time * 2 + ph) * 1;
    } else {
      bob = Math.sin(time * 2 + ph) * 1.2;
    }
    // 立ち止まっているときは、ときどき振り返る
    let flip = r.facing;
    if (!moving && Math.sin(time * 0.6 + ph * 3) > 0.92) flip = -flip;

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    emoji(r.emoji, r.x, r.y - bob, 24, { rot, flip });

    let bubble = r.bubble;
    if (!bubble && r.state === 'QUEUE' && state.t - r.queuedAt > r.patience * 0.6) bubble = '💦';
    if (bubble) emoji(bubble, r.x + 12, r.y - 26 - Math.sin(time * 3) * 1.5, 15);

    if (selected) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const label = r.name;
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(255,250,240,0.95)';
      ctx.fillRect(r.x - w / 2, r.y - 46, w, 17);
      ctx.fillStyle = '#2d3a40';
      ctx.fillText(label, r.x, r.y - 31);
    }
  }

  function drawSleep(state, time) {
    for (const house of state.houses) {
      const sleeping = state.residents.some((r) => r.homeId === house.id && r.state === 'SLEEP');
      if (sleeping) emoji('💤', house.x + 18, house.y - 14 - ((time * 6) % 8), 14, { alpha: 0.85 });
    }
  }

  function lighting(clock) {
    // 時間帯の色（朝・昼・夕方・夜）
    const hr = clock / 60;
    if (hr >= 22 || hr < 5) return 'rgba(15,25,70,0.48)';
    if (hr < 6.5) return `rgba(15,25,70,${0.48 * (6.5 - hr) / 1.5})`;
    if (hr >= 20) return `rgba(15,25,70,${0.2 + 0.28 * (hr - 20) / 2})`;
    if (hr >= 17.5) return `rgba(255,120,40,${0.18 * (hr - 17.5) / 2.5})`;
    return null;
  }

  function draw(state, time, selectedId) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawSea(time);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    drawIsland();
    for (const p of PALMS) emoji('🌴', p.x, p.y, 30, { rot: Math.sin(time * 1.1 + p.y) * 0.05 });
    drawPark(state, time);
    const clock = clockOf(state.t);
    const night = clock >= 19 * 60 || clock < 6 * 60;
    drawHouses(state);
    drawCafe(state);

    ctx.restore();

    // 天気と時間帯の色は、住民より「下」にかける（主役を色あせさせない）
    const tint = lighting(clock);
    const weatherTint = state.weather === 'rain' ? 'rgba(50,70,100,0.2)' : state.weather === 'cloudy' ? 'rgba(120,130,140,0.12)' : null;
    for (const c of [weatherTint, tint]) {
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, view.w, view.h);
    }

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    const people = state.residents.filter((r) => r.visible).sort((a, b) => a.y - b.y);
    drawWindows(state, night);
    for (const r of people) drawResident(state, r, time, r.id === selectedId);
    drawSleep(state, time);
    ctx.restore();

    if (state.weather === 'rain') {
      ctx.strokeStyle = 'rgba(220,235,255,0.55)';
      ctx.lineWidth = 1.2;
      for (const d of drops) {
        const y = (d.y * view.h + time * 420 * d.s) % view.h;
        const x = (d.x * view.w + time * 40 * d.s) % view.w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y - 11);
        ctx.stroke();
      }
    }
  }

  return { resize, draw, toWorld };
}
