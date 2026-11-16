import re, html, json, sys, subprocess, os
W = sys.argv[1]
MAP = {'100-solis-20-fl-nl': '20-FL', '201-solis-26-shuttle-9-9': '26-SHUTTLE-9-9', '220-solis162': '16', '238-solis-26hst-cab': '26-HST-CAB',
       '239-solis-s50-stage-v-2': '50-STAGE-V', '248-solis-26-xlplus': '26-XL-PLUS', '265-solis22nl': '22', '271-solis-s75-stage-5': '75-STAGE-V',
       '273-solis-s90-stage-5': '90-STAGE-V', '306-solis-75-narrow-2': '75-NARROW', '49-solis26hstnl': '26-HST', '55-solis-90-narrow-nl': '90-NARROW',
       '58-solis-60-nl': '60-STAGE-V'}
def clean(s):
    s = re.sub(r'<script.*?</script>|<style.*?</style>|<iframe.*?</iframe>', '', s, flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s)); return re.sub(r'\s+', ' ', s).strip()
out = {}
for slug, key in MAP.items():
    fn = f'{W}/solis/nl-{slug}.html'
    if not os.path.exists(fn): subprocess.run(['curl', '-sSL', '--max-time', '40', '-o', fn, f'https://www.solisbelgium.be/nl/gamma/{slug}'])
    t = open(fn, encoding='utf-8', errors='replace').read()
    m = re.search(r'<h2 itemprop="headline">(.*?)</h2>', t, re.S)
    body = re.search(r'<div itemprop="articleBody">(.*?)(?:<div class="os-gallery|</div>\s*</div>\s*</main>)', t, re.S)
    paras = [clean(p) for p in re.findall(r'<(?:p|li)[^>]*>(.*?)</(?:p|li)>', body.group(1) if body else '', re.S)]
    paras = [p for p in paras if p and len(p) > 2]
    out[key] = {'name': clean(m.group(1)) if m else '', 'paragraphs': paras}
json.dump(out, open(W + '/solis-nl.json', 'w'), ensure_ascii=False, indent=1)
for k, v in out.items(): print(k, '|', v['name'], '|', (v['paragraphs'] or [''])[0][:80])
