"""Convertit les données relevées sur herco-machinery.com, solisbelgium.be et iseki.fr
vers les fichiers d'import du configurateur (produits.csv, options.csv).
Aucune valeur n'est inventée : un champ absent de la source reste vide."""
import csv, json, re, sys, os, unicodedata, subprocess

W, OUT = sys.argv[1], sys.argv[2]
DATE = '13/11/2026'
os.makedirs(OUT, exist_ok=True)

P_COLS = ['reference', 'type', 'marque', 'categorie', 'famille', 'nom_famille', 'nom_famille_nl', 'nom_fr', 'nom_nl', 'description_fr', 'description_nl',
          'points_forts_fr', 'points_forts_nl', 'prix_ht', 'disponibilite', 'delai', 'puissance_ch', 'transmission',
          'poids_kg', 'attelage', 'prise_de_force', 'capacite_relevage_kg', 'largeur_outil_max_cm', 'largeur_cm',
          'usages', 'largeur_travail_cm', 'puissance_min_ch', 'puissance_max_ch', 'montage', 'necessite_pdf',
          'caracteristiques', 'photos', 'video', 'brochure', 'vue360_url', 'vue360_images', 'modele3d_url',
          'source', 'notes', 'actif', 'ordre']
O_COLS = ['reference', 'groupe', 'nom_fr', 'nom_nl', 'description_fr', 'description_nl', 'prix_ht', 'photo', 'tracteurs',
          'par_defaut', 'necessite_une_de', 'exclut', 'visuel', 'fonction', 'pneu_avant', 'pneu_arriere', 'largeur_cm',
          'source', 'actif', 'ordre']

NL_FR = [
    (r'(?i)\bklepelmaaier\b', 'tondeuse à fléaux'), (r'(?i)\bmet frontwielen\b', 'avec roues avant'), (r'(?i)\bzaaicombinatie\b', 'combiné de semis'),
    (r'(?i)\bgrondfrees\b', 'fraise rotative'), (r'(?i)\bovertopfrees\b', 'enfouisseuse'), (r'(?i)\bgegalvaniseerd\b', 'galvanisé'),
    (r'(?i)\belektrisch\b', 'électrique'), (r'(?i)\bzero turn maaier\b', 'tondeuse zero turn'), (r'(?i)\benkelasser\b', 'simple essieu'),
    (r'(?i)\bjoystickbediening\b', 'commande joystick'), (r'(?i)\bhydraulische paalmaaier\b', 'tondeuse à poteaux hydraulique'),
    (r'(?i)\btrailer\b', 'remorque'), (r'(?i)\btractor\b', 'tracteur'), (r'(?i)\bmanueel\b', 'mécanique'), (r'(?i)\bhydrostaat\b', 'hydrostatique'),
    (r'(?i)\bgazonbanden\b', 'pneus gazon'), (r'(?i)\bindustriebanden\b', 'pneus industriels'), (r'(?i)\bbanden\b', 'pneus'),
    (r'(?i)\bvoor ROPS-beugel\b', 'pour arceau ROPS'), (r'(?i)\bdubbelwerkend ventiel\b', 'distributeur double effet'),
    (r'(?i)\bPneux\b', 'pneus'), (r'(?i)\bFleaux\b', 'fléaux'), (r'(?i)\bTondeuse A\b', 'tondeuse à'),
]
def fr(s):
    for a, b in NL_FR: s = re.sub(a, b, s)
    return re.sub(r'\s+', ' ', s).strip()

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def num(s):
    if s is None: return None
    m = re.search(r'\d[\d .]*(?:,\d+)?', str(s).replace(' ', ' '))
    if not m: return None
    t = m.group(0).strip()
    if ',' in t: t = t.replace('.', '').replace(' ', '').replace(',', '.')
    else: t = t.replace(' ', '').replace('.', '') if re.search(r'\.\d{3}\b', t) else t.replace(' ', '')
    try: return float(t)
    except ValueError: return None

def fmt_num(v):
    if v is None: return ''
    return str(int(v)) if float(v).is_integer() else str(v).replace('.', ',')

def price(v):
    return '' if v is None else f'{v:.2f}'.replace('.', ',')

def spec(table, *keys):
    for k in keys:
        for a, b in table:
            if a.strip().lower() == k.lower() and b.strip() not in ('', '-', 'NVT'): return b.strip()
    return None

def specs_str(table):
    seen, out = set(), []
    for a, b in table:
        if a in seen or not b or b in ('-', 'NVT'): continue
        seen.add(a); out.append(f'{a}: {b}'.replace('|', '/'))
    return ' | '.join(out)

H = 'https://www.herco-machinery.com'
def full(u): return u if u.startswith('http') else H + u
def big(u): return full(u)  # seules les tailles publiées par Herco existent (600x600)

products, options = [], []
NL = json.load(open(W + '/herco-nl.json')) if os.path.exists(W + '/herco-nl.json') else {}
NL_VAR = {vid: name for page in NL.values() for vid, name in page['variants'].items()}
OPT_NL = [
    ('Pneus agraires larges', 'Brede landbouwbanden'), ('Pneus agraires (monte de série)', 'Landbouwbanden (standaard)'), ('Pneus agraires', 'Landbouwbanden'),
    ('Pneus industriels étroits', 'Smalle industriebanden'), ('Pneus industriels', 'Industriebanden'), ('Pneus gazon étroits', 'Smalle gazonbanden'),
    ('Pneus gazon Garden Galaxy Pro', 'Gazonbanden Garden Galaxy Pro'), ('Pneus gazon Galaxy', 'Gazonbanden Galaxy'), ('Pneus gazon', 'Gazonbanden'),
    ('Pneus radiaux', 'Radiaalbanden'), ('Pneus 8x18', 'Banden 8x18'),
    ('Arceau de sécurité rabattable (de série)', 'Opklapbare veiligheidsbeugel (standaard)'), ('Arceau de sécurité (ROPS)', 'Veiligheidsbeugel (ROPS)'),
    ('Cabine Farmtrac chauffée avec radio', 'Farmtrac cabine met verwarming en radio'), ('Cabine (de série)', 'Cabine (standaard)'), ('Cabine', 'Cabine'),
    ('2 distributeurs hydrauliques double effet', '2 dubbelwerkende hydraulische ventielen'), ('Set de contrepoids 4 × 30 kg', 'Set contragewichten 4 × 30 kg'),
    ('Relevage avant', 'Fronthefinrichting'), ('Chargeur frontal Farmtrac', 'Farmtrac frontlader'), ('Godet standard 1 200 mm', 'Standaardbak 1.200 mm'),
    ('Godet pélican 4 en 1, 1 200 mm', '4-in-1 pelikaanbak 1.200 mm'), ('Fourches à palettes 500 kg', 'Palletvork 500 kg'),
    ('3e fonction hydraulique sur chargeur', '3e hydraulische functie op de lader'),
]
def opt_nl(fr):
    for a_, b_ in OPT_NL:
        if fr.startswith(a_): return b_ + fr[len(a_):]
    return ''
