// 施設のあそび その2（2026-10-19）。play.js の6つに続く13か所。紙・ボタン・コインの数え方は play.js が持つ。
// ここには ゲームごとの「はじめる・すすめる・押す・はなす・描く」だけを書く（判定は test から呼べる関数）。
//   カフェ（コーヒーをいれる）   … 押しているあいだ そそぐ。線で はなす。5はいのうち ぴったり（4はいで コイン）
//   コーヒースタンド（つみあげる）… ゆれるカップを押して落とす。半分より ずれたら 落ちる。つめた数（6こで）
//   スーパー（かいものリスト）   … リストの品物だけ押す。まちがえると 1つ へる（6こで）
//   お店（高いのは どっち）       … 値札の高いほうを押す。10回のうち（8回で）
//   スキー場（旗のあいだ）       … 左・右を押して 旗のあいだを通る。12本のうち（9本で・冬だけ）
//   海水浴場（スイカわり）       … 棒がスイカの上に来たら押す。5回のうち（3回で）
//   温泉（湯かげん）             … 押すと あたたまる。「いい湯」に いた秒数（10秒で）
//   マルシェ（目きき）           … いちばん赤いトマトを押す。10回のうち（8回で）
//   ビーチフェス（花火）         … 花火が いちばん上で止まったら押す。8発のうち（6発で）
//   雪まつり（ベルのリズム）     … ベルが 輪に重なったら押す。16こ のうち（12こで）
//   幼稚園（いくつ あった？）    … 少しのあいだ見える風船の数を えらぶ。8回のうち（6回で）
//   ペットショップ（ごはん）     … いぬは ほね・ねこは さかな・うさぎは にんじん。10ぴきのうち（8ひきで）
//   公園（シャボン玉）           … シャボン玉を押して わる。20秒で わった数（15こで）

export const SIZE = 280;
const C = { ink: '#3d5a80', white: '#ffffff', red: '#e56b6f', mustard: '#f2b84b', sky: '#62b6cb', sea: '#3aa6b9', green: '#8cc084', sand: '#f2d8a7', skin: '#f3cfb0', brown: '#a7744f', muted: 'rgba(61,90,128,0.45)', warn: '#c8553d' };
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- 判定（test から呼ぶ）

export const POUR = { cups: 5, line: 0.75, ok: 0.07, fill: 2000 }; // fill：からっぽから いっぱいまで（ミリ秒）
export const pourOk = (level) => Math.abs(level - POUR.line) <= POUR.ok;

export const STACK = { cups: 8, w: 60, h: 22, base: 246 };
export const stackOk = (dx) => Math.abs(dx) <= STACK.w / 2;

export const ITEMS = ['apple', 'banana', 'milk', 'bread', 'carrot', 'fish'];
export const LIST = { items: 14, listed: 7, want: 3 };
export const listScore = (right, wrong) => Math.max(0, right - wrong);

export const PRICE = { rounds: 10, time: 5000 };
export const higher = (a, b) => (a >= b ? 0 : 1);

export const SKI = { gates: 12, lanes: [80, 140, 200], y: 220 };
export const gatePass = (skier, gate) => skier === gate;

export const MELON = { tries: 5, zone: 20 };
export const melonHit = (stickX, melonX) => Math.abs(stickX - melonX) <= MELON.zone;

export const BATH = { secs: 15, lo: 0.55, hi: 0.75, cool: 0.13, heat: 0.075 };
export const goodBath = (t) => t >= BATH.lo && t <= BATH.hi;

export const RIPE = { rounds: 10, time: 5000 };
export const ripest = (list) => list.indexOf(Math.max(...list));

export const FIRE = { shots: 8, rise: 1300, lo: 0.82, hi: 1.15 };
export const fireOk = (k) => k >= FIRE.lo && k <= FIRE.hi;

export const BELL = { notes: 16, hitX: 70, ok: 18, gap: 640, speed: 0.14 }; // speed：1ミリ秒に進む px
export const bellHit = (x) => Math.abs(x - BELL.hitX) <= BELL.ok;

export const COUNT = { rounds: 8, show: 1700, min: 2, max: 9 };
export function countChoices(n) {
  const near = shuffle([n - 1, n + 1, n - 2, n + 2].filter((k) => k >= 1));
  return shuffle([n, near[0], near[1]]);
}

export const FOOD = { dog: 'bone', cat: 'fish', rabbit: 'carrot' };
export const PETS = { rounds: 10, time: 4500 };

export const BUBBLE = { secs: 20, r: 20, every: 520 };
export const bubbleHit = (tx, ty, bx, by) => Math.hypot(tx - bx, ty - by) <= BUBBLE.r + 8;

// 3つの丸ボタン（幼稚園・ペットショップ）
export const BTN = { y: 230, xs: [60, 140, 220], r: 30 };
export const btnAt = (x, y) => BTN.xs.findIndex((cx) => Math.hypot(x - cx, y - BTN.y) <= BTN.r);

// ---------------------------------------------------------------- ゲーム

