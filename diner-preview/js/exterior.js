// お店の外観（SVG）。段階・席・スタッフ・評判・売上の合計で姿が変わる。
// 読むだけ（state を書き換えない）。
import { personSVG } from './people.js';
import { GENRES, TOWN } from './config.js';
const lookOf = (s) => GENRES[s.genre || 'washoku'].look;

const L = '#2a2350';
const W = `stroke="${L}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

// people.js の人を、好きな場所・大きさで置く
function person(x, y, w, look, opts, mood = 'idle') {
  return personSVG(look, mood, opts).replace('<svg viewBox="0 0 48 54" class="person"', `<svg x="${x}" y="${y}" width="${w}" height="${w * 54 / 48}" viewBox="0 0 48 54"`);
}

function lantern(x, y, lit) {
  return `<g>
    <path d="M${x} ${y - 8} V${y - 3}" stroke="${L}" stroke-width="2"/>
    ${lit ? `<circle cx="${x}" cy="${y + 7}" r="15" fill="#ffd23f" opacity=".25"/>` : ''}
    <rect x="${x - 7}" y="${y - 3}" width="14" height="20" rx="7" fill="${lit ? '#ff4f5e' : '#c98a8a'}" ${W}/>
    <path d="M${x - 7} ${y + 5} H${x + 7}" stroke="${L}" stroke-width="1.2" opacity=".5"/>
  </g>`;
}
function stool(x, y) {
  return `<rect x="${x - 7}" y="${y}" width="14" height="5" rx="2.5" fill="#ff9f43" ${W}/><path d="M${x - 4} ${y + 5} V${y + 16} M${x + 4} ${y + 5} V${y + 16}" stroke="${L}" stroke-width="2.5"/>`;
}
function plant(x, y) {
  return `<path d="M${x - 8} ${y} H${x + 8} L${x + 6} ${y + 12} H${x - 6}Z" fill="#ff9f43" ${W}/>
    <circle cx="${x - 5}" cy="${y - 5}" r="6" fill="#2fd39e" ${W}/><circle cx="${x + 5}" cy="${y - 6}" r="6" fill="#2fd39e" ${W}/><circle cx="${x}" cy="${y - 12}" r="6" fill="#2fd39e" ${W}/>`;
}
function stripes(x, y, w, h, a, b) {
  const n = Math.max(3, Math.round(w / 16));
  const sw = w / n;
  let out = '';
  for (let i = 0; i < n; i++) out += `<rect x="${x + i * sw}" y="${y}" width="${sw}" height="${h}" fill="${i % 2 ? b : a}"/>`;
  // 下のふち（波）
  let wave = `M${x} ${y + h}`;
  for (let i = 0; i < n; i++) wave += ` Q${x + i * sw + sw / 2} ${y + h + 7} ${x + (i + 1) * sw} ${y + h}`;
  return `${out}<path d="${wave} V${y} H${x}Z" fill="${b}" opacity="0"/><path d="${wave}" fill="none" ${W}/>
    ${Array.from({ length: n }, (_, i) => `<path d="M${x + i * sw} ${y + h} Q${x + i * sw + sw / 2} ${y + h + 7} ${x + (i + 1) * sw} ${y + h}Z" fill="${i % 2 ? b : a}" ${W}/>`).join('')}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${W}/>`;
}
function noren(x, y, w, h, color, text) {
  const n = 3, sw = w / n;
  let out = '';
  for (let i = 0; i < n; i++) out += `<rect x="${x + i * sw + 1}" y="${y}" width="${sw - 2}" height="${h}" rx="2" fill="${color}" ${W}/>`;
  return `${out}<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="${Math.min(13, (w - 6) / [...text].length).toFixed(1)}" font-weight="800" fill="#fff" font-family="M PLUS Rounded 1c, sans-serif">${text}</text>`;
}

// となりの店（商店街の地図で 呼んだ店。左右に 2つまで 見せる）
const NB_LOOK = {
  yaoya: { wall: '#d8f5e6', a: '#2fd39e', b: '#fff' },
  honya: { wall: '#e6e1ff', a: '#9b7bff', b: '#fff' },
  sento: { wall: '#dff2ff', a: '#4cc9f0', b: '#fff' },
  jimusho: { wall: '#fff2d6', a: '#ffb020', b: '#fff' },
  coffee: { wall: '#f1e4d6', a: '#8a5a3c', b: '#fff' },
  hanaya: { wall: '#ffe4ee', a: '#ff6b9a', b: '#fff' },
};
// 売上の合計 150000 で、通りに 商店街の旗が かかる
function flags() {
  const c = ['#ff4f5e', '#ffd23f', '#2fd39e', '#4cc9f0', '#9b7bff'];
  let out = '<path d="M0 24 Q180 52 360 24" fill="none" stroke="#2a2350" stroke-width="1.5"/>';
  for (let i = 0; i < 13; i++) {
    const x = 14 + i * 26, y = 24 + 28 * (1 - Math.pow((x - 180) / 180, 2));
    out += `<path d="M${x - 6} ${y} H${x + 6} L${x} ${y + 11}Z" fill="${c[i % 5]}" stroke="#2a2350" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  return out;
}
function neighbor(nb) {
  const x = nb.x;
  return `<g>
    <rect x="${x}" y="120" width="64" height="98" fill="${nb.wall}" ${W}/>
    ${stripes(x - 3, 128, 70, 12, nb.a, nb.b)}
    <rect x="${x + 8}" y="156" width="48" height="34" rx="3" fill="#bfe9ff" ${W}/>
    <rect x="${x + 6}" y="104" width="52" height="16" rx="4" fill="#fff" ${W}/>
    <text x="${x + 32}" y="116" text-anchor="middle" font-size="10" font-weight="800" fill="${L}" font-family="M PLUS Rounded 1c, sans-serif">${nb.name}</text>
  </g>`;
}

