// ことば（日本語・英語）。ゲームの文は日本語のまま作り、英語のときだけ 画面に出たところで訳す。
// - 表は js/i18n-en.js（鍵は 元の日本語。${…} のところは {0} {1}）。鍵は tools/i18n-keys.mjs が ソースから拾う
// - 画面（DOM）の文字と aria-label などは MutationObserver で、canvas の文字は fillText で訳す
// - sim.js（ルール）は 日本語の文を作るだけ。日記もセーブには日本語で残る（ことばを変えても セーブは変わらない）
// - ことばの選び方は 端末ごと（til.lang.v1）。はじめは 端末のことば（アプリなら App.js が渡す __tilDeviceLang）
import { EN } from './i18n-en.js';

const LANG_KEY = 'til.lang.v1';
const JA = /[぀-ヿ㐀-鿿]/;
export const LANGS = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
];

let lang = 'ja';
export const getLang = () => lang;
export const isEnglish = () => lang === 'en';

export function deviceLang() {
  const g = typeof window !== 'undefined' ? window : {};
  const raw = g.__tilDeviceLang || (typeof navigator !== 'undefined' && navigator.language) || 'ja';
  return String(raw).toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function storedLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'ja' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- 1つの文を訳す

// 日本語が {n} の外に無いので ソースからは拾えないが、画面には出る形（「良いこと（3）」など）
const GLUE = {
  // 建物のカードでは「◯◯を」を落として出す（main.js の a.title.slice）
  'カフェ&レストランにする': 'Make it a Café & Restaurant',
  'ペットショップ&ブリーダーにする': 'Make it a Pet Shop & Breeder',
  '品数を増やす（Lv{0}）': 'Stock more (Lv{0})',
  '{0} Lv{1}': '{0} Lv{1}',
  '「{0}」': '"{0}"', '“{0}”': '"{0}"', // 住民の名前のあとの お願い（「家の近くにベンチ」）
  '{0}（{1}）': '{0} ({1})', '{0}：{1}': '{0}: {1}', '{0}、{1}': '{0}, {1}', '{0}・{1}': '{0} · {1}' };
const TABLE = { ...EN, ...GLUE };

// 鍵の {n} を正規表現にしたもの。字の多い鍵から当てる（短い鍵が 長い文を 先に食べないように）
let patterns = null;
function compile() {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  patterns = [];
  for (const key of Object.keys(TABLE)) {
    if (!/\{\d+\}/.test(key)) continue;
    // 隣り合う {n}{m} は 1つの かたまりとして当てる（英語の側でも 隣り合っているときだけ）
    if ([...key.matchAll(/(?:\{\d+\}){2,}/g)].some((m) => !TABLE[key].includes(m[0]))) continue;
    const groups = []; // かたまりごとの {n} の並び
    const parts = key.split(/((?:\{\d+\})+)/);
    let src = '';
    parts.forEach((p, k) => {
      if (k % 2 === 0) return void (src += esc(p));
      groups.push([...p.matchAll(/\{(\d+)\}/g)].map((x) => Number(x[1])));
      // 端の {n} は空でもよい（そこに絵が入って、文字は別の かたまりになることがある）
      src += (k === 1 && parts[0] === '') || (k === parts.length - 2 && parts.at(-1) === '') ? '(.*?)' : '(.+?)';
    });
    const literal = key.replace(/\{\d+\}/g, '').length;
    patterns.push({ key, re: new RegExp(`^${src}$`, 's'), groups, literal });
  }
  patterns.sort((a, b) => b.literal - a.literal);
}

function fill(template, vals) {
  return template
    .replace(/\{s(\d+)\}/g, (_, d) => (String(vals[d]).trim() === '1' ? '' : 's'))
    .replace(/\{(\d+)\}/g, (_, d) => vals[d] ?? '');
}

// カタカナの名前（住民・赤ちゃん・ペット）をローマ字に
const KANA = {
  ア: 'a', イ: 'i', ウ: 'u', エ: 'e', オ: 'o', カ: 'ka', キ: 'ki', ク: 'ku', ケ: 'ke', コ: 'ko', サ: 'sa', シ: 'shi', ス: 'su', セ: 'se', ソ: 'so',
  タ: 'ta', チ: 'chi', ツ: 'tsu', テ: 'te', ト: 'to', ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no', ハ: 'ha', ヒ: 'hi', フ: 'fu', ヘ: 'he', ホ: 'ho',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo', ヤ: 'ya', ユ: 'yu', ヨ: 'yo', ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro', ワ: 'wa', ヲ: 'o', ン: 'n',
  ガ: 'ga', ギ: 'gi', グ: 'gu', ゲ: 'ge', ゴ: 'go', ザ: 'za', ジ: 'ji', ズ: 'zu', ゼ: 'ze', ゾ: 'zo', ダ: 'da', ヂ: 'ji', ヅ: 'zu', デ: 'de', ド: 'do',
  バ: 'ba', ビ: 'bi', ブ: 'bu', ベ: 'be', ボ: 'bo', パ: 'pa', ピ: 'pi', プ: 'pu', ペ: 'pe', ポ: 'po', ヴ: 'vu',
  ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o',
};
const YOON = { ャ: 'a', ュ: 'u', ョ: 'o' };
export function romanize(s) {
  let out = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    const next = s[k + 1];
    if (c === 'ッ') { const r = KANA[next] || ''; out += r[0] || ''; continue; }
    if (c === 'ー') continue;
    let r = KANA[c] ?? c;
    if (next in YOON) {
      const base = r.replace(/i$/, '');
      r = (/^(sh|ch|j)$/.test(base) ? base : base + 'y') + YOON[next];
      k++;
    }
    else if ('ァィゥェォ'.includes(next || '_') && r.length > 1) { r = r.slice(0, -1) + KANA[next]; k++; }
    out += r;
  }
  out = out.replace(/ou/g, 'o').replace(/uu/g, 'u');
  return out ? out[0].toUpperCase() + out.slice(1) : out;
}