// api：{ ctx, bg, text, dot, box, dots, msg, finish, add, setScore, score, playing, now }
export const MORE = {
  cafe: {
    title: 'コーヒー', unit: 'はい', how: '押しているあいだ そそぐ。線で はなす',
    make(api) {
      const S = { n: 0, base: 0, from: null, done: null, results: [] };
      const level = (now) => (S.from === null ? S.base : S.base + (now - S.from) / POUR.fill);
      const settle = (now, ok, text) => {
        S.base = level(now);
        S.from = null;
        S.done = { at: now, ok };
        S.results.push(ok);
        if (ok) api.add();
        api.msg(text);
      };
      return {
        start() {
          Object.assign(S, { n: 0, base: 0, from: null, done: null, results: [] });
        },
        frame(now) {
          if (S.from !== null && level(now) >= 1.04) settle(now, false, 'こぼれた');
          if (S.done && now - S.done.at > 900) {
            S.n += 1;
            if (S.n >= POUR.cups) return api.finish(`${POUR.cups}はいのうち ${api.score()}はい ぴったり`);
            Object.assign(S, { base: 0, from: null, done: null });
            api.msg(MORE.cafe.how);
          }
        },
        tap(x, y, now) {
          if (!S.done && S.from === null) S.from = now;
        },
        release(now) {
          if (S.from === null || S.done) return;
          const l = level(now);
          settle(now, pourOk(l), pourOk(l) ? 'ぴったり！' : l < POUR.line ? 'ちょっと少ない' : 'ちょっと多い');
        },
        draw(now) {
          const { ctx, box, dot, text } = api;
          api.bg('#fbf3e4', '#f2d8a7');
          box(0, 236, 280, 44, 0, '#c79a6a');
          const l = Math.min(1, level(now));
          // カップ
          const x0 = 96;
          const top = 110;
          const h = 120;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x0, top);
          ctx.lineTo(x0 + 88, top);
          ctx.lineTo(x0 + 78, top + h);
          ctx.lineTo(x0 + 10, top + h);
          ctx.closePath();
          ctx.fillStyle = C.white;
          ctx.fill();
          ctx.clip();
          ctx.fillStyle = '#8a5a3c';
          ctx.fillRect(x0, top + h - l * h, 88, l * h);
          ctx.restore();
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x0, top);
          ctx.lineTo(x0 + 10, top + h);
          ctx.lineTo(x0 + 78, top + h);
          ctx.lineTo(x0 + 88, top);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x0 + 92, top + 50, 16, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
          // ここまで の線
          const ly = top + h - POUR.line * h;
          ctx.strokeStyle = C.mustard;
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(x0 - 14, ly);
          ctx.lineTo(x0 + 102, ly);
          ctx.stroke();
          ctx.setLineDash([]);
          text('ここまで', 52, ly, 12, C.ink);
          // ポット
          box(150, 28, 70, 46, 14, C.ink);
          ctx.fillStyle = C.ink;
          ctx.beginPath();
          ctx.moveTo(152, 56);
          ctx.lineTo(128, 70);
          ctx.lineTo(134, 76);
          ctx.lineTo(156, 66);
          ctx.fill();
          if (S.from !== null) {
            ctx.strokeStyle = '#8a5a3c';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(131, 76);
            ctx.lineTo(131, top + h - l * h);
            ctx.stroke();
          }
          if (S.done) dot(140, 92, 10, S.done.ok ? C.mustard : 'rgba(61,90,128,0.25)');
          api.dots(S.results, POUR.cups, 262, C.mustard, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)');
        },
      };
    },
  },

  stand: {
    title: 'カップつみ', unit: 'こ', how: 'ゆれるカップを 押して 落とす',
    make(api) {
      const S = { stack: [], t0: 0, drop: null, fall: null, speed: 1 };
      const swingX = (now) => 140 + Math.sin(((now - S.t0) / 1000) * 2.4 * S.speed) * 90;
      const topY = () => STACK.base - S.stack.length * STACK.h;
      return {
        start(now) {
          Object.assign(S, { stack: [140], t0: now, drop: null, fall: null, speed: 1 });
          api.setScore(0);
        },
        frame(now) {
          if (S.drop && now - S.drop.t0 > 280) {
            const under = S.stack.at(-1);
            if (stackOk(S.drop.x - under)) {
              S.stack.push(S.drop.x);
              api.setScore(S.stack.length - 1);
              S.drop = null;
              S.speed = 1 + api.score() * 0.12;
              S.t0 = now;
              if (api.score() >= STACK.cups) return api.finish(`${STACK.cups}こ ぜんぶ つめた`);
              api.msg(`${api.score()}こ`);
            } else {
              S.fall = { x: S.drop.x, t0: now };
              S.drop = null;
              api.msg('おちた');
            }
          }
          if (S.fall && now - S.fall.t0 > 700) return api.finish(`${api.score()}こ つめた`);
        },
        tap(x, y, now) {
          if (S.drop || S.fall) return;
          S.drop = { x: swingX(now), t0: now };
        },
        draw(now) {
          const { ctx, box } = api;
          api.bg('#fff6df', '#f2d8a7');
          box(0, STACK.base + STACK.h / 2, 280, 40, 0, '#c79a6a');
          const cup = (x, y, alpha = 1) => {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = C.white;
            ctx.beginPath();
            ctx.moveTo(x - STACK.w / 2, y - STACK.h / 2);
            ctx.lineTo(x + STACK.w / 2, y - STACK.h / 2);
            ctx.lineTo(x + STACK.w / 2 - 6, y + STACK.h / 2);
            ctx.lineTo(x - STACK.w / 2 + 6, y + STACK.h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            box(x - STACK.w / 2 + 4, y - 3, STACK.w - 8, 7, 2, C.sky);
            ctx.globalAlpha = 1;
          };
          S.stack.forEach((x, i) => cup(x, STACK.base - i * STACK.h));
          const playing = api.playing();
          const holdY = Math.min(48, topY() - 60);
          if (playing && !S.drop && !S.fall) cup(swingX(now), holdY);
          if (S.drop) {
            const k = Math.min(1, (now - S.drop.t0) / 280);
            cup(S.drop.x, holdY + (topY() - holdY) * k);
          }
          if (S.fall) {
            const k = (now - S.fall.t0) / 700;
            ctx.save();
            ctx.translate(S.fall.x + (S.fall.x > S.stack.at(-1) ? 1 : -1) * k * 40, topY() + k * k * 200);
            ctx.rotate((S.fall.x > S.stack.at(-1) ? 1 : -1) * k * 2);
            cup(0, 0, 1 - k * 0.5);
            ctx.restore();
          }
          if (!playing && api.phase() === 'ready') cup(140, 48);
          api.text(`${api.score()}こ`, 248, 18, 13, C.muted);
        },
      };
    },
  },

  super: {
    title: 'かいもの', unit: 'こ', how: 'リストの品物だけ 押す',
    make(api) {
      const S = { want: [], belt: [], spawned: 0, next: 0, right: 0, wrong: 0, marks: [] };
      return {
        start(now) {
          const want = shuffle([...ITEMS]).slice(0, LIST.want);
          const others = ITEMS.filter((k) => !want.includes(k));
          const order = shuffle([...Array.from({ length: LIST.listed }, () => pick(want)), ...Array.from({ length: LIST.items - LIST.listed }, () => pick(others))]);
          Object.assign(S, { want, order, belt: [], spawned: 0, next: now + 600, right: 0, wrong: 0, marks: [] });
          api.setScore(0);
        },
        frame(now) {
          if (S.spawned < LIST.items && now >= S.next) {
            S.belt.push({ kind: S.order[S.spawned], t0: now, hit: null });
            S.spawned += 1;
            S.next = now + Math.max(620, 1000 - S.spawned * 25);
          }
          for (const it of S.belt) it.x = 300 - (now - it.t0) * 0.11;
          S.belt = S.belt.filter((it) => it.x > -30 && !(it.hit && now - it.hit.at > 300));
          if (S.spawned >= LIST.items && !S.belt.length) return api.finish(`リストの品物 ${S.right}こ${S.wrong ? `・まちがい ${S.wrong}こ` : ''}`);
        },
        tap(x, y, now) {
          const it = S.belt.find((b) => !b.hit && Math.hypot(b.x - x, 176 - y) <= 32);
          if (!it) return;
          const ok = S.want.includes(it.kind);
          it.hit = { at: now, ok };
          if (ok) S.right += 1;
          else S.wrong += 1;
          api.setScore(listScore(S.right, S.wrong));
          api.msg(ok ? 'リストにある！' : 'リストに ないよ');
        },
        draw(now) {
          const { box, text } = api;
          api.bg('#f4f9fc', '#e8f3fa');
          // リスト
          box(70, 12, 140, 70, 10, C.white);
          text('かいものリスト', 140, 26, 12, C.muted);
          S.want.forEach((k, i) => drawThing(api, k, 105 + i * 35, 56, 0.85));
          // ベルト
          box(0, 150, 280, 52, 0, '#5d6d7e');
          for (let x = (-(now / 9) % 28) - 28; x < 280; x += 28) box(x, 198, 14, 4, 0, 'rgba(255,255,255,0.25)');
          box(0, 202, 280, 78, 0, '#e8dccb');
          for (const it of S.belt) {
            if (it.hit) api.ctx.globalAlpha = 1 - Math.min(1, (now - it.hit.at) / 300);
            drawThing(api, it.kind, it.x, 176, 1.1);
            if (it.hit) {
              api.ctx.strokeStyle = it.hit.ok ? C.mustard : C.warn;
              api.ctx.lineWidth = 3;
              api.ctx.beginPath();
              api.ctx.arc(it.x, 176, 26, 0, Math.PI * 2);
              api.ctx.stroke();
            }
            api.ctx.globalAlpha = 1;
          }
          text(`${api.score()}こ`, 140, 244, 16, C.ink);
        },
      };
    },
  },

  shop: {
    title: 'どっちが高い', unit: '回', how: '値段の 高いほうを 押す',
    make(api) {
      const S = { n: 0, q: null, t0: 0, picked: null, results: [] };
      const newQ = (now) => {
        const a = 10 * Math.floor(rand(1, 100));
        let b = a;
        while (b === a) b = 10 * Math.floor(rand(1, 100));
        const [ka, kb] = shuffle([...ITEMS]);
        S.q = { prices: [a, b], kinds: [ka, kb] };
        S.t0 = now;
        S.picked = null;
      };
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [] });
          newQ(now);
        },
        frame(now) {
          if (!S.picked && now - S.t0 > PRICE.time) {
            S.picked = { at: now, i: -1, ok: false };
            S.results.push(false);
            api.msg('時間切れ');
          } else if (S.picked && now - S.picked.at > (S.picked.ok ? 650 : 1100)) {
            S.n += 1;
            if (S.n >= PRICE.rounds) return api.finish(`${PRICE.rounds}回のうち ${api.score()}回 あたり`);
            newQ(now);
            api.msg(MORE.shop.how);
          }
        },
        tap(x, y, now) {
          if (S.picked || y < 40) return;
          const i = x < 140 ? 0 : 1;
          const ok = i === higher(...S.q.prices);
          S.picked = { at: now, i, ok };
          S.results.push(ok);
          if (ok) api.add();
          api.msg(ok ? 'あたり！' : `${S.q.prices[higher(...S.q.prices)]}コインのほうが 高い`);
        },
        draw(now) {
          const { box, text, ctx } = api;
          api.bg('#fbf3e4', C.sand);
          // たな
          box(10, 160, 260, 12, 4, '#c79a6a');
          box(139, 30, 2, 200, 0, 'rgba(61,90,128,0.12)');
          if (api.playing() && S.q) {
            S.q.kinds.forEach((k, i) => {
              const cx = 72 + i * 136;
              const win = i === higher(...S.q.prices);
              drawThing(api, k, cx, 118, 2);
              box(cx - 40, 184, 80, 34, 8, S.picked && win ? C.mustard : C.white);
              ctx.strokeStyle = S.picked && S.picked.i === i && !S.picked.ok ? C.warn : C.ink;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(cx - 40, 184, 80, 34, 8);
              ctx.stroke();
              text(`${S.q.prices[i]}`, cx, 202, 20, C.ink);
            });
            if (!S.picked) {
              const left = Math.max(0, 1 - (now - S.t0) / PRICE.time);
              box(40, 14, 200, 6, 3, 'rgba(61,90,128,0.12)');
              box(40, 14, 200 * left, 6, 3, C.mustard);
            }
          }
          api.dots(S.results, PRICE.rounds, 262);
        },
      };
    },
  },

  ski: {
    title: '旗のあいだ', unit: '本', how: '左・右を押して 旗のあいだを 通る',
    make(api) {
      const S = { lane: 1, shown: 1, gates: [], spawned: 0, next: 0, results: [], speed: 0.12 };
      return {
        start(now) {
          Object.assign(S, { lane: 1, shown: 1, gates: [], spawned: 0, next: now + 400, results: [], speed: 0.12 });
        },
        frame(now) {
          if (S.spawned < SKI.gates && now >= S.next) {
            S.gates.push({ lane: Math.floor(Math.random() * 3), t0: now, done: null });
            S.spawned += 1;
            S.speed = 0.12 + S.spawned * 0.006;
            S.next = now + 640 / (S.speed / 0.12);
          }
          for (const g of S.gates) {
            g.y = -20 + (now - g.t0) * S.speed;
            if (!g.done && g.y >= SKI.y) {
              const ok = gatePass(S.lane, g.lane);
              g.done = { ok };
              S.results.push(ok);
              if (ok) api.add();
              api.msg(ok ? 'とおった！' : 'はずれた');
            }
          }
          S.gates = S.gates.filter((g) => g.y < 300);
          S.shown += (S.lane - S.shown) * 0.3;
          if (S.spawned >= SKI.gates && !S.gates.length) return api.finish(`${SKI.gates}本のうち ${api.score()}本 とおった`);
        },
        tap(x) {
          S.lane = Math.max(0, Math.min(2, S.lane + (x < 140 ? -1 : 1)));
        },
        draw() {
          const { ctx, dot, box } = api;
          api.bg('#ffffff', '#e8f3fa');
          for (const [x, y] of [[16, 60], [264, 120], [20, 190], [262, 30], [14, 250], [266, 230]]) {
            ctx.fillStyle = '#6fa56a';
            ctx.beginPath();
            ctx.moveTo(x, y - 18);
            ctx.lineTo(x - 10, y + 8);
            ctx.lineTo(x + 10, y + 8);
            ctx.fill();
          }
          for (const g of S.gates) {
            const cx = SKI.lanes[g.lane];
            for (const [dx, col] of [[-26, C.red], [26, C.sky]]) {
              box(cx + dx - 1.5, g.y - 22, 3, 24, 1, C.ink);
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.moveTo(cx + dx, g.y - 22);
              ctx.lineTo(cx + dx + (dx < 0 ? 12 : -12), g.y - 16);
              ctx.lineTo(cx + dx, g.y - 10);
              ctx.fill();
            }
          }
          // スキーをする人
          const x = 80 + S.shown * 60;
          box(x - 12, SKI.y + 6, 4, 16, 2, C.ink);
          box(x + 8, SKI.y + 6, 4, 16, 2, C.ink);
          box(x - 7, SKI.y - 8, 14, 16, 5, C.red);
          dot(x, SKI.y - 14, 6, C.skin);
          api.text('← 左', 40, 268, 12, C.muted);
          api.text('右 →', 240, 268, 12, C.muted);
          api.dots(S.results, SKI.gates, 268);
        },
      };
    },
  },

  beach: {
    title: 'スイカわり', unit: '回', how: '棒が スイカの上に来たら 押す',
    make(api) {
      const S = { n: 0, t0: 0, melon: 140, hit: null, results: [], speed: 1 };
      const stickX = (now) => 140 + Math.sin(((now - S.t0) / 1000) * 2.6 * S.speed) * 110;
      const next = (now) => Object.assign(S, { t0: now, melon: rand(50, 230), hit: null, speed: 1 + S.n * 0.15 });
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [] });
          next(now);
        },
        frame(now) {
          if (S.hit && now - S.hit.at > 1000) {
            S.n += 1;
            if (S.n >= MELON.tries) return api.finish(`${MELON.tries}回のうち ${api.score()}回 われた`);
            next(now);
            api.msg(MORE.beach.how);
          }
        },
        tap(x, y, now) {
          if (S.hit) return;
          const sx = stickX(now);
          const ok = melonHit(sx, S.melon);
          S.hit = { at: now, ok, x: sx };
          S.results.push(ok);
          if (ok) api.add();
          api.msg(ok ? 'われた！' : 'すなを たたいた');
        },
        draw(now) {
          const { ctx, dot, box } = api;
          api.bg('#bfe9f5', '#bfe9f5');
          box(0, 60, 280, 50, 0, C.sea);
          box(0, 110, 280, 170, 0, '#f6dfb4');
          const my = 190;
          if (S.hit?.ok) {
            for (const s of [-1, 1]) {
              ctx.fillStyle = '#5c9a55';
              ctx.beginPath();
              ctx.arc(S.melon + s * 14, my, 24, s < 0 ? Math.PI / 2 : -Math.PI / 2, s < 0 ? Math.PI * 1.5 : Math.PI / 2);
              ctx.fill();
              ctx.fillStyle = C.red;
              ctx.beginPath();
              ctx.arc(S.melon + s * 14, my, 19, s < 0 ? Math.PI / 2 : -Math.PI / 2, s < 0 ? Math.PI * 1.5 : Math.PI / 2);
              ctx.fill();
            }
          } else {
            dot(S.melon, my, 24, '#5c9a55');
            ctx.strokeStyle = '#2f5d34';
            ctx.lineWidth = 2.5;
            for (const dx of [-12, 0, 12]) {
              ctx.beginPath();
              ctx.moveTo(S.melon + dx * 0.6, my - 22);
              ctx.quadraticCurveTo(S.melon + dx * 1.5, my, S.melon + dx * 0.6, my + 22);
              ctx.stroke();
            }
          }
          const sx = S.hit ? S.hit.x : api.playing() ? stickX(now) : 140;
          const down = S.hit ? Math.min(1, (now - S.hit.at) / 150) : 0;
          ctx.save();
          ctx.translate(sx, 120 + down * 46);
          box(-3, -60, 6, 70, 3, C.brown);
          ctx.restore();
          ctx.strokeStyle = 'rgba(61,90,128,0.3)';
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.moveTo(sx, 132 + down * 46);
          ctx.lineTo(sx, 222);
          ctx.stroke();
          ctx.setLineDash([]);
          api.dots(S.results, MELON.tries, 262);
        },
      };
    },
  },

  onsen: {
    title: '湯かげん', unit: '秒', how: '押すと あたたまる。「いい湯」を まもる',
    make(api) {
      const S = { t: 0.4, t0: 0, last: 0, good: 0 };
      return {
        start(now) {
          Object.assign(S, { t: 0.4, t0: now, last: now, good: 0 });
          api.setScore(0);
        },
        frame(now) {
          const dt = (now - S.last) / 1000;
          S.last = now;
          S.t = Math.max(0, Math.min(1, S.t - BATH.cool * dt * (1 + Math.sin(now / 700) * 0.4)));
          if (goodBath(S.t)) S.good += dt;
          api.setScore(Math.floor(S.good));
          if (now - S.t0 >= BATH.secs * 1000) return api.finish(`いい湯 ${api.score()}秒`);
        },
        tap() {
          S.t = Math.min(1, S.t + BATH.heat);
        },
        draw(now) {
          const { ctx, box, text } = api;
          api.bg('#e8f3fa', '#f4f9fc');
          // おけ
          const warm = S.t;
          const water = `rgb(${Math.round(98 + warm * 150)},${Math.round(182 - warm * 70)},${Math.round(203 - warm * 110)})`;
          box(50, 140, 160, 100, 18, C.brown);
          box(58, 148, 144, 80, 12, water);
          for (const y of [160, 200]) box(50, y, 160, 4, 0, 'rgba(61,90,128,0.25)');
          // 湯気
          ctx.strokeStyle = `rgba(255,255,255,${0.2 + warm * 0.7})`;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          for (const x of [90, 130, 170]) {
            const s = Math.sin(now / 300 + x) * 6;
            ctx.beginPath();
            ctx.moveTo(x, 136);
            ctx.quadraticCurveTo(x + s, 116, x, 96 - warm * 30);
            ctx.stroke();
          }
          // 温度計
          box(232, 40, 22, 200, 11, C.white);
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(232, 40, 22, 200, 11);
          ctx.stroke();
          const yOf = (v) => 236 - v * 192;
          box(232, yOf(BATH.hi), 22, yOf(BATH.lo) - yOf(BATH.hi), 0, 'rgba(242,184,75,0.45)');
          box(238, yOf(S.t), 10, 236 - yOf(S.t), 5, goodBath(S.t) ? C.mustard : S.t > BATH.hi ? C.red : C.sky);
          text('いい湯', 206, (yOf(BATH.hi) + yOf(BATH.lo)) / 2, 11, C.ink);
          if (api.playing()) {
            const left = Math.max(0, BATH.secs - (now - S.t0) / 1000);
            text(`のこり ${Math.ceil(left)}秒`, 60, 24, 13, C.muted);
          }
          text(`いい湯 ${api.score()}秒`, 130, 262, 15, C.ink);
        },
      };
    },
  },

  marche: {
    title: '目きき', unit: '回', how: 'いちばん赤い トマトを 押す',
    make(api) {
      const S = { n: 0, ripe: [], t0: 0, picked: null, results: [] };
      const newQ = (now) => {
        const gap = Math.max(0.08, 0.35 - S.n * 0.03); // 進むほど 似た色になる
        const best = 1;
        const others = [rand(0.2, 1 - gap - 0.1), rand(0.2, 1 - gap)];
        S.ripe = shuffle([best, ...others]);
        S.t0 = now;
        S.picked = null;
      };
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [] });
          newQ(now);
        },
        frame(now) {
          if (!S.picked && now - S.t0 > RIPE.time) {
            S.picked = { at: now, i: -1, ok: false };
            S.results.push(false);
            api.msg('時間切れ');
          } else if (S.picked && now - S.picked.at > (S.picked.ok ? 600 : 1000)) {
            S.n += 1;
            if (S.n >= RIPE.rounds) return api.finish(`${RIPE.rounds}回のうち ${api.score()}回 あたり`);
            newQ(now);
            api.msg(MORE.marche.how);
          }
        },
        tap(x, y, now) {
          if (S.picked) return;
          const i = BTN.xs.findIndex((cx) => Math.hypot(x - cx, y - 150) <= 40);
          if (i < 0) return;
          const ok = i === ripest(S.ripe);
          S.picked = { at: now, i, ok };
          S.results.push(ok);
          if (ok) api.add();
          api.msg(ok ? 'おいしそう！' : 'まだ 少し青い');
        },
        draw(now) {
          const { ctx, dot, box } = api;
          api.bg('#fff6df', '#f2d8a7');
          box(10, 186, 260, 20, 6, C.brown);
          const mix = (v) => {
            const a = [140, 192, 132];
            const b = [229, 90, 80];
            return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * v)).join(',')})`;
          };
          if (api.playing()) {
            S.ripe.forEach((v, i) => {
              const cx = BTN.xs[i];
              dot(cx + 2, 153, 34, 'rgba(20,60,70,0.15)');
              dot(cx, 150, 34, mix(v));
              ctx.fillStyle = '#4f8a4a';
              ctx.beginPath();
              for (let k = 0; k < 5; k++) {
                const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
                ctx.moveTo(cx, 118);
                ctx.lineTo(cx + Math.cos(a) * 12, 118 + Math.sin(a) * 6);
              }
              ctx.lineWidth = 4;
              ctx.strokeStyle = '#4f8a4a';
              ctx.stroke();
              if (S.picked && (i === S.picked.i || i === ripest(S.ripe))) {
                ctx.strokeStyle = i === ripest(S.ripe) ? C.mustard : C.warn;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, 150, 40, 0, Math.PI * 2);
                ctx.stroke();
              }
            });
            if (!S.picked) {
              const left = Math.max(0, 1 - (now - S.t0) / RIPE.time);
              box(40, 40, 200, 6, 3, 'rgba(61,90,128,0.12)');
              box(40, 40, 200 * left, 6, 3, C.mustard);
            }
          }
          api.dots(S.results, RIPE.rounds, 262);
        },
      };
    },
  },

  beachfest: {
    title: '花火', unit: '発', how: '花火が いちばん上で 止まったら 押す',
    make(api) {
      const S = { n: 0, shot: null, results: [], bursts: [] };
      const k = (now) => (now - S.shot.t0) / S.shot.rise;
      const y = (now) => {
        const q = Math.min(1, k(now));
        return 236 - (236 - S.shot.top) * (1 - (1 - q) * (1 - q));
      };
      const fire = (now) => {
        S.shot = { t0: now + 400, rise: FIRE.rise - S.n * 40, top: rand(50, 110), x: rand(60, 220), done: false };
      };
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [], bursts: [] });
          fire(now);
        },
        frame(now) {
          if (!S.shot.done && now > S.shot.t0 && k(now) > FIRE.hi) {
            S.shot.done = true;
            S.shot.at = now;
            S.results.push(false);
            api.msg('消えちゃった');
          }
          if (S.shot.done && now - S.shot.at > 900) {
            S.n += 1;
            if (S.n >= FIRE.shots) return api.finish(`${FIRE.shots}発のうち ${api.score()}発 きれいに ひらいた`);
            fire(now);
            api.msg(MORE.beachfest.how);
          }
        },
        tap(x, yy, now) {
          if (S.shot.done || now < S.shot.t0) return;
          const ok = fireOk(k(now));
          S.shot.done = true;
          S.shot.at = now;
          S.results.push(ok);
          if (ok) {
            api.add();
            S.bursts.push({ x: S.shot.x, y: y(now), t0: now, col: pick([C.mustard, C.red, C.white, C.sky]) });
          }
          api.msg(ok ? 'ドーン！' : k(now) < FIRE.lo ? 'まだ のぼっている' : 'おそかった');
        },
        draw(now) {
          const { ctx, dot, box } = api;
          api.bg('#1f2f52', '#3d5a80');
          box(0, 236, 280, 44, 0, '#2a6f86');
          box(90, 216, 100, 20, 4, '#c79a6a');
          for (const b of S.bursts) {
            const t = (now - b.t0) / 900;
            if (t > 1) continue;
            ctx.globalAlpha = 1 - t;
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * Math.PI * 2;
              dot(b.x + Math.cos(a) * t * 50, b.y + Math.sin(a) * t * 50 + t * t * 10, 3.5, b.col);
            }
            ctx.globalAlpha = 1;
          }
          if (api.playing() && S.shot && !S.shot.done && now > S.shot.t0) {
            const yy = y(now);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(S.shot.x, yy + 6);
            ctx.lineTo(S.shot.x, Math.min(236, yy + 40));
            ctx.stroke();
            dot(S.shot.x, yy, 4, C.mustard);
          }
          api.dots(S.results, FIRE.shots, 262, C.mustard, 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.12)');
        },
      };
    },
  },

  snowfest: {
    title: 'ベルのリズム', unit: 'こ', how: 'ベルが 輪に 重なったら 押す',
    make(api) {
      const S = { notes: [], t0: 0, flash: null };
      return {
        start(now) {
          // 2こ・1こ・休み の ちいさな くりかえし
          const beats = [];
          let t = 900;
          for (let i = 0; beats.length < BELL.notes; i++) {
            beats.push(t);
            t += BELL.gap * (i % 3 === 2 ? 1.5 : 1);
          }
          S.notes = beats.map((at) => ({ at, done: null }));
          S.t0 = now;
          S.flash = null;
          api.setScore(0);
        },
        frame(now) {
          const t = now - S.t0;
          for (const n of S.notes) {
            n.x = BELL.hitX + (n.at - t) * BELL.speed;
            if (!n.done && n.x < BELL.hitX - BELL.ok - 4) n.done = { ok: false };
          }
          if (S.notes.every((n) => n.done) && t > S.notes.at(-1).at + 500) return api.finish(`${BELL.notes}このうち ${api.score()}こ あった`);
        },
        tap(x, y, now) {
          const t = now - S.t0;
          const n = S.notes.find((m) => !m.done && bellHit(BELL.hitX + (m.at - t) * BELL.speed));
          if (!n) return;
          n.done = { ok: true };
          api.add();
          S.flash = now;
        },
        draw(now) {
          const { ctx, dot } = api;
          api.bg('#1f2f52', '#e8f3fa');
          for (let i = 0; i < 30; i++) dot((i * 89) % 280, ((i * 53 + now / 30) % 260) + 10, 2, 'rgba(255,255,255,0.7)');
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 140);
          ctx.lineTo(280, 140);
          ctx.stroke();
          const lit = S.flash && now - S.flash < 180;
          dot(BELL.hitX, 140, 26, lit ? 'rgba(242,184,75,0.6)' : 'rgba(255,255,255,0.15)');
          ctx.strokeStyle = C.mustard;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(BELL.hitX, 140, 22, 0, Math.PI * 2);
          ctx.stroke();
          if (api.playing()) {
            for (const n of S.notes) {
              if (n.done || n.x > 300) continue;
              ctx.fillStyle = C.mustard;
              ctx.beginPath();
              ctx.moveTo(n.x - 12, 150);
              ctx.quadraticCurveTo(n.x - 11, 126, n.x, 126);
              ctx.quadraticCurveTo(n.x + 11, 126, n.x + 12, 150);
              ctx.closePath();
              ctx.fill();
              dot(n.x, 152, 3.5, C.ink);
            }
          }
          api.text(`${api.score()}こ`, 140, 230, 18, C.ink);
          const done = S.notes.filter((n) => n.done).map((n) => n.done.ok);
          api.dots(done, BELL.notes, 262);
        },
      };
    },
  },

  kinder: {
    title: 'いくつ？', unit: '回', how: '風船は いくつ？',
    make(api) {
      const S = { n: 0, balls: [], choices: [], t0: 0, picked: null, results: [] };
      const newQ = (now) => {
        const n = Math.floor(rand(COUNT.min, COUNT.max + 1));
        const balls = [];
        while (balls.length < n) {
          const b = { x: rand(36, 244), y: rand(40, 170), col: pick([C.red, C.mustard, C.sky, C.green]) };
          if (balls.every((o) => Math.hypot(o.x - b.x, o.y - b.y) > 42)) balls.push(b);
        }
        Object.assign(S, { balls, choices: countChoices(n), t0: now + 300, picked: null });
      };
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [] });
          newQ(now);
        },
        frame(now) {
          if (S.picked && now - S.picked.at > (S.picked.ok ? 700 : 1400)) {
            S.n += 1;
            if (S.n >= COUNT.rounds) return api.finish(`${COUNT.rounds}回のうち ${api.score()}回 あたり`);
            newQ(now);
            api.msg(MORE.kinder.how);
          }
        },
        tap(x, y, now) {
          if (S.picked || now - S.t0 < COUNT.show) return;
          const i = btnAt(x, y);
          if (i < 0) return;
          const ok = S.choices[i] === S.balls.length;
          S.picked = { at: now, i, ok };
          S.results.push(ok);
          if (ok) api.add();
          api.msg(ok ? 'あたり！' : `${S.balls.length}こ だった`);
        },
        draw(now) {
          const { ctx, dot, text } = api;
          api.bg('#e8f3fa', '#fff6df');
          const show = api.playing() && (now - S.t0 < COUNT.show || S.picked);
          if (show && now >= S.t0) {
            for (const b of S.balls) {
              ctx.strokeStyle = C.muted;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(b.x, b.y + 16);
              ctx.lineTo(b.x, b.y + 32);
              ctx.stroke();
              ctx.fillStyle = b.col;
              ctx.beginPath();
              ctx.ellipse(b.x, b.y, 13, 16, 0, 0, Math.PI * 2);
              ctx.fill();
              dot(b.x - 4, b.y - 6, 3, 'rgba(255,255,255,0.6)');
            }
          } else if (api.playing() && now >= S.t0) {
            text('いくつ あった？', 140, 110, 20, C.ink);
          }
          if (api.playing() && now - S.t0 >= COUNT.show) {
            BTN.xs.forEach((cx, i) => {
              const n = S.choices[i];
              const right = S.picked && n === S.balls.length;
              const wrong = S.picked && S.picked.i === i && !S.picked.ok;
              dot(cx + 2, BTN.y + 3, BTN.r, 'rgba(20,60,70,0.18)');
              dot(cx, BTN.y, BTN.r, right ? C.mustard : wrong ? C.red : C.white);
              text(String(n), cx, BTN.y + 1, 24, right || wrong ? C.white : C.ink);
            });
          }
          api.dots(S.results, COUNT.rounds, 268);
        },
      };
    },
  },

  petshop: {
    title: 'ごはん', unit: 'ひき', how: 'すきな ごはんを 押す',
    make(api) {
      const S = { n: 0, pet: 'dog', foods: [], t0: 0, picked: null, results: [] };
      const newQ = (now) => Object.assign(S, { pet: pick(Object.keys(FOOD)), foods: shuffle(['bone', 'fish', 'carrot']), t0: now, picked: null });
      return {
        start(now) {
          Object.assign(S, { n: 0, results: [] });
          newQ(now);
        },
        frame(now) {
          if (!S.picked && now - S.t0 > PETS.time) {
            S.picked = { at: now, i: -1, ok: false };
            S.results.push(false);
            api.msg('おなかが すいて 行っちゃった');
          } else if (S.picked && now - S.picked.at > (S.picked.ok ? 650 : 1100)) {
            S.n += 1;
            if (S.n >= PETS.rounds) return api.finish(`${PETS.rounds}ひきのうち ${api.score()}ひき よろこんだ`);
            newQ(now);
            api.msg(MORE.petshop.how);
          }
        },
        tap(x, y, now) {
          if (S.picked) return;
          const i = btnAt(x, y);
          if (i < 0) return;
          const ok = S.foods[i] === FOOD[S.pet];
          S.picked = { at: now, i, ok };
          S.results.push(ok);
          if (ok) api.add();
          api.msg(ok ? 'よろこんでいる！' : 'それは たべないみたい');
        },
        draw(now) {
          const { dot, box } = api;
          api.bg('#fff6df', '#f2d8a7');
          box(0, 196, 280, 84, 0, '#e8dccb');
          if (api.playing()) {
            const hop = S.picked?.ok ? Math.abs(Math.sin((now - S.picked.at) / 120)) * 12 : 0;
            drawPet(api, S.pet, 140, 128 - hop);
            api.text('いぬ → ほね　ねこ → さかな　うさぎ → にんじん', 140, 42, 11, C.muted);
            S.foods.forEach((f, i) => {
              const cx = BTN.xs[i];
              const right = S.picked && f === FOOD[S.pet];
              const wrong = S.picked && S.picked.i === i && !S.picked.ok;
              dot(cx + 2, BTN.y + 3, BTN.r, 'rgba(20,60,70,0.18)');
              dot(cx, BTN.y, BTN.r, right ? C.mustard : wrong ? C.red : C.white);
              drawThing(api, f, cx, BTN.y, 1);
            });
            if (!S.picked) {
              const left = Math.max(0, 1 - (now - S.t0) / PETS.time);
              box(40, 20, 200, 6, 3, 'rgba(61,90,128,0.12)');
              box(40, 20, 200 * left, 6, 3, C.mustard);
            }
          }
          api.dots(S.results, PETS.rounds, 270);
        },
      };
    },
  },

  park: {
    title: 'シャボン玉', unit: 'こ', how: 'シャボン玉を 押して わる',
    make(api) {
      const S = { t0: 0, next: 0, bubbles: [], pops: [] };
      return {
        start(now) {
          Object.assign(S, { t0: now, next: now, bubbles: [], pops: [] });
          api.setScore(0);
        },
        frame(now) {
          if (now - S.t0 >= BUBBLE.secs * 1000) return api.finish(`${BUBBLE.secs}秒で ${api.score()}こ わった`);
          if (now >= S.next) {
            S.bubbles.push({ x0: rand(30, 250), t0: now, v: rand(0.045, 0.08), w: rand(0, 6), r: rand(15, 22) });
            S.next = now + BUBBLE.every * rand(0.6, 1.2);
          }
          for (const b of S.bubbles) {
            b.y = 290 - (now - b.t0) * b.v;
            b.x = b.x0 + Math.sin((now - b.t0) / 500 + b.w) * 16;
          }
          S.bubbles = S.bubbles.filter((b) => b.y > -30);
          S.pops = S.pops.filter((p) => now - p.at < 300);
        },
        tap(x, y, now) {
          const b = S.bubbles.find((o) => bubbleHit(x, y, o.x, o.y));
          if (!b) return;
          S.bubbles = S.bubbles.filter((o) => o !== b);
          S.pops.push({ x: b.x, y: b.y, r: b.r, at: now });
          api.add();
        },
        draw(now) {
          const { ctx, dot, text } = api;
          api.bg('#bfe9f5', '#e8f3fa');
          ctx.fillStyle = C.green;
          ctx.beginPath();
          ctx.ellipse(140, 300, 220, 60, 0, 0, Math.PI * 2);
          ctx.fill();
          for (const b of S.bubbles) {
            dot(b.x, b.y, b.r, 'rgba(255,255,255,0.35)');
            ctx.strokeStyle = 'rgba(98,182,203,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            dot(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 'rgba(255,255,255,0.9)');
          }
          for (const p of S.pops) {
            const t = (now - p.at) / 300;
            ctx.strokeStyle = `rgba(242,184,75,${1 - t})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(p.x + Math.cos(a) * p.r * 0.6, p.y + Math.sin(a) * p.r * 0.6);
              ctx.lineTo(p.x + Math.cos(a) * p.r * (1 + t), p.y + Math.sin(a) * p.r * (1 + t));
              ctx.stroke();
            }
          }
          if (api.playing()) text(`のこり ${Math.ceil(Math.max(0, BUBBLE.secs - (now - S.t0) / 1000))}秒`, 60, 20, 13, C.muted);
          text(`${api.score()}こ`, 230, 20, 15, C.ink);
        },
      };
    },
  },
};

