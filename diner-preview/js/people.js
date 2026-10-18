// お客さんの絵（SVG）。頭が大きい2.5頭身・点の目・ほっぺ。表情は mood で変える。
// look: 0〜11（髪型・髪色・服の色の組み合わせ）
// mood: 'idle' | 'wait' | 'angry' | 'happy' | 'eat'

const LINE = '#2a2350';
const SKIN = ['#ffd9bf', '#f7c6a0', '#ecb38a', '#ffe3cf'];
const HAIR = ['#3b2a1f', '#6b3e1f', '#1f1b2e', '#c9772d', '#8a8a96', '#5a2d6b'];
const SHIRT = ['#ff6b6b', '#4cc9f0', '#2fd39e', '#ffd23f', '#9b7bff', '#ff9f43'];

// 髪型：[頭の後ろに描くもの, 頭の上に描くもの]
const STYLES = [
  // 0 ふつうの短髪（横分け）
  (c) => ['', `<path d="M8.5 25 C7 10 18 5.5 25 6 C33 6 41 10.5 39.5 25 C37 19 33 15.5 27 15 C23 17.5 15 18 8.5 25Z" fill="${c}"/>`],
  // 1 ボブ（あごまで）
  (c) => [`<path d="M7 24 C6 9 17 4.5 24 4.5 C31 4.5 42 9 41 24 L41.5 33 C41.5 36 37 36 36.5 33 L36 24 L12 24 L11.5 33 C11 36 6.5 36 6.5 33Z" fill="${c}"/>`,
    `<path d="M8 23 C8 10 17 6 24 6 C31 6 40 10 40 23 C35 17 30 15.5 24 15.5 C18 15.5 13 17 8 23Z" fill="${c}"/>`],
  // 2 おだんご
  (c) => [`<circle cx="24" cy="5.5" r="5.5" fill="${c}"/>`,
    `<path d="M8.5 24 C8 11 17 7 24 7 C31 7 40 11 39.5 24 C36 18 31 14.5 24 14.5 C17 14.5 12 18 8.5 24Z" fill="${c}"/>`],
  // 3 帽子
  (c, s) => ['', `<path d="M9 18 C9 8 17 5 24 5 C31 5 39 8 39 18Z" fill="${s}"/><path d="M7 17.5 H33 C38 17.5 43 18.5 43 20.5 C43 22 38 21.5 33 21 H7 C6 21 6 17.5 7 17.5Z" fill="${s}"/><circle cx="24" cy="5.5" r="2" fill="#fff"/>`],
  // 4 ポニーテール
  (c) => [`<path d="M37 14 C46 14 47 26 42 33 C41 28 40 22 36 19Z" fill="${c}"/>`,
    `<path d="M8.5 24 C7.5 10 17 6 24 6 C31 6 40.5 10 39.5 24 C36 17 30 14 23 15 C17 16 12 19 8.5 24Z" fill="${c}"/>`],
  // 5 おじいさん（横だけの髪とめがね・あとで顔の上に描く）
  (c) => ['', `<path d="M8.6 25 C8 20 9 16 11.5 14 C11 19 12 22 12.5 25Z M39.4 25 C40 20 39 16 36.5 14 C37 19 36 22 35.5 25Z" fill="${c}"/>`],
];

const GLASSES = `<g fill="none" stroke="${LINE}" stroke-width="1.6"><circle cx="18" cy="25" r="3.6"/><circle cx="30" cy="25" r="3.6"/><path d="M21.6 25 H26.4"/></g>`;

function face(mood) {
  const L = LINE;
  switch (mood) {
    case 'happy':
      return `<path d="M15.5 25.5 Q18 22.5 20.5 25.5 M27.5 25.5 Q30 22.5 32.5 25.5" fill="none" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M20.5 30 Q24 35 27.5 30Z" fill="#c8293a" stroke="${L}" stroke-width="1.4" stroke-linejoin="round"/>`;
    case 'eat':
      return `<circle cx="18" cy="25" r="1.7" fill="${L}"/><circle cx="30" cy="25" r="1.7" fill="${L}"/>
        <ellipse class="chew" cx="24" cy="31" rx="2.2" ry="1.6" fill="${L}"/>`;
    case 'wait':
      return `<circle cx="18" cy="25.5" r="1.7" fill="${L}"/><circle cx="30" cy="25.5" r="1.7" fill="${L}"/>
        <path d="M21.5 31 H26.5" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'angry':
      return `<path d="M15 21.5 L20.5 23.5 M33 21.5 L27.5 23.5" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="18" cy="26" r="1.7" fill="${L}"/><circle cx="30" cy="26" r="1.7" fill="${L}"/>
        <path d="M21 32 Q24 29.5 27 32" fill="none" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M38 13 C40 16 41 18 39.5 19.5 C38 20.5 36.5 19 37 17 Z" fill="#7fd3ff" stroke="${L}" stroke-width="1"/>`;
    default:
      return `<circle cx="18" cy="25" r="1.7" fill="${L}"/><circle cx="30" cy="25" r="1.7" fill="${L}"/>
        <path d="M21.5 30 Q24 32.5 26.5 30" fill="none" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
}

export const LOOK_COUNT = 12;

export function personSVG(look, mood = 'idle') {
  const style = look % STYLES.length;
  const round = Math.floor(look / STYLES.length);
  const hair = HAIR[(look * 5 + 1 + round * 2) % HAIR.length];
  const skin = SKIN[(look + round) % SKIN.length];
  const shirt = SHIRT[(look * 7 + 2 + round * 3) % SHIRT.length];
  // 帽子の色は服と別にする
  const cap = SHIRT[(look * 7 + 5 + round) % SHIRT.length];
  const [back, front] = STYLES[style](style === 5 ? '#d9d6e6' : hair, cap);
  const cheek = mood === 'angry' ? 0.9 : 0.55;
  return `<svg viewBox="0 0 48 54" class="person" aria-hidden="true">
    <g stroke="${LINE}" stroke-width="2" stroke-linejoin="round">
      <path d="M7 54 C7 44 13 39.5 24 39.5 C35 39.5 41 44 41 54Z" fill="${shirt}"/>
      ${back}
      <circle cx="24" cy="24" r="16" fill="${skin}"/>
      ${front}
    </g>
    <ellipse cx="13.5" cy="29.5" rx="3" ry="1.8" fill="#ff8a8a" opacity="${cheek}"/>
    <ellipse cx="34.5" cy="29.5" rx="3" ry="1.8" fill="#ff8a8a" opacity="${cheek}"/>
    ${face(mood)}
    ${style === 5 ? GLASSES : ''}
  </svg>`;
}
