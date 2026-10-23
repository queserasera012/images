// 日記の見せ方（D353）。1日に20行を超えて、大事なことが埋もれていた（オーナー）。
//
// 行を4つに分け、同じ種類の行は1行にまとめる：
//   島のできごと（家族・解放・お願い）→ 困りごと（赤）→ お店と施設（たたむ）→ 島のようす（たたむ）
// 表示だけを変える。島の動き（sim.js）とセーブは変えない。前の日の日記も この形で見える。
// 分け方は 行の文面で見る（文面は sim.js が決まった形で書く。変えたら test/diary.test.mjs が落ちる）

// 朝の日記の見出し（B2）：本当に離れていた日数で変える。島が進むのは 留守のあいだ 次の朝までなので、何日あいても 1日だけ
// ルールは変えない（言葉だけ）。seconds：離れていた現実の秒数
export function morningTitle(seconds) {
  const days = Math.floor((seconds || 0) / 86400);
  if (days <= 0) return { title: 'おはようございます', lead: '昨日の島では、こんなことがありました' };
  if (days === 1) return { title: 'おかえりなさい', lead: '1日ぶりです。昨日の島では、こんなことがありました' };
  return { title: 'おかえりなさい', lead: `${days}日ぶりです。島は 1日だけ 進みました` };
}

import { CONFIG } from './config.js';
import { dayOf, seasonOf, isFestDay, ofType, isAbroad, FESTS } from './sim.js';

// 明日の予定（B1）：いまの島で 明日あることを 事実だけ並べる。原因・おすすめは書かない（CLAUDE.md の 2）。何も無ければ null
// ドッグレース（7日ごと）・季節の変わり目（7日ごと・本島だけ）・フェス（7日ごと）
const FEST_NAME = { beachfest: 'ビーチフェス', snowfest: 'オーロラの夜のフェス' };
const clock = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
export function tomorrowPlan(state) {
  const day = dayOf(state.t) + 1;
  const items = [];
  if (ofType(state, 'track').length && day % CONFIG.track.every === 0) items.push(`ドッグレース（${clock(CONFIG.track.start)}から）`);
  if (!isAbroad(state) && seasonOf(day).id !== seasonOf(day - 1).id) items.push(`${seasonOf(day).name}になります`);
  for (const type of FESTS) if (isFestDay(state, type, day)) items.push(`${FEST_NAME[type]}（${clock(CONFIG[type].open)}から）`);
  return items.length ? `明日：${items.join('・')}` : null;
}

// お金の名前は 島ごと（コイン・シェル・オーロラ・D378）。前のセーブの日記は Coin・Shell のまま
const COIN = /（\+([\d,]+) (?:コイン|シェル|オーロラ|Coin|Shell)）/;
const num = (s) => Number(String(s).replace(/,/g, ''));

// 島のできごと：家族・解放・お願い・季節・ドッグレース
const EVENT = /(なりました|旅立ちました|さみしそうです|結婚しました|生まれました|引っ越してくるそうです|暮らしはじめました|引っ越しました|お願い|^島に.+が来ました$|ドッグレース|入荷しました|野に帰って|よばれます)/; // よばれます：番号つきの名前の つけ直し（D390）

// まとめる行：{ re, key, piece, make }。同じ key の行が2つ以上あれば make でまとめた1行にする
const MERGE_EVENTS = [
  { re: /^(.+?)が(歩けるように|小学生に|学生に|大人に)なりました$/, key: (m) => `stage:${m[2]}`, piece: (m) => m[1], make: (ps, m) => `${ps.join('・')}が${m[2]}なりました` },
  { re: /^(.+?)は、家を出て 新しい家で暮らしはじめました$/, key: () => 'leave', piece: (m) => m[1], make: (ps) => `${ps.join('・')}は、家を出て 新しい家で暮らしはじめました` },
  { re: /^(.+?)は、(仕事をやめて のんびり暮らしはじめました|のんびり暮らす年に なりました)$/, key: () => 'elder', piece: (m) => m[1], make: (ps) => `${ps.join('・')}は、のんびり暮らしはじめました` },
];
const MERGE_PROBLEMS = [
  {
    re: /^(.+?)、(.+?)の前で待っていた(?:観光客)? ?(\d+)人 が、.+?（−([\d,]+) (コイン|シェル|オーロラ|Coin|Shell)）$/,
    key: (m) => `lost:${m[2]}`,
    piece: (m) => ({ text: `${m[1]} ${m[3]}人`, coin: num(m[4]) }),
    make: (ps, m) => `${m[2]}の行列：${ps.map((p) => p.text).join('・')} が帰った（−${ps.reduce((s, p) => s + p.coin, 0).toLocaleString()} ${m[5]}）`,
  },
  { re: /^(.+?)は、もう少し広い家に住みたいようです$/, key: () => 'room', piece: (m) => m[1], make: (ps) => `広い家に住みたい：${ps.join('・')}` },
  { re: /^(.+?)は、一緒に住める家を探しているようです$/, key: () => 'together', piece: (m) => m[1], make: (ps) => `一緒に住める家を探している：${ps.join('・')}` },
];

