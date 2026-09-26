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
    bar: { cost: 1000, upkeep: 15, close: 23 * 60, nightValue: 30 }, // カフェをレストランに（D297 → D343：「バー」はやめた＝年齢区分）：夜23時まで。夜は1人30 Coin。コードの名前（bar）はセーブのため そのまま
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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
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
    // 育つ（D347）：赤ちゃん2 → 幼稚園5 → 小学生6 → 学生7 → 大人（生まれて20日）
    kinderDays: 5,
    pupilDays: 6,
    studentDays: 7,
    // 老いる・旅立つ（D349）：生まれて45日で老人（仕事をやめて のんびり）。60〜90日で旅立つ（人ごとに ばらす）
    elderAt: 45,
    lifeMin: 60,
    lifeMax: 90,
    // はじめからいる人・引っ越してくる人の年齢（20〜30日の大人。一度に老いない・旅立たないよう ばらす）
    arriveAgeMin: 20,
    arriveAgeMax: 30,
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
      { level: 3, seats: 12, upkeep: 50, cost: 1400 }, // D327：8人では足りなかった（5組×2人＝10人）
    ],
    buildCost: 900,
    max: 1,
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
  },

  // ---- 小学校・大学（D347）：小学生・学生が ひとりで通う。幼稚園と同じ考え（1人1日の授業料・席の数）----
  school: {
    open: 7 * 60 + 40,          // 家を出る時刻（ここから goUntil まで）
    goUntil: 8 * 60 + 30,
    start: 8 * 60,              // 授業（カードに出す）
    close: 15 * 60,
    minStay: 5 * 60,            // 遅く着いても 5時間は いる（遠いと着くのが昼すぎで、すぐ帰るように見えた・D348）
    fee: 20,
    levels: [
      { level: 1, seats: 6, upkeep: 25 },
      { level: 2, seats: 12, upkeep: 40, cost: 1200 },
      { level: 3, seats: 18, upkeep: 60, cost: 2000 },
    ],
    buildCost: 1500,
    max: 1,
    perArea: 1,
  },
  college: {
    open: 8 * 60 + 30,
    goUntil: 9 * 60 + 30,
    start: 9 * 60,
    close: 19 * 60,
    minStay: 6 * 60,
    fee: 30,
    levels: [
      { level: 1, seats: 8, upkeep: 40 },
      { level: 2, seats: 16, upkeep: 60, cost: 2200 },
      { level: 3, seats: 24, upkeep: 90, cost: 3500 },
    ],
    buildCost: 3000,
    max: 1,
    perArea: 1,
  },

  // ---- 病院（D349）：老人が ときどき通う（ほかの人も たまに）。屋内 ----
  hospital: {
    open: 9 * 60,
    close: 17 * 60,
    customerValue: 20,
    stayMin: 40,
    stayMax: 90,
    maxQueue: 6,
    rainLinger: 1,
    elderVisit: 0.35,           // 老人が その日に行く気になる確率
    levels: [
      { level: 1, seats: 6, upkeep: 30 },
      { level: 2, seats: 12, upkeep: 50, cost: 2400 },
    ],
    buildCost: 3500,
    max: 1,
    perArea: 1,
  },

  // ---- 段階的な解放（D295）。住民の人数で順番にひらく。いつも「次の目標」が1つ見える ----
  // 解放の順（D320）：島民は1日1〜2人ふえる。目標の間が2〜5日になるように、後ろほど間をあける。
  // 値段とあわせて tools/econ-sim.mjs で確かめた（docs/UNLOCKS.md）
  unlocks: [
    { id: 'port', pop: 7, goal: '港をひらく', done: '港に船が来るようになりました', note: '港に船が来るようになります' },
    { id: 'pond', pop: 9, goal: '釣り堀をひらく', done: '釣り堀を建てられるようになりました', note: '釣り堀を建てられるようになります' },
    { id: 'super', pop: 12, goal: 'スーパーをひらく', done: 'スーパーを建てられるようになりました', note: 'スーパーを建てられるようになります' },
    { id: 'petshop', pets: 2, goal: 'ペットショップをひらく', done: 'ペットショップを建てられるようになりました', note: 'ペットショップを建てられるようになります' },
    { id: 'track', pets: 3, goal: 'ドッグレース場をひらく', done: 'ドッグレース場を建てられるようになりました', note: '週に1回のドッグレース場を建てられるようになります' },
    { id: 'kinder', kids: 1, goal: '幼稚園をひらく', done: '幼稚園を建てられるようになりました', note: '幼稚園を建てられるようになります' },
    // 育つ（D347）：その段階になる子が出る1日前に ひらく。親から「大事なお願い」が届く（住民の人数のはしごには出さない）
    { id: 'school', stage: 'pupil', goal: '小学校をひらく', done: '小学校を建てられるようになりました', note: '小学校を建てられるようになります',
      wish: 'うちの子、もうすぐ小学生。近くに小学校があったらなあ' },
    { id: 'college', stage: 'student', goal: '大学をひらく', done: '大学を建てられるようになりました', note: '大学を建てられるようになります',
      wish: 'もうすぐ小学校を卒業。この島で大学に行きたいな', kid: true },
    { id: 'hospital', stage: 'elder', goal: '病院をひらく', done: '病院を建てられるようになりました', note: '病院を建てられるようになります',
      wish: '最近 体調が よくなくてね。島に病院があったら安心なんだけど', kid: true },
    { id: 'planetarium', pop: 16, goal: 'プラネタリウムをひらく', done: 'プラネタリウムを建てられるようになりました', note: 'プラネタリウムを建てられるようになります' },
    { id: 'arcade', pop: 19, goal: 'ゲームセンターをひらく', done: 'ゲームセンターを建てられるようになりました', note: 'あなたも遊べるゲームセンターを建てられるようになります' },
    { id: 'expand', pop: 21, goal: '島を広げる', done: '島を広げられるようになりました', note: '島を広げられるようになります' },
    { id: 'pool', pop: 26, goal: 'プールをひらく', done: 'プールを建てられるようになりました', note: '夏だけ開くプールを建てられるようになります' },
    { id: 'aquarium', pop: 32, goal: '水族館をひらく', done: '水族館を建てられるようになりました', note: '水族館を建てられるようになります' },
    { id: 'company', pop: 38, goal: '会社をひらく', done: '会社を建てられるようになりました', note: '住民が働きに行く会社を建てられるようになります' },
    { id: 'bridge', pop: 45, goal: '山の島に橋をかける', done: '山の島に橋をかけられるようになりました', note: '海の向こうの山の島に 橋をかけられるようになります' },
    { id: 'expand2', pop: 55, goal: '南西の浜をひらく', done: '本島の南西に 土地を広げられるようになりました', note: '本島の南西に 土地を広げられるようになります' },
    { id: 'expand4', pop: 62, goal: '北東の入り江をひらく', done: '本島の北東に 土地を広げられるようになりました', note: '本島の北東に 土地を広げられるようになります' },
    { id: 'expand3', pop: 70, goal: '北西の丘をひらく', done: '本島の北西に 土地を広げられるようになりました', note: '本島の北西に 土地を広げられるようになります' },
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
    cost: 350,                  // D324：450 → 350（序盤の Coin が貯まりにくかった。家が序盤の売上の半分を使っていた）
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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
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

  // ---- 飾り（D334）：Coin の使い道。維持費なし。住民と観光客が ぶらぶら歩きで立ち寄る
  // 同じ飾りは 1つ置くごとに値段が grow ずつ上がる（たくさん置くほど Coin が要る）。道に面していなくても置ける
  deco: {
    pop: 7, // 港がひらく人数から（はじめの Coin を飾りに使って、家が建てられなくならないように）
    grow: 0.25,
    near: 8, // ぶらぶら歩きで、道で8マス以内の飾りに寄る
    visit: 0.6, // 近くに飾りがあれば、ぶらぶら歩きの6割は飾りへ
    sit: [12, 28], // ベンチに すわっている分
    types: [
      { id: 'flowerbed', name: '花だん', cost: 150, note: '季節の花が咲く' },
      { id: 'bench', name: 'ベンチ', cost: 250, note: '住民が すわって ひと休みする' },
      { id: 'streetlamp', name: '街灯', cost: 300, note: '夜に明かりがつく' },
      { id: 'fountain', name: '噴水', cost: 2000, note: '観光客も見に来る。2×2マス' },
      { id: 'clocktower', name: '時計台', cost: 6000, note: '島の目じるし。遠くからも人が来る', pop: 45, far: 16 },
    ],
  },

  // ---- 島の人のお願い（D335）：住民が ときどき お願いする。かなえると お礼（Coin は島の大きさに合わせる・minigame.per）
  wishes: {
    pop: 9, // 住民9人から
    max: 1, // 小さなお願いは一度に1つまで（D347：2つだと何からやればよいか迷う）。⭐大事なお願い（施設をひらく）は別に数える
    chance: 0.7, // 朝、新しいお願いが来る確率
    days: 5, // 5日 かなえられなければ 取り下げ
    near: 3, // 「家の近く」は 3マス以内
    cafeSteps: 6, // 「会社の近く」は 道で6マス以内
    fountainPop: 20,
    coin: { deco: 60, fountain: 150, cafeNearWork: 150, fish: 80, prize: 80, upgrade: 100, facility: 150 },
  },

  // ---- ミニゲームの Coin（D333）：島の大きさに合わせる。住民 per 人ごとに1倍ずつ（1〜max 倍）
  // 固定の額だと、序盤は売上の +37%・後半は +3%（D332）。これで どの段階でも 1日の売上の 1割ほど
  minigame: { per: 15, max: 8 },

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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
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

  // ---- ゲームセンター（D331）：住民と観光客が遊びに来る（屋内・雨の日に増える）。あなたも4つのゲームで遊べる ----
  // 遊ぶのは無料。勝つと Coin（4つ合わせて1日 rewardsPerDay 回まで・釣りと同じ考え）。Coin を払って Coin を当てる形は作らない（賭け事をまねない）
  arcade: {
    open: 10 * 60,
    close: 22 * 60,
    customerValue: 15,
    stayMin: 30,
    stayMax: 60,
    maxQueue: 6,
    rainLinger: 1.3,
    rainBoost: 2,
    levels: [
      { level: 1, seats: 6, upkeep: 25 },
      { level: 2, seats: 10, upkeep: 40, cost: 1400 },
    ],
    buildCost: 1800,
    max: 1,
    game: {
      rewardsPerDay: 3,
      coin: 30, // 島が大きくなると ふえる（minigame.per）
      // Coin が出るのは「腕」が要るときだけ（D333）。クリアは今までどおり（楽しさのため）
      skill: {
        memory: 12, // 12手以内でそろえたら（全部おぼえている人で 9手・一番悪くて 11手）
        mole: 12, // 12ひき以上（15秒で16ぴきほど出る）。8ひきは「クリア」
      },
      stamps: 10, // じゃんけんは Coin をやめて スタンプ（勝つと1つ）。10こで 飾り券1まい
      // クレーンゲームの景品（Coin ではなく集める）
      prizes: [
        { id: 'bear', name: 'くまのぬいぐるみ', icon: '🧸' },
        { id: 'dog', name: 'いぬのぬいぐるみ', icon: '🐶' },
        { id: 'cat', name: 'ねこのぬいぐるみ', icon: '🐱' },
        { id: 'rabbit', name: 'うさぎのぬいぐるみ', icon: '🐰' },
        { id: 'penguin', name: 'ペンギンのぬいぐるみ', icon: '🐧' },
        { id: 'whale', name: 'くじらのぬいぐるみ', icon: '🐳' },
      ],
    },
  },

  // ---- ドッグレース場（D328）：週に1回（7日ごと）15:00 からレース。島のペットと、島の外から来る犬が走る。賭けは無し ----
  // 13:40 から住民と観光客が見に来る（入場料）。島のペットが3着までに入ると賞金
  track: {
    every: 7,                   // 7日ごと（Day 7・14・21…）
    open: 13 * 60 + 40,         // 観客が集まりはじめる（歩いて1時間かかる人もいるので、早めに声をかける）
    start: 15 * 60,
    length: 25,                 // レースの長さ（ゲームの分。現実の約12秒）
    close: 15 * 60 + 40,
    customerValue: 10,          // 入場料
    stayMin: 60,
    stayMax: 80,
    maxQueue: 8,
    rainLinger: 1,
    pull: 80,                   // レースの日は強く呼ぶ
    callChance: 0.6,            // 14:20 に 手のあいている人が見に行く割合
    lanes: 5,                   // 走るのは5匹（島のペットが足りない分は、島の外の犬）
    prizes: [300, 150, 80],     // 島のペットが1〜3着なら
    levels: [
      { level: 1, seats: 12, upkeep: 20 },
      { level: 2, seats: 20, upkeep: 30, cost: 1200 },
    ],
    buildCost: 1600,
    max: 1,
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
    perArea: 1,                 // D327：島を1か所ひらくごとに1軒ふえる
  },

  // ---- 人口が増える条件（1日の終わりに判定） ----
  growth: {
    minSatisfaction: 0.75,      // その日のカフェ客のうち、座れた人の割合
  },

  nightOwls: 0.3,               // 夜ふかしの住民の割合（寝るのが1時間半おそい・D297）
  startCoin: 400,              // D324：200 → 400
};
