/* 合格720 / Pass 720 — 出題・模試・復習・進捗（localStorage）。画面の文は tr() を通す（英語は js/i18n-en.js） */
(function () {
  const B = window.BLUEPRINT, QS = window.QUESTIONS, QH = window.QUESTIONS_HARD || {}, QO = window.QUESTIONS_ORDER || {}, T = window.TEXT || {};
  const P = window.P720 || { lang: 'ja', exams: Object.keys(B), all: Object.keys(B) }, EN = P.lang === 'en', DICT = window.I18N_EN || {};
  const tr = (s, ...a) => { const t = EN && DICT[s] !== undefined ? DICT[s] : s; return a.length ? t.replace(/\{(\d)\}/g, (_, i) => a[+i]) : t; };
  const APP = tr('合格720'), SEP = EN ? ', ' : '・', LOCALE = EN ? 'en-US' : 'ja-JP';
  const CODES = { ccao: 'CCAO-F', ccdv: 'CCDV-F', ccarf: 'CCAR-F', ccarp: 'CCAR-P', ccdvp: 'CCDV-P' };
  const KEY = 'p720.v1';
  const $app = document.getElementById('app'), $title = document.getElementById('title'),
        $back = document.getElementById('back'), $timer = document.getElementById('timer');
  const PASS_PCT = 72; // 公式はスケールスコア 720/1000。素点との対応は非公開なので 72% を目安にする

  // ---------- 保存 ----------
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); s.stats = s.stats || {}; s.mocks = s.mocks || []; s.flags = s.flags || {}; s.read = s.read || {}; return s; }
    catch (e) { return { stats: {}, mocks: [], flags: {}, read: {} }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function stat(id) { return S.stats[id] || (S.stats[id] = { n: 0, ok: 0, streak: 0, last: 0, wrongLast: false }); }
  function record(id, ok) { const s = stat(id); s.n++; if (ok) { s.ok++; s.streak++; } else { s.streak = 0; } s.wrongLast = !ok; s.last = Date.now(); save(); }

  // ---------- 便利 ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const L = 'ABCDEFGH';
  function shuffle(a, rnd) { rnd = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function level() { return S.level === 'hard' ? 'hard' : 'std'; }
  function qsOf(ex, lv) { const src = (((lv || level()) === 'hard' ? QH : QS)[ex] || []).concat(QO[ex] || []); return src.map((q, i) => Object.assign({ exam: ex, id: q.id || (ex + '-' + i) }, q)); }
  // 並べ替え問題：q.t === 'order'。q.c は正しい順。答えは並べた順（添字の配列）が [0,1,2,...] と一致したら正解
  function isOrder(q) { return q.t === 'order'; }
  function orderOk(picked, q) { return picked.length === q.c.length && picked.every((ci, i) => ci === i); }
  function domainOf(ex, d) { return B[ex].domains.find(x => x.id === d); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  // ---------- 画面の土台 ----------
  let view = { name: 'home' }, timerId = null;
  function setTitle(t) { $title.textContent = t; document.title = t; }
  function go(v) { view = v; render(); window.scrollTo(0, 0); }
  $back.onclick = () => { if (view.onBack) view.onBack(); else if (view.name === 'exam' || !view.exam) go({ name: 'home' }); else go({ name: 'exam', exam: view.exam }); };
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; $timer.hidden = true; }

  function render() {
    stopTimer();
    $back.hidden = view.name === 'home';
    const r = { home, exam, drill, question, result, review, scope, mockSetup, history, text, textDomain }[view.name];
    $app.innerHTML = '';
    r(view);
  }

  // ---------- ホーム ----------
  function home() {
    setTitle(APP);
    document.body.removeAttribute('data-ex');
    const total = Object.keys(B).reduce((s, k) => s + qsOf(k).length, 0);
    const hard = level() === 'hard';
    const last = S.last && B[S.last] ? S.last : null;
    let h = '';
    if (last) {
      const qs = qsOf(last), wrong = qs.filter(q => stat(q.id).wrongLast).length, unseen = qs.filter(q => !stat(q.id).n).length;
      h += `<button class="resume" data-ex="${last}"><span>${tr('<b>{0}</b> のつづき', B[last].code)}<br><span class="small">${wrong ? tr('前回まちがえた {0} 問', wrong) : unseen ? tr('まだ解いていない {0} 問', unseen) : tr('ひととおり解いた')}</span></span><span class="go">${tr('ひらく')} ›</span></button>`;
    }
    h += `<div class="row" style="margin:0 0 10px"><div class="grow"><b>${tr('難易度')}</b><div class="muted">${hard ? tr('選択肢の長さがそろい、複数選択が多い') : tr('出題範囲をひととおり確かめる')}</div></div>
      <div class="seg"><button data-lv="std" aria-pressed="${!hard}">${tr('標準')}</button><button data-lv="hard" aria-pressed="${hard}">${tr('上級')}</button></div></div>
      <ul class="exams">`;
    const ui = document.documentElement.dataset.ui || 'a';
    for (const k of Object.keys(B)) {
      const b = B[k], qs = qsOf(k);
      const seen = qs.filter(q => stat(q.id).n).length;
      const mocks = S.mocks.filter(m => m.exam === k && (m.level || 'std') === level()), best = mocks.length ? Math.max(...mocks.map(m => m.pct)) : null;
      h += `<li><button class="exam" data-ex="${k}">
        <span class="code">${b.code}</span><span class="name">${b.ja}</span>
        <span class="meta">${tr('{0} 問・解いた {1}', qs.length, seen)}</span>
        <span class="pct">${best !== null ? best + '%<small>' + tr('模試の最高') + '</small>' : pct(seen, qs.length) + '%<small>' + tr('解いた') + '</small>'}</span>
        <span class="bar"><i style="width:${pct(seen, qs.length)}%"></i></span>
      </button></li>`;
    }
    for (const k of P.all.filter(x => !B[x])) h += `<li><div class="exam soon"><span class="code">${CODES[k]}</span><span class="name">${tr('準備中')}</span></div></li>`;
    h += `</ul>
      <p class="foot">${tr('全 {0} 問。記録は難易度ごとに別です。どの試験も 120 分、合格はスケールスコア 720/1000（このアプリでは正答率 {1}% を目安に表示）。CCAO-F・CCDV-F・CCAR-P は 12 月 7 日以降の受験から出題範囲が変わります。', total, PASS_PCT)}</p>
      <p class="foot">${tr('公式の試験ガイドの出題範囲に沿って作ったオリジナルの問題です。本番の問題は公開されていません。Anthropic とは関係のない非公式の学習アプリです。')}</p>
      <div class="row" style="margin:18px 0 10px"><div class="grow"><b>${tr('見た目')}</b><div class="muted">${ui === 'b' ? tr('黒板とチョーク') : ui === 'c' ? tr('本番の画面に近い、飾りなし') : tr('書き込んだ参考書')}</div></div>
      <div class="seg">${[['a', tr('参考書')], ['b', tr('黒板')], ['c', tr('試験会場')]].map(([k, t]) => `<button data-ui="${k}" aria-pressed="${k === ui}">${t}</button>`).join('')}</div></div>
      <div class="row" style="margin:0 0 10px"><div class="grow"><b>${tr('ことば')}</b><div class="muted">${tr('問題・テキストも切りかわる。記録はそのまま')}</div></div>
      <div class="seg">${[['ja', '日本語'], ['en', 'English']].map(([k, t]) => `<button data-lang="${k}" aria-pressed="${k === P.lang}">${t}</button>`).join('')}</div></div>
      <p class="foot"><a href="#" id="reset">${tr('保存した記録を消す')}</a></p>`;
    $app.innerHTML = h;
    $app.querySelectorAll('[data-ex]').forEach(el => el.onclick = () => go({ name: 'exam', exam: el.dataset.ex }));
    $app.querySelectorAll('button[data-lv]').forEach(el => el.onclick = () => { S.level = el.dataset.lv; save(); render(); });
    $app.querySelectorAll('button[data-ui]').forEach(el => el.onclick = () => { const k = el.dataset.ui; try { localStorage.setItem('p720.ui', k); } catch (e) {} if (k === 'a') delete document.documentElement.dataset.ui; else document.documentElement.dataset.ui = k; render(); });
    $app.querySelectorAll('button[data-lang]').forEach(el => el.onclick = () => { if (el.dataset.lang !== P.lang && P.setLang) P.setLang(el.dataset.lang); });
    $app.querySelector('#reset').onclick = e => { e.preventDefault(); if (confirm(tr('解答の記録と模試の履歴をぜんぶ消します。よいですか？'))) { S = { stats: {}, mocks: [], flags: {}, read: {} }; save(); render(); } };
  }

  // ---------- 試験ごとのホーム（読む・解く・模試・成績） ----------
  function guideLinks(ja, en, label) { const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`; return EN || !ja ? a(en, label + ' (PDF)') : a(ja, label + '（日本語 PDF）') + '　' + a(en, '英語 PDF'); }
  function exam(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    document.body.dataset.ex = v.exam;
    if (S.last !== v.exam) { S.last = v.exam; save(); }
    setTitle(b.code + (level() === 'hard' ? tr('・上級') : ''));
    if (!qs.length) { $app.innerHTML = '<div class="sheet">' + tr('上級の問題はまだ用意していません。ホームで「標準」に切り替えてください。') + '</div>'; return; }
    S.tab = S.tab || {}; const tab = v.tab || S.tab[v.exam] || 'read';
    const wrong = qs.filter(q => stat(q.id).wrongLast), unseen = qs.filter(q => !stat(q.id).n);
    const dstat = d => { const dq = qs.filter(q => q.d === d.id), seen = dq.filter(q => stat(q.id).n); const n = seen.reduce((s, q) => s + stat(q.id).n, 0), ok = seen.reduce((s, q) => s + stat(q.id).ok, 0); return { dq, n, ok, p: n ? pct(ok, n) : null }; };
    const unit = b.code === 'CCAR-F' ? tr('タスク') : tr('目標');
    const TABS = [['read', tr('読む')], ['solve', tr('解く')], ['mock', tr('模試')], ['stats', tr('成績')]];
    let h = `<div class="cover"><div class="code">${b.code}</div><div class="name">${b.ja}</div>
        <div class="facts">${tr('本番は {0} 問', b.items)}${b.scored ? tr('（採点 {0}）', b.scored) : ''}${tr('、{0} 分、{1}', b.minutes, b.fee)}${b.scenarios ? tr('。シナリオ 6 本中 4 本') : ''}</div></div>
      <div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${t}</button>`).join('')}</div>`;
    if (tab === 'read') {
      h += `<ul class="rows"><li><a class="rowbtn" href="pass/${P.lang}/${v.exam}.html"><span class="t">${tr('合格ノート')}</span><span class="s">${tr('配点と作戦、図解、判断表、直前チェック')}</span><span class="r chev"></span></a></li>
        ${T[v.exam] ? `<li><button class="rowbtn" id="text"><span class="t">${tr('はじめに・早見表')}</span><span class="s">${tr('選択肢の見分け方と用語のまとめ')}</span><span class="r chev"></span></button></li>` : ''}</ul>`;
      if (T[v.exam]) {
        h += `<h2 class="head">${tr('テキスト')}　${readCount(v.exam)} / ${objCount(v.exam)} ${unit}</h2><ul class="rows">`;
        for (const d of b.domains) { const r = readCount(v.exam, d.id), n = d.objectives.length;
          h += `<li><button class="rowbtn" data-td="${d.id}"><span class="t"><span class="w">${d.weight}%</span>${esc(d.name)}</span><span class="s">${tr('読んだ {0} / {1}', r, n)}</span><span class="r chev"></span><span class="bar"><i class="${r === n ? 'ok' : ''}" style="width:${pct(r, n)}%"></i></span></button></li>`; }
        h += '</ul>';
      }
      if (b.next) h += `<details class="change"><summary>${tr('{0} の受験から出題範囲が変わる', esc(b.next.from))}</summary>
        <p class="small">${tr('予約した受験日が {0} 以降なら新しいガイドの範囲、それより前なら今の範囲（このアプリの問題とテキスト）です。本番は {1}。', esc(b.next.from), esc(b.next.items))}</p>
        <p class="small">${esc(b.next.summary)}</p><ul>${b.next.domains.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
        ${b.guide.nextEn ? `<p class="small">${guideLinks(b.guide.nextJa, b.guide.nextEn, tr('新しいガイド'))}</p>` : ''}</details>`;
      h += `<p class="foot">${esc(b.who)}<br>${guideLinks(b.guide.ja, b.guide.en, tr('公式ガイド'))}</p>`;
    } else if (tab === 'solve') {
      h += `<button class="btn primary wide" id="drillAll">${tr('全ドメインから解く（{0} 問）', qs.length)}</button>
        <div class="row" style="margin:8px 0 4px"><button class="btn grow" id="drillWrong" ${wrong.length ? '' : 'disabled'}>${tr('前回まちがえた {0}', wrong.length)}</button><button class="btn grow" id="drillUnseen" ${unseen.length ? '' : 'disabled'}>${tr('まだ解いていない {0}', unseen.length)}</button></div>
        <h2 class="head">${tr('ドメインをえらんで解く')}</h2><ul class="rows">`;
      for (const d of b.domains) { const x = dstat(d);
        h += `<li><button class="rowbtn" data-dd="${d.id}"><span class="t"><span class="w">${d.weight}%</span>${esc(d.name)}</span><span class="s">${tr('{0} 問', x.dq.length)}</span><span class="r">${x.p === null ? '<small>' + tr('まだ') + '</small>' : x.p + '<small>%</small>'}</span></button></li>`; }
      h += `</ul><p class="note">${tr('1 問ずつ、答えるとすぐ解説が出ます。数字は そのドメインの正答率です。')}</p>`;
    } else if (tab === 'mock') {
      const ms = S.mocks.filter(m => m.exam === v.exam && (m.level || 'std') === level()).slice().reverse();
      h += `<div class="sheet"><h2>${tr('本番と同じ {0} 問・{1} 分', b.items, b.minutes)}</h2><p class="muted">${tr('ドメインの配分も本番どおり。終わるまで答えは見えません。')}</p>
        <button class="btn primary wide" id="mock">${tr('模試の準備へ')}</button></div>`;
      if (ms.length) { h += `<h2 class="head">${tr('これまでの模試')}</h2><ul class="rows">${ms.slice(0, 5).map(m => `<li><div class="rowbtn" style="cursor:default"><span class="t">${new Date(m.at).toLocaleString(LOCALE, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span class="s">${tr('{0} / {1} 問、{2} 分', m.ok, m.n, Math.floor(m.secs / 60))}</span><span class="r ${m.pct >= PASS_PCT ? '' : 'danger'}">${m.pct}<small>%</small></span></div></li>`).join('')}</ul>
        <button class="btn wide" id="hist">${tr('ドメインごとの推移を見る')}</button>`; }
      else h += `<p class="note">${tr('まだ模試を受けていません。合格の目安は正答率 {0}% です。', PASS_PCT)}</p>`;
    } else {
      h += `<ul class="rows">`;
      for (const d of b.domains) { const x = dstat(d);
        h += `<li><div class="rowbtn" style="cursor:default"><span class="t"><span class="w">${d.weight}%</span>${esc(d.name)}</span><span class="s">${x.n ? tr('{0} / {1} 回 正解', x.ok, x.n) : tr('まだ解いていない')}</span><span class="r ${x.p !== null && x.p < PASS_PCT ? 'danger' : ''}">${x.p === null ? '–' : x.p + '<small>%</small>'}</span><span class="bar"><i class="${x.p !== null && x.p >= PASS_PCT ? 'ok' : ''}" style="width:${x.p || 0}%"></i></span></div></li>`; }
      h += `</ul><button class="btn wide" id="scope">${tr('{0}ごとの成績を見る', unit)}</button><p class="note">${tr('左の数字は配点です。配点が大きく、正答率が {0}% に届いていないドメインから固めます。', PASS_PCT)}</p>`;
    }
    $app.innerHTML = h;
    const on = (sel, fn) => { const el = $app.querySelector(sel); if (el) el.onclick = fn; };
    const start = (list, label) => go({ name: 'drill', exam: v.exam, list: shuffle(list.slice()), label });
    $app.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => { S.tab[v.exam] = el.dataset.tab; save(); v.tab = el.dataset.tab; render(); });
    $app.querySelectorAll('[data-td]').forEach(el => el.onclick = () => go({ name: 'textDomain', exam: v.exam, d: +el.dataset.td }));
    $app.querySelectorAll('[data-dd]').forEach(el => el.onclick = () => { const d = +el.dataset.dd; start(qs.filter(q => q.d === d), domainOf(v.exam, d).name); });
    on('#text', () => go({ name: 'text', exam: v.exam }));
    on('#drillAll', () => start(qs, tr('全ドメイン')));
    on('#drillUnseen', () => start(unseen, tr('まだ解いていない')));
    on('#drillWrong', () => start(wrong, tr('前回まちがえた')));
    on('#mock', () => go({ name: 'mockSetup', exam: v.exam }));
    on('#scope', () => go({ name: 'scope', exam: v.exam }));
    on('#hist', () => go({ name: 'history', exam: v.exam }));
  }

  // ---------- 出題範囲 ----------
  function scope(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    setTitle(tr('成績') + ' ' + b.code);
    let h = '';
    if (b.scenarios) h += `<div class="sheet"><h2>${tr('本番のシナリオ（6 本中 4 本が出る）')}</h2><ol class="small">${b.scenarios.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
    for (const d of b.domains) {
      h += `<h2 class="head">${d.id}. ${esc(d.name)}　${d.weight}%</h2><ul class="rows">`;
      d.objectives.forEach((o, i) => {
        const oq = qs.filter(q => q.d === d.id && q.o === i);
        const n = oq.reduce((s, q) => s + stat(q.id).n, 0), ok = oq.reduce((s, q) => s + stat(q.id).ok, 0), p = n ? pct(ok, n) : null;
        h += `<li><button class="rowbtn" data-d="${d.id}" data-o="${i}" ${oq.length ? '' : 'disabled'}><span class="t" style="font-weight:500">${esc(o)}</span><span class="s">${tr('{0} 問を解く', oq.length)}</span><span class="r ${p !== null && p < PASS_PCT ? 'danger' : ''}">${p === null ? '–' : p + '<small>%</small>'}</span></button></li>`;
      });
      h += '</ul>';
    }
    $app.innerHTML = h;
    $app.querySelectorAll('button[data-d]').forEach(a => a.onclick = () => { const d = +a.dataset.d, o = +a.dataset.o; go({ name: 'drill', exam: v.exam, list: shuffle(qs.filter(q => q.d === d && q.o === o)), label: domainOf(v.exam, d).name }); });
  }

  // ---------- テキスト ----------
  function objCount(ex) { return B[ex].domains.reduce((s, d) => s + d.objectives.length, 0); }
  function readCount(ex, d) { return Object.keys(S.read).filter(k => k.startsWith(ex + '-' + (d ? d + '-' : ''))).length; }
  // 軽いマークダウン：段落 / "- " 箇条書き / "> " 試験の見方 / "### " 小見出し / **太字** / `code` / [文字](url)
  // 箇条書きは形で描き分ける：「**ことば**：説明」は ことばの表、「A → B」は 対応の表
  function md(src) {
    const inline = s => fmt(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const item = x => {
      let m = x.match(EN ? /^\*\*([^*]{1,44})\*\*:\s+(.+)$/ : /^\*\*([^*]{1,28})\*\*[：:]\s*(.+)$/);
      if (m) return `<li class="${m[2].replace(/[*`]/g, '').length > (EN ? 90 : 46) ? 'def2' : 'def'}"><b>${fmt(m[1])}</b><span>${inline(m[2])}</span></li>`;
      const parts = x.split(' → ');
      if (parts.length === 2 && !(parts[0].includes('`') && parts[0].length > 22 * K) && parts[0].replace(/[*`]/g, '').length <= 34 * K && parts[1].replace(/[*`]/g, '').length <= 70 * K) return `<li class="arrow"><span>${inline(parts[0])}</span><i>→</i><span>${inline(parts[1])}</span></li>`;
      return `<li>${inline(x)}</li>`;
    };
    const K = EN ? 1.9 : 1, out = []; let list = null, quote = null, course = false;
    const flush = () => { if (list) { out.push('<ul>' + list.map(item).join('') + '</ul>'); list = null; } if (quote) { out.push(`<div class="tip">${quote.map(inline).join('<br>')}</div>`); quote = null; } };
    const endCourse = () => { if (course) { flush(); out.push('</div>'); course = false; } };
    for (const raw of src.split('\n')) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (line.startsWith('- ')) { if (quote) flush(); (list = list || []).push(line.slice(2)); continue; }
      if (line.startsWith('> ')) { if (list) flush(); endCourse(); (quote = quote || []).push(line.slice(2)); continue; }
      if (line.startsWith('### ')) { flush(); endCourse(); let t = line.slice(4);
        if (t.startsWith('🎓')) { course = true; t = t.replace(/^🎓\s*/, ''); out.push(`<div class="course"><h4><span class="chip">${tr('要点')}</span>${inline(t)}</h4>`); }
        else out.push(`<h4>${inline(t)}</h4>`);
        continue; }
      flush(); out.push(`<p>${inline(line.replace(/^\*\*🎓\s*/, '**'))}</p>`);
    }
    flush(); endCourse(); return out.join('');
  }
  function text(v) {
    const b = B[v.exam], tx = T[v.exam];
    setTitle(tr('はじめに') + ' ' + b.code);
    v.onBack = () => go({ name: 'exam', exam: v.exam });
    let h = tx.intro ? `<div class="sheet text"><h3>${tr('この試験の見方')}</h3>${md(tx.intro)}</div>` : '';
    if (tx.appendix) h += `<div class="sheet text"><h3>${esc(tx.appendix.title)}</h3>${md(tx.appendix.body)}</div>`;
    $app.innerHTML = h;
  }
  function textDomain(v) {
    const b = B[v.exam], d = domainOf(v.exam, v.d), td = (T[v.exam].domains || {})[v.d] || {}, qs = qsOf(v.exam);
    setTitle(`${b.code} ${v.d}. ${d.name}`);
    v.onBack = () => v.back ? go(v.back) : go({ name: 'exam', exam: v.exam });
    const ids = b.domains.map(x => x.id), pos = ids.indexOf(v.d);
    let h = `<div class="cover"><div class="code">${d.weight}%</div><div class="name">${v.d}. ${esc(d.name)}</div><div class="facts">${EN ? '' : esc(d.en)}</div></div>${td.intro ? `<div class="text">${md(td.intro)}</div>` : ''}`;
    d.objectives.forEach((o, i) => {
      const key = `${v.exam}-${v.d}-${i}`, sec = (td.obj || [])[i], oq = qs.filter(q => q.d === v.d && q.o === i);
      const num = `${v.d}.${i + 1}`, title = o.startsWith(num + ' ') ? o.slice(num.length + 1) : o;
      const cut = title.indexOf(EN ? ' (' : '（'), t1 = cut > 0 ? title.slice(0, cut) : title, t2 = cut > 0 ? title.slice(cut + (EN ? 2 : 1)).replace(/[）)]$/, '') : '';
      h += `<div class="sheet text" id="o-${i}"><h3><span class="objno">${num}</span>${esc(t1)}${t2 ? `<small>${esc(t2)}</small>` : ''}</h3>${sec ? md(sec.body) : '<p class="muted">' + tr('（このテキストはまだ書いていません）') + '</p>'}
        ${sec && sec.docs && sec.docs.length ? `<div class="docs">${tr('公式ドキュメント：')}${sec.docs.map(x => `<a href="${x[1]}" target="_blank" rel="noopener">${esc(x[0])}</a>`).join('　')}</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn ${S.read[key] ? 'primary' : ''}" data-read="${key}">${S.read[key] ? tr('読んだ ○') : tr('読んだことにする')}</button>${oq.length ? `<button class="btn grow" data-o="${i}">${tr('{0} 問を解く', oq.length)}</button>` : ''}</div></div>`;
    });
    h += `<div class="row">${pos > 0 ? `<button class="btn grow" data-nav="${ids[pos - 1]}">‹ ${tr('前のドメイン')}</button>` : ''}${pos < ids.length - 1 ? `<button class="btn grow" data-nav="${ids[pos + 1]}">${tr('次のドメイン')} ›</button>` : ''}</div>`;
    $app.innerHTML = h;
    $app.querySelectorAll('button[data-read]').forEach(el => el.onclick = () => { const k = el.dataset.read; if (S.read[k]) delete S.read[k]; else S.read[k] = Date.now(); save(); el.className = 'btn ' + (S.read[k] ? 'primary' : ''); el.textContent = S.read[k] ? tr('読んだ ○') : tr('読んだことにする'); });
    $app.querySelectorAll('button[data-o]').forEach(el => el.onclick = () => { const o = +el.dataset.o; go({ name: 'drill', exam: v.exam, list: shuffle(qs.filter(q => q.d === v.d && q.o === o)), label: d.name }); });
    $app.querySelectorAll('button[data-nav]').forEach(el => el.onclick = () => go({ name: 'textDomain', exam: v.exam, d: +el.dataset.nav }));
    if (v.o !== undefined) { const el = document.getElementById('o-' + v.o); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0); }
  }

  // ---------- ドリル ----------
  function drill(v) {
    if (!v.list.length) { $app.innerHTML = '<div class="sheet">' + tr('この条件の問題はありません。') + '</div>'; return; }
    v.i = v.i || 0; v.answers = v.answers || [];
    go({ name: 'question', exam: v.exam, mode: 'drill', list: v.list, i: 0, label: v.label, answers: [] });
  }

  // ---------- 模試の設定 ----------
  function mockSetup(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    setTitle(tr('模試') + ' ' + b.code);
    $app.innerHTML = `<div class="sheet"><h2>${tr('{0} 問・{1} 分', b.items, b.minutes)}</h2>
      <p>${tr('公式の配点どおりにドメインから出します。途中で閉じると記録は残りません。')}</p>
      <label class="opt"><input type="checkbox" id="prefUnseen" checked> ${tr('まだ解いていない問題を優先する')}</label>
      <label class="opt"><input type="checkbox" id="timed" checked> ${tr('時間を計る（残り時間を上に出す）')}</label>
      <p class="note">${tr('問題が足りないドメインは、あるだけ出します（本番の配分より少なくなる）。')}</p>
      <button class="btn primary wide" id="go">${tr('模試をはじめる')}</button></div>`;
    $app.querySelector('#go').onclick = () => {
      const prefUnseen = $app.querySelector('#prefUnseen').checked, timed = $app.querySelector('#timed').checked;
      // ドメインごとの出題数（最大剰余法）
      const want = b.domains.map(d => ({ d, f: b.items * d.weight / 100 }));
      let n = want.map(w => ({ d: w.d, n: Math.floor(w.f), r: w.f - Math.floor(w.f) }));
      let rest = b.items - n.reduce((s, x) => s + x.n, 0);
      n.sort((a, b2) => b2.r - a.r); for (let i = 0; i < rest; i++) n[i % n.length].n++;
      let list = [];
      for (const x of n) {
        let pool = qs.filter(q => q.d === x.d.id);
        if (prefUnseen) pool = shuffle(pool.filter(q => !stat(q.id).n)).concat(shuffle(pool.filter(q => stat(q.id).n)));
        else pool = shuffle(pool);
        list = list.concat(pool.slice(0, x.n));
      }
      shuffle(list);
      go({ name: 'question', exam: v.exam, mode: 'mock', list, i: 0, answers: [], start: Date.now(), limit: timed ? b.minutes * 60 : 0 });
    };
  }

  // ---------- 問題 ----------
  function question(v) {
    const q = v.list[v.i], b = B[v.exam], d = domainOf(v.exam, q.d);
    const isMock = v.mode === 'mock';
    setTitle((isMock ? tr('模試') : tr('ドリル')) + ' ' + b.code);
    v.onBack = () => { if (!isMock || v.answers.filter(a => a).length === 0 || confirm(tr('模試をやめますか？ 結果は残りません。'))) go({ name: 'exam', exam: v.exam }); };
    // 選択肢の並びは問題ごとに固定でシャッフル（id を種に）
    const order = q.order || (q.order = shuffle(q.c.map((_, i) => i), seeded(q.id)));
    const ord = isOrder(q), multi = !ord && q.a.length > 1;
    let picked = ord ? (v.answers[v.i] ? v.answers[v.i].picked.slice() : []) : new Set(v.answers[v.i] ? v.answers[v.i].picked : []);
    let answered = !!(v.answers[v.i] && v.answers[v.i].done);
    const grade = () => ord ? orderOk(picked, q) : sameSet(picked, new Set(q.a));

    const head = () => `<div class="qbar"><i style="width:${pct(v.i + (answered ? 1 : 0), v.list.length)}%"></i></div>
        <div class="prog"><span><b>${v.i + 1}</b> / ${v.list.length}${isMock ? '' : v.label && v.label !== d.name ? '　' + esc(v.label) : ''}</span><span class="dom">${esc(d.name)}${q.s ? tr('（シナリオ {0}）', q.s) : ''}</span></div>`;
    const links = () => `${q.ref ? `\n<a href="${q.ref}" target="_blank" rel="noopener">${tr('参考の公式ドキュメント')}</a>` : ''}${T[v.exam] ? `\n<a href="#" id="totext">${b.code === 'CCAR-F' ? tr('このタスクのテキストを読む') : tr('この目標のテキストを読む')}</a>` : ''}`;
    const verdict = (ok, right) => `<div class="verdict"><span class="mark ${ok ? 'maru' : ''}">${ok ? '' : '×'}</span><span>${ok ? tr('正解') : tr('まちがい')}<br><small>${right}</small></span></div>`;
    const actions = (ready, extra) => `<div class="actions">
          ${v.i > 0 && isMock ? '<button class="btn" id="prev">' + tr('前へ') + '</button>' : ''}${!answered && extra ? extra : ''}
          ${!answered ? `<button class="btn primary grow" id="ans" ${ready ? '' : 'disabled'}>${isMock ? tr('この答えで決める') : tr('答え合わせ')}</button>` : `<button class="btn primary grow" id="next">${v.i + 1 < v.list.length ? tr('次の問題へ') : (isMock ? tr('採点する') : tr('結果を見る'))}</button>`}
        </div>`;
    function draw() {
      const ok = answered && grade();
      if (ord) { drawOrder(ok); return; }
      $app.innerHTML = `${head()}
        <div class="q">${fmt(q.q)}</div>
        <p class="how" data-pick="${q.a.length}">${multi ? tr('<b>{0} つ</b>選ぶ', q.a.length) : tr('1 つ選ぶ')}</p>
        <ul class="choices">${order.map((ci, k) => {
          let cls = 'choice'; if (answered) { cls += ' answered'; if (!isMock) { if (q.a.includes(ci)) cls += ' right'; else if (picked.has(ci)) cls += ' wrong'; } else if (picked.has(ci)) cls += ' sel'; } else if (picked.has(ci)) cls += ' sel';
          return `<li class="${cls}" data-c="${ci}"><span class="k">${L[k]}</span><span>${fmt(q.c[ci])}</span></li>`; }).join('')}</ul>
        ${answered && !isMock ? `${verdict(ok, tr('正解は {0}', q.a.map(ci => L[order.indexOf(ci)]).sort().join(SEP)))}<div class="ex">${fmt(q.e)}${links()}</div>` : ''}
        ${actions(picked.size)}`;
      $app.querySelectorAll('.choice').forEach(el => el.onclick = () => {
        if (answered) return; const ci = +el.dataset.c;
        if (multi) { if (picked.has(ci)) picked.delete(ci); else if (picked.size < q.a.length) picked.add(ci); else { picked.delete([...picked][0]); picked.add(ci); } }
        else picked = new Set([ci]);
        draw();
      });
      wireCommon();
    }
    function wireCommon() {
      const ans = $app.querySelector('#ans'); if (ans) ans.onclick = () => {
        answered = true; const okNow = grade();
        v.answers[v.i] = { picked: [...picked], done: true, ok: okNow };
        if (!isMock) record(q.id, okNow);
        draw();
        if (!isMock) { const vd = $app.querySelector('.verdict'); if (vd) vd.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
      };
      const nx = $app.querySelector('#next'); if (nx) nx.onclick = () => { if (v.i + 1 < v.list.length) { v.i++; render(); window.scrollTo(0, 0); } else finish(); };
      const tt = $app.querySelector('#totext'); if (tt) tt.onclick = e => { e.preventDefault(); go({ name: 'textDomain', exam: v.exam, d: q.d, o: q.o, back: v }); };
      const pv = $app.querySelector('#prev'); if (pv) pv.onclick = () => { v.i--; render(); window.scrollTo(0, 0); };
      const rs = $app.querySelector('#reset'); if (rs) rs.onclick = () => { picked = []; draw(); };
    }
    // 並べ替え：押した順に 1,2,3… の番号が付く。番号の付いた項目を押すと外れる
    function drawOrder(ok) {
      const n = q.c.length;
      $app.innerHTML = `${head()}
        <div class="q">${fmt(q.q)}</div>
        <p class="how" data-pick="${n}">${tr('<b>正しい順</b>に 1 つずつ押す（{0} 項目。もう一度押すと外れる）', n)}</p>
        <ul class="choices">${order.map(ci => {
          const pos = picked.indexOf(ci);
          let cls = 'choice', badge = pos >= 0 ? String(pos + 1) : '';
          if (answered && !isMock) { cls += ' answered'; cls += pos === ci ? ' right' : ' wrong'; badge = `${pos >= 0 ? pos + 1 : '–'}→${ci + 1}`; } else { if (answered) cls += ' answered'; if (pos >= 0) cls += ' sel'; }
          return `<li class="${cls}" data-c="${ci}"><span class="k${answered && !isMock ? ' k2' : ''}">${badge}</span><span>${fmt(q.c[ci])}</span></li>`; }).join('')}</ul>
        ${answered && !isMock ? `${verdict(ok, tr('番号は「自分の順→正しい順」'))}<div class="ex">${q.c.map((s, i) => `${i + 1}. ${fmt(s)}`).join('\n')}\n\n${fmt(q.e)}${links()}</div>` : ''}
        ${actions(picked.length === n, `<button class="btn" id="reset" ${picked.length ? '' : 'disabled'}>${tr('やり直す')}</button>`)}`;
      $app.querySelectorAll('.choice').forEach(el => el.onclick = () => {
        if (answered) return; const ci = +el.dataset.c, pos = picked.indexOf(ci);
        if (pos >= 0) picked.splice(pos, 1); else if (picked.length < n) picked.push(ci);
        draw();
      });
      wireCommon();
    }
    function finish() {
      stopTimer();
      if (isMock) { v.list.forEach((qq, i) => { const a = v.answers[i]; record(qq.id, !!(a && a.ok)); }); }
      go({ name: 'result', exam: v.exam, mode: v.mode, list: v.list, answers: v.answers, start: v.start });
    }
    draw();
    if (isMock && v.limit) {
      $timer.hidden = false;
      const tick = () => { const left = v.limit - Math.floor((Date.now() - v.start) / 1000); if (left <= 0) { alert(tr('時間です。採点します。')); finish(); return; } $timer.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; $timer.classList.toggle('low', left < 600); };
      tick(); timerId = setInterval(tick, 1000);
    }
  }
  function sameSet(a, b) { if (a.size !== b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }
  function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- 結果 ----------
  function result(v) {
    const b = B[v.exam];
    setTitle(tr('結果') + ' ' + b.code);
    v.onBack = () => go({ name: 'exam', exam: v.exam });
    const n = v.list.length, ok = v.answers.filter(a => a && a.ok).length, p = pct(ok, n);
    const by = b.domains.map(d => { const idx = v.list.map((q, i) => q.d === d.id ? i : -1).filter(i => i >= 0); const o = idx.filter(i => v.answers[i] && v.answers[i].ok).length; return { d, n: idx.length, ok: o }; });
    if (v.mode === 'mock' && !v.saved) { v.saved = true; S.mocks.push({ exam: v.exam, level: level(), at: Date.now(), n, ok, pct: p, by: by.map(x => [x.d.id, x.n, x.ok]), secs: v.start ? Math.round((Date.now() - v.start) / 1000) : 0 }); save(); }
    const wrongs = v.list.map((q, i) => ({ q, i })).filter(x => !(v.answers[x.i] && v.answers[x.i].ok));
    const pass = p >= PASS_PCT, mock = v.mode === 'mock';
    $app.innerHTML = `<div class="paper"><div class="score">${p}<small>%</small></div>
      <div class="judge ${pass && mock ? 'pass' : ''}">${mock ? (pass ? tr('合格の目安を超えた') : tr('目安の {0}% まで あと {1} ポイント', PASS_PCT, PASS_PCT - p)) : tr('{0} 問中 {1} 問 正解', n, ok)}</div>
      <div class="muted">${mock ? tr('{0} 問中 {1} 問 正解', n, ok) + tr('。公式の合格点は 720/1000 で、正答率との対応は公開されていません。') : ''}</div></div>
      <h2 class="head">${tr('ドメインごと')}</h2><ul class="rows">${by.filter(x => x.n).map(x => { const dp = pct(x.ok, x.n); return `<li><div class="rowbtn" style="cursor:default"><span class="t"><span class="w">${x.d.weight}%</span>${esc(x.d.name)}</span><span class="s">${x.ok} / ${x.n}</span><span class="r ${dp < PASS_PCT ? 'danger' : ''}">${dp}<small>%</small></span><span class="bar"><i class="${dp >= PASS_PCT ? 'ok' : ''}" style="width:${dp}%"></i></span></div></li>`; }).join('')}</ul>
      ${wrongs.length ? `<button class="btn primary wide" id="rev">${tr('まちがえた {0} 問の解説を読む', wrongs.length)}</button>` : ''}
      <button class="btn wide" id="done" style="margin-top:8px">${tr('{0} にもどる', b.code)}</button>`;
    const rb = $app.querySelector('#rev'); if (rb) rb.onclick = () => go({ name: 'review', exam: v.exam, items: wrongs.map(x => ({ q: x.q, picked: v.answers[x.i] ? v.answers[x.i].picked : [] })), back: v });
    $app.querySelector('#done').onclick = () => go({ name: 'exam', exam: v.exam });
  }

  // ---------- 復習（解説の一覧） ----------
  function review(v) {
    const b = B[v.exam];
    setTitle(tr('復習') + ' ' + b.code);
    v.onBack = () => go(v.back);
    $app.innerHTML = v.items.map(({ q, picked }, k) => {
      const order = q.order || (q.order = shuffle(q.c.map((_, i) => i), seeded(q.id)));
      if (isOrder(q)) return `<div class="sheet"><div class="tag">${k + 1}. ${domainOf(v.exam, q.d).name}${tr('（並べ替え）')}</div><div class="q">${fmt(q.q)}</div>
        <ul class="choices">${q.c.map((s, i) => { const pos = picked.indexOf(i); return `<li class="choice answered ${pos === i ? 'right' : 'wrong'}"><span class="k k2">${pos >= 0 ? pos + 1 : '–'}→${i + 1}</span><span>${fmt(s)}</span></li>`; }).join('')}</ul>
        <div class="ex" style="margin-top:12px">${fmt(q.e)}${q.ref ? `\n<a href="${q.ref}" target="_blank" rel="noopener">${tr('参考の公式ドキュメント')}</a>` : ''}</div></div>`;
      return `<div class="sheet"><div class="tag">${k + 1}. ${domainOf(v.exam, q.d).name}</div><div class="q">${fmt(q.q)}</div>
        <ul class="choices">${order.map((ci, i) => `<li class="choice answered ${q.a.includes(ci) ? 'right' : (picked.includes(ci) ? 'wrong' : '')}"><span class="k">${L[i]}</span><span>${fmt(q.c[ci])}</span></li>`).join('')}</ul>
        <div class="ex" style="margin-top:12px">${fmt(q.e)}${q.ref ? `\n<a href="${q.ref}" target="_blank" rel="noopener">${tr('参考の公式ドキュメント')}</a>` : ''}</div></div>`;
    }).join('');
  }

  // ---------- 模試の履歴 ----------
  function history(v) {
    const b = B[v.exam];
    setTitle(tr('模試の推移') + ' ' + b.code);
    v.onBack = () => go({ name: 'exam', exam: v.exam });
    const ms = S.mocks.filter(m => m.exam === v.exam && (m.level || 'std') === level()).slice().reverse();
    $app.innerHTML = `<div class="sheet"><table><tr><th>${tr('日時')}</th><th class="num">${tr('正解')}</th><th class="num">${tr('率')}</th><th class="num">${tr('時間')}</th></tr>${ms.map(m => `<tr><td>${new Date(m.at).toLocaleString(LOCALE, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td class="num">${m.ok}/${m.n}</td><td class="num ${m.pct >= PASS_PCT ? '' : 'danger'}">${m.pct}%</td><td class="num">${tr('{0}分', Math.floor(m.secs / 60))}</td></tr>`).join('')}</table></div>
      <div class="sheet"><h2>${tr('ドメインごとの推移')}</h2><table><tr><th>${tr('ドメイン')}</th>${ms.slice(0, 5).reverse().map((_, i) => `<th class="num">${i + 1}</th>`).join('')}</tr>${b.domains.map(d => `<tr><td>${d.id}. ${esc(d.name)}</td>${ms.slice(0, 5).reverse().map(m => { const x = (m.by || []).find(y => y[0] === d.id); return `<td class="num">${x && x[1] ? pct(x[2], x[1]) + '%' : '–'}</td>`; }).join('')}</tr>`).join('')}</table><p class="note">${tr('直近5回。')}</p></div>`;
  }

  render();
})();
