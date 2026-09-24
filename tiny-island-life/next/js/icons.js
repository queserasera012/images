// UI の小さな絵（SVG）。島の絵と同じ色・同じ「ずらした紙の影」で描く。絵文字は使わない。

const INK = '#3d5a80';
const MUSTARD = '#f2b84b';
const SKY = '#62b6cb';
const SHADOW = 'rgba(20,60,70,0.28)';

const svg = (body, size = 24) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

const cloudPath = 'M7 18h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 9.5 4.3 4.3 0 0 0 7 18z';

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