function stall(s, lit) {
  const seats = Math.min(4, s.seats);
  let stools = '';
  for (let i = 0; i < seats; i++) stools += stool(150 + i * 22 - (seats - 1) * 11 + 30, 200);
  return `
    <path d="M128 112 V178 M232 112 V178" stroke="${L}" stroke-width="4"/>
    ${stripes(116, 100, 128, 18, '#ff4f5e', '#ffffff')}
    ${noren(140, 124, 80, 22, '#25406b', 'めし')}
    ${person(160, 140, 40, 3, { chef: true })}
    <rect x="114" y="172" width="132" height="30" rx="4" fill="#e9a25f" ${W}/>
    <path d="M114 182 H246" stroke="#c97f3e" stroke-width="2"/>
    <circle cx="130" cy="210" r="10" fill="#5a3a22" ${W}/><circle cx="230" cy="210" r="10" fill="#5a3a22" ${W}/>
    ${stools}
    ${lantern(110, 116, lit)}${lantern(250, 116, lit)}`;
}

function diner(s, lit) {
  const lk = lookOf(s);
  const win = Math.min(4, Math.ceil(s.seats / 3));
  let heads = '';
  for (let i = 0; i < win; i++) heads += person(108 + i * 15, 158, 18, i * 3 + 1);
  return `
    <rect x="96" y="112" width="168" height="106" fill="#fff6e0" ${W}/>
    <path d="M84 116 L108 88 H252 L276 116Z" fill="${lk.roof}" ${W}/>
    <path d="M100 100 H260" stroke="#6b6890" stroke-width="2"/>
    <rect x="128" y="70" width="104" height="26" rx="6" fill="${lk.signFill}" ${W}/>
    <text x="180" y="88" text-anchor="middle" font-size="14" font-weight="800" fill="${lk.signText}" font-family="M PLUS Rounded 1c, sans-serif">${lk.sign}</text>
    <rect x="104" y="146" width="66" height="44" rx="4" fill="#bfe9ff" ${W}/>
    ${heads}
    <path d="M104 176 H170" stroke="${L}" stroke-width="2.5"/>
    <rect x="186" y="140" width="56" height="78" fill="#e9a25f" ${W}/>
    ${noren(184, 140, 60, 26, lk.norenFill, lk.noren)}
    ${stripes(100, 120, 72, 14, '#ffd23f', '#ffffff')}
    <path d="M70 218 L80 186 H96 L106 218" fill="#3c3a5c" ${W}/>
    <text x="88" y="203" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="M PLUS Rounded 1c, sans-serif">本日</text>
    ${lantern(178, 122, lit)}${lantern(250, 122, lit)}`;
}

