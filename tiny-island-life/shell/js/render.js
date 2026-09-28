// 描画。state を読んで絵を置くだけ。state は書き換えない。
// 見た目の方針は docs/DESIGN.md（切り絵のジオラマ・絵文字は使わない）。格子版（D289）。

import {
  T, COLS, ROWS, WORLD, SIZES, HOUSE_FLOOR, MAP, MAP_KEY, PIER, PIERS, OX, OY, AREAS, areaById, landBounds, shapesOf, islandRadius, edgeRadius, COVERED, COVER_KEY, plotOf, idx, center, neighbors, isRoad, occupied, BRIDGES, boatRoute,
} from './grid.js';
import { CONFIG } from './config.js';
import { wantsRoomHouses, boatsNow, clockOf, inSeason, seatCount, seatPositions, queueSlot, everyone, boatNow, shopLabel, labelOf, beachWater, sportPlayers, SPORTS, marcheCap, FESTS, isFestDay } from './sim.js';

export const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';

export const PALETTE = {
  sea: '#3aa6b9',
  seaDeep: '#2e8a9c',
  sand: '#f2d8a7',
  sandDark: '#e3c38b',
  grass: '#8cc084',
  grassDark: '#6fa56a',
  grassLight: '#a4d098',
  ink: '#3d5a80',
  mustard: '#f2b84b',
  white: '#ffffff',
  shadow: 'rgba(20, 60, 70, 0.28)',
  problem: '#c8553d',
};

// ---------------------------------------------------------------- 島のテーマ（D312・見た目の単発購入の1つ目）
//
// 海・砂・芝・木・花の色だけを入れ替える。建物と人の色は変えない（どのテーマでも、島の住民は同じ）
const BASE = { ...PALETTE };
export const THEMES = {
  default: {
    name: 'いつもの島',
    palette: {},
    leaves: [['#5e9c57', '#7db86e']],
    shrub: '#5e9c57',
    flowers: ['#f28aa0', '#ffffff'],
  },
  sakura: {
    name: '桜',
    palette: { sea: '#4fb3c4', seaDeep: '#3a98ab', sand: '#f6e0b8', sandDark: '#e8cc98', grass: '#a3cf8a', grassDark: '#86b872', grassLight: '#bfe0a6' },
    leaves: [['#f2a7bb', '#f9cad7'], ['#eb9bb0', '#f6bfce'], ['#f2a7bb', '#f9cad7'], ['#5e9c57', '#7db86e']],
    shrub: '#7cb46a',
    flowers: ['#f7b7c8', '#ffffff', '#f28aa0'],
    petals: '#f7c1cf',
  },
  natsu: {
    name: '南の島',
    palette: { sea: '#1fb5c4', seaDeep: '#128fa0', sand: '#fbe9c4', sandDark: '#f0d49e', grass: '#79c677', grassDark: '#58a95e', grassLight: '#98d98f' },
    leaves: [['#3f9a5a', '#5cb872'], ['#2f8a4c', '#4caa63']],
    shrub: '#3f9a5a',
    flowers: ['#ff6b81', '#ffd166', '#ffffff'],
  },
  koyo: {
    name: '紅葉',
    palette: { sea: '#3897a6', seaDeep: '#2b7d8c', sand: '#ecd3a0', sandDark: '#d9b983', grass: '#b4b670', grassDark: '#989b58', grassLight: '#c9cb8c' },
    leaves: [['#e07a3f', '#f0a15c'], ['#c9503f', '#e0715c'], ['#f2b84b', '#f7cf7a'], ['#e07a3f', '#f0a15c'], ['#7d8f45', '#9aac5a']],
    shrub: '#b8703c',
    flowers: ['#f2b84b', '#e07a3f'],
    petals: '#e8894a',
  },
  yuki: {
    name: '雪',
    palette: { sea: '#4a8db0', seaDeep: '#3a7396', sand: '#d3cdc3', sandDark: '#bdb5a8', grass: '#e9eff4', grassDark: '#c8d6e1', grassLight: '#f7fafc' },
    leaves: [['#4f7f5a', '#5f9468']],
    shrub: '#6b8f72',
    flowers: [],
    snow: true,
  },
  // シェルの島（D363）：海の向こうの島。季節では変わらない。
  // 本島の夏（南の島）と 色だけでは見分けがつかないので、形で違える：
  // サンゴ礁の輪（浅い潟と、とぎれとぎれのサンゴ）・白い石だたみの道・ヤシの木。砂は 貝がらの砕けた うすい桃色
  shell: {
    name: 'シェルの島',
    palette: { sea: '#2a9cb6', seaDeep: '#1d7f98', sand: '#f8e6da', sandDark: '#ecccbb', grass: '#86c47c', grassDark: '#66a862', grassLight: '#a7d99b' },
    leaves: [['#3f9a5a', '#5cb872'], ['#2f8a4c', '#4caa63']],
    shrub: '#4f9e5e',
    flowers: ['#ff6b81', '#ffffff', '#ffd166'],
    palms: true,
    reef: { lagoon: '#7fd2d0', coral: '#f3a597', foam: 'rgba(255,255,255,0.8)' },
    stone: { base: '#f4f2ec', dark: '#cfc8ba', cobble: '#e2ddd1' },
  },
  // オーロラの島（D365・D366）：北欧の常冬の島。季節では変わらない。
  // 本島の冬（雪）と 色だけでは見分けがつかないので、形で違える：
  // 入り組んだ岩の海岸（フィヨルド・形は grid.js）・とがった針葉樹・踏み固めた雪の道・海に浮かぶ氷・夜空のオーロラ
  aurora: {
    name: 'オーロラの島',
    palette: { sea: '#2d5873', seaDeep: '#1d3d53', sand: '#7c8791', sandDark: '#5f6a74', grass: '#eaf0f5', grassDark: '#c3d0dc', grassLight: '#f8fafc' },
    leaves: [['#2e5b4b', '#3f7361'], ['#284f45', '#386658']],
    shrub: '#557a6c',
    flowers: [],
    snow: true,
    conifers: true,
    ice: '#f2f7fb',
    trail: { base: '#d3dde6', dark: '#a7b6c4', track: 'rgba(120,140,165,0.35)' },
    sky: ['rgba(110, 240, 180, 0.42)', 'rgba(90, 210, 220, 0.3)', 'rgba(170, 120, 255, 0.28)'],
  },
};
let theme = THEMES.default;
export function setTheme(id) {
  theme = THEMES[id] || THEMES.default;
  Object.assign(PALETTE, BASE, theme.palette);
  return theme;
}
export const themeId = () => Object.keys(THEMES).find((k) => THEMES[k] === theme);

// 住民の見た目（名前ごと）。ルールには関係ないので sim.js ではなくここに置く
export const LOOKS = {
  ユウタ: { shirt: '#3d5a80', hair: '#3b2a20', style: 'short', skin: '#f3cfb0' },
  アヤ: { shirt: '#f28aa0', hair: '#6b3f2a', style: 'long', skin: '#f6d6bb' },
  ケンジ: { shirt: '#f2b84b', hair: '#2b2b33', style: 'cap', skin: '#e9bf99' },
  ミナ: { shirt: '#2a9d8f', hair: '#4a2e20', style: 'pigtails', skin: '#f6d6bb' },
  ソラ: { shirt: '#62b6cb', hair: '#7a4b2c', style: 'short', skin: '#f3cfb0' },
  ハルカ: { shirt: '#9c89b8', hair: '#c9c4cf', style: 'bun', skin: '#f1cdb0' },
  ダイチ: { shirt: '#6a994e', hair: '#3b2a20', style: 'short', skin: '#d9a982' },
  リコ: { shirt: '#f4a259', hair: '#e8c170', style: 'bob', skin: '#f6d6bb' },
  タロウ: { shirt: '#8d6a4f', hair: '#e6e2dc', style: 'bald', skin: '#efc7a6' },
  ノゾミ: { shirt: '#e56b9f', hair: '#5a3825', style: 'pigtails', skin: '#f6d6bb' },
};
const DEFAULT_LOOK = { shirt: '#3d5a80', hair: '#3b2a20', style: 'short', skin: '#f3cfb0' };
// 観光客：麦わら帽子とカメラ。服の色は人ごとに変える
const TOURIST_SHIRTS = ['#ffffff', '#b8e0d2', '#f7c5cc', '#c9d8f0', '#f6e3a1', '#d6c7e8'];
const TOURIST_SKINS = ['#f6d6bb', '#e9bf99', '#d9a982', '#f3cfb0'];
// 「島の人」（名前のない住民）は、服・髪・肌を人ごとに組み合わせる
const GENERIC_SHIRTS = ['#4f6d7a', '#c06c84', '#6c8ead', '#e0a458', '#7a9e7e', '#b5838d', '#577590', '#d4a373'];
const GENERIC_HAIR = ['#3b2a20', '#2b2b33', '#6b3f2a', '#a0522d', '#c9c4cf'];
const GENERIC_STYLES = ['short', 'long', 'bob', 'short', 'bun', 'cap'];
const mixedLook = (look) => ({
  shirt: GENERIC_SHIRTS[look % GENERIC_SHIRTS.length],
  hair: GENERIC_HAIR[Math.floor(look / 8) % GENERIC_HAIR.length],
  style: GENERIC_STYLES[Math.floor(look / 40) % GENERIC_STYLES.length],
  skin: ['#f6d6bb', '#e9bf99', '#d9a982', '#f3cfb0'][Math.floor(look / 7) % 4],
});
// 名前を変えても見た目は変わらない（lookName＝最初の名前・D310）。島で生まれた子も人ごとに違う見た目
// 老人（D349）は 白い髪
export const lookOf = (r) => (r.elder ? { ...lookBase(r), hair: '#dcd8d2' } : lookBase(r));
const lookBase = (r) =>
  r.generic
    ? mixedLook(r.look)
    : r.tourist
    ? { shirt: TOURIST_SHIRTS[r.look % TOURIST_SHIRTS.length], hair: '#e8c170', style: 'hat', skin: TOURIST_SKINS[r.look % TOURIST_SKINS.length], camera: true, hop: r.hop }
    : LOOKS[r.lookName || r.name] || (r.look !== undefined ? mixedLook(r.look) : DEFAULT_LOOK);

// 家の色（D314・見た目の単発購入の1つ目）。屋根・壁・戸の色のセット。家ごとに順番に使う
export const HOUSE_SKINS = {
  default: { name: 'いつもの家', roofs: ['#3d5a80', '#f2b84b', '#2a9d8f', '#9c89b8'], walls: ['#ffffff'], door: '#3d5a80' },
  hokuo: { name: '北欧', roofs: ['#3f4a5a', '#a3413b', '#2f5d62', '#6b5b4b'], walls: ['#f4d6c8', '#d7e6ef', '#f6ecd0', '#dfe8d6'], door: '#3f4a5a' },
  minami: { name: '南の島', roofs: ['#ff8a7a', '#2ec4b6', '#ffbf69', '#5fb7e5'], walls: ['#ffffff', '#fff6e8'], door: '#2a9d8f' },
  wafu: { name: '和風', roofs: ['#4a4e57', '#5c5f66', '#3f4349'], walls: ['#f3ead8', '#efe3cc'], door: '#7a5a3c' },
};
let houseSkin = HOUSE_SKINS.default;
export function setHouseSkin(id) {
  houseSkin = HOUSE_SKINS[id] || HOUSE_SKINS.default;
}

function phaseOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h / 159;
}

// マスごとの決まった乱数（木や花の置き場所）
const hash = (i) => {
  let x = (i + 1) * 2654435761;
  x ^= x >>> 13;
  return ((x * 1274126177) >>> 0) / 4294967296;
};

// 交差点（道が3方向以上につながるマス）の一部に街灯を立てる。地図が変わったら（島を広げたら）作り直す
let lampsKey = null;
let lampsList = [];
function lamps() {
  if (lampsKey !== MAP_KEY) {
    lampsKey = MAP_KEY;
    lampsList = MAP.map((k, i) => (k === 'road' && neighbors(i).filter(isRoad).length >= 3 && hash(i) < 0.5 ? i : -1)).filter((i) => i >= 0);
  }
  return lampsList;
}

