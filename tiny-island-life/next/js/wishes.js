// 島の人のお願い（D335）
//
// 住民が ときどき「〜がほしい」とお願いする。かなえると お礼（Coin・島の大きさに合わせる）。
// 解放のはしご（70人で終わる）のあとも、目標が生まれ続ける。困りごとが「一度解けたら終わり」にならない（D332）。
//
// お願いは「あなたが できること」だけ（建てる・置く・広げる・釣る・取る）。できない お願いは出さない。
// 乱数は島の乱数（state.rng）を使わない。お願いを足しても、ほかの動きが変わらないように。

import { CONFIG } from './config.js';
import { SIZES, roadDistance, placements, idx } from './grid.js';
import { ofType, buildingById, cafes, cafeMax, labelOf, gameCoin, decoType, dayOf } from './sim.js';

const W = () => CONFIG.wishes;

// お願いの乱数：日と回数から決まる（島の乱数とは別）
function wrand(state, k) {
  let x = (dayOf(state.t) * 2654435761 + (state.wishSeq || 0) * 40503 + k * 97) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const wpick = (state, arr, k) => arr[Math.floor(wrand(state, k) * arr.length)];

// 建物のマスどうしの近さ（何マス離れているか）
function tilesApart(a, b) {
  const sa = SIZES[a.type];
  const sb = SIZES[b.type];
  const dc = Math.max(0, a.c - (b.c + sb.w - 1), b.c - (a.c + sa.w - 1));
  const dr = Math.max(0, a.r - (b.r + sb.h - 1), b.r - (a.r + sa.h - 1));
  return Math.max(dc, dr);
}

const adults = (state) => state.residents.filter((r) => !r.age && r.state !== 'PENDING' && r.homeId);
const wishing = (state, id) => (state.wishes || []).some((w) => w.who === id);

// ---------------------------------------------------------------- お願いの種類
// make(state, r, k) → お願い（出せなければ null）。done(state, w) → かなえたか

const KINDS = {
  // 家の近くに飾り（ベンチ・花だん・街灯）
  deco: {
    make(state, r, k) {
      if (state.residents.length < CONFIG.deco.pop) return null;
      const home = buildingById(state, r.homeId);
      const type = wpick(state, ['bench', 'flowerbed', 'streetlamp'], k);
      const w = { kind: 'deco', type, home: home.id };
      if (KINDS.deco.done(state, w)) return null;
      const near = placements(type, state.buildings).some((p) => tilesApart({ type, c: p.c, r: p.r }, home) <= W().near);
      if (!near) return null;
      const text = {
        bench: '家の近くに ベンチがあったら うれしいな',
        flowerbed: '家の前に 花だんがほしいな',
        streetlamp: '夜の帰り道が 暗いの。家の近くに 街灯がほしい',
      }[type];
      return { ...w, text, short: `家の近くに${decoType(type).name}`, hint: `家から ${W().near}マス以内に ${decoType(type).name}を置く（つくる → 飾り）` };
    },
    done(state, w) {
      const home = buildingById(state, w.home);
      return !!home && ofType(state, w.type).some((b) => tilesApart(b, home) <= W().near);
    },
  },

  // 島に噴水
  fountain: {
    make(state) {
      if (state.residents.length < W().fountainPop || ofType(state, 'fountain').length) return null;
      if (!placements('fountain', state.buildings).length) return null;
      return { kind: 'fountain', text: '島に 噴水があったら すてきだろうな', short: '島に噴水', hint: '噴水を置く（つくる → 飾り）' };
    },
    done: (state) => ofType(state, 'fountain').length > 0,
  },

  // 会社の近くにカフェ（お昼に遠くまで歩いている）
  cafeNearWork: {
    make(state, r) {
      const co = r.job && buildingById(state, r.job);
      if (!co || co.type !== 'company' || cafes(state).length >= cafeMax(state)) return null;
      const w = { kind: 'cafeNearWork', company: co.id };
      if (KINDS.cafeNearWork.done(state, w)) return null;
      const spots = placements('cafe', state.buildings);
      if (!spots.some((p) => tilesApart({ type: 'cafe', c: p.c, r: p.r }, co) <= W().near + 2)) return null;
      const name = labelOf(state, co);
      return { ...w, text: 'お昼は いつも遠くのカフェまで歩くんだ。会社の近くに あったらなあ', short: '会社の近くにカフェ', hint: `${name}から 道で ${W().cafeSteps}マス以内に カフェを建てる` };
    },
    done(state, w) {
      const co = buildingById(state, w.company);
      return !co || cafes(state).some((c) => roadDistance(co.access, c.access) <= W().cafeSteps);
    },
  },

  // 魚を釣ってきて
  fish: {
    make(state, r, k) {
      if (!ofType(state, 'pond').length) return null;
      const fish = wpick(state, CONFIG.pond.game.fish, k);
      return {
        kind: 'fish', fish: fish.id, had: state.fishLog?.[fish.id] || 0,
        text: `${fish.name}を 見てみたいんだ。釣ってきてくれない？`, short: `${fish.name}を釣る`,
        hint: `釣り堀で ${fish.name}を釣る${fish.big ? '（大物：ぴったりで釣れる）' : ''}`,
      };
    },
    done: (state, w) => (state.fishLog?.[w.fish] || 0) > w.had,
  },

  // クレーンゲームの ぬいぐるみ（取れたら その子にあげる）
  prize: {
    make(state, r, k) {
      if (!ofType(state, 'arcade').length) return null;
      const list = CONFIG.arcade.game.prizes.filter((p) => !state.prizes?.[p.id]);
      if (!list.length) return null;
      const p = wpick(state, list, k);
      return { kind: 'prize', prize: p.id, text: `クレーンゲームの ${p.name}、ほしいなあ`, short: `${p.name}`, hint: `ゲームセンターのクレーンゲームで ${p.name}を取る` };
    },
    done: (state, w) => (state.prizes?.[w.prize] || 0) > 0,
    give(state, w) {
      state.prizes[w.prize] -= 1; // その子にあげる
    },
  },

  // 混んでいるお店を広げて（昨日 入れずに帰った人がいた）
  upgrade: {
    make(state, r, k, today) {
      const full = [...new Set((today?.lost || []).map((l) => l.cafeId))]
        .map((id) => buildingById(state, id))
        .filter((b) => b && b.level < CONFIG[b.type].levels.length);
      if (!full.length) return null;
      const b = wpick(state, full, k);
      const name = labelOf(state, b);
      return { kind: 'upgrade', target: b.id, level: b.level, text: `${name}、いつも混んでて 入れないの。広げてほしいな`, short: `${name}を広げる`, hint: `${name}を広げる（つくる → 広げる）` };
    },
    done: (state, w) => {
      const b = buildingById(state, w.target);
      return !b || b.level > w.level;
    },
  },
};

// ---------------------------------------------------------------- 朝：新しいお願い・取り下げ（日記に書く）

export function morningWishes(state, endedDay, today, lines) {
  state.wishes ||= [];
  // 長く かなえられなかったお願いは、取り下げる（責めない）
  for (const w of [...state.wishes]) {
    if (endedDay - w.day + 1 < W().days) continue;
    state.wishes.splice(state.wishes.indexOf(w), 1);
    const r = state.residents.find((x) => x.id === w.who);
    if (r) lines.push({ kind: 'info', text: `${r.name}の お願い（${w.short}）は、また今度でいいそうです` });
  }
  if (state.residents.length < W().pop || state.wishes.length >= W().max) return;
  if (wrand(state, 1) >= W().chance) return;
  // 誰が・何を：候補を順に試して、出せるものを1つ
  const people = adults(state).filter((r) => !wishing(state, r.id));
  const kinds = Object.keys(KINDS);
  for (let k = 0; k < 12 && people.length; k++) {
    const r = wpick(state, people, 10 + k);
    const kind = wpick(state, kinds, 30 + k);
    const w = KINDS[kind].make(state, r, 50 + k, today);
    if (!w) continue;
    state.wishSeq = (state.wishSeq || 0) + 1;
    state.wishes.push({ ...w, id: `w${state.wishSeq}`, who: r.id, day: endedDay + 1 });
    lines.push({ kind: 'good', text: `${r.name}から お願い：「${w.text}」` });
    return;
  }
}

// ---------------------------------------------------------------- かなえたか（1分ごと）

export function checkWishes(state, events) {
  if (!state.wishes?.length) return;
  for (const w of [...state.wishes]) {
    const r = state.residents.find((x) => x.id === w.who);
    if (!r) {
      state.wishes.splice(state.wishes.indexOf(w), 1); // 島を出た人のお願い
      continue;
    }
    if (!KINDS[w.kind].done(state, w)) continue;
    KINDS[w.kind].give?.(state, w);
    state.wishes.splice(state.wishes.indexOf(w), 1);
    const coin = gameCoin(state, W().coin[w.kind]);
    state.coin += coin;
    state.wishDone = (state.wishDone || 0) + 1;
    r.thanked = (r.thanked || 0) + 1;
    r.thankedAt = state.t;
    state.today.wishes ||= [];
    state.today.wishes.push({ name: r.name, short: w.short, coin });
    events.push({ type: 'wish', name: r.name, short: w.short, coin, who: r.id });
  }
}

export const wishOf = (state, id) => (state.wishes || []).find((w) => w.who === id) || null;
export const wishList = (state) => state.wishes || [];
