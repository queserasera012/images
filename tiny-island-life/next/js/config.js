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
  houseCapacity: 3,
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
    max: 3,
  },

  // ---- 公園 ----
  park: {
    stayMin: 40,
    stayMax: 90,
    roofCost: 350,
  },

  // ---- 家 ----
  house: { cost: 450, max: 8 },

  // ---- 天気（Day 1 は晴れ・Day 2 は雨で固定。以後は抽選） ----
  weatherOdds: { sunny: 0.5, cloudy: 0.25, rain: 0.25 },
  // 行き先の選ばれやすさに掛ける倍率
  weatherWeights: {
    sunny: { cafe: 1.0, park: 1.3, stroll: 1.2, home: 0.8 },
    cloudy: { cafe: 1.1, park: 1.0, stroll: 1.0, home: 1.0 },
    rain: { cafe: 3.0, park: 0.12, stroll: 0.25, home: 1.4 },
  },
  rainParkWithRoof: 0.75,       // 東屋があるとき、雨の日の公園の倍率

  // ---- 人口が増える条件（1日の終わりに判定） ----
  growth: {
    minSatisfaction: 0.75,      // その日のカフェ客のうち、座れた人の割合
  },

  startCoin: 200,
};