function popular(s, lit) {
  return `
    <rect x="80" y="64" width="200" height="56" fill="#fff6e0" ${W}/>
    <rect x="96" y="76" width="36" height="28" rx="3" fill="#bfe9ff" ${W}/><rect x="162" y="76" width="36" height="28" rx="3" fill="#bfe9ff" ${W}/><rect x="228" y="76" width="36" height="28" rx="3" fill="#bfe9ff" ${W}/>
    <path d="M70 66 L94 40 H266 L290 66Z" fill="${lookOf(s).roof}" ${W}/>
    ${diner(s, lit).replace('M84 116 L108 88 H252 L276 116Z', 'M76 120 L84 112 H276 L284 120Z').replace('<rect x="128" y="70" width="104" height="26"', '<rect x="118" y="44" width="124" height="28"').replace('y="88" text-anchor="middle" font-size="14"', 'y="63" text-anchor="middle" font-size="16"')}
    ${lantern(112, 122, lit)}${lantern(140, 122, lit)}
    ${person(280, 178, 26, 7)}${person(302, 180, 26, 2)}${person(324, 178, 26, 9)}`;
}

const SHOPS = [stall, diner, popular];

// 店を飾る（1：のぼり 2：入口の鉢と マット 3：電球の飾り）
function decoration(s, stage) {
  const d = s.deco || 0;
  if (!d) return '';
  const lk = lookOf(s);
  let out = `<g><path d="M44 218 V140" stroke="${L}" stroke-width="3"/><rect x="44" y="142" width="18" height="52" fill="${lk.signFill}" ${W}/>
    <text x="53" y="152" font-size="9" font-weight="800" fill="${lk.signText}" font-family="M PLUS Rounded 1c, sans-serif" writing-mode="tb">${lk.noren}</text></g>`;
  if (d >= 2) out += `<rect x="172" y="212" width="40" height="6" rx="3" fill="#ff4f5e" ${W}/>${plant(166, 200)}${plant(218, 200)}`;
  if (d >= 3) {
    const y = stage === 2 ? 66 : 112;
    const c = ['#ffd23f', '#ff4f5e', '#2fd39e', '#4cc9f0'];
    out += `<path d="M84 ${y} Q180 ${y + 18} 276 ${y}" fill="none" stroke="${L}" stroke-width="1.5"/>`;
    for (let i = 0; i < 9; i++) { const x = 92 + i * 22, yy = y + 18 * (1 - Math.pow((x - 180) / 96, 2)) * 0.9 + 3; out += `<circle cx="${x}" cy="${yy}" r="4" fill="${c[i % 4]}" ${W}/>`; }
  }
  return out;
}

let uid = 0;
export function exteriorSVG(s, stage = s.stage) {
  const id = `dusk${uid++}`;
  const lit = s.rep >= 30;
  const flowers = Math.min(3, Math.floor(s.rep / 25));
  let pots = '';
  const pos = stage === 0 ? [92, 268, 284] : [84, 276, 292];
  for (let i = 0; i < flowers; i++) pots += plant(pos[i], 206);
  const staff = s.staff.slice(0, 3).map((x, i) => person(stage === 0 ? 262 + i * 18 : 246 + i * 16, 186, 22, (i * 5 + 2) % 12, { chef: true })).join('');
  const nbs = (s.town ? s.town.picked : []).slice(0, 2).map((id, i) => neighbor({ x: i ? 290 : 6, name: (TOWN.list.find((n) => n.id === id) || {}).short || (TOWN.list.find((n) => n.id === id) || {}).name || '', ...(NB_LOOK[id] || NB_LOOK.yaoya) })).join('');
  return `<svg viewBox="0 0 360 250" class="exterior" role="img" aria-label="お店の外観">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ccdf2"/><stop offset=".7" stop-color="#ffd6a8"/><stop offset="1" stop-color="#ffb38a"/></linearGradient></defs>
    <rect width="360" height="250" fill="url(#${id})"/>
    <circle cx="300" cy="44" r="16" fill="#fff3b0"/>
    <path d="M0 150 V100 H30 V80 H60 V110 H90 V70 H120 V95 H150 V60 H190 V90 H220 V75 H260 V100 H300 V85 H330 V110 H360 V150Z" fill="#a8d8ec" opacity=".7"/>
    ${nbs}
    ${s.totalSales >= 150000 ? flags() : ''}
    <rect x="0" y="218" width="360" height="32" fill="#e8d9c0" ${W}/>
    <path d="M0 232 H360" stroke="#d1bf9f" stroke-width="2"/>
    ${SHOPS[stage](s, lit)}
    ${decoration(s, stage)}
    ${pots}${staff}
  </svg>`;
}