// ---------------------------------------------------------------- 小さな絵（品物・ごはん・ペット）

export function drawThing(api, kind, x, y, s = 1) {
  const { ctx, dot } = api;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = C.ink;
  if (kind === 'apple') {
    dot(0, 2, 11, C.red);
    ctx.fillStyle = '#4f8a4a';
    ctx.beginPath();
    ctx.ellipse(4, -10, 5, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'banana') {
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -10, 16, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  } else if (kind === 'milk') {
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(0, -14);
    ctx.lineTo(8, -6);
    ctx.lineTo(8, 13);
    ctx.lineTo(-8, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.sky;
    ctx.fillRect(-8, 0, 16, 6);
  } else if (kind === 'bread') {
    ctx.fillStyle = '#d9a066';
    ctx.beginPath();
    ctx.roundRect(-13, -8, 26, 18, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(61,90,128,0.4)';
    for (const dx of [-5, 1, 7]) {
      ctx.beginPath();
      ctx.moveTo(dx - 2, -5);
      ctx.lineTo(dx + 2, 0);
      ctx.stroke();
    }
  } else if (kind === 'carrot') {
    ctx.fillStyle = '#ee8a3a';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4f8a4a';
    ctx.beginPath();
    ctx.ellipse(-3, -12, 2.5, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(3, -12, 2.5, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'fish') {
    ctx.fillStyle = C.sky;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-15, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    dot(6, -2, 1.6, C.ink);
  } else if (kind === 'bone') {
    ctx.fillStyle = '#f1e3c8';
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    for (const [dx, dy] of [[-10, -4], [-10, 4], [10, -4], [10, 4]]) {
      ctx.moveTo(dx + 4.5, dy);
      ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    }
    ctx.rect(-10, -3, 20, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-9, -2, 18, 4);
  }
  ctx.restore();
}

function drawPet(api, kind, x, y) {
  const { ctx, dot } = api;
  const col = { dog: '#d9a066', cat: '#9aa2aa', rabbit: C.white }[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  // 耳
  ctx.beginPath();
  if (kind === 'dog') {
    ctx.ellipse(-30, -6, 10, 22, 0.3, 0, Math.PI * 2);
    ctx.ellipse(30, -6, 10, 22, -0.3, 0, Math.PI * 2);
  } else if (kind === 'cat') {
    ctx.moveTo(-34, -14);
    ctx.lineTo(-24, -46);
    ctx.lineTo(-8, -26);
    ctx.moveTo(34, -14);
    ctx.lineTo(24, -46);
    ctx.lineTo(8, -26);
  } else {
    ctx.ellipse(-12, -50, 8, 26, -0.1, 0, Math.PI * 2);
    ctx.ellipse(12, -50, 8, 26, 0.1, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  // 顔
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  dot(-12, -4, 4, C.ink);
  dot(12, -4, 4, C.ink);
  dot(0, 8, kind === 'rabbit' ? 3 : 5, kind === 'rabbit' ? '#e5989b' : C.ink);
  if (kind === 'cat') {
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 14, 12);
      ctx.lineTo(s * 34, 8);
      ctx.moveTo(s * 14, 16);
      ctx.lineTo(s * 34, 18);
      ctx.stroke();
    }
  }
  ctx.restore();
}
