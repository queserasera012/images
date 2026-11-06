# text/*.md → js/t-*.js。書式：
#   @intro … 試験全体の前書き（最初の "# " まで）
#   # 1            … ドメイン（番号）。直後の本文はドメインの前書き
#   ## 1.1         … 目標（ドメイン.番号）。本文 + "docs: 題|URL" 行
#   @appendix 題    … 巻末（用語のまとめなど）
import json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent
for src in sorted(root.glob('*.md')):
    ex = src.stem
    out = {'intro': '', 'domains': {}, 'appendix': None}
    cur = None; dom = None; obj = None; app = None
    buf = []
    def flush():
        global buf, cur
        body = '\n'.join(buf).strip(); buf = []
        if cur is None: return
        if cur == 'intro': out['intro'] = body
        elif cur == 'dom': out['domains'][dom]['intro'] = body
        elif cur == 'obj':
            docs = []
            lines = []
            for l in body.split('\n'):
                m = re.match(r'docs:\s*(.+?)\|(\S+)\s*$', l)
                if m: docs.append([m.group(1).strip(), m.group(2)])
                else: lines.append(l)
            out['domains'][dom]['obj'][obj] = {'body': '\n'.join(lines).strip(), 'docs': docs}
        elif cur == 'app': out['appendix']['body'] = body
    for line in src.read_text(encoding='utf-8').split('\n'):
        if line.startswith('@intro'): flush(); cur = 'intro'; continue
        if line.startswith('@appendix'): flush(); cur = 'app'; out['appendix'] = {'title': line[9:].strip(), 'body': ''}; continue
        m = re.match(r'^# (\d+)\s*$', line)
        if m: flush(); cur = 'dom'; dom = int(m.group(1)); out['domains'][dom] = {'intro': '', 'obj': {}}; continue
        m = re.match(r'^## (\d+)\.(\d+)', line)
        if m: flush(); cur = 'obj'; dom = int(m.group(1)); obj = int(m.group(2)) - 1; continue
        buf.append(line)
    flush()
    # obj dict → list
    for d in out['domains'].values():
        n = max(d['obj'].keys()) + 1 if d['obj'] else 0
        d['obj'] = [d['obj'].get(i) for i in range(n)]
    js = 'window.TEXT = window.TEXT || {};\nwindow.TEXT.' + ex + ' = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n'
    (root.parent / 'js' / f't-{ex}.js').write_text(js, encoding='utf-8')
    nobj = sum(len(d['obj']) for d in out['domains'].values())
    print(ex, 'domains', len(out['domains']), 'objectives', nobj, 'chars', len(js))
