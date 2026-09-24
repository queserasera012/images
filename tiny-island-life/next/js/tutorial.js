// はじめの数分の「やること」（チュートリアル）。DOM には触らない（node のテストから呼べる）。
//
// 目的は2つ（D290）：
// 1. Coin が貯まるまで することが無くて離れる、を防ぐ（小さな「やること」と、ごほうびの Coin）
// 2. 操作（タップ・つくる・場所を選ぶ・日記）を1回ずつ体験してもらう
//
// 🔒 答えは教えない（v0.3 §43）。最後の雨の日も「どうする？」と聞くだけで、どれが正しいかは言わない。

export const STEPS = [
  {
    id: 'tap_resident',
    title: '住民に声をかけてみよう',
    body: '歩いている人をタップすると、名前と、いましていることが分かります',
    reward: 100,
  },
  {
    id: 'tap_cafe',
    title: 'カフェをのぞいてみよう',
    body: 'カフェをタップすると、座っている人と、外で待っている人が分かります',
    reward: 150,
  },
  {
    id: 'build_house',
    title: '家を1軒 建ててみよう',
    body: '「つくる」から家を選んで、建てる場所をタップします。島は指で動かせます。どこに建ててもかまいません',
    reward: 100,
  },
  {
    id: 'read_diary',
    title: '夜まで眺めてみよう',
    body: '1日が終わると、島の日記が届きます',
    reward: 100,
  },
  {
    // カフェに2人以上 並んだら始まる。しばらく様子を見てもらってから「どうする？」と聞く
    id: 'busy_cafe',
    title: 'カフェがいつもより混んでいます',
    body: '少し様子を見てみましょう',
    ask: 'どうする？',
    choices: [
      { id: 'cafe_upgrade', label: 'カフェを広げる' },
      { id: 'park_roof', label: '公園に東屋をつくる' },
      { id: 'nothing', label: '今回は何もしない' },
    ],
    reward: 0,
  },
];

export function tutorialOf(state) {
  if (!state.tutorial) state.tutorial = { step: 0, skipped: false };
  return state.tutorial;
}

export function currentStep(state) {
  const t = tutorialOf(state);
  if (t.skipped) return null;
  return STEPS[t.step] || null;
}

export const tutorialDone = (state) => currentStep(state) === null;

// 画面で何かが起きたら呼ぶ。いまの「やること」と一致したら進めて、ごほうびを渡す
export function report(state, trigger) {
  const step = currentStep(state);
  if (!step || step.id !== trigger) return null;
  const t = tutorialOf(state);
  t.step += 1;
  state.coin += step.reward;
  return { step, reward: step.reward, finished: tutorialDone(state) };
}

export function skipTutorial(state) {
  tutorialOf(state).skipped = true;
}

// 「混んでいる」の合図：どこかのカフェに2人以上 並んでいる
export function busyCafeNow(state) {
  return state.buildings.some((b) => b.type === 'cafe' && b.queue.length >= 2);
}