// お金の名前（シェル・オーロラ）は 鍵では「コイン」になっている（sim.js が 置きかえて出す）
const MONEY = [
  [/シェル(?!の)/g, 'Shell'],
  [/オーロラ(?![の島])/g, 'Aurora'],
  [/\bCoins?\b/g, 'Coin'], // 1.0 の日記は「Coin」と書いていた（D320）
];

// 訳のあとに残った 日本語の句読点（差し込まれた値に ついてくる）
const PUNCT = [[/。/g, '. '], [/、/g, ', '], [/：/g, ': '], [/（/g, ' ('], [/）/g, ')'], [/[「」『』]/g, '"'], [/！/g, '!'], [/？/g, '?'], [/　/g, ' '], [/～/g, '~']];
function punct(t) {
  if (!/[。、：（）「」『』！？　～]/.test(t)) return t;
  for (const [re, r] of PUNCT) t = t.replace(re, r);
  return t.replace(/, (You|The|There|It|Someone) /g, (_, w) => `, ${w.toLowerCase()} `).replace(/ {2,}/g, ' ').replace(/ ([.,:)!?])/g, '$1').replace(/\( /g, '(').trim();
}

const cache = new Map();
export const missing = new Set();

export function trLine(s) {
  if (typeof s !== 'string' || !JA.test(s)) return s;
  const hit = cache.get(s);
  if (hit !== undefined) return hit;
  const [, lead, core, trail] = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  let t = translate(core.replace(/\s*\n\s*/g, ' '));
  if (t === null) {
    missing.add(core);
    t = core;
  }
  const out = (lead ? ' ' : '') + punct(t) + (trail ? ' ' : '');
  cache.set(s, out);
  return out;
}

const deep = new Map(); // 分けて訳したときの答え（訳せない も覚える）
function translate(core, depth = 0) {
  if (!JA.test(core)) return core;
  if (core in TABLE) return TABLE[core];
  if (!patterns) compile();
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    const vals = [];
    let ok = true;
    p.groups.forEach((ids, k) => {
      const v = trPart(m[k + 1], depth);
      if (v === null) ok = false;
      ids.forEach((d, j) => (vals[d] = j === 0 ? v : ''));
    });
    if (ok) return fill(TABLE[p.key], vals);
  }
  for (const [re, word] of MONEY) {
    re.lastIndex = 0;
    if (!re.test(core)) continue;
    re.lastIndex = 0;
    const t = translate(core.replace(re, 'コイン'), depth);
    re.lastIndex = 0;
    if (t !== null) return t.replace(/\b([Cc])oin(s?)\b/g, (_, c, pl) => (c === 'C' ? word : word.toLowerCase()) + pl);
  }
  // 「A・B・C」「A、B」と並んだもの
  for (const sep of ['・', '、', '，']) {
    if (!core.includes(sep)) continue;
    const parts = core.split(sep).map((x) => trPart(x.trim(), depth));
    if (parts.every((x) => x !== null)) return parts.join(', ');
  }
  if (/^[゠-ヿ]+$/.test(core)) return romanize(core);
  // 「4はい」「12人」：数と単位（{0}{1} と並んだ鍵で 1つのかたまりになる）
  const unit = core.match(/^([\d,.]+)\s*(\D+)$/);
  if (unit) {
    const t = translate(unit[2], depth);
    if (t !== null) return unit[1] + (/^[\s%]/.test(t) ? t : ` ${t}`);
  }
  // 「カフェ2」：番号つきの名前
  const num = core.match(/^(.*?\D)(\d+)$/);
  if (num) {
    const t = translate(num[1], depth);
    if (t !== null) return `${t} ${num[2]}`;
  }
  // つなげて作った文（「名前」＋「が歩けるようになりました」など）：前と後ろに分けて、両方 訳せるところを探す
  if (depth < 2) {
    const id = `${depth}\u0000${core}`;
    if (deep.has(id)) return deep.get(id);
    let found = null;
    for (let k = core.length - 1; k > 0 && found === null; k--) {
      if (!JA.test(core.slice(k)) || !JA.test(core.slice(0, k))) continue;
      const tail = translate(core.slice(k), depth + 1);
      if (tail === null) continue;
      const head = translate(core.slice(0, k), depth + 1);
      if (head !== null) found = head + tail;
    }
    deep.set(id, found);
    return found;
  }
  return null;
}