def nl_page(url):
    return NL.get(url) or {}
def P(**kw):
    row = {c: '' for c in P_COLS}; row.update({k: ('' if v is None else v) for k, v in kw.items()}); row['actif'] = row['actif'] or 'oui'
    products.append(row)
def O(**kw):
    row = {c: '' for c in O_COLS}; row.update({k: ('' if v is None else v) for k, v in kw.items()}); row['actif'] = row['actif'] or 'oui'
    options.append(row)

PRICE_NOTE = f"Prix public HT relevé sur herco-machinery.com le {DATE} : à vérifier avant publication."

# ───────────────────────── Farmtrac (Herco) ─────────────────────────
ft = json.load(open(W + '/herco/farmtrac.json'))
REFS = {
    'Farmtrac 25CV éléctrique': 'FT25G-E', 'Farmtrac 22 CV mécanique': 'FT22-MT', 'Farmtrac 26 CV hydrostatique': 'FT26-HST',
    'Farmtrac 26 CV mécanique': 'FT26-MT', 'Farmtrac 26CV PRO hydrostatique': 'FT26PRO-HST', 'Farmtrac 26CV PRO mécanique': 'FT26PRO-MT',
    'Farmtrac FT 20 MT tracteur compact': 'FT20-MT', 'Farmtrac 50PK': 'FT6050', 'Farmtrac 75CV avec cabine': 'FT6075E',
    'Farmtrac 75CV étroit avec cabine': 'FT6075E-N',
}
def tire_kind(name):
    n = name.lower()
    if 'galaxy' in n: return 'galaxy', 'Pneus gazon Garden Galaxy Pro'
    if 'gazon' in n or 'gazonbanden' in n:
        return 'gazon', 'Pneus gazon étroits' if re.search(r'étroit|small|etroit', n) else 'Pneus gazon'
    if 'industri' in n:
        return 'industriel', 'Pneus industriels étroits' if re.search(r'étroit|ètroit|compact', n) else 'Pneus industriels'
    return 'agraire', 'Pneus agraires larges' if 'large' in n else 'Pneus agraires'

ord_ = 0
for item in ft:
    if item['category'] == 'options': continue
    ref = REFS[item['name']]; ord_ += 10
    variants = [v for v in item['variants'] if not v['name'].strip().endswith('km')]
    tables = item.get('spec_tables', [])
    base_i = 0
    priced = [(i, v['prices_ht'][0]) for i, v in enumerate(variants) if v.get('prices_ht')]
    if priced: base_i = min(priced, key=lambda x: x[1])[0]
    base = variants[base_i]
    tb = tables[base_i] if base_i < len(tables) else (tables[0] if tables else [])
    usps = item['usps']
    lift = num(spec(tb, 'Capacité de relevage (kg)')) or next((num(u) for u in usps if 'relevage' in u.lower() or 'levage' in u.lower()), None)
    pto = spec(tb, 'PTO (tpm)') or next((u.replace('PDF', '').strip() for u in usps if u.startswith('PDF')), None)
    width = num(spec(tb, 'Largeur (cm)'))
    if width is None and spec(tb, 'Largeur (mm)'): width = num(spec(tb, 'Largeur (mm)')) / 10
    kinds = set(tire_kind(v['name'])[0] for v in variants)
    usages = []
    if kinds & {'agraire'}: usages += ['prairie', 'maraichage']
    if kinds & {'gazon', 'galaxy'}: usages += ['pelouse']
    if kinds & {'industriel'}: usages += ['cour']
    spin = base.get('spin')
    imgs = [big(u) for u in base.get('images', [])]
    if spin:  # la 1re vue 360° montre le tracteur entier (les photos de variante montrent parfois seulement le pneu)
        imgs = [spin['folder'] + spin['pattern'].replace('{index}', '1')] + imgs
    hp = num(spec(tb, 'CV'))
    if hp is None: hp = num(re.search(r'(\d+)\s*CV', item['name']).group(1))
    cat = item['category'].replace('plus-70', 'plus-50')
    has_promo = base.get('has_promo') and len(base.get('prices_ht') or []) > 1
    note = PRICE_NOTE + (f" Prix promotionnel Herco « valable pour des produits en stock » ; prix normal : {price(base['prices_ht'][1])} € HT." if has_promo else '')
    note += ' Usages déduits des pneus disponibles.'
    brochure = next((p for p in item['pdfs'] if 'Prijslijst' not in p), '')
    P(reference=ref, type='tracteur', marque='Farmtrac', categorie=cat,
      nom_fr=re.sub(r'^Farmtrac ', '', item['name']).replace('éléctrique', 'électrique'),
      description_fr=item['description'], points_forts_fr='\n'.join(usps),
      nom_nl=re.sub(r'^Farmtrac ', '', nl_page(item['url']).get('name', '')), description_nl=nl_page(item['url']).get('description', ''),
      points_forts_nl='\n'.join(nl_page(item['url']).get('usps', [])),
      prix_ht=price(base['prices_ht'][0]) if base.get('prices_ht') else '', disponibilite='sur_commande',
      puissance_ch=fmt_num(hp), transmission=spec(tb, 'Transmission') or '', poids_kg=fmt_num(num(spec(tb, 'Poids (kg)'))),
      prise_de_force=pto or '', capacite_relevage_kg=fmt_num(lift), largeur_cm=fmt_num(width), usages=';'.join(dict.fromkeys(usages)),
      caracteristiques=specs_str(tb), photos=' | '.join(imgs), brochure=brochure,
      vue360_url=(spin['folder'] + spin['pattern'].replace('{index}', '{frame}')) if spin else '', vue360_images=spin['frames'] if spin else '',
      source=item['url'], notes=note, ordre=ord_)
    # Pneumatiques = variantes Herco
    if len(variants) > 1 or tables:
        bp = base['prices_ht'][0] if base.get('prices_ht') else None
        for i, v in enumerate(variants):
            kind, label = tire_kind(v['name'])
            t = tables[i] if i < len(tables) else []
            p = v['prices_ht'][0] if v.get('prices_ht') else None
            delta = round(p - bp, 2) if (p is not None and bp is not None) else None
            w = num(spec(t, 'Largeur (cm)'))
            if w is None and spec(t, 'Largeur (mm)'): w = num(spec(t, 'Largeur (mm)')) / 10
            O(reference=f'{ref}-PN-{i+1}', groupe='pneus', nom_fr=label, prix_ht=price(delta) if delta is not None else '',
              photo=big(v['images'][0]) if v.get('images') else '', tracteurs=ref, par_defaut=ref if i == base_i else '',
              visuel=kind, pneu_avant=spec(t, 'Taille des pneus avant') or '', pneu_arriere=spec(t, 'Taille des pneus arrière') or '',
              largeur_cm=fmt_num(w), source=item['url'],
              description_fr=f"Variante Herco : {fr(v['name'])}. Prix = différence avec la version de base.", ordre=i)
    # Poste de conduite
    txt = (item['description'] + ' ' + ' '.join(v['name'] for v in variants)).lower()
    if 'cabin' in txt or 'cabine' in item['name'].lower():
        O(reference=f'{ref}-CABINE', groupe='poste', nom_fr='Cabine (de série)', prix_ht='0,00', tracteurs=ref, par_defaut=ref, visuel='cabine', source=item['url'], ordre=1)
    elif re.search(r'barre de sécurité|arceau|rops', txt):
        O(reference=f'{ref}-ARCEAU', groupe='poste', nom_fr='Arceau de sécurité rabattable (de série)', prix_ht='0,00', tracteurs=ref, par_defaut=ref, visuel='arceau', source=item['url'], ordre=1)

