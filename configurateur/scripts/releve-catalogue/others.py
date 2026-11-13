import re, html, json, sys, subprocess, os, glob
W = sys.argv[1]
def get(url, fn):
    if not os.path.exists(fn): subprocess.run(['curl','-sSL','--max-time','40','-o',fn,url])
    return open(fn, encoding='utf-8', errors='replace').read()
def clean(s):
    s = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>|<iframe.*?</iframe>', '', s, flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)); return re.sub(r'\s+', ' ', s).strip()
out = []
# Solis
for fn in sorted(glob.glob(W + '/solis/*-*.html')):
    t = open(fn, encoding='utf-8', errors='replace').read()
    m = re.search(r'<h2 itemprop="headline">(.*?)</h2>', t, re.S)
    body = re.search(r'<div itemprop="articleBody">(.*?)<div class="os-gallery', t, re.S)
    b = body.group(1) if body else ''
    paras = [clean(p) for p in re.findall(r'<(?:p|li)[^>]*>(.*?)</(?:p|li)>', b, re.S)]
    paras = [p for p in paras if p and p != '\xa0']
    imgs = list(dict.fromkeys(re.findall(r'href="(https://www\.solisbelgium\.be/images/com_osgallery/[^"]+/original/[^"]+)"', t)))
    vign = re.search(r'class="pull-left item-image"> <img\s+src="([^"]+)"', t)
    pdfs = list(dict.fromkeys('https://www.solisbelgium.be' + p if p.startswith('/') else p for p in re.findall(r'href="([^"]+\.pdf)"', b)))
    vids = re.findall(r'(https://www\.youtube\.com/embed/[\w-]+)', b)
    out.append({'brand':'Solis','url':'https://www.solisbelgium.be/fr/tracteurs/'+os.path.basename(fn)[:-5],'name':clean(m.group(1)) if m else '',
      'paragraphs':paras,'images':([ 'https://www.solisbelgium.be'+vign.group(1)] if vign else [])+imgs,'pdfs':pdfs,'videos':vids,'specs':{},'price_from':None})
# Iseki
for series in sorted(glob.glob(W + '/iseki/tracteurs-de-*.html')):
    st = open(series, encoding='utf-8', errors='replace').read()
    for url in sorted(set(re.findall(r'href="(https://www\.iseki\.fr/produit/[^"]+)"', st))):
        fn = W + '/iseki/p-' + url.rstrip('/').split('/')[-1] + '.html'
        t = get(url, fn)
        name = clean(re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S).group(1)) if '<h1' in t else ''
        labels = re.findall(r'<div class="sub-spec cell ([\w-]+)">\s*(.*?)\s*</div>', t, re.S)
        lab = {k: clean(v) for k, v in labels}
        vals = re.findall(r'<div class="cell sub-spec-value ([\w-]+)">\s*<div class="hidden-md-up">.*?</div>(.*?)</div>', t, re.S)
        specs = {}
        for k, v in vals:
            v = clean(v)
            if v and lab.get(k) and lab[k] not in specs: specs[lab[k]] = v
        pf = re.search(r'à partir de\s*([\d\s .]+)\s*€\s*HT', clean(t))
        d = re.search(r'id="description".*?</h\d>(.*?)</div>', t, re.S)
        desc = clean(d.group(1)) if d else ''
        if not desc:
            x = clean(t); i = x.find(' description Con'); desc = x[i+13:i+900] if i > 0 else ''
        imgs = list(dict.fromkeys(re.sub(r'-\d+x\d+(\.\w+)$', r'\1', u) for u in re.findall(r'src="(https://www\.iseki\.fr/wp-content/uploads/[^"]+-555x400\.(?:png|jpg))"', t)))
        pdfs = list(dict.fromkeys(re.findall(r'href="(https://www\.iseki\.fr/wp-content/uploads/[^"]+\.pdf)"', t)))
        vids = list(dict.fromkeys(re.findall(r'youtube(?:-nocookie)?\.com/embed/([\w-]+)', t)))
        out.append({'brand':'Iseki','url':url,'series':os.path.basename(series)[:-5],'name':name,'paragraphs':[desc],'images':imgs,'pdfs':pdfs,
          'videos':['https://www.youtube.com/embed/'+v for v in vids],'specs':specs,'price_from':float(re.sub(r'\D','',pf.group(1))) if pf else None})
json.dump(out, open(W + '/others.json', 'w'), ensure_ascii=False, indent=1)
for o in out: print(o['brand'],'|',o['name'],'|',len(o['images']),'img |',len(o['specs']),'specs |',o['price_from'],'|',o['pdfs'][:1])
