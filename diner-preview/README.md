# まちかど食堂（試作 Phase 0）

お店経営シミュレーションの試作。スマホのブラウザで遊ぶ。
https://queserasera012.github.io/images/diner-preview/  （`?debug` で一時停止メニューに「すぐ閉店」「＋¥50,000」）

- 構想：https://claude.ai/artifact/Hm3xyA6QDiJi549f3z3nrE
- 決まったこと（2026-10-18）：最初は食堂／店が育つほど任せる／好きなときに何日でも遊べる／見た目はポップに
- ルールは `js/sim.js` だけ（DOM に触らない）。数字は `js/config.js`。画面は `js/main.js`
- テスト：`node --test test/*.test.mjs`
- 保存の名前：`diner.proto.v1`（ほかのプレビューと別）
- 確かめたいこと：3分の営業が楽しいか／日報を見て次の手を変えたくなるか
- 本番のリポジトリができたら、ここから移す
