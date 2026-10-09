// リワード広告（D309）。見たい人が見ると、おまけがもらえる。
//
// ウェブ版は本物の広告を出せないので、「ここに広告が流れます」という仮の画面を3秒出す（置き場所と量を試すため）。
// アプリにするときは、この showRewardedAd の中身だけを AdMob に置き換える（呼ぶ側は変えない）。

const WAIT_SEC = 3;

// アプリの中（WebView）で動いているとき：アプリ側に広告を頼み、答えを待つ（D317）
export const inApp = () => typeof window !== 'undefined' && !!window.__TIL_NATIVE && !!window.ReactNativeWebView;

// アプリで広告のボタンを出すか（D343）。AdMob の審査が通るまでは false で出す → 通ったら true にして EAS Update で届ける
// ウェブ版（next/）はいつも出す（仮の広告画面）
export const APP_ADS = true; // D458：AdMob の確認が済んで EAS Update で届ける（トラッキングなし・非パーソナライズ）。この枝は 届けるまで main・release/1.0 に入れない
export const adsOn = () => !inApp() || APP_ADS;
let nextId = 1;
const waiting = new Map();
if (typeof window !== 'undefined') {
  window.__tilNativeReply = (id, result) => {
    const done = waiting.get(id);
    waiting.delete(id);
    done?.(result);
  };
}
export function askApp(type, payload = {}) {
  return new Promise((resolve) => {
    const id = `m${nextId++}`;
    waiting.set(id, resolve);
    window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, ...payload }));
  });
}

// 広告を読み込んでいる・見ているあいだは 次を受け付けない（二度押しで 読み込みが2本 走らないように・A1）
let busy = false;
export const adBusy = () => busy;
export const AD_LOADING = '読み込んでいます…';
export const AD_FAILED = 'いまは広告を出せません';

// onReward：見終わった　onCancel：自分でやめた（ウェブ版の仮の画面）　onFail：出せなかった（アプリ。なければ onCancel）
// button：押したボタン。終わるまで「読み込んでいます…」にして 押せなくする
export function showRewardedAd({ onReward, onCancel, onFail, button }) {
  if (busy) return false;
  busy = true;
  const label = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = AD_LOADING;
  }
  const end = (fn) => {
    busy = false;
    if (button?.isConnected) {
      button.disabled = false;
      button.innerHTML = label;
    }
    fn?.();
  };
  if (inApp()) {
    // アプリは 見終わったら true、出せなかった・途中で閉じたら false を返す（D317）
    askApp('rewarded').then((ok) => end(ok ? onReward : onFail || onCancel));
    return true;
  }
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
      end(onCancel);
      return;
    }
    if (ev.target.closest('.ad-done')) {
      close();
      end(onReward);
    }
  });
  return true;
}