# Catégorie d'attelage relevée dans les brochures Farmtrac (catalogue Agri, fiches FT26 / FT26 HST / FT26 PRO / 6050).
FT_HITCH = {'FT6050': 'Cat. I/II', 'FT6075E': 'Cat. II', 'FT6075E-N': 'Cat. I/II', 'FT26-HST': 'Cat. 1N', 'FT26-MT': 'Cat. 1N', 'FT26PRO-HST': 'Cat. 1N', 'FT26PRO-MT': 'Cat. 1N'}
for row in products:
    if row['reference'] in FT_HITCH: row['attelage'] = FT_HITCH[row['reference']]
compacts = [r for n, r in REFS.items() if r.startswith(('FT20', 'FT22', 'FT26'))]
ft26 = [r for r in compacts if r.startswith('FT26')]
opt_items = {i['name']: i for i in ft if i['category'] == 'options'}
def ovar(name, idx=0):
    it = opt_items[name]; vs = [v for v in it['variants'] if not v['name'].strip().endswith('km')]; return it, vs[idx]
# Cabines
it, v = ovar('Farmtrac cabine tracteur compact', 0)
cab_desc = 'Chauffage, radio. ' + specs_str((it.get('spec_tables') or [[]])[0])
for vi, targets in ((0, ['FT26-MT']), (1, ['FT26-HST'])):
    it, v = ovar('Farmtrac cabine tracteur compact', vi)
    O(reference=f'FT-CABINE-{targets[0]}', groupe='poste', nom_fr='Cabine Farmtrac chauffée avec radio', description_fr=f"{v['name']}. {cab_desc}",
      prix_ht=price(v['prices_ht'][0]) if v.get('prices_ht') else '', photo=big(v['images'][0]) if v.get('images') else '',
      tracteurs=';'.join(targets), visuel='cabine', source=it['url'], ordre=2)
it, v = ovar('2x prise hydraulique à double fonction')
O(reference='FT-DISTRIB-2DE', groupe='option', nom_fr='2 distributeurs hydrauliques double effet', description_fr=fr(v['name']) + '. ' + ' · '.join(it['usps']),
  prix_ht=price(v['prices_ht'][0]) if v.get('prices_ht') else '', tracteurs=';'.join(compacts), fonction='distributeurs', source=it['url'], ordre=10)
it, v = ovar('Farmtrac contrepoids')
O(reference='FT-CONTREPOIDS-4X30', groupe='option', nom_fr='Set de contrepoids 4 × 30 kg', description_fr=v['name'], prix_ht='',
  tracteurs=';'.join(compacts), fonction='masses', source=it['url'], ordre=20)
it, v = ovar('Farmtrac relevage frontal tracteur compact')
O(reference='FT-RELEVAGE-AV-FT26', groupe='option', nom_fr='Relevage avant', description_fr=v['name'] + '. ' + specs_str((it.get('spec_tables') or [[]])[0]),
  prix_ht=price(v['prices_ht'][0]), tracteurs=';'.join(ft26), fonction='relevage-avant', visuel='relevage-avant', source=it['url'], ordre=30)
# Chargeurs
loaders = [(0, 'FT-CHARGEUR-FT26', ft26), (1, 'FT-CHARGEUR-FT20-22', ['FT20-MT', 'FT22-MT']), (2, 'FT-CHARGEUR-FT6050', ['FT6050']), (3, 'FT-CHARGEUR-FT6075', ['FT6075E', 'FT6075E-N'])]
it_l = opt_items['Farmtrac chargeur frontale']
lt = it_l.get('spec_tables') or []
for vi, ref, targets in loaders:
    it, v = ovar('Farmtrac chargeur frontale', vi)
    O(reference=ref, groupe='chargeur', nom_fr='Chargeur frontal Farmtrac', description_fr=v['name'] + ('. ' + specs_str(lt[vi]) if vi < len(lt) else ''),
      prix_ht=price(v['prices_ht'][0]) if v.get('prices_ht') else '', photo=big(v['images'][0]) if v.get('images') else '',
      tracteurs=';'.join(targets), visuel='chargeur', fonction='chargeur', source=it['url'], ordre=vi)
