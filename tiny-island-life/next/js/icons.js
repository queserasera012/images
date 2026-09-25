// UI の小さな絵（SVG）。島の絵と同じ色・同じ「ずらした紙の影」で描く。絵文字は使わない。

const INK = '#3d5a80';
const MUSTARD = '#f2b84b';
const SKY = '#62b6cb';
const SHADOW = 'rgba(20,60,70,0.28)';

const svg = (body, size = 24) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

const cloudPath = 'M7 18h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 9.5 4.3 4.3 0 0 0 7 18z';

function expandIcon(ax, ay, mx, my) {
  return svg(
    `<ellipse cx="${mx + 1}" cy="${my + 1}" rx="6.5" ry="7.5" fill="${SHADOW}"/>` +
      `<ellipse cx="${ax + 1}" cy="${ay + 1}" rx="5" ry="4.5" fill="${SHADOW}"/>` +
      `<ellipse cx="${ax}" cy="${ay}" rx="5" ry="4.5" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.3" stroke-dasharray="2 1.6"/>` +
      `<ellipse cx="${mx}" cy="${my}" rx="6.5" ry="7.5" fill="#8cc084" stroke="${INK}" stroke-width="1.4"/>`,
    28,
  );
}

export const ICONS = {
  close: svg(`<path d="M7 7l10 10M17 7L7 17" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`, 22),
  sunny: svg(
    `<g stroke="${MUSTARD}" stroke-width="2" stroke-linecap="round">` +
      [0, 45, 90, 135, 180, 225, 270, 315]
        .map((a) => {
          const r = (a * Math.PI) / 180;
          const p = (d) => (12 + Math.cos(r) * d).toFixed(1) + ' ' + (12 + Math.sin(r) * d).toFixed(1);
          return `<path d="M${p(7.5)}L${p(10)}"/>`;
        })
        .join('') +
      `</g><circle cx="12" cy="12" r="5" fill="${MUSTARD}"/>`,
  ),
  cloudy: svg(`<path d="${cloudPath}" transform="translate(1 1)" fill="${SHADOW}"/><path d="${cloudPath}" fill="#b9cbd8"/>`),
  rain: svg(
    `<path d="${cloudPath}" transform="translate(0 -3)" fill="#9fb4c4"/>` +
      `<g stroke="${SKY}" stroke-width="2" stroke-linecap="round"><path d="M9 18l-1 3"/><path d="M13 18l-1 3"/><path d="M17 18l-1 3"/></g>`,
  ),
  coin: svg(
    `<circle cx="13" cy="13" r="8" fill="${SHADOW}"/><circle cx="12" cy="12" r="8" fill="${MUSTARD}"/>` +
      `<circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.8"/>`,
    18,
  ),
  build: svg(
    `<path d="M4 12l8-7 8 7v8H4z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M4 12l8-7 8 7v8H4z" fill="${INK}"/><path d="M12 11v6M9 14h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  ),
  diary: svg(
    `<rect x="6" y="4" width="13" height="17" rx="2" fill="${SHADOW}"/>` +
      `<rect x="5" y="3" width="13" height="17" rx="2" fill="${INK}"/><rect x="8" y="3" width="1.6" height="17" fill="${MUSTARD}"/>` +
      `<path d="M11 8h4M11 11h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
  ),
  cafe_upgrade: svg(
    `<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
      `<path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="${INK}" stroke-width="1.6"/>` +
      `<path d="M9 3.5c-1 1.5 1 2 0 3.5M12.5 3.5c-1 1.5 1 2 0 3.5" stroke="${MUSTARD}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  cafe_new: svg(
    `<rect x="4" y="9" width="16" height="11" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="9" width="16" height="11" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M3 6h18v4H3z" fill="${MUSTARD}"/><path d="M7 6v4M11 6v4M15 6v4" stroke="#fff" stroke-width="1.6"/>` +
      `<rect x="7" y="13" width="3.5" height="7" rx="1" fill="${INK}"/>`,
    28,
  ),
  shop_new: svg(
    `<rect x="4" y="10" width="16" height="10" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="10" width="16" height="10" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M3 6h18v4H3z" fill="#2a9d8f"/><path d="M8 6v4M13 6v4M18 6v4" stroke="#fff" stroke-width="1.6"/>` +
      `<rect x="7" y="14" width="3" height="3" rx="0.6" fill="#f28aa0"/><rect x="11" y="14" width="3" height="3" rx="0.6" fill="${MUSTARD}"/><rect x="15" y="14" width="3" height="3" rx="0.6" fill="${SKY}"/>`,
    28,
  ),
  super_new: svg(
    `<rect x="3" y="8" width="18" height="12" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="8" width="18" height="12" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<rect x="2" y="5" width="20" height="4" rx="1" fill="#6a994e"/><rect x="6" y="11" width="7" height="5" rx="0.6" fill="#cfe6ee"/>` +
      `<rect x="15" y="11" width="4" height="9" rx="0.6" fill="#9fb4c4"/>`,
    28,
  ),
  planetarium_new: svg(
    `<rect x="4" y="15" width="16" height="6" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="15" width="16" height="6" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M4.5 15a7.5 7.5 0 0 1 15 0z" fill="${INK}"/>` +
      `<circle cx="9" cy="11.5" r="0.9" fill="${MUSTARD}"/><circle cx="13" cy="9.5" r="1.1" fill="${MUSTARD}"/><circle cx="15.5" cy="12.5" r="0.8" fill="${MUSTARD}"/>`,
    28,
  ),
  petshop_new: svg(
    `<rect x="4" y="10" width="16" height="10" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="10" width="16" height="10" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M3 11l9-7 9 7z" fill="#f4a259"/>` +
      `<ellipse cx="14.5" cy="16" rx="2" ry="1.6" fill="#f4a259"/><circle cx="12.6" cy="14.1" r="0.8" fill="#f4a259"/><circle cx="14" cy="13.3" r="0.8" fill="#f4a259"/><circle cx="15.4" cy="13.3" r="0.8" fill="#f4a259"/><circle cx="16.6" cy="14.1" r="0.8" fill="#f4a259"/>` +
      `<rect x="6.5" y="14" width="3" height="6" rx="1" fill="${INK}"/>`,
    28,
  ),
  kinder_new: svg(
    `<rect x="4" y="10" width="16" height="10" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="10" width="16" height="10" rx="1" fill="#fff6ea" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M3 11l3-5h12l3 5z" fill="#f7a8b8"/>` +
      `<circle cx="8.5" cy="14" r="1.8" fill="#cfe6ee"/><circle cx="15.5" cy="14" r="1.8" fill="#cfe6ee"/>` +
      `<rect x="10.5" y="15" width="3" height="5" rx="1.5" fill="#8ecae6"/>`,
    28,
  ),
  // 島を広げる：本島（緑）と、ひらく土地（黄）の位置
  expand_north: expandIcon(12, 6.5, 12, 14.5),
  expand_east: expandIcon(17.5, 10, 10, 13),
  expand_west: expandIcon(6.5, 14, 14, 11),
  move: svg(
    `<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    18,
  ),
  house_up: svg(
    `<path d="M5 20V9l7-5 7 5v11z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M5 20V9l7-5 7 5v11z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<rect x="8" y="10" width="3" height="3" rx="0.6" fill="${SKY}"/><rect x="13" y="10" width="3" height="3" rx="0.6" fill="${SKY}"/>` +
      `<rect x="10.5" y="15" width="3" height="5" rx="1" fill="${INK}"/>` +
      `<path d="M19.5 3.5v5M17 6h5" stroke="${MUSTARD}" stroke-width="2" stroke-linecap="round"/>`,
    28,
  ),
  pond_new: svg(
    `<rect x="3" y="6" width="18" height="12" rx="5" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="6" width="18" height="12" rx="5" fill="${SKY}" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M7 11c1-1 2-1 3 0M13 13c1-1 2-1 3 0" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `<rect x="4" y="16" width="16" height="3" rx="1" fill="#c9a27a"/>`,
    28,
  ),
  fish: svg(
    `<ellipse cx="11" cy="12" rx="7" ry="4.2" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M17 12l4-3.5v7z" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<circle cx="8" cy="11" r="1" fill="${INK}"/>`,
    22,
  ),
  stand_new: svg(
    `<rect x="5" y="9" width="14" height="11" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="5" y="9" width="14" height="11" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M4 6h16v3.5a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0z" fill="#8b5e3c"/>` +
      `<rect x="8" y="12" width="8" height="3" rx="0.8" fill="#ffe9b0"/>` +
      `<path d="M14 16.5h3v3h-3z" fill="#8b5e3c"/>`,
    28,
  ),
  ad: svg(
    `<rect x="3" y="5" width="18" height="14" rx="4" fill="${MUSTARD}"/>` + `<path d="M10 9l5 3-5 3z" fill="#fff"/>`,
    18,
  ),
  people: svg(
    `<circle cx="9" cy="8" r="3.2" fill="${INK}"/><path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="${INK}"/>` +
      `<circle cx="16.5" cy="9" r="2.6" fill="${SKY}"/><path d="M13.5 19c.3-2.6 1.4-4.4 3-4.4 2.2 0 4 1.8 4 4.4z" fill="${SKY}"/>`,
    20,
  ),
  harbor: svg(
    `<path d="M4 15h16l-2.5 4h-11z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M4 15h16l-2.5 4h-11z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<rect x="8" y="10" width="7" height="5" rx="1" fill="${MUSTARD}"/>` +
      `<path d="M16.5 15V5.5M16.5 5.5l3.5 1.5-3.5 1.5" stroke="${INK}" stroke-width="1.3" fill="#c8553d" stroke-linejoin="round"/>` +
      `<path d="M2 21.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" stroke="${SKY}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  bar: svg(
    `<path d="M6 5h12l-6 8z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M6 5h12l-6 8z" fill="#fff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="M12 13v6M8.5 19.5h7" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<circle cx="15" cy="7" r="1.4" fill="${MUSTARD}"/><path d="M3 4.5q2 1.5 4 0" stroke="#f28aa0" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  park_roof: svg(
    `<path d="M3 11l9-7 9 7z" transform="translate(1 1)" fill="${SHADOW}"/><path d="M3 11l9-7 9 7z" fill="${INK}"/>` +
      `<rect x="6" y="11" width="2" height="9" fill="#8d6a4f"/><rect x="16" y="11" width="2" height="9" fill="#8d6a4f"/>` +
      `<path d="M4 20h16" stroke="#6fa56a" stroke-width="2" stroke-linecap="round"/>`,
    28,
  ),
  house_build: svg(
    `<rect x="5" y="11" width="14" height="10" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="5" y="11" width="14" height="10" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M3 12l9-8 9 8z" fill="${MUSTARD}"/><rect x="10.5" y="15" width="3" height="6" rx="1" fill="${INK}"/>`,
    28,
  ),
  sunrise: svg(
    `<path d="M4 17a8 8 0 0 1 16 0z" fill="${MUSTARD}"/><path d="M2 19h20" stroke="${SKY}" stroke-width="2" stroke-linecap="round"/>` +
      `<g stroke="${MUSTARD}" stroke-width="2" stroke-linecap="round"><path d="M12 3v3"/><path d="M4.5 7.5l2 2"/><path d="M19.5 7.5l-2 2"/></g>`,
    36,
  ),
};
