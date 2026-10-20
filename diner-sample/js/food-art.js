// 料理の絵（SVG）。人と台の絵と同じ太い線・同じ色で描く。
// 大きさは まわりの文字の大きさで決まる（.fd は 1.25em 角）
const L = '#2a2350';
const W = `stroke="${L}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const T = `stroke="${L}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

const plate = (rx = 21, ry = 8, cy = 33) => `<ellipse cx="24" cy="${cy + 2}" rx="${rx}" ry="${ry}" fill="#d9d4ec"/><ellipse cx="24" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" ${W}/>`;
const bowl = (color) => `<path d="M6 24 H42 C42 35 35 42 24 42 C13 42 6 35 6 24Z" fill="${color}" ${W}/><path d="M17 42 H31" ${W}/>`;
const bowlTop = (fill) => `<ellipse cx="24" cy="24" rx="18" ry="5.5" fill="${fill}" ${W}/>`;
const rice = (cx, cy, r = 7) => `<path d="M${cx - r} ${cy} C${cx - r} ${cy - r * 1.1} ${cx + r} ${cy - r * 1.1} ${cx + r} ${cy}Z" fill="#fff" ${W}/>`;
const cabbage = (x, y) => `<path d="M${x} ${y} q3 -7 6 -1 q3 -6 6 0 q2 -5 5 1 q-8 4 -17 0Z" fill="#8be08a" ${T}/>`;
const cutlet = (x, y, w = 22, h = 9) => {
  let lines = '';
  for (let i = 1; i < 4; i++) lines += `<path d="M${x + (w / 4) * i} ${y + 1} L${x + (w / 4) * i - 2} ${y + h - 1}" stroke="#b5651d" stroke-width="1.4"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#f2a93b" ${W}/>${lines}`;
};
const shrimp = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x - 11} ${y} C${x - 11} ${y - 4} ${x + 5} ${y - 5} ${x + 6} ${y} C${x + 5} ${y + 5} ${x - 11} ${y + 4} ${x - 11} ${y}Z" fill="#f4b443" ${W}/><path d="M${x + 6} ${y} l5 -4 l0 8Z" fill="#ff5a4e" ${T}/></g>`;
const egg = (cx, cy, rx = 10, ry = 5) => `<path d="M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.5} ${cx + rx} ${cy - ry * 1.5} ${cx + rx} ${cy} C${cx + rx * .6} ${cy + ry * .6} ${cx - rx * .6} ${cy + ry * .6} ${cx - rx} ${cy}Z" fill="#ffe066" ${T}/>`;
const curryPool = (d) => `<path d="${d}" fill="#b0622a" ${W}/><circle cx="28" cy="31" r="2.2" fill="#ff9f43" ${T}/><circle cx="34" cy="33" r="2" fill="#ffd23f" ${T}/>`;

