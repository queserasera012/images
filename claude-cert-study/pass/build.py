import sys, os, importlib, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from gen import page
for m in ['ccdv','ccarf','ccarp','ccdvp','ccao']:
    try: c=importlib.import_module('content_'+m)
    except ModuleNotFoundError: continue
    out=pathlib.Path(os.path.dirname(__file__))/f'{m}.html'
    out.write_text(page(c.EXAM,c.CODE,c.NAME,c.BODY,c.TOC),encoding='utf-8')
    print(m, out.stat().st_size)
