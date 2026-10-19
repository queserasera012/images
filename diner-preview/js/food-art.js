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
};

export function foodSVG(id) {
  const d = DRAW[id];
  if (!d) return '';
  return `<svg class="fd" viewBox="0 0 48 48" aria-hidden="true">${d()}</svg>`;
}
export const FOOD_IDS = Object.keys(DRAW);
