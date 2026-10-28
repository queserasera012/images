// まるつけ（試し）の画面。描く・タップを渡す・保存するだけ。ルールは logic.js
import {
  GOAL, costYen, startReview, cycle, unresolved, stats, toNote, groupByType, makeSheet, fitSize,
} from "./logic.js";
import { SAMPLES } from "./sample.js";

// images の Pages は ほかのアプリと同じ置き場なので、名前をぶつけない
const KEY = "marutsuke.proto.v1";
const SUBJECTS = ["算数", "漢字", "おまかせ"];
const MODELS = { opus: "Opus（ていねい・1枚 約¥3〜4）", sonnet: "Sonnet（安い・1枚 約¥2）" };

const blank = () => ({
  settings: { url: "", token: "", kids: ["1人目"], model: "opus" },
  cur: { kid: "1人目", subject: "算数" },
  records: [],
  note: [],
});
let S = load();
let tab = "grade";
let review = null; // 丸付けの途中 { photo, resp, items, sample }
let busy = false;
let error = "";
let sheet = null;
let showAnswers = false;
let showDone = false;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.settings) return { ...blank(), ...s, settings: { ...blank().settings, ...s.settings } };
  } catch { /* 読めなければ はじめから */ }
  return blank();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 保存できない端末でも 動かす */ }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel) => document.querySelector(sel);
const view = $("#view");
const yen = (n) => `¥${n.toFixed(1)}`;
const pct = (r) => (r == null ? "—" : `${(r * 100).toFixed(1)}%`);
function todayJst() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3200);
}

// ---- 画面 ----------------------------------------------------------------

function render() {
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  view.innerHTML = { grade: gradeView, note: noteView, log: logView, settings: settingsView }[tab]();
  window.scrollTo(0, tab === "grade" && review ? window.scrollY : 0);
}

function chips(list, cur, attr) {
  return list.map((v) => `<button class="chip ${v === cur ? "on" : ""}" data-${attr}="${esc(v)}">${esc(v)}</button>`).join("");
}

function pickers() {
  return `<div class="card">
    <div class="row"><span class="label">だれの</span>${chips(S.settings.kids, S.cur.kid, "kid")}</div>
    <div class="row"><span class="label">教科</span>${chips(SUBJECTS, S.cur.subject, "subject")}</div>
  </div>`;
}

function gradeView() {
  if (busy) {
    return `<div class="loading"><div class="spin"></div><p><b>丸付けしています</b></p><p class="muted">20〜40秒ほど かかります</p></div>`;
  }
  if (review) return reviewView();
  const ready = S.settings.url && S.settings.token;
  return `${pickers()}
  ${error ? `<p class="notice">${esc(error)}</p>` : ""}
  ${ready ? "" : `<p class="notice">サーバーが まだです。「せってい」で 住所と合言葉を入れると、本物の丸付けができます。いまは 見本だけ 試せます。</p>`}
  <label class="shoot" ${ready ? "" : 'aria-disabled="true" style="opacity:.5"'}>
    <input id="file" type="file" accept="image/*" capture="environment" ${ready ? "" : "disabled"}>
    写真をとる
    <small>ドリル・プリント 1ページ。名前の欄は 写らなくて大丈夫</small>
  </label>
  <div class="card">
    <p class="muted">サーバーなしで 画面を見る</p>
    <div class="row"><button class="btn sub" data-sample="算数">見本：算数</button><button class="btn sub" data-sample="漢字">見本：漢字</button></div>
  </div>
  <p class="muted">写真は 丸付けのあと どこにも残りません（この端末にも サーバーにも）。残るのは ○✕ と まちがえた問題の文字だけです。</p>`;
}

function markText(v) {
  return v === "誤" ? "✕" : v === "空欄" ? "空欄" : v == null ? "？" : "";
}

function reviewView() {
  const { resp, items, photo, sample } = review;
  const r = resp.result;
  const left = unresolved(items);
  const wrong = items.filter((i) => i.final === "誤").length;
  const ok = items.filter((i) => i.final === "正").length;
  return `<div class="card">
    <div class="row" style="justify-content:space-between">
      <h2>${esc(r.page_title || `${r.subject}のページ`)}</h2>
      ${sample ? '<span class="badge look">見本</span>' : ""}
    </div>
    ${photo ? `<img class="photo" src="${photo}" alt="とった写真">` : ""}
    <div class="sum"><span>${items.length}問</span><span>○ ${ok}</span><span>✕ ${wrong}</span>${left ? `<span style="color:var(--warn)">？ ${left}</span>` : ""}</div>
    <p class="muted">AI の下書きです。<b>印を押すと 正 → 誤 → 空欄 と変わります</b>。黄色の行は AI が自信のない所です。</p>
    <div class="items">${items.map(itemRow).join("")}</div>
  </div>
  <div class="bar noprint">
    <button class="btn sub" data-act="cancel">やめる</button>
    <button class="btn" data-act="confirm" ${left ? "disabled" : ""}>${left ? `？を あと${left}問` : "確定する"}</button>
  </div>`;
}

