#!/usr/bin/env python3
"""Client Ledger: split the live page into editable sources, and build them back into a publishable page.

  python3 tools/ledger.py split   live/index.html -> src/, data/   (after every re-read of the live artifact)
  python3 tools/ledger.py build   src/ + data/ + live/logic.json -> dist/   (before every publish)
  python3 tools/ledger.py check   split then build must reproduce live/index.html byte for byte

The live file as the Artifact tool reads it is the service wrapper (first line, ending <body>) + '\n'
+ the published page + '</body></html>'. dist/index.html is the published page only, as build2.py did.
The logic seed embedded in the page is always written from live/logic.json (rule: the seed and
logic.json are the same rules), with updatedBy 'seed'."""
import json, os, re, shutil, sys, hashlib

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *a: os.path.join(W, *a)
WRAP_END = '</body></html>'
DATA = ('LEDGER', 'HYVE')          # stored as raw JSON text in data/<name>.json, byte-preserving

def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8', newline='').write(s)

def unwrap(live):
    head, page = live.split('\n', 1)
    assert head.endswith('<body>') and page.endswith(WRAP_END), 'unexpected service wrapper'
    return head, page[:-len(WRAP_END)]

def seed_text(logic):
    seed = dict(logic); seed['updatedBy'] = 'seed'
    order = ['version', 'updated', 'updatedBy', 'rules', 'log']
    seed = {k: seed[k] for k in order if k in seed} | {k: v for k, v in seed.items() if k not in order}
    return json.dumps(seed, indent=1, ensure_ascii=False).replace('</', '<\\/')

def split():
    head, page = unwrap(rd(J('live', 'index.html')))
    wr(J('src', 'wrapper.txt'), head)
    s0 = page.index('<style>'); s1 = page.index('</style>', s0)
    d0 = page.index('<script>', s1); d1 = page.index('</script>', d0)
    m0 = page.index('<script>', d1); m1 = page.rindex('</script>')
    wr(J('src', 'head.html'), page[:s0])
    wr(J('src', 'style.css'), page[s0 + 7:s1])
    wr(J('src', 'markup.html'), page[s1 + 8:d0])
    wr(J('src', 'between.html'), page[d1 + 9:m0])
    wr(J('src', 'main.js'), page[m0 + 8:m1])
    wr(J('src', 'tail.html'), page[m1 + 9:])
    d = page[d0 + 8:d1]; dec = json.JSONDecoder(); pos = 0; layout = []
    for m in re.finditer(r'window\.([A-Z_]+)\s*=\s*', d):
        _, n = dec.raw_decode(d[m.end():]); e = m.end() + n
        layout.append({'name': m.group(1), 'pre': d[pos:m.end()]})
        txt = d[m.end():e]
        if m.group(1) in DATA: wr(J('data', m.group(1).lower() + '.json'), txt)
        elif m.group(1) == 'LOGIC_SEED':
            assert txt == seed_text(json.load(open(J('live', 'logic.json'), encoding='utf-8')))
        else: raise SystemExit('unknown data block ' + m.group(1))
        pos = e
    layout.append({'name': None, 'pre': d[pos:]})
    wr(J('src', 'data_layout.json'), json.dumps(layout, indent=1))
    print('split ok')

def assemble():
    layout = json.load(open(J('src', 'data_layout.json')))
    logic = json.load(open(J('live', 'logic.json'), encoding='utf-8'))
    d = ''
    for b in layout:
        d += b['pre']
        if b['name'] in DATA:
            t = rd(J('data', b['name'].lower() + '.json')); json.loads(t); d += t
        elif b['name'] == 'LOGIC_SEED': d += seed_text(logic)
    for t in (d,):
        assert '</script' not in t.replace('<\\/script', '')
    return (rd(J('src', 'head.html')) + '<style>' + rd(J('src', 'style.css')) + '</style>'
            + rd(J('src', 'markup.html')) + '<script>' + d + '</script>' + rd(J('src', 'between.html'))
            + '<script>' + rd(J('src', 'main.js')) + '</script>' + rd(J('src', 'tail.html')))

def build():
    page = assemble()
    shutil.rmtree(J('dist'), ignore_errors=True)
    wr(J('dist', 'index.html'), page)
    for f in ('logic.json', 'flow.json'): shutil.copy(J('live', f), J('dist', f))
    for d in ('fonts', 'img'): shutil.copytree(J('live', d), J('dist', d))
    # local QA copy with the wrapper, openable in a browser (fetches of logic.json/flow.json need a server)
    wr(J('dist', 'qa.html'), rd(J('src', 'wrapper.txt')) + '\n' + page + WRAP_END)
    print('dist/index.html', len(page.encode()), hashlib.sha256(page.encode()).hexdigest()[:12])

def check():
    split(); live = rd(J('live', 'index.html'))
    assert rd(J('src', 'wrapper.txt')) + '\n' + assemble() + WRAP_END == live, 'round trip FAILED'
    print('round trip ok: build reproduces live/index.html byte for byte')

if __name__ == '__main__':
    {'split': split, 'build': build, 'check': check}[sys.argv[1] if len(sys.argv) > 1 else 'check']()
