# Pet Expedition — web プレビュー

**`queserasera012/app-pet-expedition` を web に書き出したもの。** 手で編集しない。

- 見る: https://queserasera012.github.io/images/pet-expedition/
- 中身の正本: `app-pet-expedition`（private）

## 何のために置いてあるか

**iPhone も Android も持っていないので、実機で確かめる手段がこれしかない**（2026-09-06・D151）。
スマホのブラウザで開けば、**本物の画面サイズと本物の指で**並びと押しやすさを見られる。

⚠️ ネイティブアプリではない。スクロールの慣性・アニメ・タブバーの挙動は別物。
⚠️ 広告・課金・Firebase は動かない（ネイティブモジュールのため）。

## 更新のしかた

`app-pet-expedition` で書き出して、ここに上書きする。

```bash
PREVIEW_BASE_URL=/images/pet-expedition npm run export:web
cp -r dist-web/. ../images/pet-expedition/
```

⚠️ リポジトリのルートに **`.nojekyll` が要る**。無いと GitHub Pages が
`_expo/` を配信しない（`_` で始まるものを Jekyll が飛ばすため）。消さないこと。