compact_loaders = 'FT-CHARGEUR-FT26;FT-CHARGEUR-FT20-22'
tools = [(0, 'FT-GODET-1200', 'Godet standard 1 200 mm'), (1, 'FT-PELICAN-1200', 'Godet pélican 4 en 1, 1 200 mm'),
         (2, 'FT-FOURCHE-PALETTE', 'Fourches à palettes 500 kg'), (3, 'FT-3E-FONCTION', '3e fonction hydraulique sur chargeur')]
for vi, ref, label in tools:
    it, v = ovar('Farmtrac chargeur frontale - options', vi)
    O(reference=ref, groupe='outil', nom_fr=label, description_fr=v['name'], prix_ht=price(v['prices_ht'][0]) if v.get('prices_ht') else '', photo=big(v['images'][0]) if v.get('images') else '',
      tracteurs=';'.join(compacts), necessite_une_de=compact_loaders, source=it['url'], ordre=vi)

# ───────────────────────── Iseki (iseki.fr) ─────────────────────────
# Iseki ne publie qu'en français : descriptions traduites en néerlandais (fichier iseki-nl.json).
ISEKI_NL = json.load(open(W + '/iseki-nl.json')) if os.path.exists(W + '/iseki-nl.json') else {}
others = json.load(open(W + '/others.json'))
def iseki_images(url):
    fn = W + '/iseki/p-' + url.rstrip('/').split('/')[-1] + '.html'
    t = open(fn, encoding='utf-8', errors='replace').read()
    gallery = list(dict.fromkeys(re.findall(r'data-thumb="(https://www\.iseki\.fr/wp-content/uploads/[^"]+)"', t)))
    if gallery: return gallery[:8]  # galerie officielle de la fiche produit
    code = re.search(r'/produit/[^/]*?(tm\d{4}|txg\w*?\d+|th\d{4}|tle?\d{4}|tg\d{4})', url, re.I)
    urls = re.findall(r'(https://www\.iseki\.fr/wp-content/uploads/[^"\s\']+\.(?:png|jpg|jpeg|webp))', t)
    keep = []
    for u in urls:
        base = re.sub(r'-\d+x\d+(\.\w+)$', r'\1', u)
        name = base.rsplit('/', 1)[-1].lower()
        if any(k in name for k in ('facebook', 'instagram', 'youtube', 'linkedin', 'logo', 'icon')): continue
        if code and code.group(1).lower()[:6] not in name.replace('-', ''): continue
        if base not in keep: keep.append(base)
    return keep[:8]
def iseki_cat(hp):
    if hp is None: return 'compact-18-30'
    return 'compact-18-30' if hp <= 30 else 'compact-30-50' if hp <= 50 else 'plus-50'
for o in [x for x in others if x['brand'] == 'Iseki']:
    s = o['specs']; ord_ += 10
    name = re.sub(r'^(Tracteurs?|TRACTEURS)( ISEKI)?\s*[-–]?\s*|\s*ISEKI$', '', o['name'], flags=re.I).strip()
    name = re.sub(r'^ISEKI\s+', '', name, flags=re.I)
    kw = num(s.get('Puissance nette (ECE-R24)') or s.get('Puissance nette ECE-R120') or s.get('Puissance nette (ECE-R120)'))
    hpmax = num(s.get('Puissance Maxi')) if re.search(r'\d', s.get('Puissance Maxi') or '') else None
    hp = hpmax if hpmax else (round(kw * 1.36, 1) if kw else None)
    ref = 'ISEKI-' + slug(name).upper()[:40]
    dims = re.findall(r'\d[\d ]*', (s.get('L x l min-max x h (RA)') or '').replace(' ', ' '))
    width = None
    m = re.search(r'x\s*([\d ]+)(?:-[\d ]+)?\s*x', s.get('L x l min-max x h (RA)') or s.get('L x l min-max x h (RA) Arceau/Cabine') or '')
    if m: width = num(m.group(1)) / 10
    tires = []
    for key, kind, label in (('Agraires AV / AR', 'agraire', 'Pneus agraires'), ('Agraires larges AV / AR', 'agraire', 'Pneus agraires larges'),
                             ('Gazon AV / AR', 'gazon', 'Pneus gazon'), ('Industriels AV / AR', 'industriel', 'Pneus industriels')):
        v = s.get(key)
        if v and v.strip() not in ('-', ''):
            parts = [p.strip() for p in v.split('/', 1)] if v.count('/') == 1 else [v.strip(), '']
            tires.append((kind, label, parts[0], parts[1] if len(parts) > 1 else ''))
    usages = []
    kinds = {t[0] for t in tires}
    if 'agraire' in kinds: usages += ['prairie', 'maraichage']
    if 'gazon' in kinds: usages += ['pelouse']
    if 'industriel' in kinds: usages += ['cour']
    note = f"Données relevées sur iseki.fr le {DATE}. Puissance en ch calculée depuis les kW (× 1,36) si non indiquée."
    if o['price_from']: note += f" Prix public France indiqué « à partir de {price(o['price_from'])} € HT » : non repris, à fixer pour la Belgique."
    if not usages: note += ''
    else: note += ' Usages déduits des pneus disponibles.'
    desc_fr = o['paragraphs'][0] if o['paragraphs'] else ''
    desc_nl = next((v for k, v in ISEKI_NL.items() if desc_fr.startswith(k)), '')
    if desc_nl and 'TG6687HMWJCYE permet' in desc_fr:
        desc_nl += ' Het nieuwe model TG6687HMWJCYE biedt meer vermogen en een comfortabele cabine met airco.'
    P(nom_nl=name, description_nl=desc_nl, reference=ref, type='tracteur', marque='Iseki', categorie={'tm':'compact-18-30','txg':'compact-18-30','th':'compact-30-50','tl':'compact-30-50','tg6':'plus-50'}[re.search(r'serie-(\w+)$', o['series']).group(1)], nom_fr=name, description_fr=o['paragraphs'][0] if o['paragraphs'] else '',
      prix_ht='', disponibilite='sur_commande', puissance_ch=fmt_num(hp), transmission=s.get('Type de boîte de vitesse', ''),
      poids_kg=fmt_num(num(s.get('POM – Poids en Ordre de Marche') or s.get('POM Arceau/Cabine'))), attelage=re.sub(r'(?i)type crochet\s*', '', (s.get('Relevage AR') or '')).replace('catégorie', 'Cat.').replace('Catégorie', 'Cat.').replace('cat.', 'Cat.'),
      prise_de_force=(s.get('Vitesses') or '').replace(' tr/min', ''), capacite_relevage_kg=fmt_num(num(s.get('Capacité de relevage') or s.get('Capacité de relevage maxi'))),
      largeur_cm=fmt_num(width), usages=';'.join(dict.fromkeys(usages)),
      caracteristiques=' | '.join(f'{k}: {v}'.replace('|', '/') for k, v in s.items() if v and v.strip() not in ('-', '- CV')),
      photos=' | '.join(iseki_images(o['url'])), video=o['videos'][0] if o['videos'] else '', brochure=o['pdfs'][0] if o['pdfs'] else '',
      source=o['url'], notes=note, ordre=ord_)
    for i, (kind, label, av, ar) in enumerate(tires):
        O(reference=f'{ref}-PN-{i+1}', groupe='pneus', nom_fr=label, prix_ht='', tracteurs=ref, par_defaut=ref if i == 0 else '',
          visuel=kind, pneu_avant=av, pneu_arriere=ar, source=o['url'], ordre=i,
          description_fr='Prix à compléter (non publié).' if i else 'Monte de base indiquée en premier sur la fiche.')

