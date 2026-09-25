// 調整する数字はすべてここに置く。ゲームロジックの中に直接 数字を書かない。

export const CONFIG = {
  // ---- 時間（現実の時間とは結びつけない。テストしながら決める・D281） ----
  // ゲームの1分＝ゲーム内時間の1分。t は「Day 1 の 05:00」を 0 とする通しの分。
  dayStartClock: 5 * 60,        // 1日の区切り（05:00。全員 寝ている時刻）
  startClock: 7 * 60 + 10,      // 新しいゲームは Day 1 の 07:10 から（開いた瞬間に人が歩いている・D290）
  daySecondsReal: 480,          // 06:00〜22:00（960分）を現実の何秒で流すか
  nightSpeed: 6,                // 夜（22:00〜06:00）は何倍速で流すか
  morningClock: 7 * 60,         // 留守から戻ったときは「翌朝 07:00」までしか進めない

  // ---- 島の住民 ----
  startResidents: 5,
  walkSpeed: 11,                // px / ゲーム内1分（1マス＝30px）
  distanceHalf: 8,              // 何マス離れると行きたさが半分になるか（遠いほど行かない・D289）
  patienceMin: 18,              // 列で待てる時間（ゲーム内の分）。住民ごとに幅を持たせる
  patienceMax: 34,

  // ---- カフェ ----
  cafe: {
    open: 6 * 60 + 30,
    close: 20 * 60,
    customerValue: 20,          // 1人の売上（Coin）
    stayMin: 25,
    stayMax: 45,
    maxQueue: 5,                // これ以上は並ばずに帰る
    rainLinger: 2.0,            // 雨の日は長居する（席が空きにくい）
    levels: [
      { level: 1, seats: 3, upkeep: 5 },
      { level: 2, seats: 5, upkeep: 20, cost: 600 },
      { level: 3, seats: 8, upkeep: 45, cost: 1500 },
    ],
    buildCost: 900,             // 2軒目のカフェ
    max: 3,                     // 本島で3軒。島を1か所広げるごとに perArea 軒ふえる（D305）
    perArea: 1,
    bar: { cost: 1000, upkeep: 15, close: 23 * 60, nightValue: 30 }, // カフェ&バー（D297）：夜23時まで。夜は1人30 Coin
    rainBoost: null,            // カフェの雨の倍率は weatherWeights.rain.cafe
  },

  // ---- コーヒースタンド（D305）：朝だけ開く1マスの店。持ち帰りなので座らず、すぐ回る ----
  // 朝の行列（起きてすぐの一杯が重なる）には効く。雨の日の長居（席が空かない）には効かない
  stand: {
    open: 6 * 60 + 30,
    close: 11 * 60,
    customerValue: 12,
    stayMin: 2,                 // 注文して受け取るまで
    stayMax: 4,
    maxQueue: 4,
    pull: 1.3,                  // 朝の一杯でカフェと比べるときの倍率（座らない分、気軽）
    levels: [{ level: 1, seats: 1, upkeep: 5 }],
    buildCost: 500,
    max: 3,
  },

  // ---- スーパー（D295）：住民が毎日1回 買い物に行く。夕方に集中する。中の様子は見えない ----
  super: {
    open: 10 * 60,
    close: 20 * 60,
    customerValue: 15,
    stayMin: 12,
    stayMax: 20,
    maxQueue: 5,
    rainLinger: 1,
    pull: 14,                   // 買い物に行きたい強さ（夕方は eveningBoost 倍）
    eveningBoost: 6,            // 16:00〜19:30。夫婦で一緒に行く分 昼にも散るので、昼は弱く夕方を強く（D305）
    levels: [
      { level: 1, seats: 4, upkeep: 15 },
      { level: 2, seats: 7, upkeep: 30, cost: 900 },
    ],
    buildCost: 800,
    max: 2,
  },

  // ---- プラネタリウム（D295）：長居する。雨の日と夜に人が集まる（屋内） ----
  planetarium: {
    open: 13 * 60,
    close: 22 * 60,
    customerValue: 25,
    stayMin: 60,
    stayMax: 90,
    maxQueue: 5,
    rainLinger: 1,
    rainBoost: 2.6,
    nightBoost: 2,              // 18:00 から
    levels: [
      { level: 1, seats: 6, upkeep: 30 },
      { level: 2, seats: 10, upkeep: 50, cost: 1600 },
    ],
    buildCost: 1400,
    max: 1,
  },

  // ---- スキー場（D318）：山の島だけ・冬だけ開く。橋をわたって人が集まる ----
  ski: {
    open: 9 * 60,
    close: 16 * 60,
    customerValue: 30,
    stayMin: 60,
    stayMax: 100,
    maxQueue: 6,
    rainLinger: 1,
    pull: 60,                   // 冬のあいだは強く呼ぶ（1週間しか開かない）
    farReach: 3,                // 遠くても行く：遠さが効くのは ふつうの店の 1/3
    rainPull: 0.5,              // 雪の日（天気は雨）は少し減る
    levels: [
      { level: 1, seats: 6, upkeep: 40 },
      { level: 2, seats: 10, upkeep: 60, cost: 2400 },
    ],
    buildCost: 3000,                // D320：2,600 → 3,000
    max: 1,
  },

  // ---- 会社（D319）：住民（大人）が朝 出勤して、お昼に近くのカフェへ行き、17時まで働く ----
  // 新しい困りごと：お昼のカフェが 会社の近くで混む（場所の問題が新しくなる）
  company: {
    go: 8 * 60 + 30,            // この時刻から出勤する
    lunch: 12 * 60,             // お昼休み（ここから30分のあいだに順に出てくる）
    close: 17 * 60,             // 仕事おわり
    pay: 20,                    // 1人1日あたり、島に入る Coin
    levels: [
      { level: 1, seats: 6, upkeep: 0 },
      { level: 2, seats: 10, upkeep: 0, cost: 2500 },
    ],
    buildCost: 4000,                // D320：3,000 → 4,000
    max: 2,
  },

  // ---- 水族館（D319）：観光客が長くいる。雨の日の行き先 ----
  aquarium: {
    open: 10 * 60,
    close: 18 * 60,
    customerValue: 30,
    stayMin: 50,
    stayMax: 90,
    maxQueue: 6,
    rainLinger: 1,
    touristPull: 50,            // 観光客の行きたさ（お土産屋より少し強い）
    rainBoost: 2.2,
    levels: [
      { level: 1, seats: 8, upkeep: 40 },
      { level: 2, seats: 12, upkeep: 60, cost: 2600 },
    ],
    buildCost: 3200,
    max: 1,
  },

  // ---- プール（D319）：夏だけ開く。晴れた日に人が集まり、公園が空く。子どもは親と来る ----
  pool: {
    open: 10 * 60,
    close: 17 * 60,
    customerValue: 20,
    stayMin: 40,
    stayMax: 80,
    maxQueue: 6,
    rainLinger: 1,
    pull: 34,
    weather: { sunny: 1, cloudy: 0.5, rain: 0.1 },
    levels: [
      { level: 1, seats: 8, upkeep: 30 },
      { level: 2, seats: 12, upkeep: 45, cost: 1800 },
    ],
    buildCost: 2200,
    max: 1,
  },

  // ---- 結婚・子ども（D297） ----
  family: {
    affinityNeed: 120,          // 同じ場所で一緒に過ごした時間（ゲーム内の分）がこれを超えると、結婚するかもしれない
    marryChance: 0.5,           // 1日の区切りで、いちばん仲のいい2人が結婚する確率
    minDay: 3,                  // 3日目から
    birthAfterDays: 2,          // 結婚して2日で赤ちゃん（家に空きがあれば）
    babyDays: 2,                // 赤ちゃんは2日で歩けるようになる
    maxKids: 2,                 // 1組あたり
    walkTogether: 0.35,         // 夫婦で出かける確率
    kidJoins: 0.6,              // 親が公園や散歩に行くとき、子どもがついていく確率
    kidNames: ['ハル', 'ユイ', 'レン', 'ミオ', 'ソウタ', 'ヒナ', 'リク', 'サクラ', 'カイ', 'ノア', 'アオイ', 'ツムギ'],
  },

  // ---- 幼稚園（D297）：子どもが朝 親と来て、15時に帰る ----
  kinder: {
    open: 7 * 60 + 45,
    dropUntil: 9 * 60,
    close: 15 * 60,
    fee: 20,                    // 1人1日
    levels: [
      { level: 1, seats: 4, upkeep: 20 },
      { level: 2, seats: 8, upkeep: 35, cost: 800 },
    ],
    buildCost: 900,
    max: 1,
  },

  // ---- 段階的な解放（D295）。住民の人数で順番にひらく。いつも「次の目標」が1つ見える ----
  // 解放の順（D320）：島民は1日1〜2人ふえる。目標の間が2〜5日になるように、後ろほど間をあける。
  // 値段とあわせて tools/econ-sim.mjs で確かめた（docs/UNLOCKS.md）
  unlocks: [
    { id: 'port', pop: 7, goal: '港をひらく', done: '港に船が来るようになりました', note: '港に船が来るようになります' },
    { id: 'pond', pop: 9, goal: '釣り堀をひらく', done: '釣り堀を建てられるようになりました', note: '釣り堀を建てられるようになります' },
    { id: 'super', pop: 12, goal: 'スーパーをひらく', done: 'スーパーを建てられるようになりました', note: 'スーパーを建てられるようになります' },
    { id: 'petshop', pets: 2, goal: 'ペットショップをひらく', done: 'ペットショップを建てられるようになりました', note: 'ペットショップを建てられるようになります' },
    { id: 'kinder', kids: 1, goal: '幼稚園をひらく', done: '幼稚園を建てられるようになりました', note: '幼稚園を建てられるようになります' },
    { id: 'planetarium', pop: 16, goal: 'プラネタリウムをひらく', done: 'プラネタリウムを建てられるようになりました', note: 'プラネタリウムを建てられるようになります' },
    { id: 'expand', pop: 21, goal: '島を広げる', done: '島を広げられるようになりました', note: '島を広げられるようになります' },
    { id: 'pool', pop: 26, goal: 'プールをひらく', done: 'プールを建てられるようになりました', note: '夏だけ開くプールを建てられるようになります' },
    { id: 'aquarium', pop: 32, goal: '水族館をひらく', done: '水族館を建てられるようになりました', note: '水族館を建てられるようになります' },
    { id: 'company', pop: 38, goal: '会社をひらく', done: '会社を建てられるようになりました', note: '住民が働きに行く会社を建てられるようになります' },
    { id: 'bridge', pop: 45, goal: '山の島に橋をかける', done: '山の島に橋をかけられるようになりました', note: '海の向こうの山の島に 橋をかけられるようになります' },
  ],

  // ---- 公園 ----
  park: {
    stayMin: 40,
    stayMax: 90,
    roofCost: 350,
  },

  // ---- 家 ----
  // 家。軒数の上限は無い。建てられるのは空いている土地の分だけ（D300）
  // 広げると住める人が増える（D303）。土地を使わずに人を増やせる代わりに、1人あたりは高くつく
  house: {
    cost: 450,
    levels: [
      { level: 1, capacity: 3 },
      { level: 2, capacity: 5, cost: 600 },  // 2階建て
      { level: 3, capacity: 8, cost: 1200 }, // アパート
    ],
  },

  // ---- 天気（Day 1 は晴れ・Day 2 は雨で固定。以後は抽選） ----
  weatherOdds: { sunny: 0.5, cloudy: 0.25, rain: 0.25 },
  // 行き先の選ばれやすさに掛ける倍率
  weatherWeights: {
    sunny: { cafe: 1.0, park: 1.3, stroll: 1.2, home: 0.8 },
    cloudy: { cafe: 1.1, park: 1.0, stroll: 1.0, home: 1.0 },
    rain: { cafe: 3.0, park: 0.12, stroll: 0.25, home: 1.4 },
  },
  rainParkWithRoof: 0.75,       // 東屋があるとき、雨の日の公園の倍率

  // ---- 港と観光客（D292） ----
  port: {
    unlockPopulation: 7,        // 住民がこの人数になった日から、船が来る
    boats: [10 * 60, 15 * 60],  // 船が着くおおよその時刻（毎日すこしずれる）
    stay: 150,                  // 港にいる時間（ゲーム内の分）
    sail: 20,                   // 来るとき・帰るときに海の上にいる時間
    tourists: { sunny: [3, 5], cloudy: [2, 4], rain: [1, 2] }, // 1便あたりの人数
    leaveBefore: 25,            // 出航の何分前に港へ戻りはじめるか
  },

  // ---- 釣り堀（D304）：住民が釣りに来る。プレイヤーも釣りができる（ミニゲーム） ----
  pond: {
    open: 6 * 60,
    close: 18 * 60,
    customerValue: 10,          // 住民の釣り代
    stayMin: 60,
    stayMax: 120,               // のんびり長くいる
    maxQueue: 2,
    pull: 24,                   // 行きたさ（晴れの日）。池に誰もいない時間が長いと寂しいので強め
    rainPull: 0.25,             // 雨の日は あまり来ない
    levels: [
      { level: 1, seats: 4, upkeep: 5 },
      { level: 2, seats: 6, upkeep: 10, cost: 600 },
    ],
    buildCost: 700,
    max: 1,
    // プレイヤーの釣り（ミニゲーム）。遊ぶのは何回でも、Coin が出るのは1日 rewardsPerDay 回まで（D303）
    game: {
      rewardsPerDay: 3,
      coin: { perfect: 50, good: 20, big: 80 }, // 大物は80（D309）
      // 魚。big は「ぴったり」のときだけ釣れる
      fish: [
        { id: 'funa', name: 'フナ', w: 5 },
        { id: 'kingyo', name: '金魚', w: 3 },
        { id: 'koi', name: 'コイ', w: 3 },
        { id: 'nijimasu', name: 'ニジマス', w: 2 },
        { id: 'namazu', name: 'ナマズ', w: 2, big: true },
        { id: 'ookoi', name: '大きなコイ', w: 1, big: true },
      ],
    },
  },

  // ---- 季節（D313）：島のテーマは買うものではなく、Day で自動で変わる ----
  seasons: {
    length: 7, // 1つの季節の日数
    order: [
      { id: 'sakura', name: '春' },
      { id: 'natsu', name: '夏' },
      { id: 'koyo', name: '秋' },
      { id: 'yuki', name: '冬' },
    ],
  },

  // ---- リワード広告（D309）：見たい人が見ると、島に見えるものが少し増える。困りごとは解かない ----
  ads: {
    bonus: { perDay: 1, rate: 0.3, cap: 300 }, // 朝の日記：昨日の売上に +30%（上限300）
    boat: { perDay: 3, from: 8 * 60, until: 16 * 60 }, // 臨時の観光船（観光客が帰りの船に間に合う時間だけ）
    bait: { perDay: 3 },                        // 釣りの特別なエサ：次に釣れる魚が大物になる
  },

  // ---- 島を広げる（D298） ----
  // 北の丘・東の岬・西の森。どこからでも ひらける。ひらくたびに高くなる
  expand: {
    costs: [2500, 3500, 5000],
    bridge: 10000, // 山の島に橋をかける（D318・D320 で 8,000 → 10,000）。となりの土地の値段の並びとは別
    mountainFoot: 5000, // 山の島を広げる（D321）。橋のあと
  },
  // 広げた土地の港。本島の港とは別の時刻に船が来る
  harbor: {
    cost: 1800,
    upkeep: 20,
    boats: [11 * 60 + 30, 16 * 60 + 30],
  },

  // ---- お土産屋（D294） ----
  shop: {
    cost: 700,
    max: 2,
    open: 9 * 60,
    close: 18 * 60,
    value: 30,                  // お土産1つの売上
    browseMin: 6,               // 店先で見ている時間（ゲーム内の分）
    browseMax: 14,
    levels: [
      { level: 1, stock: 4, upkeep: 10 },
      { level: 2, stock: 9, upkeep: 20, cost: 800 },
    ],
  },

  // ---- ペット（D293） ----
  // near＝迷い込んでくる場所／spots＝昼寝やひと休みに行く場所（D296 で うさぎ・キツネ・アライグマを追加）
  pets: {
    cat: { day: 1, clock: 13 * 60, name: 'ミケ', label: 'ねこ', speed: 0.55, near: 'cafe', spots: ['terrace', 'bench', 'roof', 'plaza'], nap: [60, 150] },
    dog: { day: 2, clock: 11 * 60, name: 'ポチ', label: 'いぬ', speed: 1.0, near: 'park' },
    rabbit: { day: 3, clock: 10 * 60, name: 'しろ', label: 'うさぎ', speed: 0.8, near: 'park', spots: ['lawn', 'garden', 'lawn'], nap: [30, 80] },
    fox: { day: 5, clock: 16 * 60, name: 'コン', label: 'キツネ', speed: 0.9, near: 'north', spots: ['north', 'north', 'bench'], nap: [50, 120] },
    raccoon: { day: 6, clock: 19 * 60, name: 'クー', label: 'アライグマ', speed: 0.7, near: 'cafe', spots: ['terrace', 'shopfront', 'plaza'], nap: [40, 100] },
  },

  // ---- ペットショップ（D296）：ペットのいる家の人だけ。2日に1回 ----
  petshop: {
    open: 9 * 60,
    close: 19 * 60,
    customerValue: 20,
    stayMin: 8,
    stayMax: 14,
    maxQueue: 3,
    rainLinger: 1,
    pull: 26,
    levels: [
      { level: 1, seats: 2, upkeep: 10 },
      { level: 2, seats: 4, upkeep: 20, cost: 700 },
    ],
    buildCost: 600,
    max: 1,
  },

  // ---- 人口が増える条件（1日の終わりに判定） ----
  growth: {
    minSatisfaction: 0.75,      // その日のカフェ客のうち、座れた人の割合
  },

  nightOwls: 0.3,               // 夜ふかしの住民の割合（寝るのが1時間半おそい・D297）
  startCoin: 200,
};
