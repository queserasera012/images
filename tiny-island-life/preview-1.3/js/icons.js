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
  // シェル（シェルの島の お金・D354）：扇の形の貝がら
  shell: svg(
    `<path d="M12 20L4.5 9.5a8.5 7 0 0 1 15 0z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M12 20L4.5 9.5a8.5 7 0 0 1 15 0z" fill="#f2d8a7"/>` +
      `<g stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"><path d="M12 19V6.2"/><path d="M12 19L8 7.2"/><path d="M12 19l4-11.8"/><path d="M12 19L5.6 9.6"/><path d="M12 19l6.4-9.4"/></g>`,
    18,
  ),
  // オーロラ（オーロラの島の お金・D366）：夜空の丸に、緑と紫の光の幕
  aurora: svg(
    `<circle cx="13" cy="13" r="8.5" fill="${SHADOW}"/><circle cx="12" cy="12" r="8.5" fill="#24365e"/>` +
      `<path d="M5 13.5c2.2-3 4.4-3.4 7-1.4s4.8 1.6 7-1.4" fill="none" stroke="#7ef0b8" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M6 10c2-2.2 4-2.4 6.2-1s4.2 1.2 6-.8" fill="none" stroke="#b79cff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>` +
      `<circle cx="9" cy="16.5" r="0.9" fill="#fff"/><circle cx="15.5" cy="16" r="0.7" fill="#fff"/>`,
    18,
  ),
  // 船（下のボタン・D367）：帆のある小さな船
  boat: svg(
    `<path d="M4 15h16l-2.5 4h-11z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M4 15h16l-2.5 4h-11z" fill="${INK}"/>` +
      `<path d="M12 4v10M12 4l6 8h-6z" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="M12 6.5l-4.5 6H12" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`,
  ),
  // 船着き場（シェルの島へ）：桟橋と ヤシの小島
  route_shell: svg(
    `<ellipse cx="15" cy="17.5" rx="7" ry="2.6" fill="#f8e6da" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M15 17V9.5" stroke="#b48a5e" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M15 9.5c-2-2-4.5-1.6-5.5-.3M15 9.5c2-2 4.5-1.6 5.5-.3M15 9.5c-.6-2.4.6-4 2.2-4.6" stroke="#3f9a5a" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      `<path d="M2 16h7" stroke="#b98b5e" stroke-width="2.4"/><path d="M3.5 16v3M7.5 16v3" stroke="#8d6a4f" stroke-width="1.2"/>` +
      `<path d="M2 21.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" stroke="${SKY}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  // 船着き場（オーロラの島へ）：桟橋と 雪の針葉樹、空に光の幕
  route_aurora: svg(
    `<path d="M4 7c3-2 6 1 9-.5s5-2 8 0" stroke="#5fd6a4" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="15" cy="17.5" rx="7" ry="2.6" fill="#eaf0f5" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M15 9l3.4 6h-6.8z" fill="#2e5b4b"/><path d="M15 9l1.4 2.5h-2.8z" fill="#fff"/><path d="M15 15v2" stroke="#6b5040" stroke-width="1.4"/>` +
      `<path d="M2 16h7" stroke="#b98b5e" stroke-width="2.4"/><path d="M3.5 16v3M7.5 16v3" stroke="#8d6a4f" stroke-width="1.2"/>` +
      `<path d="M2 21.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1" stroke="${SKY}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  // 片付け（D354）：木箱と 流木
  clear: svg(
    `<rect x="4" y="9" width="10" height="9" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="9" width="10" height="9" rx="1" fill="#c49a6c" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M4 13.5h10M9 9v9" stroke="${INK}" stroke-width="1" opacity="0.6"/>` +
      `<path d="M13 20.5l8-3.5" stroke="#8d6a4f" stroke-width="2.6" stroke-linecap="round"/><path d="M17 19l1.2 1.6" stroke="#8d6a4f" stroke-width="1.4" stroke-linecap="round"/>`,
    28,
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
  // 病院（D349）：緑の十字（赤十字の しるしは 使わない）
  hospital_new: svg(
    `<rect x="3" y="7" width="18" height="13" rx="2" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="7" width="18" height="13" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.3"/>` +
      `<rect x="3" y="6" width="18" height="3" rx="1" fill="#7fc8a9"/>` +
      `<path d="M12 10.5v6M9 13.5h6" stroke="#4caf82" stroke-width="2.4" stroke-linecap="round"/>`,
    28,
  ),
  // 小学校・大学（D347）
  school_new: svg(
    `<rect x="3" y="8" width="18" height="12" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="8" width="18" height="12" rx="1" fill="#fbf3e4" stroke="${INK}" stroke-width="1.3"/>` +
      `<rect x="9" y="3" width="6" height="6" rx="1" fill="#fbf3e4" stroke="${INK}" stroke-width="1.2"/><circle cx="12" cy="6" r="1.6" fill="#fff" stroke="${INK}" stroke-width="0.8"/>` +
      `<path d="M6 11h2M10 11h1M13 11h1M16 11h2M6 14h2M16 14h2" stroke="#8ecae6" stroke-width="1.8"/><rect x="10.5" y="14" width="3" height="6" fill="#8b5e3c"/>`,
    28,
  ),
  college_new: svg(
    `<path d="M3 10L12 4l9 6z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M3 10L12 4l9 6z" fill="${INK}"/>` +
      `<rect x="4" y="10" width="16" height="9" fill="#eef1f4" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M7 11v7M10.5 11v7M13.5 11v7M17 11v7" stroke="#fff" stroke-width="1.6"/><rect x="3" y="19" width="18" height="2" rx="0.5" fill="${INK}"/>`,
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
  expand_northwest: expandIcon(6.5, 7, 14, 13), // D329
  expand_southwest: expandIcon(7, 17.5, 14, 10),
  expand_northeast: expandIcon(17.5, 6.5, 10, 14), // D350
  // D359：入り江を埋める
  expand_bay_w: expandIcon(6, 13.5, 13.5, 14),
  expand_bay_nw: expandIcon(9, 6, 15, 15),
  expand_bay_n: expandIcon(18, 6, 11, 15),
  expand_bay_e: expandIcon(18.5, 13, 11, 14),
  // 向こうの島を広げる（D388）：東・西・北
  expand_shell_e: expandIcon(17.5, 10, 10, 13),
  expand_shell_w: expandIcon(6.5, 14, 14, 11),
  expand_shell_n: expandIcon(12, 6.5, 12, 14.5),
  expand_aurora_w: expandIcon(6.5, 14, 14, 11),
  expand_aurora_e: expandIcon(17.5, 10, 10, 13),
  expand_aurora_n: expandIcon(12, 6.5, 12, 14.5),
  // 山の島に橋をかける（D318）：海の向こうの山と、そこへ渡る橋
  expand_mountain: svg(
    `<path d="M11 18l5-9 5 9z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M11 18l5-9 5 9z" fill="#8fb07a" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M14.3 12l1.7-3 1.7 3-1 .8-.7-.6-.8.6z" fill="#fff"/>` +
      `<path d="M2 17h10" stroke="#b98b5e" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M3 15v4M6.5 15v4M10 15v4" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>`,
    28,
  ),
  // ゲームセンター（D331）：ゲーム機
  arcade_new: svg(
    `<rect x="4" y="6" width="16" height="12" rx="4" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="6" width="16" height="12" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M8 10v4M6 12h4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<circle cx="15" cy="11" r="1.3" fill="#e56b6f"/><circle cx="17" cy="13.5" r="1.3" fill="${MUSTARD}"/>`,
    28,
  ),
  // ドッグレース場（D328）：楕円のコースと旗
  track_new: svg(
    `<ellipse cx="12" cy="13" rx="9.5" ry="6.5" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<ellipse cx="12" cy="13" rx="9.5" ry="6.5" fill="#d9b27c" stroke="${INK}" stroke-width="1.3"/>` +
      `<ellipse cx="12" cy="13" rx="5" ry="2.8" fill="#7fbf6f"/>` +
      `<path d="M16 3v7" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/><path d="M16 3l4 1.5-4 1.5z" fill="#e56b6f"/>`,
    28,
  ),
  // 会社（D319）：窓の並んだビル
  company_new: svg(
    `<rect x="5" y="4" width="14" height="16" rx="1.5" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="5" y="4" width="14" height="16" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M8 8h2M11 8h2M14 8h2M8 11.5h2M11 11.5h2M14 11.5h2" stroke="${SKY}" stroke-width="2"/>` +
      `<rect x="10.5" y="15" width="3" height="5" rx="0.8" fill="${INK}"/>`,
    28,
  ),
  // 水族館（D319）：波の屋根と魚
  aquarium_new: svg(
    `<path d="M3 10q3-5 6-1t6 0 6 1v10H3z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M3 10q3-5 6-1t6 0 6 1v10H3z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<ellipse cx="11" cy="15" rx="3.5" ry="2" fill="${MUSTARD}"/><path d="M14.5 15l2.5-1.8v3.6z" fill="${MUSTARD}"/>`,
    28,
  ),
  // プール（D319）：水とコースロープ
  pool_new: svg(
    `<rect x="3" y="6" width="18" height="12" rx="3" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="6" width="18" height="12" rx="3" fill="#4fc3dc" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M4 10h16M4 14h16" stroke="#fff" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>` +
      `<circle cx="9" cy="12" r="1.6" fill="#f3cfb0"/>`,
    28,
  ),
  // 海水浴場（D371）：砂浜と波、パラソル
  beach_new: svg(
    `<path d="M2 16c3-1 5 1 8 0s5-1 8 0 3 1 4 .5V21H2z" fill="#3fb6c9"/>` +
      `<path d="M2 14h20v2c-3 1-5-1-8 0s-5 1-8 0-3-.5-4 0z" fill="#fbf1e4"/>` +
      `<path d="M12 14V6" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M5 8a7 5 0 0 1 14 0z" fill="#ff6b81" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M9.5 8L12 3.2 14.5 8" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`,
    28,
  ),
  // マルシェ（D387）：しましまの屋根の屋台と 品物
  marche_new: svg(
    `<rect x="4" y="12" width="17" height="8" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="12" width="16" height="8" rx="1" fill="#b98b5e" stroke="${INK}" stroke-width="1.1"/>` +
      `<path d="M3 6h18v5H3z" fill="#ff8a7a" stroke="${INK}" stroke-width="1.1"/><path d="M7.5 6v5M12 6v5M16.5 6v5" stroke="#fff" stroke-width="2.2"/>` +
      `<circle cx="8" cy="15" r="1.8" fill="#ffb627"/><circle cx="12" cy="15" r="1.8" fill="#86c47c"/><circle cx="16" cy="15" r="1.8" fill="#ff6b81"/>`,
    28,
  ),
  // フェスの舞台（D387）：ビーチフェス＝電球の飾りと音符／オーロラの夜のフェス＝キャンドルと オーロラ
  beachfest_new: svg(
    `<rect x="3" y="14" width="19" height="6" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M2 20h20" stroke="#f2d8a7" stroke-width="3"/>` +
      `<rect x="3" y="14" width="18" height="5" rx="1" fill="#b98b5e" stroke="${INK}" stroke-width="1.1"/>` +
      `<path d="M3 5q9 5 18 0" fill="none" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="6" cy="6.6" r="1.2" fill="#ffb627"/><circle cx="10" cy="7.8" r="1.2" fill="#ff6b81"/><circle cx="14" cy="7.8" r="1.2" fill="#86c47c"/><circle cx="18" cy="6.6" r="1.2" fill="#ffb627"/>` +
      `<path d="M13 9.5v3.2" stroke="${INK}" stroke-width="1.2"/><ellipse cx="11.9" cy="12.8" rx="1.3" ry="1" fill="${INK}"/><path d="M13 9.5l2.2 0.8" stroke="${INK}" stroke-width="1.2"/>`,
    28,
  ),
  snowfest_new: svg(
    `<path d="M2 6q5-3 10 0t10 0" fill="none" stroke="#7fe3c4" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M2 9q5-2.4 10 0t10 0" fill="none" stroke="#b69cf2" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>` +
      `<rect x="3" y="14" width="19" height="6" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="3" y="14" width="18" height="5" rx="1" fill="#eef4f8" stroke="${INK}" stroke-width="1.1"/>` +
      `<rect x="7" y="11" width="2" height="3" fill="#fff6ea" stroke="${INK}" stroke-width="0.8"/><path d="M8 9.2q.9 1 0 1.6q-.9-.6 0-1.6z" fill="#ffb627"/>` +
      `<rect x="15" y="11" width="2" height="3" fill="#fff6ea" stroke="${INK}" stroke-width="0.8"/><path d="M16 9.2q.9 1 0 1.6q-.9-.6 0-1.6z" fill="#ffb627"/>`,
    28,
  ),
  // ビーチバレー（D373）：ネットと 球
  volley_new: svg(
    `<path d="M2 19h20" stroke="#f2d8a7" stroke-width="3"/>` +
      `<path d="M4 12h16M5 9v10M19 9v10" stroke="${INK}" stroke-width="1.4"/><path d="M5 9h14v3H5z" fill="#fff" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="15" cy="5" r="3.2" fill="#fff" stroke="${MUSTARD}" stroke-width="1.6"/>`,
    28,
  ),
  // サーフィン（D373）：波と ボード
  surf_new: svg(
    `<path d="M2 20c4 0 5-9 11-9 4 0 6 3 6 5-2-1-4-1-5 1 3 0 5 1 8 3z" fill="#3fb6c9" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M13 11c-2-1-2-4 0-5" stroke="#fff" stroke-width="1.4" fill="none"/>` +
      `<ellipse cx="9" cy="7" rx="6" ry="1.8" transform="rotate(-30 9 7)" fill="#ff6b81" stroke="${INK}" stroke-width="1"/>`,
    28,
  ),
  // カーリング（D373）：的と 石
  curling_new: svg(
    `<circle cx="9" cy="10" r="7" fill="#62b6cb"/><circle cx="9" cy="10" r="4.5" fill="#fff"/><circle cx="9" cy="10" r="2.2" fill="#e56b6f"/>` +
      `<circle cx="17.5" cy="17.5" r="4.5" fill="${SHADOW}"/><circle cx="17" cy="17" r="4.5" fill="#9aa2aa" stroke="${INK}" stroke-width="1.2"/><path d="M15.5 13.5h3v2h-3z" fill="#e56b6f"/>`,
    28,
  ),
  // アイスホッケー（D373）：スティックと パック
  hockey_new: svg(
    `<path d="M6 3l7 14h5" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<ellipse cx="8" cy="19" rx="3.5" ry="1.8" fill="#1f2a36"/><path d="M3 14h4" stroke="#e56b6f" stroke-width="1.4"/>`,
    28,
  ),
  // 温泉（D371）：岩の湯船と 湯気
  onsen_new: svg(
    `<ellipse cx="13" cy="17" rx="9" ry="4" fill="${SHADOW}"/>` +
      `<ellipse cx="12" cy="16" rx="9" ry="4" fill="#6cc6c0" stroke="#7d858d" stroke-width="2.2"/>` +
      `<path d="M8 11c-1.2-1.4 1.2-2.6 0-4M12 11c-1.2-1.4 1.2-2.6 0-4M16 11c-1.2-1.4 1.2-2.6 0-4" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    28,
  ),
  // スキー場（D318）：雪の山と、滑るあと
  ski_new: svg(
    `<path d="M3 19l8-13 5 7 2-2 3 8z" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<path d="M3 19l8-13 5 7 2-2 3 8z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M9 9c2 2-2 4 0 6s-1 3 1 4" stroke="${SKY}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
      `<circle cx="15" cy="15" r="1.6" fill="#e56b6f"/>`,
    28,
  ),
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
  // 飾り（D334）
  deco_flowerbed: svg(
    `<rect x="4" y="13" width="16" height="7" rx="3" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="13" width="16" height="7" rx="3" fill="#b07a52" stroke="${INK}" stroke-width="1.3"/>` +
      `<circle cx="8" cy="11" r="2.6" fill="#f28aa0"/><circle cx="12" cy="9.5" r="2.6" fill="#ffd166"/><circle cx="16" cy="11" r="2.6" fill="#f28aa0"/>`,
  ),
  deco_bench: svg(
    `<rect x="4" y="8" width="16" height="4" rx="1.5" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="4" y="8" width="16" height="4" rx="1.5" fill="#c98b52" stroke="${INK}" stroke-width="1.2"/>` +
      `<rect x="3" y="13" width="18" height="4" rx="1.5" fill="#c98b52" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M6 17v3M18 17v3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  // 見晴らし台（1.3）：木の やぐらと 屋根、望遠鏡
  deco_lookout: svg(
    `<path d="M8 21l2.5-10M16 21l-2.5-10M9 17h6" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<rect x="7" y="9" width="10" height="3" rx="1" fill="#c98b52" stroke="${INK}" stroke-width="1.2"/>` +
      `<path d="M6 9l6-5 6 5z" fill="#ff7a5c" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M15 8l4-2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  ),
  deco_streetlamp: svg(
    `<path d="M12 9v11M9 20h6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="12" cy="6.5" r="3.6" fill="#ffd66b" stroke="${INK}" stroke-width="1.3"/>`,
  ),
  deco_fountain: svg(
    `<ellipse cx="13" cy="17" rx="9" ry="4" fill="${SHADOW}"/>` +
      `<ellipse cx="12" cy="16" rx="9" ry="4" fill="#7cc8dd" stroke="${INK}" stroke-width="1.3"/>` +
      `<rect x="10.5" y="9" width="3" height="7" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.1"/>` +
      `<path d="M12 8c-2-3-5-2-6 1M12 8c2-3 5-2 6 1" fill="none" stroke="${SKY}" stroke-width="1.6" stroke-linecap="round"/>`,
  ),
  deco_clocktower: svg(
    `<rect x="8" y="8" width="8" height="13" rx="1" transform="translate(1 1)" fill="${SHADOW}"/>` +
      `<rect x="8" y="8" width="8" height="13" rx="1" fill="#f4e6cf" stroke="${INK}" stroke-width="1.3"/>` +
      `<path d="M6.5 8.5 12 3l5.5 5.5z" fill="#c8553d" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<circle cx="12" cy="12" r="2.6" fill="#fff" stroke="${INK}" stroke-width="1.1"/><path d="M12 12v-1.6M12 12h1.3" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>`,
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
  // レストラン（D343：お酒の絵はやめた）：お皿とフォーク・ナイフ
  bar: svg(
    `<circle cx="13" cy="13" r="7" fill="${SHADOW}"/>` +
      `<circle cx="12" cy="12" r="7" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      `<circle cx="12" cy="12" r="4" fill="none" stroke="${MUSTARD}" stroke-width="1.2"/>` +
      `<path d="M3 5v5M2 5v3q0 2 1 2M4 5v3q0 2-1 2M3 10v9" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" fill="none"/>` +
      `<path d="M21 5q-2 3 0 7v7" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
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

// 広げる（Lv を上げる）：その建物の絵の右上に「＋」の札。どの建物を広げるのかが絵で分かるように
const UP_BADGE =
  `<circle cx="20" cy="5" r="3.8" fill="${MUSTARD}" stroke="${INK}" stroke-width="1.2"/>` +
  `<path d="M20 3.2v3.6M18.2 5h3.6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
for (const key of Object.keys(ICONS)) {
  if (key.endsWith('_new')) ICONS[key.replace(/_new$/, '_up')] = ICONS[key].replace('</svg>', `${UP_BADGE}</svg>`);
}
