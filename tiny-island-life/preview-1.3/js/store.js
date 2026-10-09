// 広告なしでおまけ（買い切り・1.3・D309）。買った人は、リワード広告の3か所（日記の上乗せ・臨時の船・特別なエサ）で
// 広告を見ずに 同じおまけを受け取れる（ずっと）。1日の回数は変わらない（sim.js が数える）。Coin は売らない。
//
// - アプリ：課金の部品（native/iap.js・StoreKit）に 商品の ID を渡して頼む。値段は StoreKit の displayPrice。
//   商品が取れないあいだ（App Store Connect に まだ無い・つながらない）は 入口を出さない
// - ウェブ版：本物の購入はできない。?storemock のときだけ 仮の購入の画面を出す（プレビュー用）
// - 買ったかどうかは purchases.js に覚える（島をやり直しても消えない）。アプリは 起動のとき ストアと照合する

import { CONFIG } from './config.js';
import { inApp, askApp, NO_ADS, noAds } from './ads.js';
import { grant } from './purchases.js';

const mock = () => !inApp() && typeof location !== 'undefined' && new URLSearchParams(location.search).has('storemock');
const shop = { available: false, price: null };

// 起動のとき：値段を読み、持っているか照合する（機種変更・入れ直し）
export async function initStore() {
  if (mock()) {
    Object.assign(shop, { available: true, price: CONFIG.store.mockPrice });
    return;
  }
  if (!inApp()) return;
  const id = CONFIG.store.noAdsId;
  const res = await askApp('iap', { op: 'products', skus: [id] });
  const p = res?.products?.find((x) => x.id === id);
  Object.assign(shop, { available: !!(res?.available && p?.price), price: p?.price || null });
  const own = await askApp('iap', { op: 'owned' });
  if (own?.owned?.includes(id)) grant(NO_ADS);
}

// 入口を出すか（まだ買っていなくて、ストアに商品があるとき）
export const offerNoAds = () => !noAds() && shop.available;
// 「購入を復元」を出すか（ストアが使えるとき。買ったあとも出す：Guideline 3.1.1）
export const canRestore = () => shop.available || (inApp() && noAds());
export const noAdsPrice = () => shop.price;

export async function buyNoAds() {
  if (mock()) {
    grant(NO_ADS);
    return { ok: true, message: '広告なしで受け取れるようになりました' };
  }
  const res = await askApp('iap', { op: 'buy', sku: CONFIG.store.noAdsId });
  if (res?.ok && res.owned?.includes(CONFIG.store.noAdsId)) {
    grant(NO_ADS);
    return { ok: true, message: '広告なしで受け取れるようになりました' };
  }
  return { ok: false, message: res?.cancelled ? '' : '買えませんでした。お金はかかっていません' };
}

export async function restoreNoAds() {
  if (mock()) return { ok: noAds(), message: noAds() ? '購入を復元しました' : '復元できる購入はありません' };
  const res = await askApp('iap', { op: 'restore' });
  if (res?.owned?.includes(CONFIG.store.noAdsId)) {
    grant(NO_ADS);
    return { ok: true, message: '購入を復元しました' };
  }
  return { ok: false, message: res?.ok ? '復元できる購入はありません' : 'いまは復元できません' };
}

// 入口の小さなリンク（広告のボタンの下）
export const noAdsLink = () => (offerNoAds() ? `<button class="noads-link" type="button" data-noads>広告なしで受け取る（買い切り）</button>` : '');
export const restoreLink = () => (canRestore() ? `<div class="store-foot"><button class="restore-link" type="button" data-restore>購入を復元</button></div>` : '');

// 購入の画面（何が変わるか3行・値段・買う・購入を復元）。onDone：買えた・復元できたとき
export function openNoAdsSheet({ onDone, toast }) {
  const root = document.createElement('div');
  root.className = 'game ad-mock';
  root.innerHTML = `<div class="game-card" role="dialog" aria-label="広告なしでおまけ">
    <div class="game-head"><b>広告なしでおまけ</b><span class="game-left">買い切り</span><button class="game-x" type="button" aria-label="とじる">×</button></div>
    <ul class="noads-what">
      <li>日記の上乗せ・臨時の船・特別なエサを、広告を見ずに受け取れます</li>
      <li>1日に受け取れる回数は 変わりません</li>
      <li>一度買えば ずっと使えます（入れ直したときは「購入を復元」）</li>
    </ul>
    <p class="buy-price">${noAdsPrice() || ''}</p>
    ${mock() ? '<p class="noads-mock">ウェブ版では仮の画面です（お金はかかりません）</p>' : ''}
    <div class="game-buttons ad-buttons">
      <button class="ad-cancel" type="button">やめる</button>
      <button class="ad-done noads-buy" type="button">買う</button>
    </div>
    <div class="store-foot"><button class="restore-link" type="button" data-restore>購入を復元</button></div>
  </div>`;
  document.body.appendChild(root);
  let busy = false;
  const run = async (fn, btn) => {
    if (busy) return;
    busy = true;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';
    const res = await fn();
    busy = false;
    if (res.message) toast?.(res.message);
    if (res.ok) {
      root.remove();
      onDone?.();
      return;
    }
    if (btn.isConnected) {
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('.game-x, .ad-cancel')) return busy || root.remove();
    const b = ev.target.closest('.noads-buy');
    if (b) return run(buyNoAds, b);
    const r = ev.target.closest('[data-restore]');
    if (r) return run(restoreNoAds, r);
  });
}
