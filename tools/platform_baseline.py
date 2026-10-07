#!/usr/bin/env python3
"""Verified platform baseline for the Product Journey AI: every verdict row of the knowledge base's
reconciliation study (kb/legacy/platform/init/kb/*.md), with its verdict and code evidence.

  python3 tools/platform_baseline.py [KB_ROOT]   -> data/roadmap/platform/baseline.json

Only the study (rank 2, VERIFIED) is read. Source A (_sources/, intent) is never read here.
Verdicts are current as of the study's code snapshot, recorded in the output."""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('EXPOPLATFORM_KB_ROOT', '/Users/admin/Downloads/knowledge-base-main')
STUDY = os.path.join(KB, 'kb', 'legacy', 'platform', 'init', 'kb')
VERDICTS = ('CONFIRMED', 'PARTIAL', 'CONTRADICTED', 'NOT-IN-CODE', 'UNKNOWN', 'CODE-ONLY')


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def clean(t, n):
    t = re.sub(r'\*\*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t[:n] + ('…' if len(t) > n else '')


def main():
    out, products = [], []
    for p in sorted(glob.glob(os.path.join(STUDY, '*.md'))):
        f = os.path.basename(p)
        lines = open(p, encoding='utf-8').read().split('\n')
        title = next((l.lstrip('# ').strip() for l in lines if l.startswith('# ')), f)
        title = re.sub(r'\s*[—–-]+\s*(doc\s*[↔⇄]\s*code reconciliation|reconciliation).*$', '', title, flags=re.I)
        title = re.sub(r'^[0-9a-e]{2,3}\s*[·—–.-]?\s*', '', title).strip(' ·—-')
        products.append({'file': f, 'title': title})
        head = ''
        for i, l in enumerate(lines, 1):
            if l.startswith('#'):
                head = l.lstrip('# ').strip(); continue
            if not l.strip().startswith('|') or 'verdict summary' in head.lower():
                continue
            c = cells(l)
            if set(''.join(c)) <= set('-: '):
                continue
            vi, v = None, None
            for j, x in enumerate(c):
                t = re.sub(r'[*`⚠️✅❌🟡🔴\s]', ' ', x).strip().upper()
                hit = next((w for w in VERDICTS if t.startswith(w)), None)
                if hit:
                    vi, v = j, hit
                    break
            if vi is None or vi == 0:
                continue
            before = [x for x in c[:vi] if not re.fullmatch(r'[\d\s.,–-]*|INT:\S+|`?INT:.*', x.strip())]
            if not before:
                continue
            claim = max(before, key=len)
            rest = re.sub(r'^[*`⚠️✅❌\s]*' + re.escape(v) + r'[*`\s]*[,:;—-]*\s*', '', c[vi].strip(), flags=re.I)
            evidence = ' '.join(x for x in [rest] + c[vi + 1:vi + 2] if x)
            note = ' '.join(c[vi + 2:])
            if re.sub(r'[`*\s]', '', claim).upper() in VERDICTS or len(re.sub(r'[`*]', '', claim).strip()) < 8:
                continue
            out.append({'id': '%s:%d' % (f[:-3], i), 'file': f, 'line': i, 'product': title, 'section': clean(head, 120),
                        'claim': clean(claim, 400), 'verdict': v, 'evidence': clean(evidence, 500), 'note': clean(note, 300)})
    snap = 'Code snapshots 2026-09-03 (main, alpha) and 2026-09-07 (dev); study dated 2026-08-11'
    res = {'source': 'ExpoPlatform knowledge base, kb/legacy/platform/init/kb (the reconciliation study, VERIFIED layer)',
           'snapshot': snap, 'kbRoot': KB, 'products': products, 'claims': out}
    dst = os.path.join(ROOT, 'data', 'roadmap', 'platform', 'baseline.json')
    json.dump(res, open(dst, 'w'), ensure_ascii=False, indent=0)
    from collections import Counter
    print('claims', len(out), dict(Counter(x['verdict'] for x in out)), 'products', len(products), os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main()
