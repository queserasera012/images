// 見本の結果（サーバーにつながなくても 画面を試せるように）。形は server/src/grade-schema.ts と同じ
const it = (no, question, expected, child_answer, verdict, mistake_type = null, note = null, confidence = "high") =>
  ({ no, question, expected, child_answer, verdict, mistake_type, note, confidence });

export const SAMPLES = {
  算数: {
    prompt_version: "見本",
    model: "opus",
    usage: { input_tokens: 2800, output_tokens: 650 },
    result: {
      subject: "算数", grade_guess: 2, page_title: "たし算の ひっ算（くり上がり）", teacher_marked: false,
      items: [
        it("(1)", "24 + 35", "59", "59", "正"),
        it("(2)", "37 + 48", "85", "75", "誤", "くり上がり", "一の位の くり上がりの1を 十の位に足していません"),
        it("(3)", "56 + 27", "83", "83", "正"),
        it("(4)", "68 + 19", "87", "87", "正", null, null, "medium"),
        it("(5)", "45 + 38", "83", "73", "誤", "くり上がり", "(2) と同じく くり上がりが抜けています"),
        it("(6)", "29 + 43", "72", "72", "正"),
        it("(7)", "18 + 64", "82", "82", "正"),
        it("(8)", "75 + 16", "91", "9?", "読めない", null, null, "low"),
        it("(9)", "33 + 47", "80", null, "空欄"),
        it("(10)", "52 - 17", "35", "35", "正"),
      ],
    },
  },
  漢字: {
    prompt_version: "見本",
    model: "opus",
    usage: { input_tokens: 2700, output_tokens: 520 },
    result: {
      subject: "漢字", grade_guess: 2, page_title: "かん字の 書きとり ⑫", teacher_marked: false,
      items: [
        it("①", "（がっこう）に 行く", "学校", "学校", "正"),
        it("②", "（あたら）しい 本", "新しい", "新らしい", "誤", "おくりがな", "おくりがなは「しい」だけです"),
        it("③", "（そら）を 見る", "空", "空", "正"),
        it("④", "（こえ）を 出す", "声", "声", "正", null, "とめ・はね を見てください", "low"),
        it("⑤", "（あさ）ごはん", "朝", "朝", "正"),
        it("⑥", "（かぞく）で 出かける", "家族", "家族", "正"),
        it("⑦", "（あいだ）に 入る", "間", "問", "誤", "形のにた字", "「間」の中は「日」です。「問」になっています"),
        it("⑧", "（はし）る", "走る", "走る", "正"),
      ],
    },
  },
};
