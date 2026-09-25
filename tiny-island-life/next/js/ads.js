// リワード広告（D309）。見たい人が見ると、おまけがもらえる。
//
// ウェブ版は本物の広告を出せないので、「ここに広告が流れます」という仮の画面を3秒出す（置き場所と量を試すため）。
// アプリにするときは、この showRewardedAd の中身だけを AdMob に置き換える（呼ぶ側は変えない）。

const WAIT_SEC = 3;

export function showRewardedAd({ onReward, onCancel }) {
  const root = document.createElement('div');
  root.className = 'game ad-mock';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="広告">
    <div class="game-head"><b>広告</b><span class="game-left">ウェブ版では仮の画面です</span></div>
    <div class="ad-screen"><span>ここに広告が流れます</span><b class="ad-count">${WAIT_SEC}</b></div>
    <p class="game-msg">見終わると、おまけがもらえます</p>
    <div class="game-buttons ad-buttons">
      <button class="ad-cancel" type="button">やめる</button>
      <button class="ad-done" type="button" disabled>おまけを受け取る</button>
    </div>
  </div>`;
  document.body.appendChild(root);
  let left = WAIT_SEC;
  const timer = setInterval(() => {
    left -= 1;
    root.querySelector('.ad-count').textContent = Math.max(0, left);
    if (left <= 0) {
      clearInterval(timer);
      root.querySelector('.ad-done').disabled = false;
      root.querySelector('.game-msg').textContent = '見終わりました';
    }
  }, 1000);
  const close = () => {
    clearInterval(timer);
    root.remove();
  };
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('.ad-cancel')) {
      close();
      onCancel?.();
      return;
    }
    if (ev.target.closest('.ad-done')) {
      close();
      onReward();
    }
  });
}
