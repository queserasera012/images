// まるつけ（試し）のルール。DOM に触らない（npm test がブラウザなしで回す）

// 1ドル何円で見るか・モデルの値段（$ / 100万トークン。2026-10 の Claude API の表）
export const YEN_PER_USD = 150;
export const PRICES = {
  opus: { input: 4, output: 20 },
  sonnet: { input: 2, output: 10 },
};
// 試しの合格線。正誤が親と これだけ そろわなければ やめる（2026-10-28）
export const GOAL = 0.95;
// 親が最後に えらべる判定（AI の「読めない」は 親が どれかに直す）
export const FINAL = ["正", "誤", "空欄"];

export function costYen(usage, model) {
  const p = PRICES[model] ?? PRICES.opus;
  if (!usage) return 0;
  return ((usage.input_tokens * p.input + usage.output_tokens * p.output) / 1e6) * YEN_PER_USD;
}

// 親の確定。AI の判定を初めの値にし、親が直したものだけ final が変わる
export function startReview(result) {
  return result.items.map((it) => ({
    ...it,
    ai: it.verdict,
    final: FINAL.includes(it.verdict) ? it.verdict : null,
  }));
}

// 判定を順に回す（正 → 誤 → 空欄 → 正）。まだ決まっていない（読めない）ものは 正 から
export function cycle(final) {
  if (final == null) return "正";
  return FINAL[(FINAL.indexOf(final) + 1) % FINAL.length];
}

export function unresolved(items) {
  return items.filter((it) => it.final == null).length;
}

// 試しの記録から そろい具合を出す。
// miss = AI は 正 と言ったが 本当は 誤（まちがいを見落とした。いちばん困る外れ）
export function stats(records, filter = () => true) {
  let total = 0, agree = 0, miss = 0, falseAlarm = 0, yen = 0, pages = 0;
  for (const r of records) {
    if (!filter(r)) continue;
    pages++;
    yen += r.yen ?? 0;
    for (const it of r.items) {
      total++;
      if (it.ai === it.final) agree++;
      else if (it.ai === "正" && it.final === "誤") miss++;
      else if (it.ai === "誤" && it.final === "正") falseAlarm++;
    }
  }
  return {
    pages, total, agree, miss, falseAlarm, yen,
    rate: total ? agree / total : null,
    yenPerPage: pages ? yen / pages : null,
  };
}

// 確定した記録から まちがいノートに入れるもの（親が 誤 にした問題）
export function toNote(record) {
  return record.items
    .filter((it) => it.final === "誤")
    .map((it, i) => ({
      id: `${record.id}-${i}`,
      child: record.child,
      subject: record.subject,
      date: record.date,
      question: it.question,
      expected: it.expected,
      child_answer: it.child_answer,
      mistake_type: it.mistake_type ?? "その他",
      done: false,
    }));
}

export function groupByType(entries) {
  const out = new Map();
  for (const e of entries) {
    const k = `${e.subject}｜${e.mistake_type}`;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(e);
  }
  return [...out.entries()].sort((a, b) => b[1].length - a[1].length);
}

// ---- にた問題 ----------------------------------------------------------

// 種から決まる乱数（同じ種なら同じ問題になる。テストで確かめるため）
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const ZEN = "０１２３４５６７８９＋－ー×÷＝";
const HAN = "0123456789+--×÷=";
export function normalize(q) {
  let t = "";
  for (const ch of String(q)) {
    const i = ZEN.indexOf(ch);
    t += i >= 0 ? HAN[i] : ch;
  }
  return t.replace(/[xX*✕]/g, "×").replace(/[/:]/g, "÷").replace(/\s+/g, "").replace(/=.*$/, "");
}

// 「37+48」のような 2つの数の式だけ 読む。読めなければ null
export function parseExpr(q) {
  const m = normalize(q).match(/^(\d{1,4})([+\-×÷])(\d{1,4})$/);
  if (!m) return null;
  return { a: Number(m[1]), op: m[2], b: Number(m[3]) };
}

