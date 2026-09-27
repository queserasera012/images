// 画面をつけたままにする（D296）。このアプリは「ずっと眺めていたい」ので、開いているあいだはスリープさせない。
//
// ブラウザの Screen Wake Lock API を使う（iPhone は Safari 16.4 以降、Android は Chrome 84 以降）。
// アプリを閉じる・別のアプリに切り替えると、ブラウザが自動で解除する。戻ってきたら もう一度お願いする。
// 使えない端末では、何もしない（遊ぶのに困ることはない）。

let lock = null;
let status = 'off'; // 'on' | 'off' | 'unsupported'

export const awakeStatus = () => status;

export async function keepAwake() {
  if (!('wakeLock' in navigator)) {
    status = 'unsupported';
    return false;
  }
  if (lock) return true;
  try {
    lock = await navigator.wakeLock.request('screen');
    status = 'on';
    lock.addEventListener('release', () => {
      lock = null;
      status = 'off';
    });
    return true;
  } catch {
    // 画面が見えていない・電池残量が少ない などで断られることがある
    status = 'off';
    return false;
  }
}

export function setupKeepAwake() {
  keepAwake();
  // 一部のブラウザは「ユーザーが画面に触れたあと」でないと許可しないので、最初のタップでもう一度
  document.addEventListener('pointerdown', () => keepAwake(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) keepAwake();
  });
}
