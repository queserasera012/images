// 厨房の台の絵（SVG）。お客さんの絵（people.js）と同じ太い線・同じ色で描く。
// state: 'idle' | 'cook' | 'ready'。動きは style.css の .k-* のアニメーション

const L = '#2a2350';
const W = 'stroke="#2a2350" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';

function board(state) {
  const knifeUp = state === 'cook';
  return `
    <rect x="12" y="34" width="70" height="26" rx="7" fill="#e9a25f" ${W}/>
    <path d="M18 40 H74" stroke="#c97f3e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="74" cy="47" r="3" fill="#ffe2a8" ${W}/>
    ${state === 'cook' ? `
      <g class="k-pieces">
        <circle cx="30" cy="48" r="4.5" fill="#ff9f43" ${W}/><circle cx="40" cy="50" r="4.5" fill="#ff9f43" ${W}/>
        <path d="M50 44 Q56 40 60 47 Q54 52 50 44Z" fill="#2fd39e" ${W}/>
      </g>` : ''}
    <g class="${knifeUp ? 'k-chop' : ''}" style="transform-origin:88px 36px">
      <path d="M48 30 L84 30 L88 36 L48 36 Q44 33 48 30Z" fill="#e8ecf5" ${W}/>
      <rect x="84" y="28" width="12" height="9" rx="3" fill="#5a3a22" ${W} transform="rotate(0)"/>
    </g>`;
}

function stove(state) {
  const fire = state === 'cook';
  return `
    <rect x="8" y="40" width="84" height="26" rx="6" fill="#f4f1ff" ${W}/>
    <circle cx="24" cy="56" r="4" fill="#ff4f5e" ${W}/><circle cx="38" cy="56" r="4" fill="#ffd23f" ${W}/>
    <rect x="60" y="51" width="24" height="9" rx="3" fill="#2a2350"/>
    <ellipse cx="44" cy="40" rx="30" ry="5" fill="#8a8a96" ${W}/>
    ${fire ? `
      <g class="k-fire">
        <path d="M28 39 Q26 34 29 30 Q31 34 33 35 Q34 33 33 31 Q37 34 35 39Z" fill="#ff9f43" ${W}/>
        <path d="M40 39 Q38 33 42 28 Q44 33 46 34 Q47 31 46 29 Q51 33 49 39Z" fill="#ff4f5e" ${W}/>
        <path d="M53 39 Q51 34 54 30 Q56 34 57 35 Q59 33 58 31 Q62 34 60 39Z" fill="#ffd23f" ${W}/>
      </g>` : ''}
    <path d="M16 18 H72 Q72 30 61 30 H27 Q16 30 16 18Z" fill="#4a4870" ${W}/>
    <path d="M72 20 H93" stroke="#2a2350" stroke-width="5" stroke-linecap="round"/>
    ${fire ? `
      <g class="k-steam" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".9">
        <path d="M30 14 Q26 9 30 4"/><path d="M44 13 Q40 8 44 2"/><path d="M58 14 Q54 9 58 4"/>
      </g>` : ''}`;
}

function fryer(state) {
  const hot = state === 'cook';
  return `
    <rect x="16" y="32" width="68" height="34" rx="6" fill="#cfd6e6" ${W}/>
    <rect x="22" y="58" width="56" height="4" rx="2" fill="#9aa3b8"/>
    <ellipse cx="50" cy="34" rx="30" ry="6" fill="#ffcf4d" ${W}/>
    ${hot ? `
      <g class="k-bubbles" fill="#fff6c8" stroke="#2a2350" stroke-width="1.5">
        <circle cx="36" cy="34" r="2.5"/><circle cx="50" cy="33" r="3"/><circle cx="62" cy="35" r="2.2"/>
      </g>` : ''}
    <g transform="translate(0 ${hot ? 8 : 0})">
      <path d="M32 18 H62 V30 Q62 33 59 33 H35 Q32 33 32 30Z" fill="#e8ecf5" fill-opacity=".55" ${W}/>
      <path d="M40 18 V33 M47 18 V33 M54 18 V33 M32 25 H62" stroke="#5b5480" stroke-width="1.5"/>
      <path d="M62 20 L82 12" stroke="#2a2350" stroke-width="4" stroke-linecap="round"/>
      <path d="M78 13.5 L86 10.5" stroke="#5a3a22" stroke-width="6" stroke-linecap="round"/>
    </g>`;
}

const DRAW = { board, stove, fryer };

export function stationSVG(type, state = 'idle') {
  return `<svg viewBox="0 0 100 70" class="k-art" aria-hidden="true">${DRAW[type](state)}</svg>`;
}