// 島の土地（楕円をすこし揺らした形）。広げた土地は、本島に重ねて描く
function islandPath(ctx, area, k = 1, grow = 0, dx = 0, dy = 0) {
  ctx.beginPath();
  const n = area.fjords ? 480 : 120; // 細い切れこみ（フィヨルド）は 細かく描く
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = edgeRadius(area, a) * k;
    const x = area.cx + dx + Math.cos(a) * (area.rx * f + grow);
    const y = area.cy + dy + Math.sin(a) * (area.ry * f + grow);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// サンゴ礁の輪（シェルの島・D363）：島のまわりの浅い潟と、その外のふちの とぎれとぎれのサンゴ。
// 桟橋の先（南）は あけておく（船の通り道）
function reef(g, areas) {
  const look = THEMES.shell.reef;
  g.fillStyle = look.lagoon;
  for (const a of areas.flatMap(shapesOf)) {
    islandPath(g, a, 1, 46);
    g.fill();
  }
  for (const area of areas) {
    const n = 150;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.32) continue; // 船の通り道
      if (Math.sin(a * 5 + area.ph * 3) > 0.82) continue; // ところどころ切れている
      const f = islandRadius(a, area.ph);
      const w = 44 + Math.sin(i * 2.3) * 3;
      const x = area.cx + Math.cos(a) * (area.rx * f + w);
      const y = area.cy + Math.sin(a) * (area.ry * f + w);
      const h = hash(i + Math.round(area.ph * 1000));
      if (h < 0.18) continue; // すき間
      const s = 1.6 + h * 2.2;
      g.fillStyle = look.foam;
      g.beginPath();
      g.arc(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, s + 1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = look.coral;
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ---------------------------------------------------------------- 片付けていない区画（海の向こうの島・D354・D367）
// シェルの島：嵐で流れ着いたもの（流木・木箱・網・海藻）と 伸びた草。
// オーロラの島：雪の吹きだまりに、倒れた針葉樹・伏せた小舟・区画ごとに1つ 古い漁師小屋。
// どちらも 片付けると消える（動かない絵なので 地面の絵に描く）
function drawDebris(g) {
  const tiles = [...COVERED].sort((a, b) => a - b);
  if (theme.conifers) return snowDebris(g, tiles);
  for (const i of tiles) {
    const p = center(i);
    g.fillStyle = 'rgba(150, 128, 88, 0.3)';
    g.fillRect(p.x - T / 2, p.y - T / 2, T, T);
  }
  for (const i of tiles) {
    const p = center(i);
    const h = hash(i);
    const h2 = hash(i + 991);
    // 伸びた草（どのマスにも）
    g.strokeStyle = '#5b8a4a';
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const x = p.x - 10 + ((h2 * 97 + k * 37) % 20);
      const y = p.y + 4 + ((h * 53 + k * 11) % 9);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 2, y - 6);
      g.moveTo(x, y);
      g.lineTo(x + 2, y - 7);
      g.stroke();
    }
    if (h < 0.24) {
      // 流木
      const a = (h2 - 0.5) * 1.6;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(a);
      g.fillStyle = PALETTE.shadow;
      roundRect(g, -12, -1, 26, 6, 3);
      g.fill();
      g.fillStyle = '#b8a48a';
      roundRect(g, -13, -3, 26, 6, 3);
      g.fill();
      g.strokeStyle = 'rgba(90,70,50,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-9, -1);
      g.lineTo(8, 0);
      g.moveTo(6, -3);
      g.lineTo(10, -7);
      g.stroke();
      g.restore();
    } else if (h < 0.38) {
      // 木箱（少し傾いて）
      g.save();
      g.translate(p.x + (h2 - 0.5) * 8, p.y - 2);
      g.rotate((h2 - 0.5) * 0.6);
      g.fillStyle = PALETTE.shadow;
      g.fillRect(-6, -5, 13, 12);
      g.fillStyle = '#c49a6c';
      g.fillRect(-7, -7, 13, 12);
      g.strokeStyle = 'rgba(80,50,30,0.45)';
      g.lineWidth = 1;
      g.strokeRect(-7, -7, 13, 12);
      g.beginPath();
      g.moveTo(-7, -1);
      g.lineTo(6, -1);
      g.moveTo(-7, -7);
      g.lineTo(6, 5);
      g.stroke();
      g.restore();
    } else if (h < 0.48) {
      // 網（浮きのついた）
      g.save();
      g.translate(p.x, p.y);
      g.fillStyle = 'rgba(95, 120, 110, 0.35)';
      g.beginPath();
      g.ellipse(0, 0, 12, 7, h2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(70, 95, 90, 0.7)';
      g.lineWidth = 0.8;
      for (let k = -10; k <= 10; k += 4) {
        g.beginPath();
        g.moveTo(k - 3, -6);
        g.lineTo(k + 3, 6);
        g.moveTo(k + 3, -6);
        g.lineTo(k - 3, 6);
        g.stroke();
      }
      g.fillStyle = '#e8743b';
      for (const [x, y] of [[-8, -3], [7, 3]]) {
        g.beginPath();
        g.arc(x, y, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    } else if (h < 0.56) {
      // 打ち上げられた海藻
      g.fillStyle = '#6f7a3c';
      g.beginPath();
      g.ellipse(p.x - 3, p.y + 2, 7, 3.5, 0.3, 0, Math.PI * 2);
      g.ellipse(p.x + 4, p.y, 5, 3, -0.4, 0, Math.PI * 2);
      g.fill();
    }
  }
}
function snowDebris(g, tiles) {
  const covered = new Set(tiles);
  // 吹きだまり（どのマスにも。青い影の上に 白い山）
  // 大きさも位置も ばらばらにして、マスの並びが見えないように。影を先に全部、白い山をあとで全部
  const drifts = tiles
    .filter((i) => hash(i + 313) < 0.6)
    .map((i) => {
      const p = center(i);
      const h = hash(i + 71);
      const h2 = hash(i + 173);
      return { x: p.x + (h - 0.5) * 14, y: p.y + (h2 - 0.5) * 12, rx: 10 + h2 * 9, ry: 5 + h * 4 };
    });
  g.fillStyle = 'rgba(120, 145, 175, 0.22)';
  g.beginPath();
  for (const d of drifts) {
    g.moveTo(d.x + 2 + d.rx, d.y + 3);
    g.ellipse(d.x + 2, d.y + 3, d.rx, d.ry, 0, 0, Math.PI * 2);
  }
  g.fill();
  g.fillStyle = '#fbfdff';
  g.beginPath();
  for (const d of drifts) {
    g.moveTo(d.x + d.rx, d.y);
    g.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
  }
  g.fill();
  // 区画ごとに1つ 古い漁師小屋（右と下のマスも覆われているところ）
  const huts = new Map();
  for (const i of tiles) {
    const n = plotOf(i % COLS, Math.floor(i / COLS));
    if (!covered.has(i + 1) || !covered.has(i + COLS) || !covered.has(i + COLS + 1)) continue;
    if (!huts.has(n) || hash(i + 5) < hash(huts.get(n) + 5)) huts.set(n, i);
  }
  const hutTiles = new Set([...huts.values()].flatMap((i) => [i, i + 1, i + COLS, i + COLS + 1]));
  for (const i of tiles) {
    if (hutTiles.has(i)) continue;
    const p = center(i);
    const h = hash(i);
    const h2 = hash(i + 991);
    if (h < 0.2) {
      // 倒れた針葉樹（雪をかぶって）
      g.save();
      g.translate(p.x, p.y);
      g.rotate((h2 - 0.5) * 0.9);
      g.fillStyle = 'rgba(60, 80, 110, 0.25)';
      g.fillRect(-13, 1, 27, 5);
      g.strokeStyle = '#6b5040';
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-13, 0);
      g.lineTo(13, 0);
      g.stroke();
      g.fillStyle = '#2e5b4b';
      for (let k = 0; k < 3; k++) {
        const x = -4 + k * 6;
        g.beginPath();
        g.moveTo(x + 7, 0);
        g.lineTo(x - 1, -5 + k * 0.6);
        g.lineTo(x - 1, 5 - k * 0.6);
        g.closePath();
        g.fill();
      }
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(4, -2.5, 9, 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    } else if (h < 0.3) {
      // 伏せた小舟
      g.fillStyle = 'rgba(60, 80, 110, 0.25)';
      g.beginPath();
      g.ellipse(p.x + 2, p.y + 3, 12, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#8a5a3c';
      g.beginPath();
      g.ellipse(p.x, p.y, 12, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(50,30,20,0.4)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(p.x - 10, p.y);
      g.lineTo(p.x + 10, p.y);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(p.x - 1, p.y - 2.5, 8, 2.6, 0, 0, Math.PI * 2);
      g.fill();
    } else if (h < 0.36) {
      // 雪から出た 杭
      g.fillStyle = '#7a6250';
      g.fillRect(p.x - 6, p.y - 6, 2.5, 8);
      g.fillRect(p.x + 3, p.y - 4, 2.5, 6);
      g.fillStyle = '#fff';
      g.fillRect(p.x - 6.5, p.y - 7, 3.5, 1.6);
      g.fillRect(p.x + 2.5, p.y - 5, 3.5, 1.6);
    }
  }
  for (const i of huts.values()) {
    // 古い漁師小屋：灰色の板の壁・雪の重みで少し たわんだ屋根・板を打ちつけた窓
    const x = (i % COLS) * T + 8;
    const y = Math.floor(i / COLS) * T + 18;
    const w = T * 2 - 16;
    const hgt = 20;
    g.fillStyle = 'rgba(60, 80, 110, 0.28)';
    g.fillRect(x + 4, y + 5, w, hgt + 6);
    g.fillStyle = '#8f8a82';
    g.fillRect(x, y + 6, w, hgt);
    g.strokeStyle = 'rgba(40,35,30,0.3)';
    g.lineWidth = 1;
    for (let k = 4; k < w; k += 5) {
      g.beginPath();
      g.moveTo(x + k, y + 6);
      g.lineTo(x + k, y + 6 + hgt);
      g.stroke();
    }
    g.fillStyle = '#5d564f';
    g.fillRect(x + 6, y + 12, 9, 8);
    g.strokeStyle = '#b8a48a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x + 5, y + 13);
    g.lineTo(x + 16, y + 19);
    g.stroke();
    g.fillStyle = '#6b4a36';
    g.fillRect(x + w - 14, y + 13, 8, 13);
    // 屋根と雪
    g.fillStyle = '#6e4f3c';
    g.beginPath();
    g.moveTo(x - 4, y + 8);
    g.quadraticCurveTo(x + w / 2, y + 2, x + w + 4, y + 8);
    g.lineTo(x + w / 2, y - 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(x - 5, y + 7);
    g.quadraticCurveTo(x + w / 2, y + 1, x + w + 5, y + 7);
    g.lineTo(x + w / 2 + 2, y - 7);
    g.lineTo(x + w / 2 - 2, y - 9);
    g.closePath();
    g.fill();
    // 小屋のまわりの吹きだまり
    g.beginPath();
    g.ellipse(x + 2, y + hgt + 6, 9, 4, 0, 0, Math.PI * 2);
    g.ellipse(x + w - 3, y + hgt + 7, 11, 4, 0, 0, Math.PI * 2);
    g.fill();
  }
}

// 山（D318）：紙を切り抜いたような山。ふもとは山のマスの下の端、頂上は島の上に はみ出す
const MOUNTAIN_LOOK = {
  default: { body: '#8fb07a', shade: 'rgba(40, 70, 50, 0.16)', cap: '#ffffff', tree: '#4f8a55' },
  sakura: { body: '#9fc68c', shade: 'rgba(40, 70, 50, 0.14)', cap: '#ffffff', tree: '#5e9c57' },
  natsu: { body: '#6fae6a', shade: 'rgba(30, 70, 40, 0.18)', cap: null, tree: '#2f8a4c' },
  koyo: { body: '#c08a4f', shade: 'rgba(90, 50, 20, 0.18)', cap: '#ffffff', tree: '#c9503f' },
  yuki: { body: '#f3f6f9', shade: 'rgba(60, 90, 130, 0.16)', cap: null, tree: '#4f7f5a' },
};
export function mountainGeom(m) {
  const foot = m.cy + m.ry * 0.75;
  return { foot, peak: { x: m.cx - m.rx * 0.12, y: foot - m.ry * 2.3 }, left: m.cx - m.rx, right: m.cx + m.rx };
}
function mountainPath(g, m, dx = 0, dy = 0) {
  const { cx, rx, ry } = m;
  const by = mountainGeom(m).foot + dy;
  const bx = cx + dx;
  g.beginPath();
  g.moveTo(bx - rx, by);
  g.quadraticCurveTo(bx - rx * 0.55, by - ry * 0.9, bx - rx * 0.12, by - ry * 2.3);
  g.quadraticCurveTo(bx + rx * 0.08, by - ry * 2.05, bx + rx * 0.3, by - ry * 1.7);
  g.quadraticCurveTo(bx + rx * 0.4, by - ry * 1.95, bx + rx * 0.5, by - ry * 1.78);
  g.quadraticCurveTo(bx + rx * 0.82, by - ry * 0.8, bx + rx, by);
  g.quadraticCurveTo(bx, by + ry * 0.3, bx - rx, by);
  g.closePath();
}
function drawMountain(g, m, themeKey) {
  const look = MOUNTAIN_LOOK[themeKey] || MOUNTAIN_LOOK.default;
  const { foot, peak } = mountainGeom(m);
  g.fillStyle = PALETTE.shadow;
  mountainPath(g, m, 5, 5);
  g.fill();
  g.fillStyle = look.body;
  mountainPath(g, m);
  g.fill();
  g.save();
  mountainPath(g, m);
  g.clip();
  // 右の斜面は かげ
  g.fillStyle = look.shade;
  g.beginPath();
  g.moveTo(peak.x, peak.y - 4);
  g.lineTo(peak.x + m.rx * 0.25, foot + m.ry);
  g.lineTo(m.cx + m.rx * 1.3, foot + m.ry);
  g.lineTo(m.cx + m.rx * 1.3, peak.y - 10);
  g.closePath();
  g.fill();
  // 頂上の雪（夏は無い。冬は山ぜんぶが白い）
  if (look.cap) {
    g.fillStyle = look.cap;
    const y = peak.y + m.ry * 0.62;
    g.beginPath();
    g.moveTo(m.cx - m.rx, peak.y - 10);
    g.lineTo(m.cx + m.rx, peak.y - 10);
    g.lineTo(m.cx + m.rx, y - 6);
    for (let k = 8; k >= 0; k--) {
      const x = m.cx - m.rx + (k / 8) * m.rx * 2;
      g.lineTo(x, y + (k % 2 ? 5 : -3));
    }
    g.closePath();
    g.fill();
  }
  g.restore();
  // ふもとの木
  for (let k = 0; k < 6; k++) {
    const x = m.cx - m.rx * 0.78 + k * m.rx * 0.31;
    const y = foot - 4 + ((k * 7) % 5);
    g.fillStyle = look.tree;
    g.beginPath();
    g.moveTo(x, y - 13);
    g.lineTo(x - 5, y);
    g.lineTo(x + 5, y);
    g.closePath();
    g.fill();
    if (themeKey === 'yuki') {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(x, y - 13);
      g.lineTo(x - 2.5, y - 7);
      g.lineTo(x + 2.5, y - 7);
      g.closePath();
      g.fill();
    }
  }
}

// 桟橋の向き。船は桟橋の先の、少し横に着く
function pierGeom(id) {
  const [dx, dy] = areaById(id).pier.dir;
  const [px, py] = dx ? [0, 1] : [1, 0];
  return { dx, dy, px, py };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1 };
  const cam = { x: (OX + 6.5) * T, y: (OY + 11) * T, zoom: 1 };
  const drops = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.7 + Math.random() * 0.6 }));
  let ground = null;
  let groundKey = null;
  let groundRect = null;
  let pokes = null; // タップされた住民（id → タップした時刻）。ぴょんと跳ねて ハートを出す
  // 地面は一度だけ高い解像度で描いておく。島が広くなったら少し下げる（大きすぎる絵は iPhone で描けない）
  const groundRes = (rect) => Math.min(3, Math.sqrt(9e6 / (rect.w * rect.h)));

  const maxZoom = 1.7;

  // カメラが動ける範囲：ひらいた土地のまわり。桟橋の先の船が見えるところまで（下のボタンに隠れないよう広めに）
  const BOUNDS = { left: -20, right: WORLD.w + 20, top: -20, bottom: WORLD.h + 210 };
  let boundsKey = null;
  function setBounds(state) {
    const key = `${MAP_KEY}|${(state.harbors || []).map((h) => h.id).join('+')}`;
    if (key === boundsKey) return;
    boundsKey = key;
    const b = landBounds(state.areas || ['main'], { teaser: true });
    const has = (id) => (state.harbors || []).some((h) => h.id === id);
    Object.assign(BOUNDS, {
      left: b.left - 20 - (has('west') ? 170 : 0),
      right: b.right + 20 + (has('east') ? 170 : 0),
      top: b.top - 20 - (has('north') ? 190 : 0),
      bottom: b.bottom + 210,
    });
    clampCam();
  }
  const minZoom = () => Math.min(1, (view.w / (BOUNDS.right - BOUNDS.left - 40)) * 1.02);
  function clampCam() {
    cam.zoom = Math.max(minZoom(), Math.min(maxZoom, cam.zoom));
    const hw = view.w / 2 / cam.zoom;
    const hh = view.h / 2 / cam.zoom;
    const clampAxis = (v, half, lo, hi) => (hi - lo <= half * 2 ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, v)));
    cam.x = clampAxis(cam.x, hw, BOUNDS.left, BOUNDS.right);
    // 上は、画面の上の表示（日付・目標の紙）の下まで島を下げられるように（D324：島の上の端が見えなかった）
    cam.y = clampAxis(cam.y, hh, BOUNDS.top - topInset / cam.zoom, BOUNDS.bottom);
  }
  let topInset = 0;
  function setTopInset(px) {
    topInset = Math.max(0, px);
    clampCam();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.w = rect.width;
    view.h = rect.height;
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    // 最初は 13マスぶんの幅が見えるくらい
    if (!view.started) {
      cam.zoom = Math.min(1.15, view.w / (13 * T));
      view.started = true;
    }
    clampCam();
  }

  const ox = () => view.w / 2 - cam.x * cam.zoom;
  const oy = () => view.h / 2 - cam.y * cam.zoom;

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - ox()) / cam.zoom, y: (clientY - rect.top - oy()) / cam.zoom };
  }

  function tileAt(clientX, clientY) {
    const p = toWorld(clientX, clientY);
    return { c: Math.floor(p.x / T), r: Math.floor(p.y / T) };
  }

  function panBy(dx, dy) {
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    clampCam();
  }

  function zoomAt(factor, clientX, clientY) {
    const before = toWorld(clientX, clientY);
    cam.zoom *= factor;
    clampCam();
    const after = toWorld(clientX, clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    clampCam();
  }

  function focus(x, y) {
    cam.x = x;
    cam.y = y;
    clampCam();
  }

  // ---------------------------------------------------------------- 動かない地面（島・道・桟橋）

  function buildGround(state) {
    const ids = state.areas || ['main'];
    const areas = AREAS.filter((a) => a.id === 'main' || ids.includes(a.id));
    const harbors = (state.harbors || []).map((h) => h.id);
    // 地面の絵は、ひらいた土地のまわりだけ（広い海まで高解像度で持たない）
    const lb = landBounds(ids);
    const m = 80;
    const rect = { x: Math.floor(lb.left - m), y: Math.floor(lb.top - m), w: 0, h: 0 };
    rect.w = Math.ceil(lb.right + m) - rect.x;
    rect.h = Math.ceil(lb.bottom + m) - rect.y;
    const off = document.createElement('canvas');
    const res = groundRes(rect);
    off.width = Math.round(rect.w * res);
    off.height = Math.round(rect.h * res);
    const g = off.getContext('2d');
    g.scale(res, res);
    g.translate(-rect.x, -rect.y);

    // 島の影（ずらした紙）→ 浅瀬 → 砂 → 芝。どの層も、土地ぜんぶを描いてから次の層へ
    const layer = (color, k, grow, dx = 0, dy = 0) => {
      g.fillStyle = color;
      for (const a of areas.flatMap(shapesOf)) {
        islandPath(g, a, k, grow, dx, dy);
        g.fill();
      }
    };
    if (theme.reef) reef(g, areas);
    layer(PALETTE.seaDeep, 1, 10, 6, 8);
    layer('rgba(255,255,255,0.22)', 1, 12);
    layer(PALETTE.sand, 1, 4);
    layer(PALETTE.grassDark, 0.885, 0, 3, 4);
    layer(PALETTE.grass, 0.885);

    // 桟橋：本島の桟橋はいつも。広げた土地の桟橋は、港をつくったら
    for (const id of ['main', ...harbors]) {
      const pier = center(PIERS[id]);
      const { dx, dy } = pierGeom(id);
      const L = 56;
      const r = dx ? { x: dx > 0 ? pier.x : pier.x - L, y: pier.y - 9, w: L, h: 18 } : { x: pier.x - 9, y: dy > 0 ? pier.y : pier.y - L, w: 18, h: L };
      g.fillStyle = PALETTE.shadow;
      g.fillRect(r.x + 3, r.y + 3, r.w, r.h);
      g.fillStyle = '#b98b5e';
      g.fillRect(r.x, r.y, r.w, r.h);
      g.strokeStyle = 'rgba(80,50,30,0.25)';
      g.lineWidth = 1;
      for (let k = 6; k < L; k += 7) {
        g.beginPath();
        if (dx) {
          const x = dx > 0 ? pier.x + k : pier.x - k;
          g.moveTo(x, r.y);
          g.lineTo(x, r.y + r.h);
        } else {
          const y = dy > 0 ? pier.y + k : pier.y - k;
          g.moveTo(r.x, y);
          g.lineTo(r.x + r.w, y);
        }
        g.stroke();
      }
    }

    // 道：マスをつないだ帯。先に濃い砂で影、上に明るい砂
    const W = 20;
    const band = (color, d) => {
      g.fillStyle = color;
      for (let i = 0; i < MAP.length; i++) {
        if (!isRoad(i)) continue;
        const p = center(i);
        roundRect(g, p.x - W / 2 + d, p.y - W / 2 + d, W, W, 7);
        g.fill();
        if (isRoad(i + 1) && (i + 1) % COLS !== 0) g.fillRect(p.x + d, p.y - W / 2 + d, T, W);
        if (isRoad(i + COLS)) g.fillRect(p.x - W / 2 + d, p.y + d, W, T);
      }
    };
    if (theme.stone) {
      // 石だたみ（シェルの島）：白い帯に、少し濃い石を散らす
      band(theme.stone.dark, 2);
      band(theme.stone.base, 0);
      g.fillStyle = theme.stone.cobble;
      for (let i = 0; i < MAP.length; i++) {
        if (!isRoad(i) || BRIDGES.has(i)) continue;
        const p = center(i);
        for (let k = 0; k < 4; k++) {
          const h = hash(i * 4 + k);
          roundRect(g, p.x - 8 + (k % 2) * 8 + h * 3, p.y - 7 + Math.floor(k / 2) * 8 + ((h * 7) % 1) * 2, 6.5, 5, 2);
          g.fill();
        }
      }
    } else if (theme.trail) {
      // 踏み固めた雪の道（オーロラの島）：青みの影と、そりの跡が2本
      band(theme.trail.dark, 2);
      band(theme.trail.base, 0);
      g.strokeStyle = theme.trail.track;
      g.lineWidth = 1.2;
      for (let i = 0; i < MAP.length; i++) {
        if (!isRoad(i) || BRIDGES.has(i)) continue;
        const p = center(i);
        const across = isRoad(i + 1) || isRoad(i - 1);
        const along = isRoad(i + COLS) || isRoad(i - COLS);
        g.beginPath();
        for (const k of [-3.5, 3.5]) {
          if (across) {
            g.moveTo(p.x - T / 2, p.y + k);
            g.lineTo(p.x + T / 2, p.y + k);
          }
          if (along) {
            g.moveTo(p.x + k, p.y - T / 2);
            g.lineTo(p.x + k, p.y + T / 2);
          }
        }
        g.stroke();
      }
    } else {
      band(PALETTE.sandDark, 2);
      band(PALETTE.sand, 0);
    }
    // 橋（D318）：海の上の道は 板をわたした橋にする
    for (const i of BRIDGES) {
      const p = center(i);
      g.fillStyle = PALETTE.shadow;
      g.fillRect(p.x - T / 2, p.y - 8, T, 22);
      g.fillStyle = '#c49a6c';
      g.fillRect(p.x - T / 2, p.y - 11, T, 22);
      g.strokeStyle = 'rgba(80,50,30,0.28)';
      g.lineWidth = 1;
      for (let k = 0; k < T; k += 6) {
        g.beginPath();
        g.moveTo(p.x - T / 2 + k, p.y - 11);
        g.lineTo(p.x - T / 2 + k, p.y + 11);
        g.stroke();
      }
      g.fillStyle = '#8d6a4f';
      g.fillRect(p.x - T / 2, p.y - 13, T, 3);
      g.fillRect(p.x - T / 2, p.y + 10, T, 3);
      g.fillRect(p.x - T / 2, p.y - 16, 3, 6);
      g.fillRect(p.x - T / 2, p.y + 10, 3, 7);
    }
    for (const a of areas) if (a.mountain) drawMountain(g, a.mountain, themeId());
    if (COVERED.size) drawDebris(g);
    groundRect = rect;
    return off;
  }

  // ---------------------------------------------------------------- 部品

  function floe(x, y, r, seed) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + seed;
      const f = 0.7 + hash(seed * 6 + k) * 0.45;
      ctx.lineTo(x + Math.cos(a) * r * f, y + Math.sin(a) * r * f * 0.7);
    }
    ctx.closePath();
    ctx.fill();
  }

  // オーロラ（オーロラの島の夜空・D365）：海と島の上にかかる光の幕。日が暮れると出て、明け方に消える
  function auroraSky(clock, time) {
    const min = clock >= 12 * 60 ? clock - 19 * 60 : clock + 5 * 60; // 19時から数えた分
    const strength = Math.max(0, Math.min(1, min / 60, (11 * 60 - min) / 60)); // 19〜20時で出て、5〜6時で消える
    if (strength <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 幕の下の端（いちばん明るい所）は 日付・目標の紙の下から（紙に隠れていた・D399）。上の方は紙の裏へ消えていく
    const top = Math.min(topInset, view.h * 0.45);
    theme.sky.forEach((color, k) => {
      const base = top + 50 + k * 30;
      const edge = (x) => base + Math.sin(x * 0.006 + time * 0.25 + k * 1.7) * 26 + Math.sin(x * 0.017 - time * 0.4 + k) * 9;
      const height = (x) => 70 + Math.sin(x * 0.011 + time * 0.3 + k * 2) * 30;
      // 幕は細い たての帯を並べて描く。帯ごとに 下の端が明るく、上へ行くほど消える（下の端も少しぼかす）
      const grad = ctx.createLinearGradient(0, -1, 0, 0.08);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.8, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      const W = 6;
      for (let x = 0; x < view.w + W; x += W) {
        // ひだ：ところどころ明るい
        ctx.globalAlpha = strength * (0.55 + 0.3 * Math.sin(time * 0.6 + k * 2.1) + 0.25 * Math.sin(x * 0.05 + time * 0.8 + k));
        if (ctx.globalAlpha <= 0.02) continue;
        ctx.setTransform(view.dpr, 0, 0, view.dpr * height(x), view.dpr * x, view.dpr * edge(x));
        ctx.fillRect(0, -1, W + 0.5, 1.08);
      }
    });
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.restore();
  }

  function tree(x, y, r, time) {
    if (theme.palms) return palm(x, y, r, time);
    if (theme.conifers) return conifer(x, y, r, time);
    const s = Math.sin(time * 1.3 + x) * 0.6;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 2, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x - 1.5, y - r * 0.6, 3, r * 0.6);
    // 木ごとに葉の色を選ぶ（紅葉は赤・橙・黄が まざる）
    const [leaf, light] = theme.leaves[Math.floor(Math.abs(x * 7 + y * 13)) % theme.leaves.length];
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(x + s, y - r * 0.9, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x + s - r * 0.28, y - r * 1.12, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (theme.snow) {
      // 雪の帽子
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + s, y - r * 1.25, r * 0.78, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 針葉樹（オーロラの島）：3段の とがった葉に、雪が積もる
  function conifer(x, y, r, time) {
    const s = Math.sin(time * 0.9 + x) * 0.4;
    const h = r * 2.3;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 2, r * 0.7, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b5040';
    ctx.fillRect(x - 1.5, y - r * 0.4, 3, r * 0.4);
    const [leaf, light] = theme.leaves[Math.floor(Math.abs(x * 7 + y * 13)) % theme.leaves.length];
    for (let k = 0; k < 3; k++) {
      const top = y - r * 0.3 - h * (0.42 + k * 0.29);
      const bottom = y - r * 0.3 - h * k * 0.26;
      const w = r * (0.85 - k * 0.2);
      const sx = s * (k + 1);
      ctx.fillStyle = leaf;
      ctx.beginPath();
      ctx.moveTo(x + sx, top);
      ctx.lineTo(x + sx + w, bottom);
      ctx.lineTo(x + sx - w, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(x + sx, top);
      ctx.lineTo(x + sx - w, bottom);
      ctx.lineTo(x + sx - w * 0.35, bottom);
      ctx.closePath();
      ctx.fill();
      // 雪：それぞれの段の上に
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + sx, top);
      ctx.lineTo(x + sx + w * 0.42, top + (bottom - top) * 0.45);
      ctx.lineTo(x + sx, top + (bottom - top) * 0.34);
      ctx.lineTo(x + sx - w * 0.42, top + (bottom - top) * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ヤシの木（シェルの島）：少し傾いた幹と、垂れた葉
  function palm(x, y, r, time) {
    const lean = (Math.floor(Math.abs(x * 7 + y * 3)) % 2 ? 1 : -1) * r * 0.35;
    const s = Math.sin(time * 1.1 + x) * 1.2;
    const top = { x: x + lean + s, y: y - r * 2.1 };
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4 + lean, y + 2, r * 0.95, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b48a5e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - lean * 0.2, y - r * 1.2, top.x, top.y);
    ctx.stroke();
    // 幹の節
    ctx.strokeStyle = 'rgba(80,50,30,0.3)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const px = (1 - t) * (1 - t) * x + 2 * t * (1 - t) * (x - lean * 0.2) + t * t * top.x;
      const py = (1 - t) * (1 - t) * y + 2 * t * (1 - t) * (y - r * 1.2) + t * t * top.y;
      ctx.beginPath();
      ctx.moveTo(px - 1.6, py);
      ctx.lineTo(px + 1.6, py);
      ctx.stroke();
    }
    const [leaf, light] = theme.leaves[Math.floor(Math.abs(x * 7 + y * 13)) % theme.leaves.length];
    const L = r * 1.25;
    [-2.75, -2.15, -1.55, -0.95, -0.35, 0.3, 2.9].forEach((a, k) => {
      const droop = Math.abs(Math.cos(a)) * r * 0.35;
      ctx.fillStyle = k % 2 ? light : leaf;
      ctx.beginPath();
      ctx.ellipse(top.x + (Math.cos(a) * L) / 2, top.y + (Math.sin(a) * L) / 2 + droop, L / 2, r * 0.22, a + Math.sign(Math.cos(a)) * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#7a5a3c';
    for (const dx of [-2.2, 2.2]) {
      ctx.beginPath();
      ctx.arc(top.x + dx, top.y + 2.5, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function shrub(x, y, r, time) {
    const s = Math.sin(time * 1.1 + y) * 0.5;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.shrub;
    ctx.beginPath();
    ctx.arc(x - r * 0.45 + s, y - r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45 + s, y - r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + s, y - r * 0.8, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    if (theme.snow) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + s, y - r * 1.05, r * 0.6, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  // 空いている土地の飾り（建物を建てると消える）
  function decor(used, time) {
    for (let i = 0; i < MAP.length; i++) {
      if (MAP[i] !== 'land' || used.has(i) || COVERED.has(i)) continue;
      const h = hash(i);
      const p = center(i);
      if (h < 0.16) tree(p.x + (h - 0.08) * 60, p.y + 8, 9 + h * 20, time);
      else if (h < 0.3) shrub(p.x - 4 + h * 20, p.y + 6, 7, time);
      else if (h < 0.5) {
        if (!theme.flowers.length) continue;
        ctx.fillStyle = theme.flowers[Math.floor(h * 100) % theme.flowers.length];
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(p.x - 6 + k * 6, p.y - 4 + ((k * 7) % 9), 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function paperShadow(draw) {
    ctx.save();
    ctx.translate(2.5, 3);
    ctx.fillStyle = PALETTE.shadow;
    draw(true);
    ctx.restore();
    draw(false);
  }

  // 家（D303：広げると2階建て → アパート。1階分ずつ上に伸びる）
  const floorsOf = (b) => b.level || 1;
  function house(b, n) {
    const x = b.c * T + T / 2;
    const y = b.r * T + 9;
    const lv = floorsOf(b);
    const lift = (lv - 1) * HOUSE_FLOOR;
    const w = lv >= 3 ? 26 : 24;
    const roof = houseSkin.roofs[n % houseSkin.roofs.length];
    const wall = houseSkin.walls[n % houseSkin.walls.length];
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = wall;
      roundRect(ctx, x - w / 2, y - lift, w, 18 + lift, 2);
      ctx.fill();
      if (!shadow) ctx.fillStyle = roof;
      if (lv >= 3) {
        // アパート：平らな屋根
        roundRect(ctx, x - w / 2 - 2, y - lift - 5, w + 4, 7, 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 15, y - lift + 2);
        ctx.lineTo(x, y - lift - 12);
        ctx.lineTo(x + 15, y - lift + 2);
        ctx.closePath();
        ctx.fill();
      }
    });
    // 階の境目
    ctx.fillStyle = 'rgba(61, 90, 128, 0.14)';
    for (let f = 1; f < lv; f++) ctx.fillRect(x - w / 2 + 1, y + 2 - f * HOUSE_FLOOR + HOUSE_FLOOR - 2, w - 2, 1.2);
    if (lv >= 3) {
      // アパートの看板（屋根の色の帯）
      ctx.fillStyle = roof;
      ctx.fillRect(x - w / 2, y + 1, w, 2);
    }
    ctx.fillStyle = houseSkin.door;
    roundRect(ctx, x - 3, y + 8, 6, 10, [3, 3, 0, 0]);
    ctx.fill();
  }

  function houseWindow(b, lit) {
    const x = b.c * T + T / 2;
    const y = b.r * T + 9;
    const lv = floorsOf(b);
    ctx.fillStyle = lit ? '#ffd66b' : '#cfe6ee';
    for (let f = 0; f < lv; f++) {
      const wy = y + 4 - f * HOUSE_FLOOR;
      roundRect(ctx, x + 5, wy, 5, 5, 1);
      ctx.fill();
      roundRect(ctx, x - 10, wy, 5, 5, 1);
      ctx.fill();
      if (f > 0) {
        roundRect(ctx, x - 2.5, wy, 5, 5, 1);
        ctx.fill();
      }
    }
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.26)';
      ctx.beginPath();
      ctx.arc(x, y + 8 - ((lv - 1) * HOUSE_FLOOR) / 2, 20 + (lv - 1) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function park(b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.park.w * T;
    const h = SIZES.park.h * T;
    ctx.fillStyle = PALETTE.grassDark;
    roundRect(ctx, x0 + 5, y0 + 6, w - 6, h - 6, 16);
    ctx.fill();
    ctx.fillStyle = PALETTE.grassLight;
    roundRect(ctx, x0 + 3, y0 + 3, w - 6, h - 6, 16);
    ctx.fill();
    for (let k = 0; k < 12; k++) {
      if (!theme.flowers.length) break;
      ctx.fillStyle = theme.flowers[k % theme.flowers.length];
      ctx.beginPath();
      ctx.arc(x0 + 14 + ((k * 37) % (w - 28)), y0 + 16 + ((k * 53) % (h - 30)), 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(x0 + w / 2 - 14, y0 + h - 22, 28, 5);
    tree(x0 + 18, y0 + 26, 12, time);
    tree(x0 + w - 18, y0 + h - 18, 13, time);
    tree(x0 + w - 22, y0 + 24, 9, time);
    if (b.roof) {
      const gx = x0 + 30;
      const gy = y0 + h - 22;
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.ellipse(gx + 3, gy + 8, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6a4f';
      ctx.fillRect(gx - 12, gy - 8, 3, 16);
      ctx.fillRect(gx + 9, gy - 8, 3, 16);
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.moveTo(gx - 19, gy - 6);
      ctx.lineTo(gx, gy - 20);
      ctx.lineTo(gx + 19, gy - 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  function cafe(b, label, showLabel) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.cafe.w * T;
    // テラス（ウッドデッキ）
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 3 + 3, y0 + T + 2 + 3, w - 6, 2 * T - 6, 8);
    ctx.fill();
    ctx.fillStyle = '#e9c89b';
    roundRect(ctx, x0 + 3, y0 + T + 2, w - 6, 2 * T - 6, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(141,106,79,0.22)';
    ctx.lineWidth = 1;
    for (let y = y0 + T + 11; y < y0 + 3 * T - 6; y += 9) {
      ctx.beginPath();
      ctx.moveTo(x0 + 8, y);
      ctx.lineTo(x0 + w - 8, y);
      ctx.stroke();
    }
    // 建物
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 4, y0 + 2, w - 8, T + 2, 3);
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 1, y0 - 3, w - 2, 7, 3);
    ctx.fill();
    const n = 8;
    const sw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? PALETTE.white : PALETTE.mustard;
      ctx.beginPath();
      ctx.moveTo(x0 + 4 + sw * i, y0 + 3);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 3);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 10);
      ctx.arc(x0 + 4 + sw * (i + 0.5), y0 + 10, sw / 2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stars = b.level > 1 ? ' ' + '★'.repeat(b.level - 1) : '';
    const sign = b.bar ? `RESTAURANT${stars}` : `CAFE${stars}`;
    // 戸（左）にかからないよう、戸の右から端までに収める。長い RESTAURANT は字を小さく（D343）
    const room = w - 30;
    const width = ctx.measureText(sign).width;
    if (width > room) ctx.font = `700 ${Math.floor((11 * room) / width * 10) / 10}px ${FONT}`;
    ctx.fillText(sign, b.bar ? x0 + 24 + room / 2 : x0 + w / 2 + 8, y0 + 22);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 10, y0 + 16, 11, T - 12, [5, 5, 0, 0]);
    ctx.fill();
    // 椅子と丸テーブル
    const seats = seatPositions(b);
    for (let i = 0; i < seatCount(b); i++) {
      const s = seats[i];
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.arc(s.x + 12, s.y - 1, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(s.x + 10, s.y - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.mustard;
      ctx.beginPath();
      ctx.arc(s.x + 10, s.y - 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d6a4f';
      roundRect(ctx, s.x - 5, s.y - 6, 10, 7, 2.5);
      ctx.fill();
    }
    // 列の先頭の黒板
    const q = queueSlot(b, 0);
    const mx = q.x + 16;
    const my = q.y - 2;
    ctx.fillStyle = '#8d6a4f';
    roundRect(ctx, mx - 6, my - 14, 12, 14, 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(mx - 4, my - 12, 8, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(mx - 2.5, my - 10, 5, 1.1);
    ctx.fillRect(mx - 2.5, my - 7, 3.5, 1.1);
    // カフェが2軒以上なら名札
    if (showLabel) {
      ctx.font = `700 10px ${FONT}`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = PALETTE.ink;
      roundRect(ctx, x0 + w / 2 - tw / 2, y0 - 20, tw, 15, 7.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(label, x0 + w / 2, y0 - 12);
    }
  }

  // お土産屋（2×2）：上の段が店、下の段が店先の台。台の上の品物は在庫に合わせて減る
  function shop(state, b, showLabel) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.shop.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 4, y0 + 4, w - 8, T + 4, 3);
      ctx.fill();
    });
    // 屋根（ティール）と日よけ
    ctx.fillStyle = '#2a9d8f';
    roundRect(ctx, x0 + 1, y0 - 2, w - 2, 8, 3);
    ctx.fill();
    const n = 6;
    const sw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? PALETTE.white : '#2a9d8f';
      ctx.beginPath();
      ctx.moveTo(x0 + 4 + sw * i, y0 + 6);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 6);
      ctx.lineTo(x0 + 4 + sw * (i + 1), y0 + 12);
      ctx.arc(x0 + 4 + sw * (i + 0.5), y0 + 12, sw / 2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('おみやげ', x0 + w / 2 + 6, y0 + 25);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 8, y0 + 18, 9, T - 12, [4, 4, 0, 0]);
    ctx.fill();
    // 店先の台
    const ty = y0 + T + 14;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 9, ty + 3, w - 14, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#b98b5e';
    roundRect(ctx, x0 + 7, ty, w - 14, 10, 3);
    ctx.fill();
    const colors = ['#f28aa0', '#f2b84b', '#62b6cb', '#9c89b8', '#6a994e'];
    const shown = Math.min(b.stock, 8);
    for (let i = 0; i < shown; i++) {
      ctx.fillStyle = colors[i % colors.length];
      roundRect(ctx, x0 + 10 + (i % 4) * 11, ty - 5 + Math.floor(i / 4) * 5, 8, 6, 1.5);
      ctx.fill();
    }
    if (b.stock <= 0) {
      // 売り切れの札
      ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + w / 2 - 15, ty - 9, 30, 13, 3);
      ctx.fill();
      ctx.fillStyle = PALETTE.problem;
      ctx.font = `700 9px ${FONT}`;
      ctx.fillText('売切', x0 + w / 2, ty - 2.5);
    }
    if (showLabel) {
      const label = shopLabel(state, b);
      ctx.font = `700 10px ${FONT}`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = PALETTE.ink;
      roundRect(ctx, x0 + w / 2 - tw / 2, y0 - 20, tw, 15, 7.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(label, x0 + w / 2, y0 - 12);
    }
  }

  // スーパー（3×2）：大きなガラス窓。中にいる人数が窓の人影で分かる
  function superMarket(state, b, showLabel) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.super.w * T;
    const h = SIZES.super.h * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 4, y0 + 6, w - 8, h - 16, 3);
      ctx.fill();
    });
    ctx.fillStyle = '#6a994e';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, 9, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('スーパー', x0 + w / 2, y0 + 6);
    // 窓と、中の人影
    const inside = b.seats.filter(Boolean).length;
    ctx.fillStyle = '#cfe6ee';
    roundRect(ctx, x0 + 10, y0 + 16, w - 44, 20, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(61,90,128,0.55)';
    for (let i = 0; i < inside; i++) {
      const px = x0 + 16 + (i % 5) * 9;
      const py = y0 + 22 + Math.floor(i / 5) * 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(px - 2.2, py + 2, 4.4, 4);
    }
    // 自動ドア
    ctx.fillStyle = '#9fb4c4';
    roundRect(ctx, x0 + w - 30, y0 + 16, 20, 28, 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + w - 20, y0 + 16);
    ctx.lineTo(x0 + w - 20, y0 + 44);
    ctx.stroke();
    // カート置き場
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const cx = x0 + 14 + k * 9;
      ctx.strokeRect(cx, y0 + h - 12, 7, 5);
      ctx.beginPath();
      ctx.arc(cx + 1.5, y0 + h - 5.5, 1, 0, Math.PI * 2);
      ctx.arc(cx + 5.5, y0 + h - 5.5, 1, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (showLabel) nameTag(labelOf(state, b), x0 + w / 2, y0 - 12);
  }

  // プラネタリウム（3×3）：星柄のドーム。夜は光る
  function planetarium(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.planetarium.w * T;
    const cx = x0 + w / 2;
    const base = y0 + 64;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 8, base - 6, w - 16, 22, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#3d5a80';
      ctx.beginPath();
      ctx.arc(cx, base - 4, 36, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    });
    // ドームの星
    const clock = clockOf(state.t);
    const night = clock >= 18 * 60 || clock < 6 * 60;
    for (let k = 0; k < 11; k++) {
      const a = Math.PI + ((k * 0.61) % 1) * Math.PI;
      const rr = 10 + ((k * 37) % 24);
      const sx = cx + Math.cos(a) * rr;
      const sy = base - 4 + Math.sin(a) * rr;
      const tw = night ? 0.6 + Math.sin(time * 3 + k) * 0.4 : 0.8;
      ctx.fillStyle = `rgba(255, 214, 107, ${tw})`;
      ctx.beginPath();
      ctx.arc(sx, sy, k % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('プラネタリウム', cx, base + 5);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, cx - 5, base + 9, 10, 7, [3, 3, 0, 0]);
    ctx.fill();
  }

  // 夜：暗くする色の上から、ドームの星と入口の明かりだけを明るく描き直す
  function planetariumGlow(b, time) {
    const cx = b.c * T + (SIZES.planetarium.w * T) / 2;
    const base = b.r * T + 64;
    for (let k = 0; k < 11; k++) {
      const a = Math.PI + ((k * 0.61) % 1) * Math.PI;
      const rr = 10 + ((k * 37) % 24);
      ctx.fillStyle = `rgba(255, 224, 130, ${0.65 + Math.sin(time * 3 + k) * 0.35})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, base - 4 + Math.sin(a) * rr, k % 3 === 0 ? 2 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 214, 107, 0.9)';
    roundRect(ctx, cx - 5, base + 9, 10, 7, [3, 3, 0, 0]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 214, 107, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, base + 14, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function nameTag(label, x, y) {
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x - tw / 2, y - 7.5, tw, 15, 7.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.fillText(label, x, y);
  }

  // ペットショップ（2×2）：オレンジの屋根と肉球の看板
  function petshop(state, b) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.petshop.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 4, y0 + 8, w - 8, T + 12, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = b.breeder ? '#7cb87a' : '#f4a259'; // ブリーダーは 緑の屋根（D356）
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0 + 10);
      ctx.lineTo(x0 + w / 2, y0 - 4);
      ctx.lineTo(x0 + w - 1, y0 + 10);
      ctx.closePath();
      ctx.fill();
    });
    // 肉球の看板
    const px = x0 + w / 2 + 8;
    const py = y0 + 24;
    ctx.fillStyle = '#f4a259';
    ctx.beginPath();
    ctx.ellipse(px, py + 1.5, 3.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [dx, dy] of [[-3.4, -2.6], [-1.2, -4.2], [1.2, -4.2], [3.4, -2.6]]) {
      ctx.beginPath();
      ctx.arc(px + dx, py + dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ペット', px, py + 11);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + 9, y0 + 22, 10, T - 6, [5, 5, 0, 0]);
    ctx.fill();
    // ペットショップ&ブリーダー（D356）：緑の屋根・屋根にハート・店先に白い柵。柵の中に 売っている子が並ぶ（D355）
    if (b.breeder) {
      ctx.fillStyle = '#4f8a4d';
      ctx.font = `700 5.5px ${FONT}`;
      ctx.fillText('&ブリーダー', px - 1, py + 19);
      ctx.fillStyle = PALETTE.white;
      heart(x0 + w / 2, y0 + 4, 2.6);
      const fx0 = x0 + w / 2 - 17;
      const fx1 = x0 + w / 2 + 23;
      const fy = y0 + 2 * T - 2;
      // 柵の中（草）
      ctx.fillStyle = 'rgba(124,184,122,0.35)';
      roundRect(ctx, fx0, fy - 9, fx1 - fx0, 9, 2);
      ctx.fill();
      breederPets(b, x0, y0, w);
      // 柵（手前）：子の足もとを隠す
      ctx.fillStyle = PALETTE.white;
      ctx.strokeStyle = 'rgba(61,90,128,0.55)';
      ctx.lineWidth = 0.7;
      for (let x = fx0; x <= fx1; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x - 1.1, fy + 1);
        ctx.lineTo(x - 1.1, fy - 5);
        ctx.lineTo(x, fy - 6.5);
        ctx.lineTo(x + 1.1, fy - 5);
        ctx.lineTo(x + 1.1, fy + 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      for (const ry of [fy - 4, fy - 1]) {
        ctx.fillRect(fx0, ry - 0.7, fx1 - fx0, 1.4);
        ctx.strokeRect(fx0, ry - 0.7, fx1 - fx0, 1.4);
      }
      return;
    }
    // 店先の骨
    ctx.fillStyle = PALETTE.white;
    const bx = x0 + w / 2;
    const by = y0 + 2 * T - 7;
    ctx.fillRect(bx - 5, by - 1.2, 10, 2.4);
    for (const dx of [-5, 5]) for (const dy of [-1.4, 1.4]) {
      ctx.beginPath();
      ctx.arc(bx + dx, by + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function heart(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 1.2);
    ctx.bezierCurveTo(cx - r * 2, cy - r * 0.2, cx - r * 0.9, cy - r * 1.5, cx, cy - r * 0.5);
    ctx.bezierCurveTo(cx + r * 0.9, cy - r * 1.5, cx + r * 2, cy - r * 0.2, cx, cy + r * 1.2);
    ctx.fill();
  }

  // ブリーダーの店先の子（子犬・子猫・子うさぎ・D355）
  function breederPets(b, x0, y0, w) {
    if (b.pets?.length) {
      b.pets.forEach((kind, i) => {
        const ax = x0 + w / 2 - 9 + i * 16;
        const ay = y0 + 2 * T - 9;
        const col = { dog: '#c98b52', cat: '#f4a259', rabbit: '#ffffff' }[kind];
        ctx.fillStyle = col;
        ctx.strokeStyle = 'rgba(61,90,128,0.6)';
        ctx.lineWidth = 0.8;
        if (kind === 'rabbit') {
          for (const dx of [-1.8, 1.8]) {
            ctx.beginPath();
            ctx.ellipse(ax + dx, ay - 6, 1.3, 3.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (kind === 'cat') {
          for (const dx of [-2.6, 2.6]) {
            ctx.beginPath();
            ctx.moveTo(ax + dx - 1.8, ay - 2);
            ctx.lineTo(ax + dx, ay - 6);
            ctx.lineTo(ax + dx + 1.8, ay - 2);
            ctx.fill();
          }
        } else {
          for (const dx of [-3.4, 3.4]) {
            ctx.beginPath();
            ctx.ellipse(ax + dx, ay - 1, 1.6, 2.8, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#8b5e3c';
            ctx.fill();
          }
          ctx.fillStyle = col;
        }
        ctx.beginPath();
        ctx.arc(ax, ay, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.ink;
        for (const dx of [-1.3, 1.3]) {
          ctx.beginPath();
          ctx.arc(ax + dx, ay - 0.4, 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  // 幼稚園：上の段が園舎（パステルの屋根）、下の段が園庭（すべり台と砂場）
  // 小学校（D347）：校舎（時計）と 校庭（鉄棒）。中に子どもがいれば 窓に頭が見える
  function school(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.school.w * T;
    // 校庭
    ctx.fillStyle = '#e9d9b8';
    roundRect(ctx, x0 + 3, y0 + T + 2, w - 6, T - 6, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0 + w - 26, y0 + 2 * T - 6);
    ctx.lineTo(x0 + w - 26, y0 + 2 * T - 15);
    ctx.lineTo(x0 + w - 12, y0 + 2 * T - 15);
    ctx.lineTo(x0 + w - 12, y0 + 2 * T - 6);
    ctx.stroke();
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#fbf3e4';
      roundRect(ctx, x0 + 4, y0 + 2, w - 8, T + 2, 2);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#b5654a';
      roundRect(ctx, x0 + 2, y0 - 1, w - 4, 5, 2);
      ctx.fill();
    });
    // 時計塔
    ctx.fillStyle = '#fbf3e4';
    roundRect(ctx, x0 + w / 2 - 7, y0 - 9, 14, 12, [3, 3, 0, 0]);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x0 + w / 2, y0 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 窓（2段）
    const inside = b.seats.filter(Boolean).length;
    let k = 0;
    for (const wy of [y0 + 8, y0 + 18]) {
      for (let i = 0; i < 5; i++) {
        const wx = x0 + 10 + i * ((w - 20) / 4) - 3;
        if (i === 2 && wy > y0 + 10) continue; // 入り口
        ctx.fillStyle = '#cfe6ee';
        ctx.fillRect(wx, wy, 6, 6);
        if (inside > k++) {
          ctx.fillStyle = 'rgba(61,90,128,0.55)';
          ctx.beginPath();
          ctx.arc(wx + 3 + Math.sin(time * 2 + k) * 0.8, wy + 5, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#8b5e3c';
    roundRect(ctx, x0 + w / 2 - 5, y0 + 20, 10, T - 16, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('しょうがっこう', x0 + w / 2, y0 + T + 9);
  }

  // 大学（D347）：柱のある建物と、前の芝生
  function college(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.college.w * T;
    // 芝生と小道
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, x0 + 4, y0 + 2 * T - 2, w - 8, T - 4, 6);
    ctx.fill();
    ctx.fillStyle = '#e9d9b8';
    ctx.fillRect(x0 + w / 2 - 5, y0 + 2 * T - 2, 10, T - 4);
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#eef1f4';
      roundRect(ctx, x0 + 6, y0 + 14, w - 12, 2 * T - 16, 2);
      ctx.fill();
      // 三角の屋根
      if (!shadow) ctx.fillStyle = '#3d5a80';
      ctx.beginPath();
      ctx.moveTo(x0 + 2, y0 + 16);
      ctx.lineTo(x0 + w / 2, y0 + 1);
      ctx.lineTo(x0 + w - 2, y0 + 16);
      ctx.closePath();
      ctx.fill();
    });
    // 柱
    ctx.fillStyle = PALETTE.white;
    for (let i = 0; i < 6; i++) ctx.fillRect(x0 + 12 + i * ((w - 28) / 5), y0 + 20, 4, 2 * T - 26);
    ctx.fillStyle = '#d8dee6';
    ctx.fillRect(x0 + 8, y0 + 2 * T - 6, w - 16, 4);
    // 学生がいれば 窓の明かり
    const inside = b.seats.filter(Boolean).length;
    if (inside) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.35)';
      ctx.fillRect(x0 + 14, y0 + 24, w - 28, 10);
    }
    ctx.fillStyle = PALETTE.white;
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('だいがく', x0 + w / 2, y0 + 11);
    void time;
  }

  // 病院（D349）：白い建物に 緑の十字とハート（赤十字の しるしは 使わない）
  function hospital(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.hospital.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#ffffff';
      roundRect(ctx, x0 + 4, y0 + 4, w - 8, 2 * T - 10, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#7fc8a9';
      roundRect(ctx, x0 + 2, y0 + 1, w - 4, 6, 2);
      ctx.fill();
    });
    // 緑の十字
    const cx = x0 + w / 2;
    const cy = y0 + 17;
    ctx.fillStyle = '#4caf82';
    ctx.fillRect(cx - 2.5, cy - 7, 5, 14);
    ctx.fillRect(cx - 7, cy - 2.5, 14, 5);
    // 窓
    const inside = b.seats.filter(Boolean).length;
    for (let i = 0; i < 4; i++) {
      const wx = i < 2 ? x0 + 10 + i * 12 : x0 + w - 32 + (i - 2) * 12;
      ctx.fillStyle = inside > i ? '#fff1c1' : '#cfe6ee';
      ctx.fillRect(wx, y0 + 12, 8, 7);
    }
    ctx.fillStyle = '#8ecae6';
    roundRect(ctx, cx - 7, y0 + 2 * T - 20, 14, 14, [2, 2, 0, 0]);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('びょういん', cx, y0 + 30);
    void time;
  }

  function kinder(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.kinder.w * T;
    // 園庭の柵
    ctx.fillStyle = '#f7ecd6';
    roundRect(ctx, x0 + 3, y0 + T + 2, w - 6, T - 6, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.white;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = x0 + 6; x < x0 + w - 4; x += 6) {
      ctx.moveTo(x, y0 + 2 * T - 5);
      ctx.lineTo(x, y0 + 2 * T - 10);
    }
    ctx.stroke();
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#fff6ea';
      roundRect(ctx, x0 + 5, y0 + 8, w - 10, T - 2, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#f7a8b8';
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0 + 11);
      ctx.lineTo(x0 + 14, y0 - 3);
      ctx.lineTo(x0 + w - 14, y0 - 3);
      ctx.lineTo(x0 + w - 1, y0 + 11);
      ctx.closePath();
      ctx.fill();
    });
    // 看板
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x0 + w / 2 - 24, y0 + 1, 48, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#d06a82';
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ようちえん', x0 + w / 2, y0 + 6.5);
    // 丸い窓（中に子どもがいれば、小さな頭が見える）
    const inside = b.seats.filter(Boolean).length;
    const wins = [x0 + 18, x0 + w - 18];
    wins.forEach((wx, i) => {
      ctx.fillStyle = '#cfe6ee';
      ctx.beginPath();
      ctx.arc(wx, y0 + 22, 6, 0, Math.PI * 2);
      ctx.fill();
      if (inside > i) {
        ctx.fillStyle = 'rgba(61,90,128,0.55)';
        ctx.beginPath();
        ctx.arc(wx + Math.sin(time * 2 + i) * 1.5, y0 + 24, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // 入り口
    ctx.fillStyle = '#8ecae6';
    roundRect(ctx, x0 + w / 2 - 6, y0 + 20, 12, T - 12, [6, 6, 0, 0]);
    ctx.fill();
    // すべり台
    const sx = x0 + 14;
    const sy = y0 + 2 * T - 8;
    ctx.strokeStyle = '#f2b84b';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy);
    ctx.lineTo(sx - 4, sy - 10);
    ctx.lineTo(sx + 8, sy);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // 砂場とバケツ
    ctx.fillStyle = PALETTE.sandDark;
    ctx.beginPath();
    ctx.ellipse(x0 + w - 18, sy - 4, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e76f51';
    roundRect(ctx, x0 + w - 16, sy - 8, 4, 4, 1);
    ctx.fill();
  }

  // コーヒースタンド（D305）：1マスの小さな店。しま模様の日よけとカウンター
  function stand(state, b, time) {
    const x = b.c * T + T / 2;
    const y = b.r * T + 8;
    const open = b.seats.some(Boolean) || (clockOf(state.t) >= CONFIG.stand.open && clockOf(state.t) < CONFIG.stand.close);
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x - 11, y + 2, 22, 17, 2);
      ctx.fill();
    });
    // しま模様の日よけ
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? PALETTE.white : '#8b5e3c';
      ctx.beginPath();
      ctx.moveTo(x - 13 + k * 6.5, y);
      ctx.lineTo(x - 13 + (k + 1) * 6.5, y);
      ctx.lineTo(x - 13 + (k + 1) * 6.5, y + 5);
      ctx.arc(x - 13 + k * 6.5 + 3.25, y + 5, 3.25, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
    // カウンターの窓（開いていれば明るい）
    ctx.fillStyle = open ? '#ffe9b0' : '#cfd8dd';
    roundRect(ctx, x - 7, y + 8, 14, 6, 1.5);
    ctx.fill();
    // カップの看板
    ctx.fillStyle = '#8b5e3c';
    roundRect(ctx, x + 7, y + 13, 5, 5, [0, 0, 2, 2]);
    ctx.fill();
    if (open) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 9.5, y + 12);
      ctx.quadraticCurveTo(x + 8 + Math.sin(time * 3) * 1.5, y + 9, x + 9.5, y + 6);
      ctx.stroke();
    }
  }

  // 釣り堀（D304）：池と、下のふちの板の釣り座
  function pond(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.pond.w * T;
    const h = SIZES.pond.h * T;
    // 池（紙を1枚へこませた感じ：外側に濃い縁）
    ctx.fillStyle = '#4f9fb0';
    roundRect(ctx, x0 + 3, y0 + 3, w - 6, h - 16, 14);
    ctx.fill();
    ctx.fillStyle = '#6cc3d5';
    roundRect(ctx, x0 + 5, y0 + 5, w - 10, h - 20, 12);
    ctx.fill();
    // さざなみ
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = x0 + 14 + ((i * 23 + time * 4) % (w - 28));
      const y = y0 + 12 + ((i * 11) % (h - 34));
      ctx.beginPath();
      ctx.arc(x, y, 4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // 蓮の葉
    ctx.fillStyle = '#6a994e';
    for (const [dx, dy, r] of [[12, 12, 4.5], [w - 16, 16, 3.8]]) {
      ctx.beginPath();
      ctx.moveTo(x0 + dx, y0 + dy);
      ctx.arc(x0 + dx, y0 + dy, r, 0.4, Math.PI * 2 - 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // 板の釣り座
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#c9a27a';
      roundRect(ctx, x0 + 4, y0 + h - 16, w - 8, 9, 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(80,50,30,0.25)';
    ctx.lineWidth = 1;
    for (let x = x0 + 12; x < x0 + w - 6; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + h - 16);
      ctx.lineTo(x, y0 + h - 7);
      ctx.stroke();
    }
    // 看板
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x0 + w / 2 - 17, y0 - 4, 34, 11, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('釣り堀', x0 + w / 2, y0 + 1.5);
  }

  // 釣りをしている人の竿と浮き
  function rod(r, time) {
    const ph = phaseOf(r.id);
    const tipX = r.x + 9;
    const tipY = r.y - 34;
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r.x + 3, r.y - 12);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    const by = r.y - 22 + Math.sin(time * 2 + ph) * 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + 2, by);
    ctx.stroke();
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.arc(tipX + 2, by, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // レストラン（旧 カフェ&バー・D343）：テラスの上の電球かざり（夜は灯る）
  function barLights(b, lit, time) {
    const x0 = b.c * T + 6;
    const x1 = (b.c + SIZES.cafe.w) * T - 6;
    const y = (b.r + 1) * T + 6;
    ctx.strokeStyle = 'rgba(61,90,128,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + 10, x1, y);
    ctx.stroke();
    const colors = ['#ffd66b', '#f28aa0', '#62b6cb', '#ffd66b', '#b8e0d2'];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const px = x0 + (x1 - x0) * t;
      const py = y + 10 * 4 * t * (1 - t) * 0.5 + 1.5;
      ctx.fillStyle = lit ? colors[k % colors.length] : '#e6e2dc';
      ctx.beginPath();
      ctx.arc(px, py, lit ? 2.2 + Math.sin(time * 3 + k) * 0.3 : 1.6, 0, Math.PI * 2);
      ctx.fill();
      if (lit) {
        ctx.fillStyle = 'rgba(255, 214, 107, 0.16)';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 街灯。道の交差点のもの（マスの右上）と、飾りとして置いたもの（マスの真ん中・D334）
  function lamp(i, lit, placed = false) {
    const p = center(i);
    const x = placed ? p.x : p.x + 12;
    const y = placed ? p.y + 10 : p.y - 8;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - 1, y - 18, 2, 18);
    ctx.fillStyle = lit ? '#ffd66b' : PALETTE.white;
    ctx.beginPath();
    ctx.arc(x, y - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = 'rgba(255, 214, 107, 0.22)';
      ctx.beginPath();
      ctx.arc(x, y - 16, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------- 飾り（D334）

  // 花だん：季節の花の色（冬は花がないので、緑の植え込み）
  function flowerbed(b, time) {
    const p = center(idx(b.c, b.r));
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#b07a52';
      roundRect(ctx, p.x - 14, p.y - 2, 28, 14, 5);
      ctx.fill();
    });
    ctx.fillStyle = '#8a5a3a';
    roundRect(ctx, p.x - 12, p.y, 24, 9, 4);
    ctx.fill();
    const colors = theme.flowers.length ? theme.flowers : null;
    for (let k = 0; k < 7; k++) {
      const fx = p.x - 10 + (k % 4) * 6.5 + (k >= 4 ? 3 : 0);
      const fy = p.y + 1 + (k >= 4 ? 5 : 0) + Math.sin(time * 1.3 + k) * 0.4;
      ctx.fillStyle = theme.shrub;
      ctx.beginPath();
      ctx.arc(fx, fy + 1, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (!colors) continue;
      ctx.fillStyle = colors[k % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy - 1, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ベンチ：木の座面と背もたれ
  function bench(b) {
    const p = center(idx(b.c, b.r));
    const x = p.x;
    const y = p.y + 2;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#c98b52';
      roundRect(ctx, x - 13, y - 8, 26, 5, 2); // 背もたれ
      ctx.fill();
      roundRect(ctx, x - 14, y, 28, 5, 2); // 座面
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.ink;
    for (const dx of [-11, 10]) ctx.fillRect(x + dx, y + 5, 2, 5);
    ctx.fillRect(x - 11, y - 3, 1.5, 3);
    ctx.fillRect(x + 9.5, y - 3, 1.5, 3);
  }

  // 噴水（2×2）：まるい池と、真ん中から上がる水
  function fountain(b, time) {
    const x = (b.c + 1) * T;
    const y = (b.r + 1) * T + 4;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#e9eef2';
      ctx.beginPath();
      ctx.ellipse(x, y, T * 0.85, T * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#7cc8dd';
    ctx.beginPath();
    ctx.ellipse(x, y, T * 0.7, T * 0.47, 0, 0, Math.PI * 2);
    ctx.fill();
    // 波紋
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const f = (time * 0.5 + k / 2) % 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + f * T * 0.55, 4 + f * T * 0.36, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 1 - f;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 台と水
    ctx.fillStyle = '#e9eef2';
    roundRect(ctx, x - 5, y - 14, 10, 14, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 232, 244, 0.9)';
    for (let k = 0; k < 6; k++) {
      const f = (time * 1.4 + k / 6) % 1;
      const dir = k % 2 ? 1 : -1;
      const dx = dir * (2 + f * 11);
      const dy = -14 - Math.sin(f * Math.PI) * 14 + f * 12;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 1.8 * (1 - f * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 時計台：細長い塔と、いまの時刻の時計
  function clocktower(state, b) {
    const p = center(idx(b.c, b.r));
    const x = p.x;
    const base = p.y + 14;
    const h = 46;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#f4e6cf';
      roundRect(ctx, x - 9, base - h, 18, h, 2);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#c8553d';
      ctx.beginPath();
      ctx.moveTo(x - 12, base - h + 1);
      ctx.lineTo(x, base - h - 14);
      ctx.lineTo(x + 12, base - h + 1);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.arc(x, base - h + 11, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    const m = clockOf(state.t);
    const hr = ((m / 60) % 12) / 12 * Math.PI * 2;
    const mn = (m % 60) / 60 * Math.PI * 2;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, base - h + 11);
    ctx.lineTo(x + Math.sin(hr) * 3.4, base - h + 11 - Math.cos(hr) * 3.4);
    ctx.moveTo(x, base - h + 11);
    ctx.lineTo(x + Math.sin(mn) * 5, base - h + 11 - Math.cos(mn) * 5);
    ctx.stroke();
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x - 3, base - 9, 6, 9, [3, 3, 0, 0]);
    ctx.fill();
  }

  // 船：南の桟橋の横に着く
  function boat(state, port, time) {
    for (const b of boatsNow(state, port)) boatOne(port, b, time);
  }

  // 1隻の船。臨時の船（広告のおまけ・D309）は桟橋の反対側に着く
  function boatOne(port, b, time) {
    const side = b.extra ? -1 : 1;
    const { dock, from } = boatRoute(port.id, side);
    const e = 1 - Math.pow(1 - b.k, 2); // 着く前にゆっくりになる
    const x = from.x + (dock.x - from.x) * e;
    const y = from.y + (dock.y - from.y) * e + (b.phase === 'docked' ? Math.sin(time * 1.6) * 0.8 : 0);
    const moving = b.phase !== 'docked';
    if (moving) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 10);
      ctx.lineTo(x - 26, y + 26);
      ctx.moveTo(x + 10, y + 10);
      ctx.lineTo(x + 20, y + 30);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(20, 60, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 8, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 船体
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 4);
    ctx.lineTo(x + 25, y - 4);
    ctx.lineTo(x + 18, y + 8);
    ctx.lineTo(x - 18, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x - 20, y + 3, 40, 3);
    // 船室
    ctx.fillStyle = PALETTE.mustard;
    roundRect(ctx, x - 12, y - 16, 22, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#cfe6ee';
    for (const wx of [-8, -2, 4]) {
      roundRect(ctx, x + wx, y - 13, 4, 4, 1);
      ctx.fill();
    }
    // 旗
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 14, y - 26, 1.5, 22);
    ctx.fillStyle = PALETTE.problem;
    ctx.beginPath();
    ctx.moveTo(x + 15.5, y - 26);
    ctx.lineTo(x + 24 + Math.sin(time * 5) * 1.5, y - 23);
    ctx.lineTo(x + 15.5, y - 20);
    ctx.closePath();
    ctx.fill();
  }

  // ---------------------------------------------------------------- ペット（D293）

  // ペットは人より小さいが、見つけやすいよう 1.25倍で描く
  function drawPet(state, pet, time) {
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(1.25, 1.25);
    ctx.translate(-pet.x, -pet.y);
    drawPetBody(state, pet, time);
    ctx.restore();
  }

  const GUEST_TINTS = [
    { body: '#f2f2f2', dark: '#6b6b6b' },
    { body: '#3b2a20', dark: '#1e140f', muzzle: '#8d6a4f' },
    { body: '#e8c170', dark: '#a87c3a' },
    { body: '#c9a27a', dark: '#6b4a33' },
    { body: '#8a8f98', dark: '#3f434a' },
  ];

  // 種類ごとの色と形（D296：うさぎ・キツネ・アライグマを追加）
  const SPECIES = {
    cat: { body: '#ffffff', dark: '#3b2a20', patch: '#f4a259', ears: 'pointy', tail: 'thin' },
    dog: { body: '#d9a066', dark: '#8d6a4f', ears: 'floppy', tail: 'wag', muzzle: '#fff4e6', nose: true },
    rabbit: { body: '#f4f1ee', dark: '#b8aca3', ears: 'long', tail: 'puff', inner: '#f7c5cc' },
    fox: { body: '#e8833a', dark: '#5a3825', ears: 'fox', tail: 'bushy', chest: '#fff4e6', nose: true },
    raccoon: { body: '#8a8f98', dark: '#3f434a', ears: 'round', tail: 'ringed', mask: true },
  };

  function drawPetBody(state, pet, time) {
    const ph = phaseOf(pet.id);
    const sp0 = SPECIES[pet.kind] || SPECIES.cat;
    // 島の外から来た犬（ドッグレース・D328）は毛の色を変える
    const sp = pet.tint !== undefined ? { ...sp0, ...GUEST_TINTS[pet.tint % GUEST_TINTS.length] } : sp0;
    const moving = Math.hypot(pet.tx - pet.x, pet.ty - pet.y) > 0.5;
    const poked = pokes?.get(pet.id);
    const since = poked === undefined ? 99 : time - poked;
    let hop = since < 1.2 ? Math.abs(Math.sin((since / 1.2) * Math.PI * 2)) * 7 : 0;
    if (moving) hop += Math.abs(Math.sin(time * (pet.kind === 'rabbit' ? 8 : 14) + ph)) * (pet.kind === 'rabbit' ? 4.5 : 1.6);
    const x = pet.x;
    const y = pet.y - hop;
    const f = pet.facing;
    const sleeping = pet.state === 'SLEEP' || pet.state === 'NAP';
    const { body, dark } = sp;

    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(pet.x + 1.5, pet.y + 1, 8, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sleeping) {
      // 丸くなって寝ている
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 9.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sp.patch) {
        ctx.fillStyle = sp.patch;
        ctx.beginPath();
        ctx.arc(x - 3, y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sp.tail === 'bushy' || sp.tail === 'ringed') {
        ctx.fillStyle = sp.tail === 'bushy' ? '#fff4e6' : dark;
        ctx.beginPath();
        ctx.arc(x - f * 7, y - 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sp.ears === 'long') {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(x + f * 3, y - 8, 1.8, 4.5, f * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = sp.mask ? dark : dark;
      ctx.beginPath();
      ctx.arc(x + f * 5, y - 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      const k = (time * 0.6 + ph) % 1;
      ctx.font = `700 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(61,90,128,${0.8 * (1 - k)})`;
      ctx.fillText('z', x + 8 + k * 3, y - 12 - k * 8);
      return;
    }

    const sitting = !moving && ['SIT', 'SHELTER', 'FOLLOW', 'WAIT'].includes(pet.state);
    // 白いふち
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath();
    ctx.ellipse(x, y - 6, sitting ? 6.5 : 9, sitting ? 7.5 : 6, 0, 0, Math.PI * 2);
    ctx.arc(x + f * 7, y - (sitting ? 13 : 11), 6.3, 0, Math.PI * 2);
    ctx.fill();

    // しっぽ
    ctx.lineCap = 'round';
    const tx0 = x - f * 7;
    if (sp.tail === 'puff') {
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(tx0, y - 6, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.tail === 'bushy') {
      const sway = Math.sin(time * 2 + ph) * 1.5;
      ctx.strokeStyle = body;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(tx0, y - 6);
      ctx.quadraticCurveTo(x - f * 13, y - 8 + sway, x - f * 14, y - 13);
      ctx.stroke();
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath();
      ctx.arc(x - f * 14, y - 13.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.tail === 'ringed') {
      ctx.strokeStyle = body;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tx0, y - 6);
      ctx.lineTo(x - f * 13, y - 11);
      ctx.stroke();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 4;
      for (const k of [0.45, 0.85]) {
        const px = tx0 + (x - f * 13 - tx0) * k;
        const py = y - 6 + (y - 11 - (y - 6)) * k;
        ctx.beginPath();
        ctx.moveTo(px - f * 0.6, py - 0.3);
        ctx.lineTo(px + f * 0.6, py + 0.3);
        ctx.stroke();
      }
    } else {
      const thin = sp.tail === 'thin';
      ctx.strokeStyle = thin ? dark : body;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const wag = Math.sin(time * (thin ? 2 : 12) + ph) * (thin ? 2 : 3);
      ctx.moveTo(tx0, y - 7);
      ctx.quadraticCurveTo(x - f * 11, y - 12 + wag * 0.3, x - f * (10 + wag * 0.5), y - (thin ? 16 : 13));
      ctx.stroke();
    }
    // 足
    if (!sitting) {
      ctx.fillStyle = dark;
      const st = moving ? Math.sin(time * 14 + ph) * 1.2 : 0;
      ctx.fillRect(x - 5 + st, y - 3, 2, 3);
      ctx.fillRect(x + 3 - st, y - 3, 2, 3);
    }
    // からだ
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y - 6, sitting ? 5 : 7.5, sitting ? 6 : 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (sp.patch) {
      ctx.fillStyle = sp.patch;
      ctx.beginPath();
      ctx.arc(x - f * 2, y - 7, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sp.chest) {
      ctx.fillStyle = sp.chest;
      ctx.beginPath();
      ctx.ellipse(x + f * 3, y - 6, 2.4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // あたま
    const hx = x + f * 7;
    const hy = y - (sitting ? 13 : 11);
    // 耳（頭より先に描くものと、あとに描くもの）
    if (sp.ears === 'long') {
      for (const dx of [-1.8, 1.8]) {
        ctx.fillStyle = PALETTE.white;
        ctx.beginPath();
        ctx.ellipse(hx + dx, hy - 7, 2.6, 5.6, dx * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(hx + dx, hy - 7, 1.7, 4.6, dx * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sp.inner;
        ctx.beginPath();
        ctx.ellipse(hx + dx, hy - 6.5, 0.7, 3, dx * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(hx, hy, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    if (sp.ears === 'pointy' || sp.ears === 'fox') {
      // とがった耳（ねこは片方が茶色、キツネは先が黒）
      ctx.fillStyle = sp.ears === 'fox' ? body : dark;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 2);
      ctx.lineTo(hx - 3, hy - 8);
      ctx.lineTo(hx - 0.5, hy - 3.5);
      ctx.fill();
      ctx.fillStyle = sp.ears === 'fox' ? body : '#f4a259';
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy - 2);
      ctx.lineTo(hx + 3, hy - 8);
      ctx.lineTo(hx + 0.5, hy - 3.5);
      ctx.fill();
      if (sp.ears === 'fox') {
        ctx.fillStyle = dark;
        for (const dx of [-3, 3]) {
          ctx.beginPath();
          ctx.moveTo(hx + dx - 0.9, hy - 6.2);
          ctx.lineTo(hx + dx, hy - 8);
          ctx.lineTo(hx + dx + 0.9, hy - 6.2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff4e6';
        ctx.beginPath();
        ctx.ellipse(hx + f * 2.5, hy + 1.8, 2.6, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sp.ears === 'floppy') {
      ctx.beginPath();
      ctx.ellipse(hx - f * 3, hy - 1, 1.8, 3.6, f * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sp.muzzle;
      ctx.beginPath();
      ctx.ellipse(hx + f * 2.5, hy + 1.5, 2.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.ears === 'round') {
      for (const dx of [-3.4, 3.4]) {
        ctx.beginPath();
        ctx.arc(hx + dx, hy - 3.8, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (sp.mask) {
      // アライグマの目のまわりの黒い帯
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(hx + f * 1.2, hy - 0.8, 4.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(hx + f * 1.5, hy - 1, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.arc(hx + f * 1.5, hy - 1, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sp.nose) {
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath();
      ctx.arc(hx + f * 4.3, hy + 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 迷い込んだ子は ときどき「？」、タップされたらハート
    let b = null;
    if (since < 2) b = 'heart';
    else if (!pet.adopted && Math.sin(time * 1.1 + ph) > 0.6) b = 'question';
    if (b) bubble(b, x + 9, y - 22);
  }

  // ---------------------------------------------------------------- 住民（前の版から そのまま）

  // 顔の後ろに垂れる髪（D325：ロング・ボブを1枚で描いていて、髪が顔の上に かぶさって見えた）。顔より先に描く
  function hairBack(look, hx, hy) {
    ctx.fillStyle = look.hair;
    if (look.style === 'long') {
      roundRect(ctx, hx - 7.4, hy - 4, 14.8, 11, [4, 4, 3, 3]);
      ctx.fill();
    } else if (look.style === 'bob') {
      roundRect(ctx, hx - 7.4, hy - 4, 14.8, 7.5, [4, 4, 3, 3]);
      ctx.fill();
    }
  }

  function hair(look, hx, hy, f) {
    ctx.fillStyle = look.hair;
    switch (look.style) {
      case 'long':
        // 前髪だけ（後ろの髪は hairBack）
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.6, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        return;
      case 'pigtails':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx - 7, hy + 1, 2.6, 0, Math.PI * 2);
        ctx.arc(hx + 7, hy + 1, 2.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'bun':
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy - 7.5, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'cap':
        ctx.fillStyle = PALETTE.problem;
        ctx.beginPath();
        ctx.arc(hx, hy - 1.5, 6.6, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(hx + (f > 0 ? 0 : -9), hy - 2, 9, 2.2);
        return;
      case 'bob':
        // 前髪だけ（後ろの髪は hairBack）
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        return;
      case 'hat':
        ctx.fillStyle = '#e8c170';
        ctx.beginPath();
        ctx.ellipse(hx, hy - 3.5, 9.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy - 4, 5.2, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = PALETTE.problem;
        ctx.fillRect(hx - 5.2, hy - 5.5, 10.4, 1.6);
        return;
      case 'bald':
        ctx.beginPath();
        ctx.arc(hx - 5.5, hy, 1.8, 0, Math.PI * 2);
        ctx.arc(hx + 5.5, hy, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'short':
      default:
        ctx.beginPath();
        ctx.arc(hx, hy - 1, 6.4, Math.PI * 1.05, Math.PI * 1.95);
        ctx.lineTo(hx + 4, hy - 3);
        ctx.lineTo(hx - 5, hy - 2);
        ctx.closePath();
        ctx.fill();
    }
  }

  function person(r, x, y, { bob = 0, stride = 0, facing = 1, seated = false }) {
    const look = lookOf(r);
    const by = y - bob;
    // 影
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1.5, y + 1, 7.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 白いふち（シール）
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x - 8, by - 18.5, 16, 16.5, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, by - 22, 8.3, 0, Math.PI * 2);
    ctx.fill();

    // 足
    if (!seated) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 4 + stride, by - 5, 3, 5 + bob);
      ctx.fillRect(x + 1 - stride, by - 5, 3, 5 + bob);
    }
    // 胴体
    ctx.fillStyle = look.shirt;
    roundRect(ctx, x - 6.2, by - 16.5, 12.4, 12.5, 5);
    ctx.fill();
    // 島めぐりの人（D374）：来た島の小物。シェルの島から＝花の首かざり・オーロラの島から＝毛糸のマフラー・本島から＝手さげ袋
    if (look.hop === 'shell') {
      ['#ff6b81', '#ffd166', '#ffffff', '#ff6b81', '#ffd166'].forEach((col, k) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x - 4.5 + k * 2.25, by - 15.5 + Math.abs(k - 2) * -0.6 + 1.2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (look.hop === 'aurora') {
      ctx.fillStyle = '#3d5a80';
      roundRect(ctx, x - 6, by - 17, 12, 3.5, 1.5);
      ctx.fill();
      ctx.fillRect(x + 2.5 * facing, by - 15, 3, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, by - 16.2, 1.4, 2);
      ctx.fillRect(x + 1.5, by - 16.2, 1.4, 2);
    } else if (look.hop === 'main') {
      ctx.strokeStyle = '#c49a6c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 7.5 * facing, by - 9, 2.2, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#f2b84b';
      ctx.fillRect(x - 7.5 * facing - 3, by - 9, 6, 6);
    }
    if (look.camera) {
      ctx.fillStyle = '#2b2b33';
      roundRect(ctx, x - 3.5, by - 12, 7, 5, 1.2);
      ctx.fill();
      ctx.fillStyle = '#9fb4c4';
      ctx.beginPath();
      ctx.arc(x, by - 9.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 頭（後ろの髪 → 顔 → 前髪）
    hairBack(look, x, by - 22);
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(x, by - 22, 6.3, 0, Math.PI * 2);
    ctx.fill();
    hair(look, x, by - 22, facing);
    // 目（向いている方へ寄る）
    ctx.fillStyle = PALETTE.ink;
    const ex = x + facing * 1.6;
    ctx.beginPath();
    ctx.arc(ex - 2.2, by - 21.3, 0.95, 0, Math.PI * 2);
    ctx.arc(ex + 2.2, by - 21.3, 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  function bubble(kind, x, y) {
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x - 9 + 1.5, y - 16 + 2, 18, 15, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x - 9, y - 16, 18, 15, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 2);
    ctx.lineTo(x - 6, y + 3);
    ctx.lineTo(x + 2, y - 2);
    ctx.fill();
    const cx = x;
    const cy = y - 8.5;
    if (kind === 'sweat') {
      ctx.fillStyle = '#62b6cb';
      for (const [dx, s] of [[-3, 1], [3, 0.8]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 1.5, 2.4 * s, 0, Math.PI);
        ctx.lineTo(cx + dx, cy - 3.5 * s);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === 'lost') {
      ctx.fillStyle = PALETTE.problem;
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 1, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'room') {
      // 小さな家と、外向きの矢印（もう少し広い家に住みたい）
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.moveTo(cx - 4.5, cy);
      ctx.lineTo(cx - 1, cy - 3.5);
      ctx.lineTo(cx + 2.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 3.5, cy, 5, 3.5);
      ctx.strokeStyle = PALETTE.mustard;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 3.5, cy - 2);
      ctx.lineTo(cx + 6, cy - 4.5);
      ctx.moveTo(cx + 4, cy - 4.5);
      ctx.lineTo(cx + 6, cy - 4.5);
      ctx.lineTo(cx + 6, cy - 2.5);
      ctx.stroke();
    } else if (kind === 'closed') {
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 3);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.moveTo(cx + 3, cy - 3);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.stroke();
    } else if (kind === 'wish') {
      ctx.fillStyle = PALETTE.mustard;
      roundRect(ctx, cx - 1.6, cy - 5, 3.2, 6.5, 1.6);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + 3.8, 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'photo') {
      ctx.fillStyle = '#2b2b33';
      roundRect(ctx, cx - 5, cy - 3, 10, 7, 1.5);
      ctx.fill();
      ctx.fillStyle = '#ffd66b';
      ctx.beginPath();
      ctx.arc(cx, cy + 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'bag') {
      ctx.fillStyle = '#2a9d8f';
      roundRect(ctx, cx - 4, cy - 2, 8, 7, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#2a9d8f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 2.2, Math.PI, 0);
      ctx.stroke();
    } else if (kind === 'question') {
      ctx.fillStyle = PALETTE.ink;
      ctx.font = `700 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy + 0.5);
    } else if (kind === 'heart') {
      ctx.fillStyle = '#e56b9f';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 3.5);
      ctx.bezierCurveTo(cx - 6, cy - 1, cx - 3, cy - 5.5, cx, cy - 2.5);
      ctx.bezierCurveTo(cx + 3, cy - 5.5, cx + 6, cy - 1, cx, cy + 3.5);
      ctx.fill();
    } else if (kind === 'arrive') {
      ctx.fillStyle = PALETTE.mustard;
      roundRect(ctx, cx - 4.5, cy - 2.5, 9, 6.5, 1.5);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 1.8, cy - 4.5, 3.6, 2);
    }
  }

  function drawResident(state, r, time, selected) {
    const ph = phaseOf(r.id);
    const moving = Math.hypot(r.tx - r.x, r.ty - r.y) > 0.5 && state.t >= r.pauseUntil;
    let bob = 0;
    let stride = 0;
    if (moving) {
      bob = Math.abs(Math.sin(time * 10 + ph)) * 2.2;
      stride = Math.sin(time * 10 + ph) * 1.4;
    } else if (r.state === 'PARK') {
      bob = Math.pow(Math.max(0, Math.sin(time * 2.2 + ph)), 14) * 6;
    } else {
      bob = (Math.sin(time * 2 + ph) + 1) * 0.5;
    }
    // タップされたら、ぴょんと跳ねる
    const poked = pokes?.get(r.id);
    const since = poked === undefined ? 99 : time - poked;
    if (since < 1.2) bob += Math.abs(Math.sin((since / 1.2) * Math.PI * 2)) * 8;
    // 立ち止まっているときは、ときどき振り返る
    let facing = r.facing;
    if (!moving && Math.sin(time * 0.6 + ph * 3) > 0.9) facing = -facing;

    if (r.age === 'kid' || r.age === 'pupil') {
      // 子どもは小さく描く（足もとを基準に縮める）。小学生は少し大きく、ランドセル（D347）
      const k = r.age === 'pupil' ? 0.84 : 0.72;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(k, k);
      ctx.translate(-r.x, -r.y);
      if (r.age === 'pupil') {
        ctx.fillStyle = r.look % 2 ? '#c8553d' : '#3d5a80';
        roundRect(ctx, r.x - facing * 7 - 4, r.y - bob - 22, 8, 9, 2);
        ctx.fill();
      }
      person(r, r.x, r.y, { bob, stride, facing, seated: false });
      ctx.restore();
    } else {
      // マルシェ・運動では 立っている（屋台の前・コート・D387）
      const standAt = r.state === 'SEATED' && ['marche', ...SPORTS, ...FESTS].includes(state.buildings.find((b) => b.id === r.destId)?.type);
      person(r, r.x, r.y, { bob, stride, facing, seated: r.state === 'SEATED' && !standAt });
      if (r.state === 'SEATED' && state.buildings.find((b) => b.id === r.destId)?.type === 'pond') rod(r, time);
    }
    if (r.carry === 'groceries') {
      // スーパーの買い物袋（ねぎが のぞいている）
      const bx = r.x - facing * 8;
      const by = r.y - bob - 11;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, bx - 3.5, by, 7, 8, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#6a994e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx + 1, by);
      ctx.lineTo(bx + 3, by - 5);
      ctx.stroke();
    }
    if (r.carry === 'coffee') {
      // 持ち帰りのコーヒー
      const bx = r.x - facing * 7;
      const by = r.y - bob - 12;
      ctx.fillStyle = PALETTE.white;
      roundRect(ctx, bx - 2.2, by, 4.4, 6, [0, 0, 1.5, 1.5]);
      ctx.fill();
      ctx.fillStyle = '#8b5e3c';
      ctx.fillRect(bx - 2.2, by + 2, 4.4, 1.6);
    }
    if (r.carry === 'petfood') {
      // ペットフードの袋（肉球）
      const bx = r.x - facing * 8;
      const by = r.y - bob - 11;
      ctx.fillStyle = '#f4a259';
      roundRect(ctx, bx - 3.5, by, 7, 8, 1.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(bx, by + 4.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (r.bought) {
      // お土産の紙袋を持っている
      const bx = r.x - facing * 7;
      ctx.fillStyle = '#2a9d8f';
      roundRect(ctx, bx - 3, r.y - bob - 11, 6, 7, 1.2);
      ctx.fill();
    }

    let b = r.bubble;
    if (!b && since < 2) b = 'heart';
    // お願いがある人（D335）：ときどき「！」。かなえてもらった直後はハート
    if (!b && r.thankedAt && state.t - r.thankedAt < 90) b = 'heart';
    if (!b && state.wishes?.some((w) => w.who === r.id) && Math.sin(time * 1.1 + ph * 3) > 0.1) b = 'wish';
    // 観光客は ときどき写真を撮る
    if (!b && r.tourist && (r.state === 'STROLL' || r.state === 'PARK') && Math.sin(time * 0.9 + ph * 5) > 0.8) b = 'photo';
    if (!b && r.state === 'QUEUE' && state.t - r.queuedAt > r.patience * 0.6) b = 'sweat';
    // 夫婦で並んで歩いているときは、ときどきハート
    if (!b && r.spouseId && moving && Math.sin(time * 0.7 + ph * 2) > 0.93) {
      const sp = state.residents.find((x) => x.id === r.spouseId);
      if (sp && sp.visible && Math.hypot(sp.x - r.x, sp.y - r.y) < 18) b = 'heart';
    }
    if (b) bubble(b, r.x + 11, r.y - 30 - Math.sin(time * 3 + ph) * 1.2);

    if (selected) {
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(r.name).width + 12;
      const ty = r.y - (b ? 56 : 42);
      ctx.fillStyle = PALETTE.shadow;
      roundRect(ctx, r.x - w / 2 + 1.5, ty - 8 + 2, w, 16, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      roundRect(ctx, r.x - w / 2, ty - 8, w, 16, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(r.name, r.x, ty + 0.5);
    }
  }


  function drawSleep(state, time) {
    ctx.font = `700 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of state.buildings) {
      if (b.type !== 'house') continue;
      if (!state.residents.some((r) => r.homeId === b.id && r.state === 'SLEEP')) continue;
      const x = b.c * T + T / 2;
      const y = b.r * T - (floorsOf(b) - 1) * HOUSE_FLOOR;
      const k = (time * 0.5) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
      ctx.fillText('z', x + 10 + k * 4, y - 2 - k * 10);
      ctx.fillText('z', x + 15 + k * 4, y - 9 - k * 10);
    }
  }

  function lighting(clock) {
    const hr = clock / 60;
    if (hr >= 22 || hr < 5) return 'rgba(18, 28, 72, 0.52)';
    if (hr < 6.5) return `rgba(18, 28, 72, ${(0.52 * (6.5 - hr)) / 1.5})`;
    if (hr >= 20) return `rgba(18, 28, 72, ${0.22 + (0.3 * (hr - 20)) / 2})`;
    if (hr >= 17.5) return `rgba(242, 140, 60, ${(0.16 * (hr - 17.5)) / 2.5})`;
    return null;
  }

  // 建てる場所を選んでいるとき：置けるマスを明るく、選んだ場所に建物の影を出す
  function drawPlacing(state, placing, time) {
    const pulse = 0.55 + Math.sin(time * 4) * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (const i of placing.cells) {
      const x = (i % COLS) * T;
      const y = Math.floor(i / COLS) * T;
      roundRect(ctx, x + 2, y + 2, T - 4, T - 4, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (placing.from) {
      // 動かす前の場所（点線で囲む）
      const s = SIZES[placing.type];
      ctx.strokeStyle = PALETTE.mustard;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      roundRect(ctx, placing.from.c * T + 1, placing.from.r * T + 1, s.w * T - 2, s.h * T - 2, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (placing.ghost) {
      const s = SIZES[placing.type];
      const x = placing.ghost.c * T;
      const y = placing.ghost.r * T;
      ctx.fillStyle = 'rgba(242, 184, 75, 0.45)';
      ctx.strokeStyle = PALETTE.mustard;
      ctx.lineWidth = 3;
      roundRect(ctx, x + 1, y + 1, s.w * T - 2, s.h * T - 2, 8);
      ctx.fill();
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- 1コマ

  // ---------------------------------------------------------------- ゲームセンター（D331）

  // 3×2：紫の建物に「GAME」の看板。夜は看板の電球がまたたく
  function arcade(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.arcade.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#9c89b8';
      roundRect(ctx, x0 + 5, y0 + 6, w - 10, T + 18, 4);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#6d5a8c';
      roundRect(ctx, x0 + 2, y0 + 2, w - 4, 9, 3);
      ctx.fill();
    });
    // 看板
    ctx.fillStyle = '#2b2b33';
    roundRect(ctx, x0 + w / 2 - 24, y0 + 13, 48, 15, 4);
    ctx.fill();
    ctx.font = `800 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letters = ['G', 'A', 'M', 'E'];
    const colors = ['#f2b84b', '#e56b6f', '#62b6cb', '#7fbf6f'];
    letters.forEach((l, k) => {
      ctx.fillStyle = colors[(k + Math.floor(time * 2)) % colors.length];
      ctx.fillText(l, x0 + w / 2 - 15 + k * 10, y0 + 21);
    });
    // 入口と窓
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + w / 2 - 6, y0 + T + 8, 12, 16, [5, 5, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffd66b';
    for (const dx of [-30, 20]) {
      roundRect(ctx, x0 + w / 2 + dx, y0 + T + 8, 10, 9, 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 7.5px ${FONT}`;
    ctx.fillText('ゲームセンター', x0 + w / 2, y0 + 2 * T - 4);
  }

  // ---------------------------------------------------------------- ドッグレース（D328）

  const RACE_SHOW_AFTER = 20; // ゴールのあと、何分 コースに残って見せるか
  function racing(state, id) {
    const r = state.race;
    return !!r && state.t >= r.start - 1 && state.t <= r.end + RACE_SHOW_AFTER && r.runners.some((x) => x.id === id);
  }
  const trackGeom = (b) => ({ cx: b.c * T + (SIZES.track.w * T) / 2, cy: b.r * T + 52, rx: 33, ry: 22 });

  function track(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.track.w * T;
    const g = trackGeom(b);
    // 看板と旗
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x0 + w / 2 - 26, y0 + 2, 52, 11, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 7.5px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ドッグレース', x0 + w / 2, y0 + 8);
    // コース（外の土・内の芝）
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#d9b27c';
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, g.rx + 9, g.ry + 9, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#7fbf6f';
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, g.rx - 8, g.ry - 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.8;
    for (const d of [-3, 3]) {
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, g.rx + d, g.ry + d, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // ゴール（手前の真ん中）：白黒の線
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = k % 2 ? '#2b2b33' : '#ffffff';
      ctx.fillRect(g.cx - 1.5, g.cy + g.ry - 8 + k * 3, 3, 3);
    }
    // 小旗
    const colors = ['#e56b6f', '#f2b84b', '#62b6cb', '#7fbf6f'];
    ctx.strokeStyle = 'rgba(61,90,128,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x0 + 6, y0 + 20);
    ctx.quadraticCurveTo(x0 + w / 2, y0 + 26, x0 + w - 6, y0 + 20);
    ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const x = x0 + 10 + k * ((w - 20) / 8);
      const y = y0 + 21 + Math.sin((k / 8) * Math.PI) * 4;
      ctx.fillStyle = colors[k % colors.length];
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x + 2.5, y);
      ctx.lineTo(x, y + 4 + Math.sin(time * 3 + k) * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 走っている5匹。2周してゴール。順位は sim が決めた順（state.race.order）
  function raceRunners(state, b, time) {
    const r = state.race;
    if (!r || r.trackId !== b.id || state.t < r.start - 1 || state.t > r.end + RACE_SHOW_AFTER) return;
    const g = trackGeom(b);
    const len = r.end - r.start;
    const list = r.runners.map((x) => {
      const rank = r.order.indexOf(x.id);
      const dur = len * (0.8 + rank * 0.05);
      const u = Math.max(0, Math.min(1, (state.t - r.start) / dur));
      // 手前の真ん中（ゴール）から左回りに2周
      const a = Math.PI / 2 + u * Math.PI * 4 + Math.sin(u * 9 + rank) * 0.02;
      const lane = (r.runners.indexOf(x) - 2) * 3.6;
      let px = g.cx + Math.cos(a) * (g.rx + lane);
      let py = g.cy + Math.sin(a) * (g.ry + lane * 0.7);
      if (u >= 1) {
        // ゴールしたら、内側の芝に着いた順に並ぶ（まわりの観客と重ならないように）
        px = g.cx - 22 + rank * 11;
        py = g.cy + 5;
      }
      const moving = u > 0 && u < 1;
      const dir = -Math.sin(a) * (moving ? 1 : 0);
      return { x, rank, px, py, moving, dir, u };
    });
    for (const k of list.sort((p, q) => p.py - q.py)) {
      const fake = { id: k.x.id, kind: k.x.kind, adopted: true, x: k.px, y: k.py, tx: k.px + (k.moving ? 3 : 0), ty: k.py, facing: k.dir >= 0 ? 1 : -1, state: 'RUN', tint: k.x.tint };
      ctx.save();
      ctx.translate(k.px, k.py);
      ctx.scale(0.8, 0.8);
      ctx.translate(-k.px, -k.py);
      drawPetBody(state, fake, time);
      ctx.restore();
    }
    raceLabel = state.t >= r.end ? list.find((k) => k.rank === 0) : null;
  }

  // ゴールのあと：1着の名札（観客より手前に描く）
  let raceLabel = null;
  function drawRaceLabel() {
    const win = raceLabel;
    raceLabel = null;
    if (win) {
      const label = `1着 ${win.x.name}`;
      ctx.font = `700 8px ${FONT}`;
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = PALETTE.mustard;
      roundRect(ctx, win.px - tw / 2, win.py - 26, tw, 12, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, win.px, win.py - 20);
    }
  }

  // ---------------------------------------------------------------- 施設 第1弾（D319）

  // 会社（3×2）：窓の並んだビル。中で働いている人がいると窓が明るい
  function company(state, b) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.company.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#e8edf2';
      roundRect(ctx, x0 + 6, y0 - 10, w - 12, T + 30, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#5b7190';
      roundRect(ctx, x0 + 3, y0 - 14, w - 6, 7, 2);
      ctx.fill();
    });
    const working = state.residents.filter((r) => r.state === 'WORK' && r.destId === b.id).length;
    let k = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const lit = k < working * 2;
        ctx.fillStyle = lit ? '#ffd66b' : '#9fc9d6';
        ctx.fillRect(x0 + 13 + col * 14, y0 - 3 + row * 11, 8, 6);
        k += 1;
      }
    }
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + w / 2 - 7, y0 + T + 6, 14, 14, [3, 3, 0, 0]);
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    roundRect(ctx, x0 + 8, y0 + T + 8, 24, 11, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('会社', x0 + 20, y0 + T + 13.5);
  }

  // 水族館（3×3）：波の屋根と、魚の泳ぐ大きな窓
  function aquarium(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.aquarium.w * T;
    const top = y0 + 24; // 3段めまで使う（下の段が空き地に見えないように）
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + 6, top + 8, w - 12, 56, 4);
      ctx.fill();
      if (!shadow) ctx.fillStyle = '#2a7fa8';
      ctx.beginPath();
      ctx.moveTo(x0 + 2, top + 14);
      for (let k = 0; k <= 4; k++) {
        const x = x0 + 2 + ((w - 4) * k) / 4;
        ctx.quadraticCurveTo(x - (w - 4) / 8, top - 6 - (k % 2) * 4, x, top + 2);
      }
      ctx.lineTo(x0 + w - 2, top + 14);
      ctx.closePath();
      ctx.fill();
    });
    // 窓の中を魚が泳ぐ
    const wx = x0 + 14;
    const wy = top + 16;
    const ww = w - 28;
    ctx.fillStyle = '#7fd0e0';
    roundRect(ctx, wx, wy, ww, 24, 4);
    ctx.fill();
    ctx.save();
    roundRect(ctx, wx, wy, ww, 24, 4);
    ctx.clip();
    for (let k = 0; k < 3; k++) {
      const fx = wx + ((time * (8 + k * 3) + k * 23) % (ww + 20)) - 10;
      const fy = wy + 6 + k * 6;
      ctx.fillStyle = ['#f2b84b', '#f28aa0', '#ffffff'][k];
      ctx.beginPath();
      ctx.ellipse(fx, fy, 4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - 4, fy);
      ctx.lineTo(fx - 7, fy - 2.2);
      ctx.lineTo(fx - 7, fy + 2.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('水族館', x0 + w / 2, top + 49);
    roundRect(ctx, x0 + w / 2 - 6, top + 55, 12, 9, [3, 3, 0, 0]);
    ctx.fill();
  }

  // プール（3×2）：夏だけ水が入る。ほかの季節はシートをかけてある
  function pool(state, b, time, open) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.pool.w * T;
    const h = SIZES.pool.h * T;
    ctx.fillStyle = '#efe3cc';
    roundRect(ctx, x0 + 2, y0 + 2, w - 4, h - 4, 5);
    ctx.fill();
    const px = x0 + 8;
    const py = y0 + 8;
    const pw = w - 16;
    const ph = h - 18;
    if (!open) {
      ctx.fillStyle = '#8fa9bd';
      roundRect(ctx, px, py, pw, ph, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(px + (pw * k) / 4, py);
        ctx.lineTo(px + (pw * k) / 4, py + ph);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.white;
      roundRect(ctx, x0 + w / 2 - 16, py + ph / 2 - 6, 32, 12, 3);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.font = `700 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('夏だけ', x0 + w / 2, py + ph / 2 + 0.5);
      return;
    }
    ctx.fillStyle = '#4fc3dc';
    roundRect(ctx, px, py, pw, ph, 4);
    ctx.fill();
    // 水面のゆらぎ
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const y = py + 6 + k * 9;
      ctx.beginPath();
      for (let x = px + 4; x < px + pw - 4; x += 4) ctx.lineTo(x, y + Math.sin(time * 2 + x * 0.3 + k) * 1.2);
      ctx.stroke();
    }
    // コースロープ
    for (const k of [1, 2]) {
      const y = py + (ph * k) / 3;
      for (let x = px + 3; x < px + pw - 2; x += 5) {
        ctx.fillStyle = (x / 5) % 2 < 1 ? '#e56b6f' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // パラソル
    ctx.fillStyle = '#f2b84b';
    ctx.beginPath();
    ctx.arc(x0 + w - 10, y0 + h - 6, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x0 + w - 10.5, y0 + h - 6, 1, 5);
  }

  // 海水浴場（シェルの島・D371）：海に面した辺が 水（波打ちぎわの泡）、残りが 白い砂。パラソルとタオル、見張りの台
  function beach(b, time, bare = false) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES[b.type].w * T;
    const h = SIZES[b.type].h * T;
    const water = beachWater(b);
    const [dc, dr] = water.dir;
    ctx.fillStyle = '#fbf1e4';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 6);
    ctx.fill();
    // 水：外へ行くほど濃い
    const g = dr ? ctx.createLinearGradient(0, water.y + (dr > 0 ? 0 : water.h), 0, water.y + (dr > 0 ? water.h : 0)) : ctx.createLinearGradient(water.x + (dc > 0 ? 0 : water.w), 0, water.x + (dc > 0 ? water.w : 0), 0);
    g.addColorStop(0, '#9fe3dd');
    g.addColorStop(1, '#3fb6c9');
    ctx.fillStyle = g;
    roundRect(ctx, water.x + 1, water.y + 1, water.w - 2, water.h - 2, 5);
    ctx.fill();
    // 波打ちぎわ（砂との境目の泡が 寄せては返す）
    const wash = Math.sin(time * 1.4) * 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (dr) {
      const y = (dr > 0 ? water.y : water.y + water.h) + dr * wash;
      for (let x = water.x + 3; x <= water.x + water.w - 3; x += 3) ctx.lineTo(x, y + Math.sin(x * 0.35 + time * 2) * 1.2);
    } else {
      const x = (dc > 0 ? water.x : water.x + water.w) + dc * wash;
      for (let y = water.y + 3; y <= water.y + water.h - 3; y += 3) ctx.lineTo(x + Math.sin(y * 0.35 + time * 2) * 1.2, y);
    }
    ctx.stroke();
    if (bare) return; // サーフィンの浜は ボードの棚を描く
    // 砂の上：パラソル2本・タオル・見張りの台（水と反対の側）
    const sand = dr ? { x: x0, y: dr > 0 ? y0 : y0 + T, w, h: h - T } : { x: dc > 0 ? x0 : x0 + T, y: y0, w: w - T, h };
    const spots = dr ? [[0.22, 0.5], [0.62, 0.42], [0.88, 0.62]] : [[0.4, 0.22], [0.55, 0.6], [0.35, 0.9]];
    const colors = [['#ff6b81', '#ffffff'], ['#f2b84b', '#ffffff']];
    spots.slice(0, 2).forEach(([fx, fy], k) => {
      const px = sand.x + sand.w * fx;
      const py = sand.y + sand.h * fy;
      ctx.fillStyle = k ? '#62b6cb' : '#f28aa0';
      ctx.fillRect(px - 7, py + 2, 12, 5); // タオル
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.ellipse(px + 3, py + 3, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(px - 0.6, py - 8, 1.2, 10);
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = colors[k][s % 2];
        ctx.beginPath();
        ctx.moveTo(px, py - 12);
        ctx.arc(px, py - 8, 9, Math.PI + (s * Math.PI) / 6, Math.PI + ((s + 1) * Math.PI) / 6);
        ctx.closePath();
        ctx.fill();
      }
    });
    const [lx, ly] = spots[2];
    const px = sand.x + sand.w * lx;
    const py = sand.y + sand.h * ly;
    ctx.strokeStyle = '#c49a6c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px - 4, py + 4);
    ctx.lineTo(px - 2, py - 6);
    ctx.moveTo(px + 4, py + 4);
    ctx.lineTo(px + 2, py - 6);
    ctx.stroke();
    ctx.fillStyle = '#e56b6f';
    ctx.fillRect(px - 4, py - 9, 8, 4);
  }

  // 温泉（オーロラの島・D371）：木の板の床に、岩で囲んだ まるい湯船。湯気が立つ。のれんの小屋と 雪の灯籠
  function onsen(b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.onsen.w * T;
    const h = SIZES.onsen.h * T;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 4, y0 + 5, w - 4, h - 4, 5);
    ctx.fill();
    ctx.fillStyle = '#b08a64';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,45,25,0.25)';
    ctx.lineWidth = 1;
    for (let x = x0 + 7; x < x0 + w - 2; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + 3);
      ctx.lineTo(x, y0 + h - 3);
      ctx.stroke();
    }
    const cx = x0 + w / 2;
    const cy = y0 + T + 4;
    // 岩のふち
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ctx.fillStyle = k % 3 ? '#7d858d' : '#9aa2aa';
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 34, cy + Math.sin(a) * 15, 5.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 湯
    const g = ctx.createRadialGradient(cx - 6, cy - 3, 2, cx, cy, 34);
    g.addColorStop(0, '#bff0e6');
    g.addColorStop(1, '#6cc6c0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 31, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // 雪をかぶった岩
    ctx.fillStyle = '#ffffff';
    for (const k of [0, 5, 11]) {
      const a = (k / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * 34, cy + Math.sin(a) * 15 - 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // のれんの小屋（左上）と 灯籠（右下）
    ctx.fillStyle = '#6e4f3c';
    ctx.fillRect(x0 + 4, y0 + 3, 16, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x0 + 3, y0 + 1, 18, 3);
    ctx.fillStyle = '#3d5a80';
    ctx.fillRect(x0 + 6, y0 + 6, 5, 6);
    ctx.fillStyle = '#c8553d';
    ctx.fillRect(x0 + 12, y0 + 6, 5, 6);
    ctx.fillStyle = '#9aa2aa';
    ctx.fillRect(x0 + w - 11, y0 + h - 14, 5, 9);
    ctx.fillStyle = `rgba(255, 214, 120, ${0.75 + Math.sin(time * 3) * 0.2})`;
    ctx.fillRect(x0 + w - 10, y0 + h - 12, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x0 + w - 12, y0 + h - 16, 7, 2);
  }
  // 湯気（住民の上に重ねる）
  function onsenSteam(b, time) {
    const cx = b.c * T + (SIZES.onsen.w * T) / 2;
    const cy = b.r * T + T + 4;
    for (let k = 0; k < 7; k++) {
      const life = (time * 0.35 + k / 7) % 1;
      const x = cx - 22 + ((k * 13) % 44) + Math.sin(time + k) * 3;
      const y = cy - life * 26;
      ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - life)})`;
      ctx.beginPath();
      ctx.arc(x, y, 3 + life * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // マルシェ（D387）：屋台が3つ。しましまの屋根と、木箱に品物。品物が減ると 箱が空く
  const MARCHE_LOOK = {
    shell: { roofs: [['#ff8a7a', '#ffffff'], ['#2ec4b6', '#ffffff'], ['#ffbf69', '#ffffff']], goods: ['#ffb627', '#f4d35e', '#ff6b81', '#86c47c'] },
    aurora: { roofs: [['#a3413b', '#f4ecdf'], ['#2f5d62', '#f4ecdf'], ['#6b5b4b', '#f4ecdf']], goods: ['#c49a6c', '#8e2f5a', '#3d5a80', '#f2e2b3'] },
  };
  function marche(state, b) {
    const look = MARCHE_LOOK[state.isle] || MARCHE_LOOK.shell;
    const x0 = b.c * T;
    const y0 = b.r * T;
    const full = Math.min(1, b.stock / Math.max(1, marcheCap(b)));
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x0 + 5, y0 + 10, SIZES.marche.w * T - 6, 36);
    for (let k = 0; k < 3; k++) {
      const x = x0 + 3 + k * 29;
      const [roof, stripe] = look.roofs[k];
      // 台と 木箱
      ctx.fillStyle = '#b98b5e';
      ctx.fillRect(x + 2, y0 + 22, 22, 14);
      ctx.fillStyle = '#8d6a4f';
      ctx.fillRect(x + 2, y0 + 34, 22, 3);
      const show = Math.round(full * 6);
      for (let g = 0; g < 6; g++) {
        const gx = x + 6 + (g % 3) * 7;
        const gy = y0 + 25 + Math.floor(g / 3) * 5;
        ctx.fillStyle = g < show ? look.goods[(g + k) % look.goods.length] : 'rgba(80,50,30,0.25)';
        ctx.beginPath();
        ctx.arc(gx, gy, g < show ? 2.6 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // しましまの屋根
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = s % 2 ? stripe : roof;
        ctx.fillRect(x + s * 6.5, y0 + 6, 6.5, 12);
      }
      ctx.fillStyle = roof;
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.arc(x + 3.25 + s * 6.5, y0 + 18, 3.25, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 1, y0 + 18, 1.5, 18);
      ctx.fillRect(x + 24, y0 + 18, 1.5, 18);
    }
  }

  // フェスの舞台（D387）：シェル＝砂浜の木の舞台に 電球のひも。オーロラ＝雪の舞台に ランタン。
  // フェスの時間は 演奏する人が舞台に立ち、灯りがともる
  function festStage(state, b, time) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES[b.type].w * T;
    const snow = b.type === 'snowfest';
    const clock = clockOf(state.t);
    const on = isFestDay(state, b.type) && clock >= CONFIG[b.type].open - 20 && clock < CONFIG[b.type].close;
    // 客席の地面
    ctx.fillStyle = snow ? 'rgba(200,215,230,0.5)' : 'rgba(240,220,180,0.55)';
    roundRect(ctx, x0 + 2, y0 + 26, w - 4, 32, 5);
    ctx.fill();
    // 舞台
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x0 + 10, y0 + 6, w - 16, 22);
    ctx.fillStyle = snow ? '#8a9aa8' : '#b98b5e';
    ctx.fillRect(x0 + 8, y0 + 4, w - 16, 20);
    ctx.fillStyle = snow ? '#ffffff' : '#8d6a4f';
    ctx.fillRect(x0 + 8, y0 + 22, w - 16, 3);
    // 屋根の柱と 横のはり
    ctx.fillStyle = snow ? '#5d4a3a' : '#6e4f3c';
    ctx.fillRect(x0 + 9, y0 - 12, 3, 18);
    ctx.fillRect(x0 + w - 12, y0 - 12, 3, 18);
    ctx.fillRect(x0 + 8, y0 - 14, w - 16, 3);
    if (snow) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0 + 7, y0 - 17, w - 14, 3);
    }
    // 灯り：電球のひも（シェル）・ランタン（オーロラ）。フェスの時間は明るく
    for (let k = 0; k < 7; k++) {
      const lx = x0 + 12 + ((w - 24) * k) / 6;
      const ly = y0 - 10 + Math.sin((k / 6) * Math.PI) * 4;
      const glow = on ? 0.75 + Math.sin(time * 4 + k) * 0.25 : 0.25;
      ctx.fillStyle = snow ? `rgba(255, 196, 110, ${glow})` : ['#ff6b81', '#ffd166', '#62b6cb'][k % 3];
      ctx.globalAlpha = snow ? 1 : glow;
      ctx.beginPath();
      if (snow) ctx.fillRect(lx - 2, ly, 4, 5);
      else ctx.arc(lx, ly + 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!on) return;
    // 演奏する人（3人）：はねるように ゆれる
    const colors = snow ? ['#3d5a80', '#a3413b', '#2f5d62'] : ['#ff6b81', '#2ec4b6', '#f2b84b'];
    for (let k = 0; k < 3; k++) {
      const px = x0 + 22 + k * ((w - 44) / 2);
      const hop = Math.abs(Math.sin(time * 5 + k)) * 2;
      ctx.fillStyle = colors[k];
      roundRect(ctx, px - 4, y0 + 8 - hop, 8, 9, 3);
      ctx.fill();
      ctx.fillStyle = '#f3cfb0';
      ctx.beginPath();
      ctx.arc(px, y0 + 5 - hop, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // 音符（シェル）・キャンドルのゆらぎ（オーロラ）
    if (!snow) {
      ctx.fillStyle = 'rgba(61,90,128,0.7)';
      for (let k = 0; k < 3; k++) {
        const t = (time * 0.6 + k / 3) % 1;
        const nx = x0 + w / 2 + Math.sin(t * 6 + k) * 18;
        const ny = y0 - 14 - t * 20;
        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(nx + 1.4, ny - 7, 1, 7);
      }
      ctx.globalAlpha = 1;
    } else {
      for (let k = 0; k < 8; k++) {
        const cx = x0 + 6 + ((w - 12) * k) / 7;
        const cy = y0 + 58;
        ctx.fillStyle = '#f4ecdf';
        ctx.fillRect(cx - 1.5, cy - 5, 3, 5);
        ctx.fillStyle = `rgba(255, 190, 90, ${0.7 + Math.sin(time * 6 + k * 2) * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 7, 1.6, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // 花火（ビーチフェスの最後・D387）：夜空に 開いて 散る（画面の上のほう）
  function fireworks(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const colors = ['255, 120, 140', '255, 210, 110', '120, 220, 255', '190, 150, 255'];
    for (let k = 0; k < 4; k++) {
      const cyc = (time * 0.45 + k * 0.27) % 1;
      const seed = Math.floor(time * 0.45 + k * 0.27) * 7 + k;
      const cx = view.w * (0.2 + ((seed * 37) % 60) / 100);
      const cy = view.h * (0.12 + ((seed * 53) % 20) / 100);
      if (cyc < 0.2) {
        ctx.fillStyle = `rgba(${colors[k]}, 0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy + (0.2 - cyc) * 400, 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const t = (cyc - 0.2) / 0.8;
      const rad = 10 + t * 70;
      ctx.fillStyle = `rgba(${colors[k]}, ${1 - t})`;
      for (let s = 0; s < 18; s++) {
        const a = (s / 18) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad + t * t * 20, 2.2 - t * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 運動（D373）

  // ビーチバレー場：白い砂のコートに 線とネット
  function volleyCourt(b) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.volley.w * T;
    const h = SIZES.volley.h * T;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 4, y0 + 5, w - 4, h - 4, 5);
    ctx.fill();
    ctx.fillStyle = '#f7e7cf';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 5);
    ctx.fill();
    ctx.strokeStyle = '#e56b6f';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x0 + 8, y0 + 8, w - 16, h - 18);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0 + w / 2, y0 + 3);
    ctx.lineTo(x0 + w / 2, y0 + h - 8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(61,90,128,0.45)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(x0 + w / 2 + 2, y0 + 5);
    ctx.lineTo(x0 + w / 2 + 2, y0 + h - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x0 + w / 2 - 1.5, y0 + 1, 3, 4);
    ctx.fillRect(x0 + w / 2 - 1.5, y0 + h - 10, 3, 4);
  }
  // サーフィンの浜：海水浴場と同じ水と砂。砂の上に ボードを立てかけた棚
  function surfBeach(b, time) {
    beach(b, time, true);
    const water = beachWater(b);
    const [dc, dr] = water.dir;
    const x0 = b.c * T;
    const y0 = b.r * T;
    const sx = dr ? x0 + 8 : dc > 0 ? x0 + 6 : x0 + T + 6;
    const sy = dr ? (dr > 0 ? y0 + 6 : y0 + T + 6) : y0 + 8;
    const colors = ['#ff6b81', '#f2b84b', '#62b6cb', '#86c47c'];
    ctx.fillStyle = '#8d6a4f';
    ctx.fillRect(sx - 2, sy + 12, 44, 3);
    colors.forEach((col, k) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(sx + 4 + k * 11, sy + 6, 3.2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(sx + 3.5 + k * 11, sy - 1, 1, 14);
    });
    // 沖の白い波頭
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) {
      const t = (time * 0.25 + k * 0.5) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      if (dr) {
        const y = (dr > 0 ? water.y + water.h : water.y) - dr * t * water.h;
        ctx.moveTo(water.x + 4, y);
        ctx.quadraticCurveTo(water.x + water.w / 2, y - dr * 4, water.x + water.w - 4, y);
      } else {
        const x = (dc > 0 ? water.x + water.w : water.x) - dc * t * water.w;
        ctx.moveTo(x, water.y + 4);
        ctx.quadraticCurveTo(x - dc * 4, water.y + water.h / 2, x, water.y + water.h - 4);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // カーリング場：屋根の骨組みが見える 氷のシート。両はしに 同心円（ハウス）
  function curlingSheet(b) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.curling.w * T;
    const h = SIZES.curling.h * T;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 4, y0 + 5, w - 4, h - 4, 5);
    ctx.fill();
    ctx.fillStyle = '#6e4f3c';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 2, 5);
    ctx.fill();
    ctx.fillStyle = '#e8f3fa';
    roundRect(ctx, x0 + 5, y0 + 6, w - 10, h - 14, 3);
    ctx.fill();
    for (const cx of [x0 + 20, x0 + w - 20]) {
      for (const [rad, col] of [[11, '#62b6cb'], [7.5, '#ffffff'], [4.5, '#e56b6f'], [1.8, '#ffffff']]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, y0 + h / 2 - 1, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(229,107,111,0.6)';
    ctx.lineWidth = 1;
    for (const x of [x0 + 36, x0 + w - 36]) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + 7);
      ctx.lineTo(x, y0 + h - 9);
      ctx.stroke();
    }
    // 屋根の梁（上から見た 骨組み）
    ctx.strokeStyle = 'rgba(110,79,60,0.35)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x0 + (w * k) / 4, y0 + 2);
      ctx.lineTo(x0 + (w * k) / 4, y0 + 6);
      ctx.stroke();
    }
  }
  // アイスホッケー場：まわりの板と ガラス、赤と青の線、両はしに ゴール
  function hockeyRink(b) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.hockey.w * T;
    const h = SIZES.hockey.h * T;
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x0 + 4, y0 + 5, w - 4, h - 6, 16);
    ctx.fill();
    ctx.fillStyle = '#d7e3ec';
    roundRect(ctx, x0 + 1, y0 + 1, w - 2, h - 8, 16);
    ctx.fill();
    ctx.fillStyle = '#f4f9fc';
    roundRect(ctx, x0 + 5, y0 + 5, w - 10, h - 16, 13);
    ctx.fill();
    ctx.strokeStyle = '#e56b6f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + w / 2, y0 + 6);
    ctx.lineTo(x0 + w / 2, y0 + h - 12);
    ctx.stroke();
    ctx.strokeStyle = '#3d5a80';
    for (const x of [x0 + w * 0.33, x0 + w * 0.67]) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + 6);
      ctx.lineTo(x, y0 + h - 12);
      ctx.stroke();
    }
    ctx.strokeStyle = '#e56b6f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x0 + w / 2, y0 + (h - 8) / 2, 9, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, dir] of [[x0 + 9, 1], [x0 + w - 9, -1]]) {
      ctx.strokeStyle = '#e56b6f';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x - (dir > 0 ? 0 : 6), y0 + (h - 8) / 2 - 6, 6, 12);
    }
  }
  // 遊んでいる様子（遊ぶ人が2人以上いるとき）：ビーチバレーは球がネットを越え、カーリングは石がすべり、ホッケーはパックが走る
  function sportMotion(state, b, time) {
    const players = sportPlayers(b);
    const here = b.seats.slice(0, players.length).map((id, k) => (id ? players[k] : null)).filter(Boolean);
    if (here.length < 2) return;
    const t = (time * (b.type === 'hockey' ? 0.9 : 0.5) + b.c * 0.1) % 1;
    const i = Math.floor(time * (b.type === 'hockey' ? 0.9 : 0.5) + b.c * 0.1) % here.length;
    const a = here[i];
    const z = here[(i + 1) % here.length];
    const x = a.x + (z.x - a.x) * t;
    let y = a.y + (z.y - a.y) * t;
    if (b.type === 'volley') {
      y -= 10 + Math.sin(t * Math.PI) * 18;
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath();
      ctx.ellipse(x, a.y + (z.y - a.y) * t + 2, 3, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2b84b';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (b.type === 'curling') {
      const x0 = b.c * T + 36;
      const x1 = b.c * T + SIZES.curling.w * T - 22;
      const ease = 1 - (1 - t) * (1 - t);
      ctx.fillStyle = '#9aa2aa';
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) * ease, b.r * T + (SIZES.curling.h * T) / 2 - 1, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e56b6f';
      ctx.fillRect(x0 + (x1 - x0) * ease - 1.5, b.r * T + (SIZES.curling.h * T) / 2 - 3.5, 3, 2);
    } else {
      ctx.fillStyle = '#1f2a36';
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 2.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 波に乗る人：ボードの上に立って、少し揺れる
  function surfer(r, time) {
    const look = lookOf(r);
    const ph = phaseOf(r.id);
    const ride = Math.sin(time * 1.5 + ph);
    const x = r.x + ride * 3;
    const y = r.y;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(x - 5, y + 2, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ['#ff6b81', '#f2b84b', '#62b6cb', '#86c47c'][Math.floor(ph * 10) % 4];
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 2.4, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = look.shirt;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 1);
    ctx.lineTo(x, y - 7);
    ctx.lineTo(x + 2, y - 1);
    ctx.stroke();
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 6 + ride);
    ctx.lineTo(x + 5, y - 7 - ride);
    ctx.stroke();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(x, y - 10, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(x, y - 11, 2.8, Math.PI, 0);
    ctx.fill();
  }

  // 湯につかる人：頭と肩、頭に手ぬぐい
  function bather(r, time) {
    const look = lookOf(r);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + 1, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, 5, 2.2, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r.x, r.y - 3.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(r.x, r.y - 4.5, 3.2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(r.x - 2.5, r.y - 8.5 + Math.sin(time + r.x) * 0.3, 5, 1.8);
  }

  // 泳いでいる人：水から頭と腕だけ
  function swimmer(r, time) {
    const look = lookOf(r);
    const ph = phaseOf(r.id);
    const bob = Math.sin(time * 3 + ph) * 1;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + 1, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    const arm = Math.sin(time * 4 + ph) * 3;
    ctx.beginPath();
    ctx.moveTo(r.x - 3, r.y);
    ctx.lineTo(r.x - 6, r.y - 3 + arm);
    ctx.moveTo(r.x + 3, r.y);
    ctx.lineTo(r.x + 6, r.y - 3 - arm);
    ctx.stroke();
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(r.x, r.y - 2 + bob, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(r.x, r.y - 3 + bob, 3.2, Math.PI, 0);
    ctx.fill();
  }

  // ---------------------------------------------------------------- 山の島（D318）

  // 橋をかける前の山の島：海の向こうに うっすら見える（D317・オーナー案）
  // 広げられるふもと（D321）も、山の島に橋をかけたら うっすら見せる
  function teaser(state) {
    const opened = state.areas || [];
    for (const a of AREAS) {
      if (!a.island || opened.includes(a.id)) continue;
      if (a.parent) {
        if (!opened.includes(a.parent)) continue;
        ctx.save();
        ctx.globalAlpha = 0.4;
        for (const sh of shapesOf(a)) {
          ctx.fillStyle = PALETTE.sand;
          islandPath(ctx, sh, 1, 4);
          ctx.fill();
          ctx.fillStyle = PALETTE.grass;
          islandPath(ctx, sh, 0.885);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = PALETTE.seaDeep;
      islandPath(ctx, a, 1, 10, 6, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.sand;
      islandPath(ctx, a, 1, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.grass;
      islandPath(ctx, a, 0.885);
      ctx.fill();
      if (a.mountain) drawMountain(ctx, a.mountain, themeId());
      ctx.restore();
      // 名札
      const y = a.cy + a.ry * 0.5;
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(a.name).width + 18;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      roundRect(ctx, a.cx - w / 2, y - 11, w, 22, 11);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(a.name, a.cx, y + 0.5);
    }
  }

  // スキー場のロッジ（2×2）。冬のほかは「冬だけ」の札
  function skiLodge(state, b, open) {
    const x0 = b.c * T;
    const y0 = b.r * T;
    const w = SIZES.ski.w * T;
    paperShadow((shadow) => {
      if (!shadow) ctx.fillStyle = '#a0714f';
      roundRect(ctx, x0 + 6, y0 + 12, w - 12, T + 8, 3);
      ctx.fill();
      if (!shadow) ctx.fillStyle = theme.snow ? '#ffffff' : '#c8553d';
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0 + 16);
      ctx.lineTo(x0 + w / 2, y0 - 8);
      ctx.lineTo(x0 + w - 1, y0 + 16);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = '#f7e3b5';
    ctx.fillRect(x0 + w / 2 - 5, y0 + 4, 10, 7);
    ctx.fillStyle = PALETTE.ink;
    roundRect(ctx, x0 + w / 2 - 5, y0 + T + 4, 10, 16, [5, 5, 0, 0]);
    ctx.fill();
    // 立てかけたスキー板
    ctx.strokeStyle = '#e56b6f';
    ctx.lineWidth = 2;
    for (const dx of [0, 4]) {
      ctx.beginPath();
      ctx.moveTo(x0 + w - 12 + dx, y0 + 2 * T - 6);
      ctx.lineTo(x0 + w - 8 + dx, y0 + T + 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'スキー' : '冬だけ', x0 + 16, y0 + 2 * T - 5);
  }

  // 冬のスキー場：山にコースとリフト。滑っている人（席についた人）が、頂上から ふもとへ
  function skiSlope(state, b, time) {
    const a = AREAS.find((x) => x.mountain);
    const m = a.mountain;
    const { foot, peak } = mountainGeom(m);
    const lodge = { x: b.c * T + T, y: b.r * T + T / 2 };
    // リフト：ロッジから頂上へ
    ctx.strokeStyle = 'rgba(61, 90, 128, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lodge.x, lodge.y - 6);
    ctx.lineTo(peak.x + 6, peak.y + 10);
    ctx.stroke();
    for (let k = 1; k < 5; k++) {
      const x = lodge.x + ((peak.x + 6 - lodge.x) * k) / 5;
      const y = lodge.y - 6 + ((peak.y + 10 - lodge.y + 6) * k) / 5;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 0.8, y, 1.6, 6);
    }
    // コース（2本）
    const trail = (k, u) => ({
      x: peak.x + Math.sin(u * Math.PI * 3 + k * 2.1) * m.rx * 0.32 * u + (k ? m.rx * 0.28 : -m.rx * 0.3) * u,
      y: peak.y + 8 + (foot - 6 - peak.y - 8) * u,
    });
    ctx.strokeStyle = 'rgba(98, 182, 203, 0.45)';
    ctx.lineWidth = 3;
    for (const k of [0, 1]) {
      ctx.beginPath();
      for (let s = 0; s <= 24; s++) {
        const p = trail(k, s / 24);
        if (s === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    // 滑る人
    b.seats.forEach((id, k) => {
      if (!id) return;
      const r = everyone(state).find((x) => x.id === id);
      const u = (time * 0.06 + k * 0.29) % 1;
      const p = trail(k % 2, u);
      const look = r ? lookOf(r) : { shirt: '#e56b6f', skin: '#f3cfb0' };
      ctx.fillStyle = 'rgba(20,60,70,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x + 2, p.y + 3, 4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y + 2);
      ctx.lineTo(p.x + 4, p.y + 1);
      ctx.stroke();
      ctx.fillStyle = look.shirt;
      roundRect(ctx, p.x - 2.5, p.y - 6, 5, 7, 2);
      ctx.fill();
      ctx.fillStyle = look.skin;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, 2.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function draw(state, time, ui = {}) {
    pokes = ui.pokes || null;
    setBounds(state);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, 0, view.w, view.h);

    const toWorldSpace = () => {
      ctx.setTransform(view.dpr * cam.zoom, 0, 0, view.dpr * cam.zoom, view.dpr * ox(), view.dpr * oy());
    };

    toWorldSpace();
    // 波
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + time * 5) % (WORLD.w + 400)) - 200;
      const y = ((i * 151) % (WORLD.h + 400)) - 200;
      ctx.beginPath();
      ctx.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    if (theme.ice) {
      // 海に浮かぶ氷（オーロラの島）：ゆっくり流れる、角ばった白いかけら
      for (let i = 0; i < 26; i++) {
        const x = ((i * 173 + time * 2.2) % (WORLD.w + 300)) - 150;
        const y = ((i * 229 + 40) % (WORLD.h + 300)) - 150;
        const r = 5 + hash(i + 7) * 9;
        ctx.fillStyle = 'rgba(20, 45, 70, 0.25)';
        floe(x + 2, y + 3, r, i);
        ctx.fillStyle = theme.ice;
        floe(x, y, r, i);
      }
    }
    teaser(state);
    const gk = `${MAP_KEY}|${(state.harbors || []).map((h) => h.id).join('+')}|${themeId()}|${COVER_KEY}`;
    if (gk !== groundKey) {
      ground = buildGround(state);
      groundKey = gk;
    }
    ctx.drawImage(ground, groundRect.x, groundRect.y, groundRect.w, groundRect.h);

    const clock = clockOf(state.t);
    const night = clock >= 19 * 60 || clock < 6 * 60;
    const used = occupied(state.buildings);
    decor(used, time);
    // お願いの建物（D360）：住民のカードを開いているあいだと、その飾りを置く場所を選んでいるあいだ。
    // 「家から 3マス以内」のお願いは、その範囲を うすく塗る
    for (const wp0 of ui.wishPlaces || []) {
      if (!wp0.near) continue;
      const s = SIZES[wp0.building.type];
      const n = wp0.near;
      ctx.fillStyle = `rgba(242, 184, 75, ${0.16 + Math.sin(time * 2) * 0.04})`;
      ctx.strokeStyle = 'rgba(242, 184, 75, 0.55)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, (wp0.building.c - n) * T, (wp0.building.r - n) * T, (s.w + 2 * n) * T, (s.h + 2 * n) * T, 14);
      ctx.fill();
      ctx.stroke();
    }

    const cafeList = state.buildings.filter((b) => b.type === 'cafe');
    const poolOpen = inSeason(state, 'pool'); // 夏だけ。シェルの島は常夏なので一年中（D364）
    let houseN = 0;
    // 奥（上）から順に描く
    for (const b of [...state.buildings].sort((a, c) => a.r - c.r)) {
      if (b.type === 'house') house(b, houseN++);
      else if (b.type === 'park') park(b, time);
      else if (b.type === 'cafe') cafe(b, ui.cafeLabel ? ui.cafeLabel(b) : 'カフェ', cafeList.length > 1);
      else if (b.type === 'shop') shop(state, b, state.buildings.filter((x) => x.type === 'shop').length > 1);
      else if (b.type === 'super') superMarket(state, b, state.buildings.filter((x) => x.type === 'super').length > 1);
      else if (b.type === 'planetarium') planetarium(state, b, time);
      else if (b.type === 'petshop') petshop(state, b);
      else if (b.type === 'kinder') kinder(state, b, time);
      else if (b.type === 'school') school(state, b, time);
      else if (b.type === 'college') college(state, b, time);
      else if (b.type === 'hospital') hospital(state, b, time);
      else if (b.type === 'pond') pond(state, b, time);
      else if (b.type === 'stand') stand(state, b, time);
      else if (b.type === 'ski') skiLodge(state, b, theme.snow);
      else if (b.type === 'company') company(state, b);
      else if (b.type === 'aquarium') aquarium(state, b, time);
      else if (b.type === 'pool') pool(state, b, time, poolOpen);
      else if (b.type === 'beach') beach(b, time);
      else if (b.type === 'onsen') onsen(b, time);
      else if (b.type === 'marche') marche(state, b);
      else if (FESTS.includes(b.type)) festStage(state, b, time);
      else if (b.type === 'volley') volleyCourt(b);
      else if (b.type === 'surf') surfBeach(b, time);
      else if (b.type === 'curling') curlingSheet(b);
      else if (b.type === 'hockey') hockeyRink(b);
      else if (b.type === 'track') track(state, b, time);
      else if (b.type === 'arcade') arcade(state, b, time);
      else if (b.type === 'flowerbed') flowerbed(b, time);
      else if (b.type === 'bench') bench(b);
      else if (b.type === 'streetlamp') lamp(idx(b.c, b.r), false, true);
      else if (b.type === 'fountain') fountain(b, time);
      else if (b.type === 'clocktower') clocktower(state, b);
    }
    for (const b of state.buildings) if (b.type === 'track') raceRunners(state, b, time);
    if (theme.snow) for (const b of state.buildings) if (b.type === 'ski') skiSlope(state, b, time);
    for (const i of lamps()) lamp(i, false);
    for (const b of state.buildings) if (b.type === 'cafe' && b.bar && !night) barLights(b, false, time);
    for (const port of [state.port, ...(state.harbors || [])]) boat(state, port, time);
    if (ui.placing) drawPlacing(state, ui.placing, time);
    // 選んでいる建物を点線で囲む（住民の一覧から飛んだとき、どの家か分かるように・D311）
    const sbs = [ui.selectedBuildingId && state.buildings.find((b) => b.id === ui.selectedBuildingId), ...(ui.wishPlaces || []).map((p) => p.building)];
    for (const sb of new Set(sbs.filter(Boolean))) {
      const s = SIZES[sb.type];
      const top = sb.type === 'house' ? 14 + ((sb.level || 1) - 1) * HOUSE_FLOOR : 6;
      ctx.strokeStyle = `rgba(242, 184, 75, ${0.65 + Math.sin(time * 4) * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      roundRect(ctx, sb.c * T - 3, sb.r * T - top - 3, s.w * T + 6, s.h * T + top + 6, 9);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 天気と時間帯の色は住民より下にかける（主役を色あせさせない）
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const weatherTint = state.weather === 'rain' ? 'rgba(40, 60, 90, 0.22)' : state.weather === 'cloudy' ? 'rgba(90, 110, 125, 0.14)' : null;
    for (const c of [weatherTint, lighting(clock)]) {
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (theme.sky && state.weather === 'sunny') auroraSky(clock, time);
    // ビーチフェスの花火（D387）：フェスの日の 最後の30分
    if (state.weather !== 'rain' && isFestDay(state, 'beachfest') && clock >= CONFIG.beachfest.fireworks && clock < CONFIG.beachfest.close) fireworks(time);

    toWorldSpace();
    for (const b of state.buildings) {
      if (b.type !== 'house') continue;
      const home = state.residents.some((r) => r.homeId === b.id && !r.visible && r.state !== 'PENDING');
      houseWindow(b, night && home);
    }
    if (night) for (const i of lamps()) lamp(i, true);
    if (night) for (const b of state.buildings) if (b.type === 'streetlamp') lamp(idx(b.c, b.r), true, true);
    if (night) for (const b of state.buildings) if (b.type === 'planetarium') planetariumGlow(b, time);
    if (night) for (const b of state.buildings) if (b.type === 'cafe' && b.bar) barLights(b, true, time);
    // 住民・観光客・ペットを、奥（上）から順に
    const things = [
      ...everyone(state).filter((r) => r.visible).map((r) => ({
        y: r.y,
        draw: () => {
          // 水の中の絵は、席（水の中）に着いてから。着くまでは 道から歩いていく（土の上で泳いで見えた・D396）
          const arrived = Math.hypot(r.x - r.tx, r.y - r.ty) < 3;
          const at = r.state === 'SEATED' && arrived && state.buildings.find((b) => b.id === r.destId)?.type;
          if (at === 'pool' || at === 'beach') return swimmer(r, time);
          if (at === 'onsen') return bather(r, time);
          if (at === 'surf') return surfer(r, time);
          return drawResident(state, r, time, r.id === ui.selectedId);
        },
      })),
      // レースに出ているあいだ、島のペットはコースの上に描く（家のまわりには描かない）
      ...(state.pets || []).filter((p) => !racing(state, p.id)).map((p) => ({ y: p.y, draw: () => drawPet(state, p, time) })),
    ].sort((a, b) => a.y - b.y);
    for (const t of things) t.draw();
    for (const b of state.buildings) if (b.type === 'onsen') onsenSteam(b, time);
    for (const b of state.buildings) if (SPORTS.includes(b.type) && b.type !== 'surf') sportMotion(state, b, time);
    drawSleep(state, time);
    // お願いの建物の名札（D360）：住民が前に立っていても、どの家か分かるように いちばん上に
    for (const wp of ui.wishPlaces || []) {
      if (!wp.label) continue;
      const s = SIZES[wp.building.type];
      const top = wp.building.type === 'house' ? 14 + ((wp.building.level || 1) - 1) * HOUSE_FLOOR : 6;
      const x = (wp.building.c + s.w / 2) * T;
      const y = wp.building.r * T - top - 14;
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(wp.label).width + 14;
      ctx.fillStyle = PALETTE.shadow;
      roundRect(ctx, x - w / 2 + 1.5, y - 8 + 2, w, 17, 8.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.mustard;
      roundRect(ctx, x - w / 2, y - 8, w, 17, 8.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(wp.label, x, y + 1);
    }
    drawRaceLabel();
    // 「もう少し広い家に住みたい」家族の家の上に、ふきだし（D307）
    for (const id of wantsRoomHouses(state)) {
      const b = state.buildings.find((x) => x.id === id);
      bubble('room', b.c * T + T / 2 + 8, b.r * T - (floorsOf(b) - 1) * HOUSE_FLOOR - 4 + Math.sin(time * 2 + b.c) * 1.2);
    }

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (state.weather !== 'rain' && (theme.petals || theme.snow)) {
      // 桜・紅葉は花びらと葉が ひらひら、雪は ゆっくり降る（D312）
      for (const [i, d] of drops.entries()) {
        if (i % 3) continue;
        const fall = theme.snow ? 22 : 16;
        const y = (d.y * view.h + time * fall * d.s) % view.h;
        const x = (d.x * view.w + Math.sin(time * 0.8 + i) * 14 + time * 6 * d.s) % view.w;
        ctx.fillStyle = theme.snow ? 'rgba(255,255,255,0.9)' : theme.petals;
        ctx.beginPath();
        if (theme.snow) ctx.arc(x, y, 1.6 + d.s, 0, Math.PI * 2);
        else ctx.ellipse(x, y, 2.6, 1.5, time * 1.5 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state.weather === 'rain') {
      ctx.strokeStyle = 'rgba(235, 245, 255, 0.6)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (const d of drops) {
        const y = (d.y * view.h + time * 380 * d.s) % view.h;
        const x = (d.x * view.w + time * 60 * d.s) % view.w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2.5, y - 9);
        ctx.stroke();
      }
    }
  }

  function toClient(x, y) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ox() + x * cam.zoom, y: rect.top + oy() + y * cam.zoom };
  }

  return { resize, draw, toWorld, toClient, tileAt, panBy, zoomAt, focus, setTopInset };
}
