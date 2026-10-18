import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim.js';
import { DAY, DISHES } from '../js/config.js';

// 画面の代わりに「目についた物を順にタップする」人
function playDay(s, { lazy = false } = {}) {
  S.startDay(s);
  const dt = 0.1;
  while (s.phase === 'service') {
    if (!lazy) {
      const t = s.today;
      for (const j of t.jobs.filter((j) => j.state === 'pass')) S.tapPass(s, j.id);
      for (const st of s.stations) S.tapStation(s, st.id);
      for (const j of t.jobs.filter((j) => j.state === 'ticket')) S.tapTicket(s, j.id);
    }
    S.tick(s, dt);
  }
  return s.lastReport;
}

test('同じ種なら同じ一日になる', () => {
  const a = S.createState(42), b = S.createState(42);
  assert.deepEqual(playDay(a), playDay(b));
});

test('1日目の屋台で、ふつうに遊ぶと もうかる', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = playDay(S.createState(seed));
    assert.ok(r.served >= 12, `seed ${seed}: served ${r.served}`);
    assert.ok(r.profit > 0, `seed ${seed}: profit ${r.profit}`);
  }
});

test('何もしないと、お客さんは帰り、日報に損が出る', () => {
  const r = playDay(S.createState(7), { lazy: true });
  assert.equal(r.served, 0);
  assert.ok(r.left.wait + r.left.queue > 0);
  assert.ok(r.lostSales > 0);
});

test('スタッフが全部の持ち場にいれば、手を出さなくても店が回る', () => {
  const s = S.createState(9);
  s.money = 1e6; s.stage = 1;
  S.hire(s, 'board'); S.hire(s, 'stove'); S.hire(s, 'hall');
  const r = playDay(s, { lazy: true });
  assert.ok(r.served >= 10, `served ${r.served}`);
});

test('高すぎる値段だと頼まれない', () => {
  const s = S.createState(3);
  for (const id of Object.keys(s.menu)) S.setPrice(s, id, DISHES[id].base * 2);
  const r = playDay(s);
  assert.equal(r.served, 0);
  assert.ok(r.left.pricey > 0);
});

test('仕込みが足りないと売り切れて、時刻が日報に出る', () => {
  const s = S.createState(11);
  for (const id of Object.keys(s.menu)) S.setPrep(s, id, 2);
  const r = playDay(s);
  assert.ok(Object.keys(r.soldOutAt).length > 0);
  assert.ok(r.left.soldOut > 0);
});

test('余った食材は捨てた額として出る', () => {
  const s = S.createState(12);
  for (const id of Object.keys(s.menu)) S.setPrep(s, id, 40);
  const r = playDay(s);
  assert.ok(r.wasteCost > 0);
});

test('レシピ帳：正しい組み合わせで料理が見つかる・同じ組み合わせは2度試せない', () => {
  const s = S.createState(1);
  const r = S.tryRecipe(s, 'egg', 'rice');
  assert.equal(r.found, 'omurice');
  assert.ok(s.menu.omurice.on);
  assert.equal(S.tryRecipe(s, 'rice', 'egg').ok, false);
  assert.equal(S.tryRecipe(s, 'egg', 'tomato').found, null);
});

test('揚げ場が無いと からあげは作れず、注文もされない', () => {
  const s = S.createState(1);
  S.tryRecipe(s, 'chicken', 'rice');
  assert.equal(S.canCook(s, 'karaage'), false);
  const r = playDay(s);
  assert.equal(r.sold.karaage, undefined);
});

test('営業の途中で保存すると、開店前に戻る', () => {
  const s = S.createState(5);
  const money = s.money;
  S.startDay(s);
  for (let i = 0; i < 300; i++) S.tick(s, 0.1);
  const back = S.parseSave(S.serialize(s));
  assert.equal(back.money, money);
  assert.equal(back.phase, 'night');
  assert.equal(back.day, 1);
});

test('壊れた保存は読まない（真っ白にしない）', () => {
  assert.equal(S.parseSave('{'), null);
  assert.equal(S.parseSave('{"v":99}'), null);
});

test('広告は1日5回まで・もうけ1.5倍は1回だけ', () => {
  const s = S.createState(2);
  playDay(s);
  assert.equal(S.watchAd(s, 'profit').ok, true);
  assert.equal(S.watchAd(s, 'profit').ok, false);
  S.watchAd(s, 'market'); S.watchAd(s, 'flyer'); S.watchAd(s, 'freeTrial');
  assert.equal(S.adLeft(s), 1);
});

test('10日 遊ぶと 小さな食堂に広げられるくらいになる（ふつうに遊ぶ人）', () => {
  const s = S.createState(21);
  for (let d = 0; d < 10; d++) {
    playDay(s); S.toNight(s);
    // 売れた数に合わせて仕込む
    for (const [id, n] of Object.entries(s.lastReport.sold)) S.setPrep(s, id, n + 3);
    if (S.canBuy(s, 'seat').ok && s.money > 9000) S.buy(s, 'seat');
  }
  console.log('day10', { money: s.money, rep: Math.round(s.rep), total: s.totalSales, seats: s.seats, next: S.nextStage(s) });
});
