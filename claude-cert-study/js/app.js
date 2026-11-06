/* Claude 資格 問題集 — 出題・模試・復習・進捗（localStorage） */
(function () {
  const B = window.BLUEPRINT, QS = window.QUESTIONS, QH = window.QUESTIONS_HARD || {}, T = window.TEXT || {};
  const KEY = 'ccs.v1';
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
  function qsOf(ex, lv) { const src = ((lv || level()) === 'hard' ? QH : QS)[ex] || []; return src.map((q, i) => Object.assign({ exam: ex, id: q.id || (ex + '-' + i) }, q)); }
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
    setTitle('Claude 資格 問題集');
    const total = Object.keys(B).reduce((s, k) => s + qsOf(k).length, 0);
    const hard = level() === 'hard';
    let h = `<p class="muted">Anthropic 公式の試験ガイド（2026年7月・v1.0）の出題範囲に沿って作った<b>オリジナル問題</b>です。本番の問題は NDA の下にあり公開されていません。</p>
      <div class="card"><div class="row"><div class="grow"><b>難易度</b><div class="muted small">${hard ? '上級：選択肢の長さを揃え、複数選択と「どれも正しそう」な問題を増やした版' : '標準：出題範囲を一通り確かめる版'}</div></div>
        <button class="btn ${hard ? '' : 'primary'}" data-lv="std">標準</button><button class="btn ${hard ? 'primary' : ''}" data-lv="hard">上級</button></div>
        <div class="muted small" style="margin-top:6px">合計 ${total} 問。記録は難易度ごとに別。</div></div>`;
    for (const k of Object.keys(B)) {
      const b = B[k], qs = qsOf(k);
      const seen = qs.filter(q => stat(q.id).n).length, ok = qs.filter(q => stat(q.id).ok).length;
      const mocks = S.mocks.filter(m => m.exam === k && (m.level || 'std') === level()), best = mocks.length ? Math.max(...mocks.map(m => m.pct)) : null;
      h += `<button class="card exam" data-ex="${k}">
        <div class="code">${b.code}</div><div class="name">${b.ja}</div>
        <div class="muted">${esc(b.name)}</div>
        <div class="bar"><i style="width:${pct(seen, qs.length)}%"></i></div>
        <div class="muted">${qs.length} 問・解いた ${seen}・一度は正解 ${ok}${best !== null ? `・模試ベスト ${best}%` : ''}</div>
      </button>`;
    }
    h += `<div class="card small muted">
      <b>共通：</b>120分・合格はスケールスコア 720/1000（このアプリでは 72% を目安に表示）・有効 12か月・Pearson VUE の監督付き・日本語版あり。
      受験には Claude Partner Network 加盟企業のメールアドレスが要る（公式 FAQ・2026-11-05 時点）。<br>
      <a href="#" id="reset">保存した記録を消す</a>
    </div>`;
    $app.innerHTML = h;
    $app.querySelectorAll('.exam').forEach(el => el.onclick = () => go({ name: 'exam', exam: el.dataset.ex }));
    $app.querySelectorAll('button[data-lv]').forEach(el => el.onclick = () => { S.level = el.dataset.lv; save(); render(); });
    $app.querySelector('#reset').onclick = e => { e.preventDefault(); if (confirm('解答の記録と模試の履歴をぜんぶ消します。よいですか？')) { S = { stats: {}, mocks: [], flags: {}, read: {} }; save(); render(); } };
  }

  // ---------- 試験ごとのホーム ----------
  function exam(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    if (!qs.length) { setTitle(b.code); $app.innerHTML = '<div class="card">上級の問題はまだ用意していません。ホームで「標準」に切り替えてください。</div>'; return; }
    setTitle(b.code + ' ' + b.ja + (level() === 'hard' ? '・上級' : ''));
    const wrong = qs.filter(q => stat(q.id).wrongLast).length, unseen = qs.filter(q => !stat(q.id).n).length;
    let rows = b.domains.map(d => {
      const dq = qs.filter(q => q.d === d.id), seen = dq.filter(q => stat(q.id).n);
      const n = seen.reduce((s, q) => s + stat(q.id).n, 0), ok = seen.reduce((s, q) => s + stat(q.id).ok, 0);
      return `<tr><td>${d.id}. ${esc(d.name)}</td><td class="num">${d.weight}%</td><td class="num">${dq.length}問</td><td class="num">${n ? pct(ok, n) + '%' : '–'}</td></tr>`;
    }).join('');
    $app.innerHTML = `
      <div class="card"><h2>${esc(b.name)}</h2>
        <div class="muted">${esc(b.who)}</div>
        <div class="muted" style="margin-top:6px">本番：${b.items} 問・${b.minutes} 分・${b.fee}${b.scenarios ? '・シナリオ6本中4本' : ''}</div>
        <div class="row" style="margin-top:6px"><a class="small" href="${b.guide.ja}" target="_blank" rel="noopener">公式ガイド（日本語 PDF）</a><a class="small" href="${b.guide.en}" target="_blank" rel="noopener">英語 PDF</a></div>
      </div>
      ${T[v.exam] ? `<div class="card"><h2>テキスト</h2><p class="muted">出題範囲の目標ごとに要点をまとめた読みもの。読んだ ${readCount(v.exam)} / ${objCount(v.exam)} 目標。</p><button class="btn primary wide" id="text">テキストを読む</button></div>` : ''}
      <div class="card"><h2>ドリル</h2><p class="muted">1問ずつ、答えるとすぐ解説。ドメインを選んで集中的に。</p>
        <div class="row"><button class="btn primary grow" id="drillAll">全ドメイン</button><button class="btn grow" id="drillUnseen" ${unseen ? '' : 'disabled'}>未出題 ${unseen}</button><button class="btn grow" id="drillWrong" ${wrong ? '' : 'disabled'}>前回まちがえた ${wrong}</button></div>
        <div class="row" style="margin-top:8px"><select id="dom" class="grow">${b.domains.map(d => `<option value="${d.id}">${d.id}. ${esc(d.name)}（${d.weight}%）</option>`).join('')}</select><button class="btn" id="drillDom">このドメイン</button></div>
      </div>
      <div class="card"><h2>模試</h2><p class="muted">本番と同じ問題数・時間・ドメイン配分で。終わるまで答えは見えない。</p>
        <button class="btn primary wide" id="mock">模試をはじめる（${b.items} 問・${b.minutes} 分）</button>
        ${S.mocks.filter(m => m.exam === v.exam && (m.level || 'std') === level()).length ? '<button class="btn wide" id="hist" style="margin-top:8px">模試の履歴</button>' : ''}
      </div>
      <div class="card"><h2>ドメインごとの正答率</h2><table><tr><th>ドメイン</th><th class="num">配点</th><th class="num">問題</th><th class="num">正答率</th></tr>${rows}</table>
        <button class="btn wide" id="scope" style="margin-top:10px">出題範囲（目標ごとの成績）</button></div>`;
    const start = (list, label) => go({ name: 'drill', exam: v.exam, list: shuffle(list), label });
    $app.querySelector('#drillAll').onclick = () => start(qs, '全ドメイン');
    $app.querySelector('#drillUnseen').onclick = () => start(qs.filter(q => !stat(q.id).n), '未出題');
    $app.querySelector('#drillWrong').onclick = () => start(qs.filter(q => stat(q.id).wrongLast), '前回まちがえた');
    $app.querySelector('#drillDom').onclick = () => { const d = +$app.querySelector('#dom').value; start(qs.filter(q => q.d === d), domainOf(v.exam, d).name); };
    $app.querySelector('#mock').onclick = () => go({ name: 'mockSetup', exam: v.exam });
    const tb = $app.querySelector('#text'); if (tb) tb.onclick = () => go({ name: 'text', exam: v.exam });
    $app.querySelector('#scope').onclick = () => go({ name: 'scope', exam: v.exam });
    const hb = $app.querySelector('#hist'); if (hb) hb.onclick = () => go({ name: 'history', exam: v.exam });
  }

  // ---------- 出題範囲 ----------
  function scope(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    setTitle('出題範囲 ' + b.code);
    let h = '';
    if (b.scenarios) h += `<div class="card"><h2>本番のシナリオ（6本中4本が出る）</h2><ol class="small">${b.scenarios.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
    for (const d of b.domains) {
      h += `<div class="card"><h2>${d.id}. ${esc(d.name)} <span class="tag">${d.weight}%</span></h2><div class="muted">${esc(d.en)}</div><ul class="list">`;
      d.objectives.forEach((o, i) => {
        const oq = qs.filter(q => q.d === d.id && q.o === i);
        const n = oq.reduce((s, q) => s + stat(q.id).n, 0), ok = oq.reduce((s, q) => s + stat(q.id).ok, 0);
        h += `<li><div>${esc(o)}</div><div class="row"><span class="pill">${oq.length} 問</span>${n ? `<span class="pill ${pct(ok, n) >= PASS_PCT ? 'ok' : 'ng'}">${pct(ok, n)}%</span>` : ''}${oq.length ? `<a href="#" class="small" data-d="${d.id}" data-o="${i}">この目標を解く</a>` : ''}</div></li>`;
      });
      h += '</ul></div>';
    }
    $app.innerHTML = h;
    $app.querySelectorAll('a[data-d]').forEach(a => a.onclick = e => { e.preventDefault(); const d = +a.dataset.d, o = +a.dataset.o; go({ name: 'drill', exam: v.exam, list: shuffle(qs.filter(q => q.d === d && q.o === o)), label: domainOf(v.exam, d).name }); });
  }

  // ---------- テキスト ----------
  function objCount(ex) { return B[ex].domains.reduce((s, d) => s + d.objectives.length, 0); }
  function readCount(ex, d) { return Object.keys(S.read).filter(k => k.startsWith(ex + '-' + (d ? d + '-' : ''))).length; }
  // 軽いマークダウン：段落 / "- " 箇条書き / "> " 試験の見方 / **太字** / `code` / [文字](url)
  function md(src) {
    const inline = s => fmt(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = []; let list = null, quote = null;
    const flush = () => { if (list) { out.push('<ul>' + list.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>'); list = null; } if (quote) { out.push(`<div class="tip">${quote.map(inline).join('<br>')}</div>`); quote = null; } };
    for (const raw of src.split('\n')) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (line.startsWith('- ')) { if (quote) flush(); (list = list || []).push(line.slice(2)); continue; }
      if (line.startsWith('> ')) { if (list) flush(); (quote = quote || []).push(line.slice(2)); continue; }
      if (line.startsWith('### ')) { flush(); out.push(`<h4>${inline(line.slice(4))}</h4>`); continue; }
      flush(); out.push(`<p>${inline(line)}</p>`);
    }
    flush(); return out.join('');
  }
  function text(v) {
    const b = B[v.exam], tx = T[v.exam];
    setTitle('テキスト ' + b.code);
    v.onBack = () => go({ name: 'exam', exam: v.exam });
    let h = tx.intro ? `<div class="card text">${md(tx.intro)}</div>` : '';
    for (const d of b.domains) {
      const r = readCount(v.exam, d.id), n = d.objectives.length;
      h += `<button class="card exam" data-d="${d.id}"><div class="name">${d.id}. ${esc(d.name)} <span class="tag">${d.weight}%</span></div><div class="muted">${esc(d.en)}・${n} ${b.code === 'CCAR-F' ? 'タスク' : '目標'}</div><div class="bar"><i class="${r === n ? 'ok' : ''}" style="width:${pct(r, n)}%"></i></div><div class="muted">読んだ ${r} / ${n}</div></button>`;
    }
    if (tx.appendix) h += `<div class="card text"><h2>${esc(tx.appendix.title)}</h2>${md(tx.appendix.body)}</div>`;
    $app.innerHTML = h;
    $app.querySelectorAll('button[data-d]').forEach(el => el.onclick = () => go({ name: 'textDomain', exam: v.exam, d: +el.dataset.d }));
  }
  function textDomain(v) {
    const b = B[v.exam], d = domainOf(v.exam, v.d), td = (T[v.exam].domains || {})[v.d] || {}, qs = qsOf(v.exam);
    setTitle(`${b.code} ${v.d}. ${d.name}`);
    v.onBack = () => v.back ? go(v.back) : go({ name: 'text', exam: v.exam });
    const ids = b.domains.map(x => x.id), pos = ids.indexOf(v.d);
    let h = `<div class="card text"><h2>${v.d}. ${esc(d.name)} <span class="tag">${d.weight}%</span></h2><div class="muted">${esc(d.en)}</div>${td.intro ? md(td.intro) : ''}</div>`;
    d.objectives.forEach((o, i) => {
      const key = `${v.exam}-${v.d}-${i}`, sec = (td.obj || [])[i], oq = qs.filter(q => q.d === v.d && q.o === i);
      const num = `${v.d}.${i + 1}`, label = o.startsWith(num + ' ') ? o : num + '　' + o;
      h += `<div class="card text" id="o-${i}"><h3>${esc(label)}</h3>${sec ? md(sec.body) : '<p class="muted">（このテキストはまだ書いていません）</p>'}
        ${sec && sec.docs && sec.docs.length ? `<div class="docs">公式ドキュメント：${sec.docs.map(x => `<a href="${x[1]}" target="_blank" rel="noopener">${esc(x[0])} ↗</a>`).join('　')}</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn ${S.read[key] ? 'primary' : ''}" data-read="${key}">${S.read[key] ? '✓ 読んだ' : '読んだ'}</button>${oq.length ? `<button class="btn" data-o="${i}">この目標を解く（${oq.length} 問）</button>` : ''}</div></div>`;
    });
    h += `<div class="row">${pos > 0 ? `<button class="btn grow" data-nav="${ids[pos - 1]}">‹ ${ids[pos - 1]}. ${esc(domainOf(v.exam, ids[pos - 1]).name)}</button>` : ''}${pos < ids.length - 1 ? `<button class="btn grow" data-nav="${ids[pos + 1]}">${ids[pos + 1]}. ${esc(domainOf(v.exam, ids[pos + 1]).name)} ›</button>` : ''}</div>`;
    $app.innerHTML = h;
    $app.querySelectorAll('button[data-read]').forEach(el => el.onclick = () => { const k = el.dataset.read; if (S.read[k]) delete S.read[k]; else S.read[k] = Date.now(); save(); el.className = 'btn ' + (S.read[k] ? 'primary' : ''); el.textContent = S.read[k] ? '✓ 読んだ' : '読んだ'; });
    $app.querySelectorAll('button[data-o]').forEach(el => el.onclick = () => { const o = +el.dataset.o; go({ name: 'drill', exam: v.exam, list: shuffle(qs.filter(q => q.d === v.d && q.o === o)), label: d.name }); });
    $app.querySelectorAll('button[data-nav]').forEach(el => el.onclick = () => go({ name: 'textDomain', exam: v.exam, d: +el.dataset.nav }));
    if (v.o !== undefined) { const el = document.getElementById('o-' + v.o); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0); }
  }

  // ---------- ドリル ----------
  function drill(v) {
    if (!v.list.length) { $app.innerHTML = '<div class="card">この条件の問題はありません。</div>'; return; }
    v.i = v.i || 0; v.answers = v.answers || [];
    go({ name: 'question', exam: v.exam, mode: 'drill', list: v.list, i: 0, label: v.label, answers: [] });
  }

  // ---------- 模試の設定 ----------
  function mockSetup(v) {
    const b = B[v.exam], qs = qsOf(v.exam);
    setTitle('模試 ' + b.code);
    $app.innerHTML = `<div class="card"><h2>模試</h2>
      <p>${b.items} 問を公式の配点比率どおりにドメインから引きます。時間は ${b.minutes} 分。途中で閉じると消えます。</p>
      <label class="opt"><input type="checkbox" id="prefUnseen" checked> まだ解いていない問題を優先する</label>
      <label class="opt"><input type="checkbox" id="timed" checked> 時間を計る（残り時間を上に出す）</label>
      <p class="note">問題が足りないドメインは、あるだけ出します（本番の配分より少なくなる）。</p>
      <button class="btn primary wide" id="go">はじめる</button></div>`;
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
    setTitle((isMock ? '模試 ' : 'ドリル ') + b.code);
    v.onBack = () => { if (!isMock || v.answers.filter(a => a).length === 0 || confirm('模試をやめますか？ 結果は残りません。')) go({ name: 'exam', exam: v.exam }); };
    // 選択肢の並びは問題ごとに固定でシャッフル（id を種に）
    const order = q.order || (q.order = shuffle(q.c.map((_, i) => i), seeded(q.id)));
    const multi = q.a.length > 1;
    let picked = new Set(v.answers[v.i] ? v.answers[v.i].picked : []);
    let answered = !!(v.answers[v.i] && v.answers[v.i].done);

    function draw() {
      const ok = answered && sameSet(picked, new Set(q.a));
      $app.innerHTML = `<div class="prog"><span>${v.i + 1} / ${v.list.length}${v.label ? '・' + esc(v.label) : ''}</span><span>${d.id}. ${esc(d.name)}${q.s ? '・シナリオ' + q.s : ''}</span></div>
        <div class="card"><div class="q">${fmt(q.q)}</div>
        <div class="muted small" style="margin-top:6px">${multi ? `<b>${q.a.length} つ</b>選んでください` : '1 つ選んでください'}</div>
        <ul class="choices">${order.map((ci, k) => {
          let cls = 'choice'; if (answered) { cls += ' answered'; if (q.a.includes(ci)) cls += ' right'; else if (picked.has(ci)) cls += ' wrong'; } else if (picked.has(ci)) cls += ' sel';
          return `<li class="${cls}" data-c="${ci}"><span class="k">${L[k]}</span><span>${fmt(q.c[ci])}</span></li>`; }).join('')}</ul>
        ${answered && !isMock ? `<div class="ex ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解' : 'まちがい'}</b>　正解：${q.a.map(ci => L[order.indexOf(ci)]).sort().join('・')}\n${fmt(q.e)}${q.ref ? `\n<a href="${q.ref}" target="_blank" rel="noopener">参考 ↗</a>` : ''}${T[v.exam] ? `\n<a href="#" id="totext">📖 この目標のテキストを読む</a>` : ''}</div>` : ''}
        </div>
        <div class="row">
          ${v.i > 0 && isMock ? '<button class="btn" id="prev">前へ</button>' : ''}
          ${!answered ? `<button class="btn primary grow" id="ans" ${picked.size ? '' : 'disabled'}>${isMock ? '決める' : '答える'}</button>` : `<button class="btn primary grow" id="next">${v.i + 1 < v.list.length ? '次へ' : (isMock ? '採点する' : '結果を見る')}</button>`}
        </div>
        ${isMock ? `<div class="note">決めたあとも「前へ」で見直せる。最後の問題の「採点する」で終わる。</div>` : `<div class="note">わからないときは勘で答えず、選択肢ごとに「なぜ違うか」を言えるかを確かめる。</div>`}`;
      $app.querySelectorAll('.choice').forEach(el => el.onclick = () => {
        if (answered) return; const ci = +el.dataset.c;
        if (multi) { if (picked.has(ci)) picked.delete(ci); else if (picked.size < q.a.length) picked.add(ci); else { picked.delete([...picked][0]); picked.add(ci); } }
        else picked = new Set([ci]);
        draw();
      });
      const ans = $app.querySelector('#ans'); if (ans) ans.onclick = () => {
        answered = true; const okNow = sameSet(picked, new Set(q.a));
        v.answers[v.i] = { picked: [...picked], done: true, ok: okNow };
        if (!isMock) record(q.id, okNow);
        draw();
      };
      const nx = $app.querySelector('#next'); if (nx) nx.onclick = () => { if (v.i + 1 < v.list.length) { v.i++; render(); } else finish(); };
      const tt = $app.querySelector('#totext'); if (tt) tt.onclick = e => { e.preventDefault(); go({ name: 'textDomain', exam: v.exam, d: q.d, o: q.o, back: v }); };
      const pv = $app.querySelector('#prev'); if (pv) pv.onclick = () => { v.i--; render(); };
    }
    function finish() {
      stopTimer();
      if (isMock) { v.list.forEach((qq, i) => { const a = v.answers[i]; record(qq.id, !!(a && a.ok)); }); }
      go({ name: 'result', exam: v.exam, mode: v.mode, list: v.list, answers: v.answers, start: v.start });
    }
    draw();
    if (isMock && v.limit) {
      $timer.hidden = false;
      const tick = () => { const left = v.limit - Math.floor((Date.now() - v.start) / 1000); if (left <= 0) { alert('時間です。採点します。'); finish(); return; } $timer.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; $timer.classList.toggle('low', left < 600); };
      tick(); timerId = setInterval(tick, 1000);
    }
  }
  function sameSet(a, b) { if (a.size !== b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }
  function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- 結果 ----------
  function result(v) {
    const b = B[v.exam];
    setTitle('結果 ' + b.code);
    v.onBack = () => go({ name: 'exam', exam: v.exam });
    const n = v.list.length, ok = v.answers.filter(a => a && a.ok).length, p = pct(ok, n);
    const by = b.domains.map(d => { const idx = v.list.map((q, i) => q.d === d.id ? i : -1).filter(i => i >= 0); const o = idx.filter(i => v.answers[i] && v.answers[i].ok).length; return { d, n: idx.length, ok: o }; });
    if (v.mode === 'mock' && !v.saved) { v.saved = true; S.mocks.push({ exam: v.exam, level: level(), at: Date.now(), n, ok, pct: p, by: by.map(x => [x.d.id, x.n, x.ok]), secs: v.start ? Math.round((Date.now() - v.start) / 1000) : 0 }); save(); }
    const wrongs = v.list.map((q, i) => ({ q, i })).filter(x => !(v.answers[x.i] && v.answers[x.i].ok));
    $app.innerHTML = `<div class="card center"><div class="score ${p >= PASS_PCT ? '' : 'danger'}">${p}%</div><div class="muted">${ok} / ${n} 問${v.mode === 'mock' ? `・合格の目安 ${PASS_PCT}%（公式は 720/1000。素点との対応は非公開）` : ''}</div>
      ${p >= PASS_PCT && v.mode === 'mock' ? '<div class="pill ok" style="margin-top:8px">目安を超えた</div>' : ''}</div>
      <div class="card"><h2>ドメインごと</h2><table><tr><th>ドメイン</th><th class="num">正解</th><th class="num">率</th></tr>${by.filter(x => x.n).map(x => `<tr><td>${x.d.id}. ${esc(x.d.name)}</td><td class="num">${x.ok}/${x.n}</td><td class="num">${pct(x.ok, x.n)}%</td></tr>`).join('')}</table>
      <p class="note">本番のスコアレポートもドメインごとの正答率が出る。配点の大きいドメイン（${b.domains.slice().sort((a, c) => c.weight - a.weight).slice(0, 2).map(d => d.name).join('・')}）から固める。</p></div>
      ${wrongs.length ? `<button class="btn primary wide" id="rev">まちがえた ${wrongs.length} 問の解説を読む</button>` : ''}
      <button class="btn wide" id="done" style="margin-top:8px">${b.code} のホームへ</button>`;
    const rb = $app.querySelector('#rev'); if (rb) rb.onclick = () => go({ name: 'review', exam: v.exam, items: wrongs.map(x => ({ q: x.q, picked: v.answers[x.i] ? v.answers[x.i].picked : [] })), back: v });
    $app.querySelector('#done').onclick = () => go({ name: 'exam', exam: v.exam });
  }

  // ---------- 復習（解説の一覧） ----------
  function review(v) {
    const b = B[v.exam];
    setTitle('復習 ' + b.code);
    v.onBack = () => go(v.back);
    $app.innerHTML = v.items.map(({ q, picked }, k) => {
      const order = q.order || (q.order = shuffle(q.c.map((_, i) => i), seeded(q.id)));
      return `<div class="card"><div class="tag">${k + 1}. ${domainOf(v.exam, q.d).name}</div><div class="q">${fmt(q.q)}</div>
        <ul class="choices">${order.map((ci, i) => `<li class="choice answered ${q.a.includes(ci) ? 'right' : (picked.includes(ci) ? 'wrong' : '')}"><span class="k">${L[i]}</span><span>${fmt(q.c[ci])}</span></li>`).join('')}</ul>
        <div class="ex">${fmt(q.e)}${q.ref ? `\n<a href="${q.ref}" target="_blank" rel="noopener">参考 ↗</a>` : ''}</div></div>`;
    }).join('');
  }

  // ---------- 模試の履歴 ----------
  function history(v) {
    const b = B[v.exam];
    setTitle('模試の履歴 ' + b.code);
    const ms = S.mocks.filter(m => m.exam === v.exam && (m.level || 'std') === level()).slice().reverse();
    $app.innerHTML = `<div class="card"><table><tr><th>日時</th><th class="num">正解</th><th class="num">率</th><th class="num">時間</th></tr>${ms.map(m => `<tr><td>${new Date(m.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td class="num">${m.ok}/${m.n}</td><td class="num ${m.pct >= PASS_PCT ? '' : 'danger'}">${m.pct}%</td><td class="num">${Math.floor(m.secs / 60)}分</td></tr>`).join('')}</table></div>
      <div class="card"><h2>ドメインごとの推移</h2><table><tr><th>ドメイン</th>${ms.slice(0, 5).reverse().map((_, i) => `<th class="num">${i + 1}</th>`).join('')}</tr>${b.domains.map(d => `<tr><td>${d.id}. ${esc(d.name)}</td>${ms.slice(0, 5).reverse().map(m => { const x = (m.by || []).find(y => y[0] === d.id); return `<td class="num">${x && x[1] ? pct(x[2], x[1]) + '%' : '–'}</td>`; }).join('')}</tr>`).join('')}</table><p class="note">直近5回。</p></div>`;
  }

  render();
})();
