// 日記の見せ方（D353）。1日に20行を超えて、大事なことが埋もれていた（オーナー）。
//
// 行を4つに分け、同じ種類の行は1行にまとめる：
//   島のできごと（家族・解放・お願い）→ 困りごと（赤）→ お店と施設（たたむ）→ 島のようす（たたむ）
// 表示だけを変える。島の動き（sim.js）とセーブは変えない。前の日の日記も この形で見える。
// 分け方は 行の文面で見る（文面は sim.js が決まった形で書く。変えたら test/diary.test.mjs が落ちる）

const COIN = /（\+([\d,]+) Coin）/;
const num = (s) => Number(String(s).replace(/,/g, ''));

// 島のできごと：家族・解放・お願い・季節・ドッグレース
const EVENT = /(なりました|旅立ちました|さみしそうです|結婚しました|生まれました|引っ越してくるそうです|暮らしはじめました|引っ越しました|お願い|^島に.+が来ました$|ドッグレース)/;

// まとめる行：{ re, key, piece, make }。同じ key の行が2つ以上あれば make でまとめた1行にする
const MERGE_EVENTS = [
  { re: /^(.+?)が(歩けるように|小学生に|学生に|大人に)なりました$/, key: (m) => `stage:${m[2]}`, piece: (m) => m[1], make: (ps, m) => `${ps.join('・')}が${m[2]}なりました` },
  { re: /^(.+?)は、家を出て 新しい家で暮らしはじめました$/, key: () => 'leave', piece: (m) => m[1], make: (ps) => `${ps.join('・')}は、家を出て 新しい家で暮らしはじめました` },
  { re: /^(.+?)は、(仕事をやめて のんびり暮らしはじめました|のんびり暮らす年に なりました)$/, key: () => 'elder', piece: (m) => m[1], make: (ps) => `${ps.join('・')}は、のんびり暮らしはじめました` },
];
const MERGE_PROBLEMS = [
  {
    re: /^(.+?)、(.+?)の前で待っていた(?:観光客)? ?(\d+)人 が、.+?（−([\d,]+) Coin）$/,
    key: (m) => `lost:${m[2]}`,
    piece: (m) => ({ text: `${m[1]} ${m[3]}人`, coin: num(m[4]) }),
    make: (ps, m) => `${m[2]}の行列：${ps.map((p) => p.text).join('・')} が帰った（−${ps.reduce((s, p) => s + p.coin, 0).toLocaleString()} Coin）`,
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
    const up = t.match(/維持費 −([\d,]+) Coin$/);
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
  return {
    events: events.done(),
    problems: problems.done(),
    money,
    scene,
    upkeep,
    earned: entry.earned ?? income,
    places: money.filter((l) => COIN.test(l.text)).length,
  };
}