const digits = (n) => String(n).length;
function randDigits(r, len) {
  if (len === 1) return 1 + Math.floor(r() * 9);
  const lo = 10 ** (len - 1);
  return lo + Math.floor(r() * (9 * lo));
}
// 位ごとに くり上がる（下がる）かを "01" のような並びで返す。37+48 は 一の位だけ くり上がる
function carries(a, b) {
  let m = "", c = 0;
  for (; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    c = (a % 10) + (b % 10) + c >= 10 ? 1 : 0;
    m += c;
  }
  return m;
}
function borrows(a, b) {
  let m = "", c = 0;
  for (; a > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    c = a % 10 - c < b % 10 ? 1 : 0;
    m += c;
  }
  return m;
}
// 問題の「くせ」。同じくせの問題を出し直す（くり上がりで まちがえた子には くり上がりを）
export function shapeOf({ a, b, op }) {
  const s = { op, da: digits(a), db: digits(b) };
  if (op === "+") { s.carry = carries(a, b); s.dr = digits(a + b); }
  if (op === "-") { s.borrow = borrows(a, b); s.dr = digits(a - b); }
  if (op === "÷") { s.rem = a % b !== 0; s.dq = digits(Math.floor(a / b)); }
  return s;
}
function same(x, y) {
  return Object.keys(x).every((k) => x[k] === y[k]);
}
export function answerOf({ a, b, op }) {
  if (op === "+") return String(a + b);
  if (op === "-") return String(a - b);
  if (op === "×") return String(a * b);
  const q = Math.floor(a / b), r = a % b;
  return r ? `${q} あまり ${r}` : String(q);
}

// 同じくせの式を n こ。式でない問題（文章題など）は [] を返す
export function makeSimilar(question, n = 3, seed = 1) {
  const e = parseExpr(question);
  if (!e || (e.op === "÷" && e.b === 0)) return [];
  const want = shapeOf(e);
  const r = rng(seed);
  const out = [];
  const seen = new Set([`${e.a}${e.op}${e.b}`]);
  for (let tries = 0; out.length < n && tries < 2000; tries++) {
    let a, b;
    if (e.op === "÷") {
      b = randDigits(r, want.db);
      const q = randDigits(r, want.dq);
      a = b * q + (want.rem ? 1 + Math.floor(r() * Math.max(1, b - 1)) : 0);
      if (want.rem && b === 1) continue;
    } else {
      a = randDigits(r, want.da);
      b = randDigits(r, want.db);
      if (e.op === "-" && a < b) continue;
      if (e.op === "×" && (a < 2 || b < 2)) continue; // 1の段は 練習にならない
    }
    const p = { a, b, op: e.op };
    const key = `${a}${e.op}${b}`;
    if (seen.has(key) || !same(want, shapeOf(p))) continue;
    seen.add(key);
    out.push({ question: `${a} ${e.op} ${b}`, answer: answerOf(p) });
  }
  return out;
}

// まちがいノートから「やりなおしシート」を作る。算数は にた問題、漢字は 同じ字を もう一度
export function makeSheet(entries, seed = 1, perItem = 2, max = 12) {
  const out = [];
  entries.forEach((e, i) => {
    if (out.length >= max) return;
    if (e.subject === "算数") {
      const sim = makeSimilar(e.question, perItem, seed + i * 97);
      if (sim.length) sim.forEach((s) => out.push({ subject: "算数", ...s, from: e.question }));
      else out.push({ subject: "算数", question: e.question, answer: e.expected, from: e.question });
    } else {
      out.push({ subject: e.subject, question: e.question, answer: e.expected, from: e.question });
    }
  });
  return out.slice(0, max);
}

// 送る前に写真を小さくする寸法（長い辺）。大きいほど API 代がかかる
export function fitSize(w, h, max = 1568) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}
