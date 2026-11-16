import re, html, json, sys, subprocess, os, glob
W = sys.argv[1]
OUT = W + '/herco-nl'
def clean(s):
    s = re.sub(r'<svg.*?</svg>', '', s, flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)); return re.sub(r'\s+', ' ', s).strip()
res = {}
for fn in glob.glob(W + '/herco/*.html') + glob.glob(W + '/herco-m/*.html'):
    t = open(fn, encoding='utf-8', errors='replace').read()
    if '<h1' not in t or 'product-select' not in t and 'product-price-' not in t: continue
    links = re.findall(r'href="(https://www\.herco-machinery\.com/nl/producten/[^"]+)"[^>]*hreflang="nl"|hreflang="nl"[^>]*href="(https://www\.herco-machinery\.com/nl/producten/[^"]+)"', t)
    cand = [a or b for a, b in links]
    if not cand:
        cand = [u for u in re.findall(r'href="(https://www\.herco-machinery\.com/nl/producten/[^"]+)"', t) if u.count('/') >= 7]
    if not cand: continue
    nl = cand[0]
    out = os.path.join(OUT, re.sub(r'[^a-z0-9]+', '_', nl.lower())[-120:] + '.html')
    if not os.path.exists(out): subprocess.run(['curl', '-sSL', '--max-time', '40', '-o', out, nl])
    n = open(out, encoding='utf-8', errors='replace').read()
    m = re.search(r'<h1[^>]*>(.*?)</h1>', n, re.S)
    u = re.search(r'<ul class="product-usps">(.*?)</ul>', n, re.S)
    d = re.search(r'class="read-more-content"[^>]*>(.*?)</div>', n, re.S)
    fr_url = re.search(r'<link rel="canonical" href="([^"]+)"', t)
    res[fr_url.group(1) if fr_url else fn] = {
        'nl_url': nl, 'name': clean(m.group(1)) if m else '',
        'usps': [clean(x) for x in re.findall(r'<li>(.*?)</li>', u.group(1), re.S)] if u else [],
        'description': clean(d.group(1)) if d else '',
        'variants': {vid: clean(name) for vid, name in re.findall(r'<option value="(\d+)">(.*?)</option>', n)},
    }
json.dump(res, open(W + '/herco-nl.json', 'w'), ensure_ascii=False, indent=1)
print(len(res), 'pages NL')
