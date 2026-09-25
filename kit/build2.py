#!/usr/bin/env python3
"""Client Ledger v3 build: spec v1 (Risk, Flow and Investment) on top of the published light theme (Version 2).

Source: publish/index.html, byte-identical to the live Version 2.
Swaps in src/style_v3.css, src/markup_v3.html, src/main_v3.js and the v5 logic registry as the seed.
Writes publish3/index.html (service skeleton stripped, for publishing) and site3/ (skeleton kept, with
logic.json and flow.json beside it) for local QA."""
import json, os, re, shutil, hashlib

W = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(W, 'publish', 'index.html')
page = open(SRC, encoding='utf-8').read()
assert hashlib.sha256(page.encode()).hexdigest().startswith('e899fb51'), 'publish/index.html is not Version 2'

skeleton = open(os.path.join(W, 'site', 'index_after.html'), encoding='utf-8').read().split('\n', 1)[0]
assert skeleton.endswith('<body>')

# ---- style
a = page.index('<style>') + len('<style>'); b = page.index('</style>')
assert page[a:b] == open(os.path.join(W, 'src', 'style.css'), encoding='utf-8').read()
page = page[:a] + open(os.path.join(W, 'src', 'style_v3.css'), encoding='utf-8').read() + page[b:]

# ---- markup (from </style> up to the data script)
a = page.index('</style>'); b = page.index('<script>')
assert page[a:b] == open(os.path.join(W, 'src', 'markup.html'), encoding='utf-8').read()
page = page[:a] + open(os.path.join(W, 'src', 'markup_v3.html'), encoding='utf-8').read() + page[b:]

# ---- main script (the second <script>)
first = page.index('<script>'); second = page.index('<script>', first + 1) + len('<script>')
end = page.index('</script>', second)
assert page[second:end] == open(os.path.join(W, 'src', 'main.js'), encoding='utf-8').read()
page = page[:second] + open(os.path.join(W, 'src', 'main_v3.js'), encoding='utf-8').read() + page[end:]

# ---- the logic seed: registry v5
reg = json.load(open(os.path.join(W, 'registry', 'logic.v5.json'), encoding='utf-8'))
m = re.search(r'window\.LOGIC_SEED\s*=\s*', page)
obj, n = json.JSONDecoder().raw_decode(page[m.end():])
assert obj['version'] == 4
seed = {'version': reg['version'], 'updated': reg['updated'], 'updatedBy': 'seed', 'rules': reg['rules']}
txt = json.dumps(seed, indent=1, ensure_ascii=False).replace('</', '<\\/')
page = page[:m.end()] + txt + page[m.end() + n:]

assert '</script' not in txt
os.makedirs(os.path.join(W, 'publish3'), exist_ok=True)
open(os.path.join(W, 'publish3', 'index.html'), 'w', encoding='utf-8').write(page)

# ---- local QA site: skeleton kept, supporting files beside it
S3 = os.path.join(W, 'site3')
os.makedirs(S3, exist_ok=True)
for d in ('fonts', 'img'):
    if not os.path.exists(os.path.join(S3, d)):
        shutil.copytree(os.path.join(W, 'site', d), os.path.join(S3, d))
open(os.path.join(S3, 'index.html'), 'w', encoding='utf-8').write(skeleton + '\n' + page + '</body></html>')
shutil.copy(os.path.join(W, 'registry', 'logic.v5.json'), os.path.join(S3, 'logic.json'))
shutil.copy(os.path.join(W, 'flow', 'flow.json'), os.path.join(S3, 'flow.json'))
print('publish3/index.html', len(page), hashlib.sha256(page.encode()).hexdigest()[:12])