// 当てはめた {n} の中身：日本語なら それも訳す（訳せなければ その当てはめは使わない）
function trPart(v, depth = 0) {
  if (!JA.test(v)) return v;
  const [, lead, core, trail] = v.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const t = translate(core, depth);
  return t === null ? null : lead + t + trail;
}

// ---------------------------------------------------------------- 画面（DOM・canvas）

const ORIG = new WeakMap(); // Text → 元の日本語
const ORIG_ATTR = new WeakMap(); // Element → { 属性: 元の日本語 }
const TR_ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'value']; // value は 名前の入れ物（カタカナの名前 → ローマ字）
let observer = null;

function trNode(node) {
  const p = node.parentNode;
  if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
  const v = node.nodeValue;
  if (!JA.test(v)) return;
  const t = trLine(v);
  if (t === v) return;
  ORIG.set(node, v);
  node.nodeValue = t;
}

function trAttr(el, name) {
  if (name === 'value' && el.nodeName !== 'INPUT') return;
  const v = el.getAttribute(name);
  if (!v || !JA.test(v)) return;
  const t = trLine(v);
  if (t === v) return;
  const o = ORIG_ATTR.get(el) || {};
  o[name] = v;
  ORIG_ATTR.set(el, o);
  el.setAttribute(name, t);
}

function trTree(root) {
  if (root.nodeType === 3) return trNode(root);
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) for (const a of TR_ATTRS) if (root.hasAttribute(a)) trAttr(root, a);
  const w = document.createTreeWalker(root, 5); // 要素と文字
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) trNode(n);
    else for (const a of TR_ATTRS) if (n.hasAttribute(a)) trAttr(n, a);
  }
}

function restoreTree(root) {
  const w = document.createTreeWalker(root, 5);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) {
      if (ORIG.has(n)) n.nodeValue = ORIG.get(n);
    } else if (ORIG_ATTR.has(n)) {
      for (const [a, v] of Object.entries(ORIG_ATTR.get(n))) n.setAttribute(a, v);
    }
  }
}

function watch() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((records) => {
    if (lang !== 'en') return;
    for (const r of records) {
      if (r.type === 'characterData') trNode(r.target);
      else if (r.type === 'attributes') trAttr(r.target, r.attributeName);
      else for (const n of r.addedNodes) trTree(n);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });
}

let patched = false;
function patchCanvas() {
  if (patched || typeof CanvasRenderingContext2D === 'undefined') return;
  patched = true;
  const P = CanvasRenderingContext2D.prototype;
  for (const m of ['fillText', 'strokeText', 'measureText']) {
    const f = P[m];
    P[m] = function (text, ...rest) {
      return f.call(this, lang === 'en' ? trLine(text) : text, ...rest);
    };
  }
  const ask = window.confirm.bind(window);
  window.confirm = (msg) => ask(lang === 'en' ? trLine(msg) : msg);
}

// 起動のとき（画面を組み立てる前に呼ぶ）
export function initLang() {
  lang = storedLang() || deviceLang();
  if (typeof document === 'undefined') return lang;
  patchCanvas();
  watch();
  applyLang();
  return lang;
}

function applyLang() {
  document.documentElement.lang = lang;
  if (lang === 'en') trTree(document.body);
  else restoreTree(document.body);
}

export function setLang(next) {
  if (next !== 'ja' && next !== 'en') return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // 残せなくても いまは 変わる
  }
  if (typeof document !== 'undefined') applyLang();
}

// テスト用：表を差しかえたあとに 当てはめを作り直す
export function resetCache() {
  cache.clear();
  missing.clear();
  deep.clear();
  patterns = null;
}