# ───────────────────────── Solis (solisbelgium.be + brochure 12/2025) ─────────────────────────
SOLIS_NL = json.load(open(W + '/solis-nl.json')) if os.path.exists(W + '/solis-nl.json') else {}
SOLIS_BROCHURE = 'https://www.solisbelgium.be/images/tracteurs/pdf/flyer_SOLIS_20_PAGES_12-2025_.pdf'
COMPACT_TIRES = [('agraire', 'Pneus agraires', '', ''), ('industriel', 'Pneus industriels', '', ''), ('gazon', 'Pneus gazon', '', ''), ('galaxy', 'Pneus gazon Galaxy', '', '')]
def tires_from(std, opts):
    return [('agraire', 'Pneus agraires (monte de série)', std[0], std[1])] + list(opts)
S60_OPTS = [('agraire', 'Pneus agraires 9.5x24 / 16.9x28', '9.5x24', '16.9x28'), ('agraire', 'Pneus radiaux 250/85R24 / 420/85R28', '250/85R24', '420/85R28'),
            ('agraire', 'Pneus radiaux 280/85R24 / 420/85R28', '280/85R24', '420/85R28'), ('agraire', 'Pneus radiaux 320/70R24 / 480/70R28', '320/70R24', '480/70R28'),
            ('industriel', 'Pneus industriels 10-16.5 / 14.9-24', '10-16.5', '14.9-24'), ('industriel', 'Pneus industriels 12.5/80-18 / 18.4-24', '12.5/80-18', '18.4-24')]
NARROW_OPTS = [('agraire', 'Pneus radiaux 210/95R18 / 360/70R28', '210/95R18', '360/70R28'), ('agraire', 'Pneus radiaux 280/70R18 / 360/70R28', '280/70R18', '360/70R28'),
               ('agraire', 'Pneus radiaux 260/70R16 / 360/70R24', '260/70R16', '360/70R24'), ('agraire', 'Pneus radiaux 280/70R18 / 420/70R24', '280/70R18', '420/70R24'),
               ('agraire', 'Pneus radiaux 280/70R18 / 380/85R24', '280/70R18', '380/85R24'), ('agraire', 'Pneus 8x18 / 13.6x24', '8x18', '13.6x24')]
S75_OPTS = [('agraire', 'Pneus agraires 12.4x24 / 18.4x30', '12.4x24', '18.4x30'), ('agraire', 'Pneus radiaux 280/85R24 / 420/85R30', '280/85R24', '420/85R30'),
            ('agraire', 'Pneus radiaux 320/85R24 / 460/85R30', '320/85R24', '460/85R30'), ('agraire', 'Pneus radiaux 320/70R24 / 480/70R30', '320/70R24', '480/70R30'),
            ('agraire', 'Pneus radiaux 360/85R24 / 460/85R30', '360/85R24', '460/85R30')]
S90_OPTS = [('agraire', 'Pneus agraires 13.6x24 / 16.9x34', '13.6x24', '16.9x34'), ('agraire', 'Pneus radiaux 320/85R24 / 460/85R30', '320/85R24', '460/85R30'),
            ('agraire', 'Pneus radiaux 320/70R24 / 480/70R30', '320/70R24', '480/70R30'), ('agraire', 'Pneus radiaux 360/85R24 / 460/85R30', '360/85R24', '460/85R30'),
            ('agraire', 'Pneus radiaux 420/65R24 / 540/65R34', '420/65R24', '540/65R34')]