const DRAW = {
  onigiri: () => `${plate(18, 6, 38)}<path d="M24 8 C28 8 39 26 39 31 C39 36 33 37 24 37 C15 37 9 36 9 31 C9 26 20 8 24 8Z" fill="#fff" ${W}/><rect x="15" y="27" width="18" height="10" rx="2" fill="#2f3a3a" ${W}/><circle cx="19" cy="20" r="1" fill="${L}"/><circle cx="29" cy="20" r="1" fill="${L}"/>`,
  yakisoba: () => `${plate()}<path d="M9 31 q4 -9 8 -2 q4 -9 8 -1 q4 -9 8 -1 q3 -6 6 1 q-15 7 -30 3Z" fill="#c9773a" ${W}/><path d="M14 27 q3 -3 5 0 M24 26 q3 -3 5 0" fill="none" stroke="#8a4a1e" stroke-width="1.5"/><circle cx="20" cy="31" r="1.6" fill="#2fd39e"/><circle cx="29" cy="30" r="1.6" fill="#2fd39e"/><path d="M31 24 l4 -3" stroke="#ff6b9a" stroke-width="2.6" stroke-linecap="round"/>`,
  tonjiru: () => `${bowl('#c0392b')}${bowlTop('#c99a5b')}<circle cx="18" cy="23.5" r="2.6" fill="#ff9f43" ${T}/><rect x="25" y="21" width="5" height="4" rx="1" fill="#f6d7b0" ${T}/><circle cx="32" cy="24" r="1.5" fill="#2fd39e"/><circle cx="22" cy="25" r="1.3" fill="#2fd39e"/>`,
  omurice: () => `${plate()}<path d="M8 31 C8 17 40 17 40 31 C33 34 15 34 8 31Z" fill="#ffd23f" ${W}/><path d="M14 24 l4 -3 l4 3 l4 -3 l4 3 l4 -3" fill="none" stroke="#e8302e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  napolitan: () => `${plate()}<path d="M9 31 q4 -10 8 -2 q4 -10 8 -1 q4 -10 8 -1 q3 -7 6 1 q-15 7 -30 3Z" fill="#ff6b3d" ${W}/><path d="M15 27 q3 -3 5 0 M26 26 q3 -3 5 0" fill="none" stroke="#c0392b" stroke-width="1.5"/><circle cx="21" cy="30" r="2.6" fill="none" stroke="#2fd39e" stroke-width="2"/><circle cx="31" cy="29" r="2.2" fill="none" stroke="#2fd39e" stroke-width="2"/>`,
  shogayaki: () => `${plate()}<path d="M10 29 C12 22 20 21 25 26 C21 31 14 32 10 29Z" fill="#9c5a2c" ${W}/><path d="M17 31 C20 24 28 23 31 28 C27 33 21 33 17 31Z" fill="#b5703a" ${W}/>${cabbage(28, 30)}`,
  karaage: () => `${plate()}<circle cx="16" cy="28" r="6" fill="#d98c2b" ${W}/><circle cx="26" cy="27" r="6.5" fill="#e09a33" ${W}/><circle cx="21" cy="32" r="5.5" fill="#cf7f22" ${W}/><path d="M32 33 L40 26 A7 7 0 0 1 36 36Z" fill="#ffe066" ${W}/>`,
  tonkatsu: () => `${plate()}${cutlet(9, 24)}${cabbage(28, 30)}`,
  oyakodon: () => `${bowl('#3c3a5c')}${bowlTop('#fff')}${egg(24, 24, 15, 4)}<circle cx="18" cy="23" r="2.4" fill="#f2c27a" ${T}/><circle cx="28" cy="24" r="2.4" fill="#f2c27a" ${T}/><path d="M23 20 l2 -3 l2 3" fill="#2fd39e" ${T}/>`,
  croquette: () => `${plate()}<ellipse cx="17" cy="28" rx="8" ry="5" fill="#e8a33d" ${W}/><ellipse cx="29" cy="28" rx="8" ry="5" fill="#dc962f" ${W}/><path d="M13 27 q4 -2 8 0 M25 27 q4 -2 8 0" fill="none" stroke="#5a3a22" stroke-width="2" stroke-linecap="round"/>`,
  ebifry: () => `${plate()}${shrimp(20, 27, -12)}${shrimp(22, 32, 6)}${cabbage(30, 30)}`,
  tendon: () => `${bowl('#c0392b')}${bowlTop('#fff')}${shrimp(18, 17, -60)}${shrimp(29, 17, -110)}<ellipse cx="24" cy="24" rx="7" ry="3" fill="#f4b443" ${T}/>`,
  katsudon: () => `${bowl('#3c3a5c')}${bowlTop('#fff')}${cutlet(12, 17, 24, 8)}${egg(24, 23, 13, 3)}<path d="M30 19 l2 -3 l2 3" fill="#2fd39e" ${T}/>`,
  katsucurry: () => `${plate()}${curryPool('M24 25 C34 24 42 28 42 33 C36 37 28 38 24 38Z')}<path d="M6 32 C7 26 17 24 24 25 V38 C14 38 7 36 6 32Z" fill="#fff" ${W}/>${cutlet(14, 20, 20, 9)}`,
  curry: () => `${plate()}${curryPool('M22 25 C32 23 42 27 42 33 C36 37 28 38 22 38Z')}<path d="M6 32 C7 26 15 24 23 25 C21 30 21 34 22 38 C13 38 7 36 6 32Z" fill="#fff" ${W}/>`,
  // ---- 中華 ----
  gyoza: () => `${plate()}${[[13, 30], [24, 28], [35, 30]].map(([x, y]) => `<path d="M${x - 8} ${y + 2} C${x - 8} ${y - 8} ${x + 8} ${y - 8} ${x + 8} ${y + 2}Z" fill="#fff3d6" ${W}/><path d="M${x - 7} ${y + 2} H${x + 7}" stroke="#d98c2b" stroke-width="3" stroke-linecap="round"/><path d="M${x - 3} ${y - 4} l1 2 M${x} ${y - 5} l1 2 M${x + 3} ${y - 4} l1 2" stroke="${L}" stroke-width="1.2" stroke-linecap="round"/>`).join('')}`,
  chahan: () => `${plate()}<path d="M9 31 C9 17 39 17 39 31 C33 34 15 34 9 31Z" fill="#ffd96a" ${W}/><circle cx="17" cy="25" r="1.6" fill="#2fd39e"/><circle cx="27" cy="23" r="1.6" fill="#2fd39e"/><circle cx="32" cy="27" r="1.6" fill="#2fd39e"/><rect x="20" y="26" width="3" height="2.5" rx=".8" fill="#ff6b9a"/><rect x="13" y="28" width="3" height="2.5" rx=".8" fill="#ff6b9a"/><circle cx="24" cy="30" r="1.4" fill="#ffffff"/>`,
  ramen: () => `${bowl('#c0392b')}${bowlTop('#e3a65c')}<path d="M12 25 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#ffe08a" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="22" r="3.6" fill="#f2c27a" ${T}/><circle cx="17" cy="22" r="1.3" fill="#b5651d"/><circle cx="29" cy="22.5" r="3" fill="#fff" ${T}/><path d="M27.6 22.5 a1.4 1.4 0 1 1 2.8 0" fill="none" stroke="#ff6b9a" stroke-width="1.2"/><rect x="33" y="14" width="5" height="9" rx="1" fill="#2f3a3a" ${T}/>`,
  tenshin: () => `${plate()}<path d="M8 31 C8 17 40 17 40 31 C33 34 15 34 8 31Z" fill="#ffe066" ${W}/><path d="M10 29 C13 24 19 26 24 24 C29 22 35 25 38 29 C32 32 16 32 10 29Z" fill="#c0392b" opacity=".85"/><circle cx="20" cy="22" r="1.5" fill="#2fd39e"/><circle cx="28" cy="21" r="1.5" fill="#2fd39e"/>`,
  harumaki: () => `${plate()}<g transform="rotate(-14 20 27)"><rect x="8" y="23" width="24" height="8" rx="4" fill="#e8a33d" ${W}/><path d="M14 24 l-1 6 M20 24 l-1 6 M26 24 l-1 6" stroke="#b5651d" stroke-width="1.3"/></g><g transform="rotate(-6 26 32)"><rect x="14" y="28" width="24" height="8" rx="4" fill="#dc962f" ${W}/><path d="M20 29 l-1 6 M26 29 l-1 6 M32 29 l-1 6" stroke="#b5651d" stroke-width="1.3"/></g>`,
  mapo: () => `${plate()}<path d="M8 32 C9 24 39 24 40 32 C33 36 15 36 8 32Z" fill="#e8462e" ${W}/>${[[15, 28], [22, 30], [29, 27], [33, 31], [19, 33]].map(([x, y]) => `<rect x="${x - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" rx="1" fill="#fff8e8" ${T}/>`).join('')}<circle cx="25" cy="27" r="1.2" fill="#2fd39e"/><circle cx="12" cy="31" r="1.2" fill="#2fd39e"/><circle cx="36" cy="28" r="1.2" fill="#2fd39e"/>`,
  tantan: () => `${bowl('#3c3a5c')}${bowlTop('#ef7d3c')}<path d="M12 25 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#ffe08a" stroke-width="2" stroke-linecap="round"/><path d="M14 22 C16 17 22 18 21 23Z" fill="#5fc96b" ${T}/><circle cx="29" cy="22" r="2.6" fill="#9c5a2c" ${T}/><circle cx="33" cy="23.5" r="1.8" fill="#9c5a2c" ${T}/><circle cx="25" cy="21" r="1" fill="#c0392b"/>`,
  ebichili: () => `${plate()}<path d="M8 32 C9 24 39 24 40 32 C33 36 15 36 8 32Z" fill="#ff5a3c" ${W}/>${shrimp(18, 28, -20)}${shrimp(30, 30, 15)}<circle cx="24" cy="25" r="1.2" fill="#2fd39e"/><circle cx="13" cy="32" r="1.2" fill="#2fd39e"/>`,
  subuta: () => `${plate()}<path d="M9 32 C10 25 38 25 39 32 C33 35 15 35 9 32Z" fill="#c8562e" opacity=".9" ${T}/>${[[15, 28], [24, 26], [31, 29], [21, 32]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 3.5}" width="8" height="7" rx="2.5" fill="#a84a22" ${W}/><path d="M${x - 2} ${y - 2} h3" stroke="#ffcf9e" stroke-width="1.3" stroke-linecap="round"/>`).join('')}<path d="M27 32 l4 -3 l3 3 l-4 2Z" fill="#2fd39e" ${T}/><path d="M11 28 l3 -3 l2 3Z" fill="#ff9f43" ${T}/>`,
};

export function foodSVG(id) {
  const d = DRAW[id];
  if (!d) return '';
  return `<svg class="fd" viewBox="0 0 48 48" aria-hidden="true">${d()}</svg>`;
}
export const FOOD_IDS = Object.keys(DRAW);
