// アプリ内課金（D314）。買ったものは島のセーブとは別に持つ（島をやり直しても消えない）。
//
// ウェブ版は本物の購入ができないので、「購入（仮）」の画面を出して、押したら買ったことにする。
// アプリにするときは buy の中身だけを課金の部品（RevenueCat など）に置き換える（呼ぶ側は変えない）。

const KEY = 'til.grid.purchases.v1';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && Array.isArray(v.owned) ? v : { owned: [], houseSkin: 'default' };
  } catch {
    return { owned: [], houseSkin: 'default' };
  }
}
function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 保存できなくても、その場では使える */
  }
}

export const owns = (id) => id === 'house:default' || read().owned.includes(id);
export const chosenHouseSkin = () => read().houseSkin || 'default';
export function chooseHouseSkin(id) {
  const v = read();
  v.houseSkin = id;
  write(v);
}

// アプリの1回目のビルドには課金の部品が入っていない（D317）。アプリの中では まだ買えない
export const canBuy = () => !(typeof window !== 'undefined' && window.__TIL_NATIVE);

export function buy({ id, title, price, onDone }) {
  const root = document.createElement('div');
  root.className = 'game ad-mock';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="購入">
    <div class="game-head"><b>購入</b><span class="game-left">ウェブ版では仮の画面です</span></div>
    <p class="buy-title">${title}</p>
    <p class="buy-price">${price}</p>
    <p class="game-msg">アプリでは、ここでストアの購入画面が出ます</p>
    <div class="game-buttons ad-buttons">
      <button class="ad-cancel" type="button">やめる</button>
      <button class="ad-done" type="button">購入する（仮）</button>
    </div>
  </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('.ad-cancel')) return root.remove();
    if (ev.target.closest('.ad-done')) {
      const v = read();
      if (!v.owned.includes(id)) v.owned.push(id);
      write(v);
      root.remove();
      onDone?.();
    }
  });
}