// 商店街の顔：お祭りの夜。上に となりの店、前に 自分の店5つ、通りに 常連さん
export function festivalSVG(s, people) {
  const id = `fest${uid++}`;
  const shops = ['washoku', 'chuka', 'burger', 'cafe', 'italian'];
  const nbs = (s.town ? s.town.picked : []).slice(0, 5);
  const back = nbs.map((nid, i) => {
    const x = 6 + i * 70, lk = NB_LOOK[nid] || NB_LOOK.yaoya, n = TOWN.list.find((v) => v.id === nid) || {};
    return `<rect x="${x}" y="64" width="66" height="60" fill="${lk.wall}" ${W}/>${stripes(x - 2, 68, 70, 9, lk.a, lk.b)}
      <rect x="${x + 9}" y="86" width="48" height="15" rx="4" fill="#fff" ${W}/>
      <text x="${x + 33}" y="97.5" text-anchor="middle" font-size="9" font-weight="800" fill="${L}" font-family="M PLUS Rounded 1c, sans-serif">${n.short || n.name || ''}</text>`;
  }).join('');
  const front = shops.map((g, i) => {
    const x = 4 + i * 71, lk = GENRES[g].look;
    return `<rect x="${x + 3}" y="124" width="64" height="70" fill="#fff6e0" ${W}/>
      <path d="M${x - 1} 128 L${x + 9} 114 H${x + 61} L${x + 71} 128Z" fill="${lk.roof}" ${W}/>
      <rect x="${x + 9}" y="134" width="52" height="15" rx="4" fill="${lk.signFill}" ${W}/>
      <text x="${x + 35}" y="145.5" text-anchor="middle" font-size="${Math.min(10, 48 / [...lk.sign].length * 1.15).toFixed(1)}" font-weight="800" fill="${lk.signText}" font-family="M PLUS Rounded 1c, sans-serif">${lk.sign}</text>
      <rect x="${x + 10}" y="156" width="22" height="20" rx="2" fill="#ffe9a8" ${W}/>
      <rect x="${x + 38}" y="156" width="22" height="38" fill="#e9a25f" ${W}/>
      ${lantern(x + 35, 118, true)}`;
  }).join('');
  const crowd = people.slice(0, 20).map((look, i) => {
    const row = i % 2, col = Math.floor(i / 2);
    return person(8 + col * 34 + row * 17, 186 + row * 22, 30, look, {}, 'happy');
  }).join('');
  const stars = Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 97) % 360}" cy="${8 + ((i * 53) % 40)}" r="1.4" fill="#fff" opacity=".8"/>`).join('');
  return `<svg viewBox="0 0 360 260" class="exterior festival" role="img" aria-label="商店街の お祭りの夜">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2a6e"/><stop offset=".55" stop-color="#7a4fa3"/><stop offset="1" stop-color="#ff9a6b"/></linearGradient></defs>
    <rect width="360" height="260" fill="url(#${id})"/>${stars}
    <circle cx="318" cy="18" r="11" fill="#fff3b0"/>
    ${back}
    <g transform="translate(0,-4)">${flags()}</g>
    ${front}
    <rect x="0" y="194" width="360" height="66" fill="#e8d9c0" ${W}/>
    ${crowd}
  </svg>`;
}
