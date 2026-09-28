#!/usr/bin/env python3
"""Click-through QA for the Product Journey pages, run before every publish.

  python3 tools/roadmap_qa.py [roadmap roadmap-dlg roadmap-internal]    QA_WIDTH=1100 or 400 for other widths
  python3 tools/roadmap_qa.py --shots                                   screenshots (light + dark, 1440 and 400) into dist-journey/qa-shots/

Injects tools/roadmap_qa_probe.js into dist-journey/<page>/index.html, runs it in headless Chrome and prints the report:
JavaScript errors, WCAG contrast failures in light and dark, sideways page scroll, escaped HTML or undefined values,
sheets that miss What / Why / Outcome, filters that show nothing, and removed items that are still visible.
Exit code 1 when there are errors or issues."""
import functools, html, http.server, json, os, re, socketserver, subprocess, sys, threading

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SKELETON = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light}body{margin:0;background:#faf9f5}[hidden]{display:none!important}img{max-width:100%}</style></head><body>')


def serve(d):
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=d)
    h.log_message = lambda *a: None
    srv = socketserver.TCPServer(('127.0.0.1', 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def run(page, width):
    d = os.path.join(W, 'dist-journey', page)
    src = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
    probe = open(os.path.join(W, 'tools', 'roadmap_qa_probe.js'), encoding='utf-8').read()
    open(os.path.join(d, 'qa_run.html'), 'w', encoding='utf-8').write(SKELETON + src + '<script>' + probe + '</script></body></html>')
    # Chrome will not size a window below 500px, so narrow widths run the page inside an iframe of that width
    open(os.path.join(d, 'qa_host.html'), 'w').write('<!doctype html><body style="margin:0"><iframe src="qa_run.html" style="border:0;width:%spx;height:1000px"></iframe>'
        '<script>addEventListener("message",e=>{if(e.data&&e.data.__qa){const p=document.createElement("pre");p.id="__qa";p.textContent=e.data.__qa;document.body.append(p)}})</script></body>' % width)
    srv = serve(d)
    try:
        out = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--window-size=%s,1000' % max(int(width), 500), '--virtual-time-budget=900000',
                              '--dump-dom', 'http://127.0.0.1:%d/%s' % (srv.server_address[1], 'qa_host.html' if int(width) < 500 else 'qa_run.html')], capture_output=True, text=True, timeout=900).stdout
    finally:
        srv.shutdown(); os.remove(os.path.join(d, 'qa_run.html')); os.remove(os.path.join(d, 'qa_host.html'))
    m = re.search(r'<pre id="__qa">(.*?)</pre>', out, re.S)
    if not m:
        print(page, width, 'QA did not finish'); return False
    R = json.loads(html.unescape(m.group(1)))
    print('%s @%spx · steps %d · sheets opened %d · errors %d · issues %d' % (page, width, R['steps'], R['opened'], len(R['errors']), len(R['issues'])))
    for e in R['errors'][:20]: print('  ERROR', e['step'], e['msg'])
    kinds = {}
    for i in R['issues']: kinds.setdefault(i['kind'], []).append(i)
    for k, lst in kinds.items():
        print('  %s: %d' % (k, len(lst)))
        for i in lst[:10]: print('     ', i.get('theme', ''), i.get('el', ''), '|', i.get('text', ''))
    for n in R['notes']: print('  NOTE', n)
    return not R['errors'] and not R['issues']


def shots():
    out = os.path.join(W, 'dist-journey', 'qa-shots'); os.makedirs(out, exist_ok=True)
    for page in ('roadmap', 'roadmap-dlg', 'roadmap-internal'):
        d = os.path.join(W, 'dist-journey', page)
        src = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
        for theme in ('light', 'dark'):
            open(os.path.join(d, 'shot.html'), 'w', encoding='utf-8').write(SKELETON + src.replace("var t = 'light';", "var t = '%s';" % theme, 1) + '</body></html>')
            srv = serve(d)
            open(os.path.join(d, 'shot_host.html'), 'w').write('<!doctype html><body style="margin:0;background:#888"><iframe src="shot.html" style="border:0;width:400px;height:2400px"></iframe></body>')
            for w, h in ((1440, 2600), (400, 2400)):
                f = os.path.join(out, '%s-%s-%d.png' % (page, theme, w))
                subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=%d,%d' % (max(w, 500), h), '--virtual-time-budget=4000',
                                '--screenshot=' + f, 'http://127.0.0.1:%d/%s' % (srv.server_address[1], 'shot_host.html' if w < 500 else 'shot.html')], capture_output=True, timeout=120)
                print('shot', f)
            srv.shutdown()
        os.remove(os.path.join(d, 'shot.html')); os.remove(os.path.join(d, 'shot_host.html'))


if __name__ == '__main__':
    if '--shots' in sys.argv:
        shots(); sys.exit(0)
    pages = [a for a in sys.argv[1:] if not a.startswith('-')] or ['roadmap', 'roadmap-dlg', 'roadmap-internal']
    ok = all([run(p, os.environ.get('QA_WIDTH', '1440')) for p in pages])
    sys.exit(0 if ok else 1)
