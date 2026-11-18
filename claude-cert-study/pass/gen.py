# 合格ノート ジェネレータ。content_*.py の構造を HTML にする。python3 pass/build.py
import html, re
def esc(s): return html.escape(s, quote=False)
def fmt(s):
    s=esc(s)
    s=re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s=re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    return s
DCOL=['--d1','--d2','--d3','--d4','--d5','--d6','--d7','--d8']
def hero(code,name,facts,strategy):
    return f'<div class="hero"><div class="code">{esc(code)}</div><h2>{esc(name)}</h2><div class="facts">'+''.join(f'<span>{fmt(f)}</span>' for f in facts)+'</div><ol>'+''.join(f'<li>{fmt(s)}</li>' for s in strategy)+'</ol></div>'
def sec(n,title,anchor):
    return f'<div class="sec" id="{anchor}"><span class="n">{n}</span><h2>{esc(title)}</h2></div>'
def weights(doms,note=None):
    h='<div class="card">'
    for i,(name,pct,tag,memo) in enumerate(doms):
        t=f'<span class="tag {"hot" if tag=="最重点" else ""}">{esc(tag)}</span>' if tag else ''
        h+=f'<div class="w"><span class="lab">D{i+1} {esc(name)}{t}</span><span class="pct">{pct}%</span><div class="bar"><i style="width:{min(100,pct*2.6)}%;background:var({DCOL[i]})"></i></div><span class="note">{fmt(memo)}</span></div>'
    if note: h+=f'<p class="muted">{fmt(note)}</p>'
    return h+'</div>'
def rules(rows):
    return ''.join(f'<div class="rule"><div class="sit">{fmt(s)}</div><div class="ok"><b>✅ 選ぶ</b>　{fmt(o)}</div><div class="ng"><b>❌ 選ばない</b>　{fmt(n)}</div></div>' for s,o,n in rows)
def flow(steps,vertical=False,title=None):
    h='<div class="card">'+(f'<h3>{fmt(title)}</h3>' if title else '')+f'<div class="flow{" v" if vertical else ""}">'
    for i,st in enumerate(steps):
        if i: h+='<span class="ar">→</span>'
        kind=''; lab=''; txt=st
        if isinstance(st,tuple):
            lab,txt=st[0],st[1]; kind=st[2] if len(st)>2 else ''
        h+=f'<div class="st {kind}">'+(f'<b>{esc(lab)}</b>' if lab else '')+f'{fmt(txt)}</div>'
    return h+'</div></div>'
def tiles(items,title=None):
    return '<div class="card">'+(f'<h3>{fmt(title)}</h3>' if title else '')+'<div class="tiles">'+''.join(f'<div class="tile"><b>{fmt(k)}</b>{fmt(v)}</div>' for k,v in items)+'</div></div>'
def triggers(rows,title='問題文のことば → 答えの方向'):
    return f'<div class="card"><h3>{esc(title)}</h3><table><tr><th>問題文に出たら</th><th>こう答える</th></tr>'+''.join(f'<tr><td class="k">{fmt(k)}</td><td class="v">{fmt(v)}</td></tr>' for k,v in rows)+'</table></div>'
def table(headers,rows,title=None):
    return '<div class="card">'+(f'<h3>{fmt(title)}</h3>' if title else '')+'<table><tr>'+''.join(f'<th>{esc(x)}</th>' for x in headers)+'</tr>'+''.join('<tr>'+''.join(f'<td>{fmt(c)}</td>' for c in r)+'</tr>' for r in rows)+'</table></div>'
def callout(text,kind=''):
    return f'<div class="co {kind}">{fmt(text)}</div>'
def points(items,title=None):
    return '<div class="card">'+(f'<h3>{fmt(title)}</h3>' if title else '')+'<ul class="pt">'+''.join(f'<li>{fmt(x)}</li>' for x in items)+'</ul></div>'
def mnemonic(pairs,title=None):
    return '<div class="card">'+(f'<h3>{fmt(title)}</h3>' if title else '')+'<div class="mn">'+''.join(f'<b>{esc(k)}</b><span>{fmt(v)}</span>' for k,v in pairs)+'</div></div>'
def checklist(exam,items):
    return f'<div class="card"><ul class="chk" data-exam="{exam}">'+''.join(f'<li><input type="checkbox" id="c{i}"><span>{fmt(x)}</span></li>' for i,x in enumerate(items))+'</ul><div class="prog" id="prog"></div></div>'
JS='''<script>
(function(){var ul=document.querySelector('.chk');if(!ul)return;var key='ccs.pass.'+ul.dataset.exam;var st={};try{st=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
var boxes=ul.querySelectorAll('input');function upd(){var n=0;boxes.forEach(function(b){b.parentNode.classList.toggle('done',b.checked);if(b.checked)n++});document.getElementById('prog').textContent=n+' / '+boxes.length+' 確認ずみ'+(n===boxes.length?'　🎉 行ってらっしゃい':'');}
boxes.forEach(function(b){b.checked=!!st[b.id];b.onchange=function(){st[b.id]=b.checked;try{localStorage.setItem(key,JSON.stringify(st))}catch(e){}upd()}});upd();})();
</script>'''
def page(exam,code,name,body,toc):
    t=''.join(f'<a href="#{a}">{esc(l)}</a>' for a,l in toc)
    return f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>合格ノート {esc(code)}</title><link rel="stylesheet" href="pass.css?v=1"></head><body>
<div class="top"><a class="back" href="../" aria-label="戻る">‹</a><h1>合格ノート {esc(code)}　{esc(name)}</h1></div>
<main><div class="toc">{t}</div>{body}<p class="foot">本番の問題は NDA の下にあり、このノートは公式ガイドの出題範囲と対策コースの要点から書いたオリジナルの整理です。数字（価格・上限）は暗記の対象外。</p></main>{JS}</body></html>'''