// 行を順に入れる。まとめる行は 最初に出た場所に1行だけ置く
function bucket() {
  const items = [];
  const groups = new Map();
  return {
    items,
    add(line, rules) {
      for (const rule of rules || []) {
        const m = line.text.match(rule.re);
        if (!m) continue;
        const key = rule.key(m);
        let g = groups.get(key);
        if (!g) {
          g = { rule, m, pieces: [], lines: [], kind: line.kind };
          groups.set(key, g);
          items.push(g);
        }
        g.pieces.push(rule.piece(m));
        g.lines.push(line);
        return;
      }
      items.push({ lines: [line], kind: line.kind });
    },
    done() {
      return items.map((it) => (it.rule && it.lines.length > 1 ? { kind: it.kind, text: it.rule.make(it.pieces, it.m), n: it.lines.length } : it.lines[0]));
    },
  };
}

export function diaryView(entry) {
  const events = bucket();
  const problems = bucket();
  const money = [];
  const scene = [];
  let upkeep = 0;
  let income = 0;
  for (const l of entry.lines) {
    const t = l.text;
    if (/^昨日は.+でした。$/.test(t)) continue; // 天気は見出しに出す
    const up = t.match(/維持費 −([\d,]+) (?:コイン|シェル|オーロラ|Coin|Shell)$/);
    if (up) {
      upkeep += num(up[1]);
      money.push(l);
      continue;
    }
    if (l.kind === 'problem') {
      problems.add(l, MERGE_PROBLEMS);
      continue;
    }
    if (t.startsWith('あなたは')) {
      scene.push(l); // あなたの釣り・ゲーム
      continue;
    }
    if (EVENT.test(t)) {
      events.add(l, MERGE_EVENTS);
      continue;
    }
    const c = t.match(COIN);
    if (c) {
      income += num(c[1]);
      money.push(l);
      continue;
    }
    scene.push(l); // 船・飾り・公園・ペット
  }
  // 困りごとは 損の額（−40 コイン など）が付いた行を 先頭に（C5・並べ替えだけ。同じ組の中の順は そのまま）
  const LOSS = /（−[\d,]+ (?:コイン|シェル|オーロラ|Coin|Shell)）/;
  const probs = problems.done();
  const sorted = [...probs.filter((l) => LOSS.test(l.text)), ...probs.filter((l) => !LOSS.test(l.text))];
  return {
    events: events.done(),
    problems: sorted,
    money,
    scene,
    upkeep,
    earned: entry.earned ?? income,
    places: money.filter((l) => COIN.test(l.text)).length,
  };
}

// ---------------------------------------------------------------- 日記の見せ方（D350 案A・1.3・オーナーが選んだ）

// 家族の出来事：生まれた・育った・結婚・旅立ち・引っ越し・名前
// 「建てられるようになりました」などは 家族ではない（良いこと）
const FAMILY = /(生まれました|結婚しました|旅立ちました|さみしそうです|(歩けるように|小学生に|学生に|大人に)なりました$|のんびり暮らす年に なりました|家族になりました|家の子になりました|暮らしはじめました|引っ越しました|引っ越してくるそうです|よばれます)/;

// 良いこと／困りごと／家族の出来事 の3つ。数字（お店と施設の売上）は 末尾にまとめる
export function diaryGroups(entry) {
  const v = diaryView(entry);
  const family = v.events.filter((l) => FAMILY.test(l.text));
  const good = [...v.events.filter((l) => !FAMILY.test(l.text)), ...v.scene];
  return { family, good, problems: v.problems, money: v.money, earned: v.earned, upkeep: v.upkeep, places: v.places };
}