function itemRow(it, i) {
  const look = it.confidence === "low" || it.ai === "読めない";
  const fixed = it.final !== it.ai && it.final != null;
  const showExp = it.final !== "正" || it.child_answer !== it.expected;
  return `<div class="item ${look && !fixed ? "look" : ""}">
    <button class="mark v-${it.final}" data-flip="${i}" aria-label="${esc(it.no)} の判定：${it.final ?? "未決"}">${markText(it.final)}</button>
    <div class="q">
      <div><span class="no">${esc(it.no)}</span><span class="text">${esc(it.question)}</span>
        ${look && !fixed ? '<span class="badge look">見てください</span>' : ""}${fixed ? '<span class="badge fixed">直した</span>' : ""}</div>
      <div class="ans">こたえ <b>${esc(it.child_answer ?? "（なし）")}</b>${showExp ? ` ／ 正しくは <b>${esc(it.expected)}</b>` : ""}</div>
      ${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}
    </div>
  </div>`;
}

function noteView() {
  if (sheet) return sheetView();
  const mine = S.note.filter((e) => e.child === S.cur.kid);
  const open = mine.filter((e) => !e.done);
  const list = showDone ? mine : open;
  const groups = groupByType(list);
  return `<div class="card"><div class="row"><span class="label">だれの</span>${chips(S.settings.kids, S.cur.kid, "kid")}</div></div>
  <div class="card">
    <div class="row" style="justify-content:space-between"><h2>まちがいノート</h2><span class="muted">のこり ${open.length}問</span></div>
    ${open.length ? `<button class="btn wide" data-act="sheet">やりなおしシートを作る</button>` : ""}
    <p class="muted">算数は 同じ くせ（くり上がり など）の にた問題、漢字は 同じ字を もう一度。シートを作っても AI 代は かかりません。</p>
  </div>
  ${groups.length ? groups.map(([k, es]) => `<div class="card group">
      <h3><span>${esc(k.split("｜")[1])}</span><span class="muted">${esc(k.split("｜")[0])}・${es.length}問</span></h3>
      ${es.map((e) => `<div class="entry"><div><div class="text">${esc(e.question)}</div>
        <div class="ans">${esc(e.date.slice(5))}　こたえ ${esc(e.child_answer ?? "なし")} → ${esc(e.expected)}</div></div>
        <button class="check ${e.done ? "on" : ""}" data-done="${esc(e.id)}">${e.done ? "できた" : "まだ"}</button></div>`).join("")}
    </div>`).join("") : `<p class="muted" style="text-align:center;padding:24px 0">まだ ありません。丸付けで ✕ にした問題が ここに たまります。</p>`}
  ${mine.length > open.length ? `<button class="btn sub" data-act="toggleDone">${showDone ? "できたものを かくす" : `できたものも 見る（${mine.length - open.length}）`}</button>` : ""}`;
}

function sheetView() {
  return `<div class="card sheet">
    <div class="row noprint" style="justify-content:space-between">
      <h2>やりなおしシート（${esc(S.cur.kid)}）</h2>
      <button class="btn sub" data-act="answers">${showAnswers ? "こたえを かくす" : "こたえを見る"}</button>
    </div>
    ${sheet.map((p, i) => `<div class="p"><span class="n">${i + 1}</span><div>${esc(p.question)}${p.subject === "算数" && !/[=＝]/.test(p.question) ? " =" : ""}
      ${showAnswers ? `<div class="a">${esc(p.answer)}</div>` : ""}</div></div>`).join("")}
  </div>
  <div class="bar noprint"><button class="btn sub" data-act="closeSheet">もどる</button><button class="btn" data-act="newSheet">べつの問題にする</button></div>`;
}

