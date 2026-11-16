import re, html, json, sys, subprocess, os
OUT = sys.argv[1]
B = 'https://www.herco-machinery.com'
cats = {
 'electrique': '/fr/produits/farmtrac-1/tracteurs-electriques',
 'compact-18-30': '/fr/produits/farmtrac-1/tracteurs-compact-18cv-30cv',
 'compact-30-50': '/fr/produits/farmtrac-1/tracteurs-compact-30cv-50cv',
 'plus-70': '/fr/produits/farmtrac-1/tracteurs-70cv',
 'options': '/fr/produits/farmtrac-1/tracteurs-options',
}
def get(url):
    fn = os.path.join(OUT, re.sub(r'[^a-z0-9]+', '_', url.lower())[-120:] + '.html')
    if not os.path.exists(fn):
        subprocess.run(['curl', '-sSL', '--max-time', '40', '-o', fn, url], check=False)
    return open(fn, encoding='utf-8', errors='replace').read()
def clean(s):
    s = re.sub(r'<svg.*?</svg>', '', s, flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)); return re.sub(r'\s+', ' ', s).strip()
def money(s):
    return float(s.replace(' ','').replace(' ', '').replace('.', '').replace(',', '.'))
res = []
for cat, path in cats.items():
    t = get(B + path)
    links = sorted(set(re.findall(r'href="(?:https://www\.herco-machinery\.com)?(' + re.escape(path) + r'/[^"#?]+)"', t)))
    for l in links:
        p = get(B + l)
        item = {'category': cat, 'url': B + l}
        m = re.search(r'<h1[^>]*>(.*?)</h1>', p, re.S); item['name'] = clean(m.group(1)) if m else None
        u = re.search(r'<ul class="product-usps">(.*?)</ul>', p, re.S)
        item['usps'] = [clean(x) for x in re.findall(r'<li>(.*?)</li>', u.group(1), re.S)] if u else []
        d = re.search(r'class="read-more-content"[^>]*>(.*?)</div>', p, re.S); item['description'] = clean(d.group(1)) if d else ''
        variants = re.findall(r'<option value="(\d+)">(.*?)</option>', p)
        if not variants:
            m2 = re.search(r'id="product-price-(\d+)"', p); variants = [(m2.group(1), item['name'])] if m2 else []
        item['variants'] = []
        for vid, vname in variants:
            v = {'id': vid, 'name': clean(vname)}
            blk = re.search(r'id="product-price-' + vid + r'"(.*?)(?:Configurez votre machine|id="product-price-|</section>)', p, re.S)
            if blk:
                b = blk.group(1)
                prices = re.findall(r'([\d .]+,\d{2}) €\s*<span class="price_note">hors TVA', b)
                v['prices_ht'] = [money(x) for x in prices]
                v['has_promo'] = 'promo-price' in b
                v['note'] = clean(re.search(r'class="price-note">(.*?)</div>', b, re.S).group(1)) if 'price-note">' in b else ''
            g = re.search(r'id="images-' + vid + r'"(.*?)(?:id="images-\d+"|<div class="col-md-6">)', p, re.S)
            if g:
                gg = g.group(1)
                v['images'] = list(dict.fromkeys(re.findall(r'href="(/cache/upload/(?:files|images)/[^"]+)"', gg)))
                s = re.search(r'data-folder="([^"]+)"\s*data-filename-x="([^"]+)"\s*data-amount-x="(\d+)"', gg)
                if s: v['spin'] = {'folder': B + s.group(1), 'pattern': s.group(2), 'frames': int(s.group(3))}
            item['variants'].append(v)
        tables = re.findall(r'<table.*?</table>', p, re.S)
        specs = []
        item['spec_tables'] = []
        for tb in tables:
            cur = []
            for row in re.findall(r'<tr.*?</tr>', tb, re.S):
                cells = [clean(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row, re.S)]
                if len(cells) >= 2 and cells[0]: cur.append(cells[:2])
            item['spec_tables'].append(cur)
            for row in re.findall(r'<tr.*?</tr>', tb, re.S):
                cells = [clean(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row, re.S)]
                if any(cells): specs.append(cells)
        item['specs'] = specs
        dl = re.findall(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>', p, re.S)
        if dl: item['specs'] += [[clean(a), clean(b)] for a, b in dl]
        item['pdfs'] = list(dict.fromkeys(B + x if x.startswith('/') else x for x in re.findall(r'href="([^"]+\.pdf)"', p, re.I)))
        item['videos'] = list(dict.fromkeys(re.findall(r'(https?://(?:www\.)?(?:youtube\.com/embed/|youtu\.be/|youtube\.com/watch\?v=|player\.vimeo\.com/video/)[\w-]+)', p)))
        res.append(item)
json.dump(res, open(os.path.join(OUT, 'farmtrac.json'), 'w'), ensure_ascii=False, indent=1)
print(len(res), 'pages')