COMPACT_USES = 'prairie;maraichage;pelouse;cour'
# clé = suffixe de la référence ; (ch, transmission, relevage kg, attelage, PDF, poids kg, largeur cm, pneus, poste, usages, fiche)
SOLIS_SPECS = {
    '16': (16, '6 AV + 2 AR, sliding mesh', 500, 'Cat. 1N', '540 / 1000', 970, 94.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: ITL 3 cylindres, 979 cm³ | Vitesse max.: 15,1 km/h | Débit hydraulique: 12 l/min | Réservoir: 26 l | Empattement: 1420 mm'),
    '20-FL': (20, '6 AV + 2 AR, sliding mesh', 600, 'Cat. 1N', '540 / 1000', 970, 94.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: 3 cylindres Mitsubishi, 953 cm³ | Vitesse max.: 15,1 km/h | Débit hydraulique: 13,3 l/min | Réservoir: 26 l | Empattement: 1420 mm'),
    '22': (22, '6 AV + 2 AR, sliding mesh', 600, 'Cat. 1N', '540 / 1000', 1070, 107.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: ITL GTV BB, 1130 cm³ | Vitesse max.: 17 km/h | Débit hydraulique: 13,7 l/min | Réservoir: 26 l | Empattement: 1560 mm'),
    '26-XL-PLUS': (26, '6 AV + 2 AR, sliding mesh', 600, 'Cat. 1N', '540 / 1000', 1070, 107.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: 3 cylindres Mitsubishi, 1319 cm³ | Vitesse max.: 16,2 km/h | Débit hydraulique: 13,5 l/min | Réservoir: 28 l | Poids avec cabine: 1265 kg | Empattement: 1560 mm'),
    '26-HST': (26, 'Hydrostatique 2 gammes', 600, 'Cat. 1N', '540 (ventrale 2100)', 1235, 121.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: 3 cylindres Mitsubishi, 1319 cm³ | Vitesse max.: 21 km/h | Débit hydraulique: 16,5 l/min | Réservoir: 22 l | Empattement: 1570 mm'),
    '26-HST-CAB': (26, 'Hydrostatique 2 gammes', 600, 'Cat. 1N', '540 (ventrale 2100)', None, 121.5, COMPACT_TIRES, 'cabine', COMPACT_USES, 'Moteur: 3 cylindres Mitsubishi, 1319 cm³ | Vitesse max.: 21 km/h | Débit hydraulique: 16,5 l/min | Réservoir: 22 l | Empattement: 1570 mm'),
    '26-SHUTTLE-9-9': (26, '9 AV + 9 AR, inverseur synchronisé', 600, 'Cat. 1N', '540 / 540E', 1250, 121.5, COMPACT_TIRES, 'arceau', COMPACT_USES, 'Moteur: 3 cylindres Mitsubishi, 1319 cm³ | Vitesse max.: 21,5 km/h | Débit hydraulique: 17,8 l/min | Réservoir: 20 l | Empattement: 1570 mm'),
    '50-STAGE-V': (50, '12 AV + 12 AR, inverseur synchronisé', 2500, 'Cat. II', '540 / 540E', 2870, 188, tires_from(('9.5x20', '13.6x28'), [('agraire', 'Pneus radiaux 250/85R20 / 340/85R28', '250/85R20', '340/85R28')]), 'arceau-cabine', 'prairie;maraichage', 'Moteur: 3 cylindres 3065 cm³ CRDi Stage V | Puissance: 37,3 kW | Couple: 215 Nm | Débit hydraulique: 45 l/min | Distributeurs: 2 DE (3 en option) | Vitesse max.: 30 km/h | Réservoir: 72 l'),
    '60-STAGE-V': (58, '12 AV + 12 AR, inverseur synchronisé', 2500, 'Cat. II', '540 / 540E', 2780, 195, tires_from(('9.5x24', '14.9x28'), S60_OPTS), 'arceau-cabine', 'prairie;maraichage', 'Moteur: 3 cylindres 3065 cm³ CRDi Stage V | Puissance: 43,2 kW | Couple: 250 Nm | Débit hydraulique: 45 l/min | Distributeurs: 2 DE (3 en option) | Vitesse max.: 30 km/h | Poids cabine: 3340 à 3560 kg'),
    '75-STAGE-V': (75, '12 AV + 12 AR, inverseur synchronisé', 2500, 'Cat. II', '540 / 540E', 3550, 205, tires_from(('11.2x24', '16.9x30'), S75_OPTS), 'arceau-cabine', 'prairie;maraichage', 'Moteur: 4 cylindres 4087 cm³ CRDi Stage V | Puissance: 55,9 kW | Couple: 340 Nm | Relevage en option: 3000 kg | Débit hydraulique: 65 l/min | Vitesse max.: 35 km/h | Poids cabine: 3825 à 4245 kg'),
    '90-STAGE-V': (90, '12 AV + 12 AR, inverseur synchronisé', 3000, 'Cat. II', '540 / 540E', 4035, 205, tires_from(('12.4x24', '18.4x30'), S90_OPTS), 'arceau-cabine', 'prairie;maraichage', 'Moteur: 4 cylindres 4087 cm³ CRDi Stage V (AdBlue) | Puissance: 67,3 kW | Couple: 375 Nm | Relevage en option: 3500 kg | Débit hydraulique: 65 l/min | Vitesse max.: 35 km/h'),
    '75-NARROW': (73.5, '12 AV + 12 AR, inverseur synchronisé', 2500, 'Cat. II', '540 / 540E', 3295, 141, tires_from(('8.00-18', '14.9-24'), NARROW_OPTS), 'arceau-cabine', 'maraichage', 'Moteur: 4 cylindres 4088 cm³ Stage V | Puissance: 54,8 kW | Couple: 340 Nm | Débit hydraulique: 45 l/min | Vitesse max.: 30 km/h | Usage: vergers et vignes'),
    '90-NARROW': (90, '12 AV + 12 AR, Carraro synchronisé', 2500, 'Cat. II', None, 3295, 141, tires_from(('8.00-18', '14.9-24'), NARROW_OPTS), 'arceau-cabine', 'maraichage', 'Moteur: 4 cylindres 4087 cm³ Stage V | Couple: 375 Nm | Débit hydraulique: 45 l/min (65 en option) | Vitesse max.: 29 km/h | Rayon de braquage: 4,75 m | Usage: vergers et vignes'),
}
for o in [x for x in others if x['brand'] == 'Solis']:
    ord_ += 10
    txt = ' '.join(o['paragraphs'])
    m = re.search(r'(\d{2,3})\s*(?:CV|ch\b|chevaux)', txt)
    hp = float(m.group(1)) if m else None
    paras = [p for p in o['paragraphs'] if not p.lower().startswith(o['name'].lower()[:8]) or len(p) > 40]
    ref = 'SOLIS-' + slug(o['name']).upper()
    sspec = SOLIS_SPECS.get(ref.replace('SOLIS-SOLIS-', ''))
    extra = dict(brochure=o['pdfs'][0] if o['pdfs'] else '')
    note = f"Texte et photos relevés sur solisbelgium.be le {DATE}."
    if sspec:
        hp, trans, lift, hitch, pto, kg, wcm, tires, poste, usages, specs = sspec
        extra = dict(transmission=trans, capacite_relevage_kg=fmt_num(lift), attelage=hitch, prise_de_force=pto or '', poids_kg=fmt_num(kg),
                     largeur_cm=fmt_num(wcm), usages=usages, caracteristiques=specs, brochure=SOLIS_BROCHURE)
        note += ' Caractéristiques, pneus et versions tirés de la brochure Solis 12/2025.'
        for i, (kind, label, av, ar) in enumerate(tires):
            O(reference=f'{ref}-PN-{i+1}', groupe='pneus', nom_fr=label, prix_ht='0,00' if i == 0 else '', tracteurs=ref, par_defaut=ref if i == 0 else '',
              visuel=kind, pneu_avant=av, pneu_arriere=ar, source=SOLIS_BROCHURE, ordre=i, description_fr='' if i == 0 else 'Option : prix à confirmer.')
        if poste in ('arceau', 'arceau-cabine'):
            O(reference=f'{ref}-ARCEAU', groupe='poste', nom_fr='Arceau de sécurité (ROPS)', prix_ht='0,00', tracteurs=ref, par_defaut=ref, visuel='arceau', source=SOLIS_BROCHURE, ordre=1)
        if poste == 'arceau-cabine':
            O(reference=f'{ref}-CABINE', groupe='poste', nom_fr='Cabine', description_fr='Version cabine : prix à confirmer.', prix_ht='', tracteurs=ref, visuel='cabine', source=SOLIS_BROCHURE, ordre=2)
        if poste == 'cabine':
            O(reference=f'{ref}-CABINE', groupe='poste', nom_fr='Cabine (de série)', prix_ht='0,00', tracteurs=ref, par_defaut=ref, visuel='cabine', source=SOLIS_BROCHURE, ordre=1)
    snl = SOLIS_NL.get(ref.replace('SOLIS-SOLIS-', ''), {})
    extra.update(nom_nl=re.sub(r'^Solis[\s-]+', '', snl.get('name', '')), description_nl='\n'.join(snl.get('paragraphs', [])[:6]))
    cat = 'compact-18-30' if hp and hp <= 30 else 'compact-30-50' if hp and hp <= 50 else 'plus-50' if hp else 'compact-18-30'
    P(reference=ref, type='tracteur', marque='Solis', categorie=cat, nom_fr=re.sub(r'^Solis\s+', '', o['name']),
      description_fr='\n'.join(paras[:6]), prix_ht='', disponibilite='sur_commande', puissance_ch=fmt_num(hp),
      photos=' | '.join(o['images'][:8]), video=o['videos'][0].replace('/embed/', '/watch?v=') if o['videos'] else '',
      source=o['url'], notes=note, ordre=ord_, **extra)


# ───────────────────────── Machines (Herco) ─────────────────────────
mach = json.load(open(W + '/herco-m/machines.json'))
TYPE = {
    'peruzzo|fleaux-pto': 'broyeur-fleaux', 'peruzzo|fleaux-pto-ramassage': 'broyeur-fleaux-ramassage', 'peruzzo|fleaux-hydraulique': 'broyeur-fleaux',
    'peruzzo|accotement': 'broyeur-accotement', 'peruzzo|potaux': 'tondeuse-poteaux', 'peruzzo|aspirateurs': 'aspirateur', 'peruzzo|dechiqueteuses-pto': 'broyeur-branches',
    'peruzzo|balayeuse': 'balayeuse', 'beroni|fraises': 'fraise', 'balfor|fendeuses-pto': 'fendeuse', 'balfor|fendeuses-hydrauliques': 'fendeuse',
    'ecolawn|epandeurs': 'epandeur', 'mateng|broyeurs-pto': 'broyeur-branches', 'wallenstein|dechiqueteuses-pto': 'broyeur-branches',
}
GARMECH = [('epareuse', 'epareuse'), ('gyrobroyeur', 'gyrobroyeur'), ('tondeuse', 'tondeuse'), ('taille', 'taille-haies'), ('semis', 'semoir'),
           ('enfouisseuse', 'enfouisseuse'), ('fraise', 'fraise'), ('herse', 'herse-rotative'), ('bennette', 'benne'), ('epandeur', 'epandeur'), ('remorque', 'remorque')]
SKIP = {'encore|zero-turn'}
mo = 0
for item in mach:
    if item['category'] in SKIP: continue
    if re.search(r'\bTEG\b', item['name'], re.I): continue  # plateaux pour tondeuses frontales Kubota / John Deere, pas pour tracteurs
    brand = item['category'].split('|')[0].capitalize()
    if item['category'].startswith('garmech'):
        n = slug(item['name'])
        typ = next(t for k, t in GARMECH if k in n)
    else:
        typ = TYPE[item['category']]
    variants = [v for v in item['variants'] if not v['name'].strip().endswith('km')]
    tables = item.get('spec_tables') or []
    by_width = {}
    width_power = {}
    for tb in tables:  # puissance requise connue pour une largeur donnée (identique avec ou sans roues avant)
        w_, cv_ = num(spec(tb, 'Largeur de travail (cm)')), spec(tb, 'CV tracteur', 'CV min', 'CV')
        if w_ and cv_ and w_ not in width_power: width_power[w_] = cv_
    if tables and len(tables) != len(variants):
        # Herco publie parfois un tableau par largeur : on associe chaque variante au tableau de sa largeur.
        for tb in tables:
            w_ = num(spec(tb, 'Largeur de travail (cm)'))
            if w_ and w_ not in by_width: by_width[w_] = tb
        tables = []
    def width_of_name(nm):
        m = re.search(r'(\d+(?:[.,]\d+)?)\s*(cm|m)\b', nm, re.I)
        if m: return num(m.group(1)) * (100 if m.group(2).lower() == 'm' else 1)
        m = re.search(r'(?<![\d])(\d{3,4})(?![\d])', nm)
        if m and int(m.group(1)) >= 800: return int(m.group(1)) / 10
        return None
    fam = slug(brand + ' ' + item['name'])[:60]
    fam_imgs = next((v.get('images') for v in variants if v.get('images')), [])
    fam_spin = next((v.get('spin') for v in variants if v.get('spin')), None)
    for i, v in enumerate(variants):
        v_imgs = v.get('images') or fam_imgs  # même machine, autre largeur
        if fam.startswith(('peruzzo-peruzzo-fox-cross', 'peruzzo-peruzzo-fox-s-')) and len(v_imgs) > 1:
            v_imgs = v_imgs[1:] + v_imgs[:1]  # 1re image = tableau de cotes / plan : passée en fin de galerie
        v_spin = v.get('spin') or fam_spin
        mo += 1
        t = tables[i] if tables else by_width.get(width_of_name(v['name']), [])
        ww = num(spec(t, 'Largeur de travail (cm)'))
        nm = v['name']
        if ww is None:
            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(cm|m)\b', nm, re.I)
            if m: ww = num(m.group(1)) * (100 if m.group(2).lower() == 'm' else 1)
            else:
                m = re.search(r'\b(\d{3,4})\b', nm)
                if m and typ.startswith(('broyeur-fleaux', 'broyeur-accotement', 'balayeuse')) and int(m.group(1)) >= 800: ww = int(m.group(1)) / 10
        cvr = spec(t, 'CV tracteur')
        cmin = num(spec(t, 'CV min')); cmax = num(spec(t, 'CV max'))
        if cvr:
            parts = re.findall(r'\d+', cvr)
            if parts: cmin = cmin or float(parts[0]); cmax = cmax or (float(parts[1]) if len(parts) > 1 else None)
        cv = spec(t, 'CV')
        if cv and cmin is None and not re.search(r'honda|b&s', ' '.join(x[1] for x in t), re.I):
            parts = re.findall(r'\d+', cv)
            if parts:
                cmin = float(parts[0]); cmax = cmax or (float(parts[1]) if len(parts) > 1 else None)
        if cmin is None and ww in width_power and not re.search(r'honda|b&s|essence', nm, re.I):
            parts = re.findall(r'\d+', width_power[ww])
            if parts: cmin = float(parts[0]); cmax = cmax or (float(parts[1]) if len(parts) > 1 else None)
        if cmin is None:
            m = re.search(r'tracteurs? (?:à|a) partir de (\d+)\s*cv', ' '.join(item['usps']) + ' ' + item['description'], re.I)
            if m: cmin = float(m.group(1))
        montage = (spec(t, 'Montage') or '').lower()
        if re.search(r'kubota|john deere|deere', nm, re.I): continue  # pour tondeuses frontales, pas pour tracteurs
        mount = 'avant' if montage.strip() == 'devant' else 'arriere'
        if typ in ('remorque', 'benne') or (typ == 'epandeur' and 'garmech' in fam): mount = 'traine'
        if typ == 'aspirateur' and 'pto' not in nm.lower(): mount = 'traine'
        pto = spec(t, 'Vitesse PTO (t/min)', 'PTO (tpm)', 'PDF')
        if pto and not re.search(r'\d', pto): pto = None
        engine = re.search(r'honda|b&s|essence|elektrisch|électrique', nm + ' ' + item['name'], re.I)
        hydro = 'hydrau' in item['category'] or ' he ' in f' {nm.lower()} ' or 'hydro' in nm.lower()
        needs_pto = 'non' if (engine or hydro or typ in ('remorque', 'benne')) else 'oui' if (pto or 'pto' in item['category'] or 'cardan' in nm.lower()) else ''
        if 'montage' in montage and 'devant ou' in montage: pass
        note = PRICE_NOTE
        if montage and montage.strip() != 'devant' and montage.startswith('dev'): note += ' Montage avant ou arrière : réglé ici sur « arrière ».'
        if hydro: note += ' Entraînement hydraulique : vérifier le débit du tracteur.'
        P(reference='HERCO-' + v['id'], type='machine', marque=brand, categorie=typ, famille=fam, nom_famille=fr(item['name']), nom_fr=fr(nm),
          nom_nl=NL_VAR.get(v['id'], ''), nom_famille_nl=nl_page(item['url']).get('name', ''), description_nl=nl_page(item['url']).get('description', ''), points_forts_nl='\n'.join(nl_page(item['url']).get('usps', [])),
          description_fr=item['description'], points_forts_fr='\n'.join(item['usps']),
          prix_ht=price(v['prices_ht'][0]) if v.get('prices_ht') else '', disponibilite='sur_commande',
          poids_kg=fmt_num(num(spec(t, 'Poids (kg)', 'Le poids à vide (kg)'))), attelage=spec(t, 'Attelage') or '',
          prise_de_force=pto or '', largeur_travail_cm=fmt_num(ww), puissance_min_ch=fmt_num(cmin), puissance_max_ch=fmt_num(cmax),
          montage=mount, necessite_pdf=needs_pto, caracteristiques=specs_str(t),
          photos=' | '.join(big(u) for u in v_imgs[:6]) or '', brochure=next(iter(item['pdfs']), ''),
          vue360_url=(v_spin['folder'] + v_spin['pattern'].replace('{index}', '{frame}')) if v_spin else '', vue360_images=v_spin['frames'] if v_spin else '',
          video=next(iter(item['videos']), ''), source=item['url'], notes=note, ordre=mo)

def write(path, cols, rows):
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        for r in rows: w.writerow(r)
# Options sans photo : photo de la variante correspondante, sinon première photo de la page Herco.
opt_photos = {}
for it in opt_items.values():
    vs = [v for v in it['variants'] if not v['name'].strip().endswith('km')]
    opt_photos[it['url']] = [big(v['images'][0]) if v.get('images') else None for v in vs]
for row in options:
    if row['photo'] or row['source'] not in opt_photos: continue
    imgs = opt_photos[row['source']]
    m = re.search(r'(\d+)$', row['reference'])
    first = next((x for x in imgs if x), '')
    row['photo'] = first
# Arceau / cabine de série : la photo du tracteur les montre.
first_photo = {p['reference']: p['photos'].split(' | ')[0] for p in products if p['photos']}
for row in options:
    if not row['photo'] and row['groupe'] == 'poste' and row['par_defaut'] in first_photo:
        row['photo'] = first_photo[row['par_defaut']]
DESC_NL = {'Option : prix à confirmer.': 'Optie: prijs te bevestigen.', 'Version cabine : prix à confirmer.': 'Cabineversie: prijs te bevestigen.',
           'Prix à compléter (non publié).': 'Prijs aan te vullen (niet gepubliceerd).', 'Monte de base indiquée en premier sur la fiche.': 'Standaardmontage, als eerste vermeld op de fiche.'}
for row in options:
    if not row['nom_nl']: row['nom_nl'] = opt_nl(row['nom_fr'])
    if not row['description_nl'] and row['description_fr'] in DESC_NL: row['description_nl'] = DESC_NL[row['description_fr']]
write(OUT + '/produits.csv', P_COLS, products)
write(OUT + '/options.csv', O_COLS, options)
print(len(products), 'produits', sum(1 for p in products if p['type'] == 'tracteur'), 'tracteurs,', len(options), 'options')