function logView() {
  const all = stats(S.records);
  const bySub = ["算数", "漢字"].map((s) => [s, stats(S.records, (r) => r.subject === s)]);
  const byModel = Object.keys(MODELS).map((m) => [m, stats(S.records, (r) => r.model === m)]).filter(([, s]) => s.total);
  const ok = all.rate != null && all.rate >= GOAL;
  return `<div class="card">
    <h2>AI と 親の判定が そろった割合</h2>
    <div class="big ${all.rate == null ? "" : ok ? "ok" : "ng"}">${pct(all.rate)}</div>
    <div class="meter" aria-hidden="true"><i style="width:${(all.rate ?? 0) * 100}%"></i><b style="left:${GOAL * 100}%"></b></div>
    <p class="muted">線が 合格の ${GOAL * 100}%。2週間で 20ページを めやすに。見本は 数えません。</p>
    <div class="grid2">
      <div class="stat"><div class="n">${all.pages}ページ</div><div class="l">${all.total}問</div></div>
      <div class="stat"><div class="n" style="color:var(--red)">${all.miss}問</div><div class="l">見落とし（AI は ○・本当は ✕）</div></div>
      <div class="stat"><div class="n">${all.falseAlarm}問</div><div class="l">言いすぎ（AI は ✕・本当は ○）</div></div>
      <div class="stat"><div class="n">${all.yenPerPage == null ? "—" : yen(all.yenPerPage)}</div><div class="l">1ページの AI 代（合計 ${yen(all.yen)}）</div></div>
    </div>
  </div>
  <div class="card">
    <h2>教科・モデルごと</h2>
    <table><tr><th></th><th>ページ</th><th>そろった</th><th>見落とし</th><th>1ページ</th></tr>
    ${[...bySub, ...byModel.map(([m, s]) => [m === "opus" ? "Opus" : "Sonnet", s])].map(([k, s]) =>
      `<tr><td>${esc(k)}</td><td>${s.pages}</td><td>${pct(s.rate)}</td><td>${s.miss}</td><td>${s.yenPerPage == null ? "—" : yen(s.yenPerPage)}</td></tr>`).join("")}
    </table>
  </div>
  <div class="card">
    <h2>これまでの丸付け</h2>
    ${S.records.length ? `<table><tr><th>日</th><th>だれ</th><th>教科</th><th>問</th><th>そろった</th></tr>
      ${S.records.slice().reverse().map((r) => { const s = stats([r]); return `<tr><td>${esc(r.date.slice(5))}</td><td>${esc(r.child)}</td><td>${esc(r.subject)}</td><td>${s.total}</td><td>${pct(s.rate)}</td></tr>`; }).join("")}
    </table>` : `<p class="muted">まだ ありません。</p>`}
    <button class="btn sub" data-act="export">記録を コピーする（秘書に渡す用）</button>
  </div>`;
}

function settingsView() {
  const s = S.settings;
  return `<div class="card">
    <h2>サーバー</h2>
    <div class="field"><label for="url">住所（プリすとと同じ）</label><input id="url" inputmode="url" autocomplete="off" placeholder="https://purisuto-server.〇〇.workers.dev" value="${esc(s.url)}"></div>
    <div class="field"><label for="token">合言葉</label><input id="token" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(s.token)}"></div>
    <button class="btn sub" data-act="health">つながるか 試す</button>
  </div>
  <div class="card">
    <h2>子ども</h2>
    <div class="field"><label for="kids">よび名（「、」で区切る。本名でなくてよい）</label><input id="kids" autocomplete="off" value="${esc(s.kids.join("、"))}"></div>
  </div>
  <div class="card">
    <h2>AI のモデル</h2>
    ${Object.entries(MODELS).map(([k, v]) => `<label class="row"><input type="radio" name="model" value="${k}" ${s.model === k ? "checked" : ""}> ${esc(v)}</label>`).join("")}
    <p class="muted">はじめは Opus で そろい具合を測り、95%を超えたら Sonnet でも 同じか 比べます。</p>
  </div>
  <button class="btn wide" data-act="saveSettings">保存する</button>
  <button class="btn sub" data-act="reset">記録を ぜんぶ消す</button>`;
}

// ---- 写真を送る ------------------------------------------------------------

