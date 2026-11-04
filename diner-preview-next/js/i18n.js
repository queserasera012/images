// ことば（日本語・英語）。Tiny Island Life の js/i18n.js を写した。ゲームの文は日本語のまま作り、英語のときだけ 画面に出たところで訳す。
// - 表は js/i18n-en.js（鍵は 元の日本語。${…} のところは {0} {1}）。鍵は tools/i18n-keys.mjs が ソースから拾う
// - 画面（DOM）の文字と aria-label などは MutationObserver で、canvas の文字は fillText で訳す
// - sim.js（ルール）は 日本語の文を作るだけ。日記もセーブには日本語で残る（ことばを変えても セーブは変わらない）
// - ことばの選び方は 端末ごと（diner.lang.v1）。はじめは 端末のことば（アプリなら App.js が渡す __dinerDeviceLang）
import { EN } from './i18n-en.js';

const LANG_KEY = 'diner.lang.v1';
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
  const raw = g.__dinerDeviceLang || (typeof navigator !== 'undefined' && navigator.language) || 'ja';
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
  '🔒 {0}': '🔒 {0}', '{0}＋{1}': '{0} + {1}', '{0}＋{1}＋{2}': '{0} + {1} + {2}',
  '{0}（{1}）': '{0} ({1})', '{0}：{1}': '{0}: {1}', '{0}、{1}': '{0}, {1}', '{0}・{1}': '{0} · {1}', '「{0}」': '"{0}"' };
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
    patterns.push({ key, re: new RegExp(`^${src}$`, 's'), lits: parts.filter((x, k) => k % 2 === 0), groups, literal });
  }
  patterns.sort((a, b) => b.literal - a.literal);
}

function fill(template, vals) {
  return template
    .replace(/\{s(\d+)\}/g, (_, d) => (String(vals[d]).trim() === '1' ? '' : 's'))
    .replace(/\{(\d+)\}/g, (_, d) => vals[d] ?? '');
}

// カタカナの名前（常連さん・バイト）をローマ字に
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

const MONEY = [];

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
// 文を 鍵の 決まった字（lits）で 切る切り方を ぜんぶ（多すぎるときは limit まで）。lits[0] と lits.at(-1) は 端に つく
function splits(core, lits, limit) {
  const out = [];
  const n = lits.length - 1;
  if (core.length < lits[0].length + lits[n].length || !core.startsWith(lits[0]) || !core.endsWith(lits[n])) return out;
  const end = core.length - lits[n].length;
  const go = (pos, k, acc) => {
    if (out.length >= limit) return;
    if (k === n - 1) { if (end >= pos) out.push([...acc, core.slice(pos, end)]); return; }
    const lit = lits[k + 1];
    for (let i = core.indexOf(lit, pos + 1); i >= 0 && i + lit.length <= end; i = core.indexOf(lit, i + 1)) go(i + lit.length, k + 1, [...acc, core.slice(pos, i)]);
  };
  go(lits[0].length, 0, []);
  return out;
}

function translate(core, depth = 0) {
  if (!JA.test(core)) return core;
  if (core in TABLE) return TABLE[core];
  if (!patterns) compile();
  for (const p of patterns) {
    // 短く当てて だめなら ほかの切り方も 試す（「工事の 現場の お昼の まとめ買いに」のように「の」が 何度も出る文）
    const m0 = core.match(p.re);
    if (!m0) continue;
    for (const m of [m0.slice(1), ...splits(core, p.lits, 40)]) {
      const vals = [];
      let ok = true;
      p.groups.forEach((ids, k) => {
        const v = trPart(m[k], depth);
        if (v === null) ok = false;
        ids.forEach((d, j) => (vals[d] = j === 0 ? v : ''));
      });
      if (ok) return fill(TABLE[p.key], vals);
    }
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
  // 「A。B。C」とつないだ文（店長の ひとこと など）
  if (core.includes('。')) {
    const parts = core.split('。').filter((x) => x.trim()).map((x) => trPart(x.trim(), depth));
    if (parts.every((x) => x !== null)) return parts.join('. ') + (core.trim().endsWith('。') ? '.' : '');
  }
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
  if (p && p.nodeName === 'text' && p.namespaceURI === 'http://www.w3.org/2000/svg') fitSvgText(p, v, t);
}

// 絵の中の札（SVG の text）は 日本語の長さで 字の大きさが 決めてある。英語が 長くなる分だけ 小さくする（2026-11-04）
// 幅は ざっくり：かな・漢字 1字＝1、英数字 1字＝0.56
const textWidth = (str) => [...str].reduce((a, c) => a + (c.charCodeAt(0) < 0x2e80 ? 0.56 : 1), 0);
function fitSvgText(el, ja, en) {
  const fs = parseFloat(el.getAttribute('font-size'));
  if (!fs || el.hasAttribute('writing-mode')) return;
  const ratio = textWidth(ja) / textWidth(en);
  if (ratio >= 1) return;
  const o = ORIG_ATTR.get(el) || {};
  if (!o['font-size']) o['font-size'] = el.getAttribute('font-size');
  ORIG_ATTR.set(el, o);
  el.setAttribute('font-size', (parseFloat(o['font-size']) * Math.max(0.55, ratio)).toFixed(1));
  if (el.hasAttribute('letter-spacing')) { o['letter-spacing'] = o['letter-spacing'] || el.getAttribute('letter-spacing'); el.setAttribute('letter-spacing', '0'); }
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