async function shrink(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    img.src = url;
    await img.decode();
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const ERRORS = {
  unauthorized: "合言葉が ちがいます。「せってい」を見てください",
  too_large: "写真が 大きすぎます",
  bad_pages: "写真を 1枚 えらんでください",
  bad_media_type: "この写真の形式は 読めません",
  rate_limited: "混みあっています。少し待って もう一度",
  refused: "この写真は 丸付けできませんでした",
  parse_failed: "読み取りに失敗しました。もう一度 とってください",
  upstream: "AI につながりませんでした。少し待って もう一度",
  not_found: "サーバーが まだ 丸付けに対応していません（更新が要ります）",
};

async function send(file) {
  error = "";
  busy = true;
  render();
  try {
    const dataUrl = await shrink(file);
    const res = await fetch(S.settings.url.replace(/\/+$/, "") + "/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${S.settings.token}` },
      body: JSON.stringify({
        pages: [{ media_type: "image/jpeg", data: dataUrl.split(",")[1] }],
        subject: S.cur.subject,
        model: S.settings.model,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(ERRORS[body.error] ?? `うまくいきませんでした（${res.status}）`);
    if (!body.result.items.length) throw new Error("問題が 見つかりませんでした。ページ全体が 入るように とってください");
    review = { photo: dataUrl, resp: body, items: startReview(body.result), sample: false };
  } catch (e) {
    error = e instanceof TypeError ? "サーバーに つながりません。住所を見てください" : e.message;
  } finally {
    busy = false;
    render();
  }
}

function confirmReview() {
  const { resp, items, sample } = review;
  const subject = resp.result.subject === "その他" ? S.cur.subject : resp.result.subject;
  const record = {
    id: Date.now().toString(36),
    date: todayJst(),
    child: S.cur.kid,
    subject,
    model: resp.model,
    prompt_version: resp.prompt_version,
    yen: costYen(resp.usage, resp.model),
    usage: resp.usage,
    items: items.map(({ no, question, expected, child_answer, mistake_type, confidence, ai, final }) =>
      ({ no, question, expected, child_answer, mistake_type: final === "誤" ? (mistake_type ?? "その他") : null, confidence, ai, final })),
  };
  const note = toNote(record);
  const s = stats([record]);
  if (!sample) {
    S.records.push(record);
    S.note.push(...note);
    save();
  }
  review = null;
  render();
  toast(sample
    ? `見本なので 記録には 入れません（AI と同じ ${s.agree}/${s.total}問）`
    : `${s.total}問中 AI と同じ ${s.agree}問。✕ ${note.length}問を ノートに入れました`);
}

// ---- タップ ----------------------------------------------------------------

view.addEventListener("click", async (ev) => {
  const t = ev.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if (d.kid) { S.cur.kid = d.kid; save(); sheet = null; render(); return; }
  if (d.subject) { S.cur.subject = d.subject; save(); render(); return; }
  if (d.sample) {
    const resp = structuredClone(SAMPLES[d.sample]);
    review = { photo: null, resp, items: startReview(resp.result), sample: true };
    render(); return;
  }
  if (d.flip != null) {
    const it = review.items[Number(d.flip)];
    it.final = cycle(it.final);
    render(); return;
  }
  if (d.done) {
    const e = S.note.find((x) => x.id === d.done);
    if (e) { e.done = !e.done; save(); render(); }
    return;
  }
  switch (d.act) {
    case "cancel": review = null; render(); break;
    case "confirm": confirmReview(); break;
    case "sheet": case "newSheet": {
      const open = S.note.filter((e) => e.child === S.cur.kid && !e.done);
      sheet = makeSheet(open, Date.now() % 100000);
      showAnswers = false; render(); break;
    }
    case "closeSheet": sheet = null; render(); break;
    case "answers": showAnswers = !showAnswers; render(); break;
    case "toggleDone": showDone = !showDone; render(); break;
    case "saveSettings": {
      const kids = $("#kids").value.split(/[、,，\s]+/).map((k) => k.trim()).filter(Boolean);
      S.settings = {
        url: $("#url").value.trim(),
        token: $("#token").value.trim(),
        kids: kids.length ? kids : ["1人目"],
        model: document.querySelector('input[name="model"]:checked')?.value ?? "opus",
      };
      if (!S.settings.kids.includes(S.cur.kid)) S.cur.kid = S.settings.kids[0];
      save(); toast("保存しました"); break;
    }
    case "health": {
      const url = $("#url").value.trim().replace(/\/+$/, "");
      try {
        const r = await fetch(url + "/health").then((x) => x.json());
        toast(r.grade ? `つながりました（丸付け ${r.grade}）` : "つながりましたが、丸付けは まだです（サーバーの更新が要ります）");
      } catch { toast("つながりません。住所を見てください"); }
      break;
    }
    case "export": {
      const text = JSON.stringify({ records: S.records }, null, 1);
      try { await navigator.clipboard.writeText(text); toast("コピーしました。チャットに 貼ってください"); }
      catch { toast("コピーできませんでした"); }
      break;
    }
    case "reset":
      if (t.dataset.sure) { S = { ...blank(), settings: S.settings, cur: S.cur }; save(); toast("消しました"); render(); }
      else { t.dataset.sure = "1"; t.textContent = "もう一度 押すと 消えます"; }
      break;
  }
});

view.addEventListener("change", (ev) => {
  if (ev.target.id === "file" && ev.target.files[0]) send(ev.target.files[0]);
});

document.querySelector(".tabs").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  if (busy) return;
  tab = b.dataset.tab;
  sheet = null;
  render();
});

render();
