/**
 * Import / export du catalogue en CSV (séparateur « ; », UTF-8) ou Excel (.xlsx).
 * Colonnes documentées dans docs/GUIDE-ADMIN.md et dans les modèles de data/.
 * L'import met à jour les lignes existantes (même référence) et crée les nouvelles.
 */
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { options, products, type NewOption, type NewProduct, type Option, type Product } from '@/db/schema';
import { parseEur } from './money';
import { slugify } from './slug';

export const PRODUCT_COLUMNS = [
  'reference', 'type', 'marque', 'categorie', 'famille', 'nom_famille', 'nom_fr', 'nom_nl', 'description_fr', 'description_nl',
  'points_forts_fr', 'points_forts_nl', 'prix_ht', 'disponibilite', 'delai', 'puissance_ch', 'transmission',
  'poids_kg', 'attelage', 'prise_de_force', 'capacite_relevage_kg', 'largeur_outil_max_cm', 'largeur_cm',
  'usages', 'largeur_travail_cm', 'puissance_min_ch', 'puissance_max_ch', 'montage', 'necessite_pdf',
  'caracteristiques', 'photos', 'video', 'brochure', 'vue360_url', 'vue360_images', 'modele3d_url',
  'source', 'notes', 'actif', 'ordre',
] as const;

export const OPTION_COLUMNS = [
  'reference', 'groupe', 'nom_fr', 'nom_nl', 'description_fr', 'description_nl', 'prix_ht', 'photo', 'tracteurs',
  'par_defaut', 'necessite_une_de', 'exclut', 'visuel', 'fonction', 'pneu_avant', 'pneu_arriere', 'largeur_cm',
  'source', 'actif', 'ordre',
] as const;

type Row = Record<string, string>;
export type ImportReport = { created: number; updated: number; errors: { line: number; message: string }[] };

// ───────────── Lecture des fichiers ─────────────

export async function readRows(file: { name: string; buffer: Buffer }): Promise<Row[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const header: string[] = [];
    const rows: Row[] = [];
    ws.eachRow((row, n) => {
      const values = (row.values as unknown[]).slice(1).map(cellText);
      if (n === 1) values.forEach((v, i) => (header[i] = normHeader(v)));
      else if (values.some((v) => v.trim())) {
        const r: Row = {};
        header.forEach((h, i) => (r[h] = values[i] ?? ''));
        rows.push(r);
      }
    });
    return rows;
  }
  const text = file.buffer.toString('utf8').replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const parsed = Papa.parse<Row>(text, { header: true, delimiter, skipEmptyLines: 'greedy', transformHeader: normHeader });
  return parsed.data;
}

function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if (o.text) return String(o.text);
    if (o.result != null) return String(o.result);
    if (o.hyperlink) return o.hyperlink;
  }
  return String(v);
}

function normHeader(h: string) {
  return h
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ───────────── Conversion des valeurs ─────────────

const s = (v?: string) => (v ?? '').trim() || null;
const int = (v?: string) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};
function num(v?: string): number | null {
  const t = (v ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const bool = (v?: string, dflt = true) => {
  const t = (v ?? '').trim().toLowerCase();
  if (!t) return dflt;
  return ['oui', 'yes', 'ja', '1', 'true', 'vrai', 'x'].includes(t);
};
const list = (v?: string) =>
  (v ?? '')
    .split(/\s*\|\s*|\n/)
    .map((x) => x.trim())
    .filter(Boolean);

function parseSpecs(v?: string) {
  return list(v)
    .map((part) => {
      const i = part.indexOf(':');
      return i > 0 ? { label: part.slice(0, i).trim(), value: part.slice(i + 1).trim() } : null;
    })
    .filter((x): x is { label: string; value: string } => !!x && !!x.value);
}

const KIND: Record<string, 'tractor' | 'machine'> = { tracteur: 'tractor', tractor: 'tractor', machine: 'machine', outil: 'machine' };
const AVAIL: Record<string, 'en_stock' | 'sur_commande' | 'indisponible'> = {
  en_stock: 'en_stock', 'en stock': 'en_stock', stock: 'en_stock', sur_commande: 'sur_commande', 'sur commande': 'sur_commande',
  indisponible: 'indisponible',
};
const MOUNT: Record<string, 'arriere' | 'avant' | 'traine' | 'chargeur'> = {
  arriere: 'arriere', 'arrière': 'arriere', avant: 'avant', traine: 'traine', 'traînée': 'traine', trainee: 'traine', chargeur: 'chargeur',
};
const GROUPS = ['pneus', 'poste', 'option', 'chargeur', 'outil'] as const;

export function rowToProduct(r: Row): NewProduct {
  const ref = s(r.reference);
  if (!ref) throw new Error('référence manquante');
  const kind = KIND[(r.type ?? '').trim().toLowerCase()];
  if (!kind) throw new Error(`type « ${r.type ?? ''} » inconnu (tracteur ou machine)`);
  const nameFr = s(r.nom_fr);
  if (!nameFr) throw new Error('nom_fr manquant');
  const brand = s(r.marque) ?? '';
  const price = r.prix_ht?.trim() ? parseEur(r.prix_ht) : null;
  if (r.prix_ht?.trim() && price == null) throw new Error(`prix_ht illisible : « ${r.prix_ht} »`);
  const needsPto = (r.necessite_pdf ?? '').trim() ? bool(r.necessite_pdf) : null;
  return {
    ref,
    slug: slugify(`${brand} ${nameFr}`) + (kind === 'machine' ? '-' + slugify(ref).slice(-8) : ''),
    kind,
    brand,
    category: s(r.categorie) ?? (kind === 'tractor' ? 'compact-18-30' : 'divers'),
    family: s(r.famille),
    familyName: s(r.nom_famille),
    nameFr,
    nameNl: s(r.nom_nl),
    descriptionFr: s(r.description_fr),
    descriptionNl: s(r.description_nl),
    highlightsFr: s(r.points_forts_fr),
    highlightsNl: s(r.points_forts_nl),
    priceHt: price,
    availability: AVAIL[(r.disponibilite ?? '').trim().toLowerCase()] ?? 'sur_commande',
    leadTime: s(r.delai),
    powerHp: num(r.puissance_ch),
    transmission: s(r.transmission),
    weightKg: int(r.poids_kg),
    hitchCategory: s(r.attelage),
    ptoType: s(r.prise_de_force),
    liftCapacityKg: int(r.capacite_relevage_kg),
    maxImplementWidthCm: int(r.largeur_outil_max_cm),
    widthCm: int(r.largeur_cm),
    usages: s(r.usages),
    workingWidthCm: int(r.largeur_travail_cm),
    minPowerHp: num(r.puissance_min_ch),
    maxPowerHp: num(r.puissance_max_ch),
    mount: MOUNT[(r.montage ?? '').trim().toLowerCase()] ?? (kind === 'machine' ? 'arriere' : null),
    needsPto,
    specs: parseSpecs(r.caracteristiques),
    images: list(r.photos),
    videoUrl: s(r.video),
    brochureUrl: s(r.brochure),
    spinUrl: s(r.vue360_url),
    spinFrames: int(r.vue360_images) ?? 36,
    modelUrl: s(r.modele3d_url),
    sourceUrl: s(r.source),
    notes: s(r.notes),
    active: bool(r.actif),
    sort: int(r.ordre) ?? 0,
  };
}

export function rowToOption(r: Row): NewOption {
  const ref = s(r.reference);
  if (!ref) throw new Error('référence manquante');
  const group = (r.groupe ?? '').trim().toLowerCase() as (typeof GROUPS)[number];
  if (!GROUPS.includes(group)) throw new Error(`groupe « ${r.groupe ?? ''} » inconnu (${GROUPS.join(', ')})`);
  const nameFr = s(r.nom_fr);
  if (!nameFr) throw new Error('nom_fr manquant');
  const price = r.prix_ht?.trim() ? parseEur(r.prix_ht) : null;
  if (r.prix_ht?.trim() && price == null) throw new Error(`prix_ht illisible : « ${r.prix_ht} »`);
  return {
    ref,
    group,
    nameFr,
    nameNl: s(r.nom_nl),
    descriptionFr: s(r.description_fr),
    descriptionNl: s(r.description_nl),
    priceHt: price,
    image: s(r.photo),
    tractorRefs: s(r.tracteurs) ?? '*',
    defaultFor: s(r.par_defaut),
    requiresAny: s(r.necessite_une_de),
    excludes: s(r.exclut),
    visual: s(r.visuel),
    feature: s(r.fonction),
    tireFront: s(r.pneu_avant),
    tireRear: s(r.pneu_arriere),
    widthCm: int(r.largeur_cm),
    sourceUrl: s(r.source),
    active: bool(r.actif),
    sort: int(r.ordre) ?? 0,
  };
}

// ───────────── Écriture en base ─────────────

export async function importRows(kind: 'produits' | 'options', rows: Row[]): Promise<ImportReport> {
  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  const parsed: { line: number; value: NewProduct | NewOption }[] = [];
  rows.forEach((r, i) => {
    try {
      parsed.push({ line: i + 2, value: kind === 'produits' ? rowToProduct(r) : rowToOption(r) });
    } catch (e) {
      report.errors.push({ line: i + 2, message: (e as Error).message });
    }
  });
  if (!parsed.length) return report;

  const table = kind === 'produits' ? products : options;
  const existing = new Set((await db.select({ ref: table.ref }).from(table)).map((x) => x.ref));
  // Les slugs doivent être uniques : on suffixe en cas de doublon.
  if (kind === 'produits') {
    const taken = new Map((await db.select({ ref: products.ref, slug: products.slug }).from(products)).map((x) => [x.slug, x.ref]));
    for (const p of parsed) {
      const v = p.value as NewProduct;
      let slug = v.slug;
      let n = 2;
      while (taken.has(slug) && taken.get(slug) !== v.ref) slug = `${v.slug}-${n++}`;
      taken.set(slug, v.ref);
      v.slug = slug;
    }
  }

  // Les médias déjà rapatriés (URL locales) ne sont pas remplacés par les liens externes d'origine.
  const external = (u: string | null | undefined) => !!u && /^https?:\/\//.test(u);
  const local = (u: string | null | undefined) => !!u && !external(u);
  if (kind === 'produits') {
    const media = new Map((await db.select({ ref: products.ref, images: products.images, spinUrl: products.spinUrl, brochureUrl: products.brochureUrl }).from(products)).map((x) => [x.ref, x]));
    for (const p of parsed) {
      const v = p.value as NewProduct;
      const old = media.get(v.ref);
      if (!old) continue;
      if ((v.images ?? []).length && (v.images ?? []).every(external) && old.images.some(local)) v.images = old.images;
      if (external(v.spinUrl) && local(old.spinUrl)) v.spinUrl = old.spinUrl;
      if (external(v.brochureUrl) && local(old.brochureUrl)) v.brochureUrl = old.brochureUrl;
    }
  } else {
    const media = new Map((await db.select({ ref: options.ref, image: options.image }).from(options)).map((x) => [x.ref, x.image]));
    for (const p of parsed) {
      const v = p.value as NewOption;
      if (external(v.image) && local(media.get(v.ref))) v.image = media.get(v.ref);
    }
  }

  await db.transaction(async (tx) => {
    for (const { line, value } of parsed) {
      try {
        const { ref, ...rest } = value as NewProduct & NewOption;
        await tx
          .insert(table)
          .values(value as never)
          .onConflictDoUpdate({ target: table.ref, set: { ...(rest as object), updatedAt: sql`now()` } as never });
        if (existing.has(ref)) report.updated++;
        else report.created++;
      } catch (e) {
        report.errors.push({ line, message: (e as Error).message });
      }
    }
  });
  return report;
}

// ───────────── Export ─────────────

const cents = (v: number | null) => (v == null ? '' : (v / 100).toFixed(2).replace('.', ','));
const n = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

export function productToRow(p: Product): Row {
  return {
    reference: p.ref, type: p.kind === 'tractor' ? 'tracteur' : 'machine', marque: p.brand, categorie: p.category, famille: p.family ?? '', nom_famille: p.familyName ?? '',
    nom_fr: p.nameFr, nom_nl: p.nameNl ?? '', description_fr: p.descriptionFr ?? '', description_nl: p.descriptionNl ?? '',
    points_forts_fr: p.highlightsFr ?? '', points_forts_nl: p.highlightsNl ?? '', prix_ht: cents(p.priceHt),
    disponibilite: p.availability, delai: p.leadTime ?? '', puissance_ch: n(p.powerHp), transmission: p.transmission ?? '',
    poids_kg: n(p.weightKg), attelage: p.hitchCategory ?? '', prise_de_force: p.ptoType ?? '', capacite_relevage_kg: n(p.liftCapacityKg),
    largeur_outil_max_cm: n(p.maxImplementWidthCm), largeur_cm: n(p.widthCm), usages: p.usages ?? '',
    largeur_travail_cm: n(p.workingWidthCm), puissance_min_ch: n(p.minPowerHp), puissance_max_ch: n(p.maxPowerHp),
    montage: p.mount ?? '', necessite_pdf: p.needsPto == null ? '' : p.needsPto ? 'oui' : 'non',
    caracteristiques: p.specs.map((x) => `${x.label}: ${x.value}`).join(' | '), photos: p.images.join(' | '),
    video: p.videoUrl ?? '', brochure: p.brochureUrl ?? '', vue360_url: p.spinUrl ?? '', vue360_images: n(p.spinFrames),
    modele3d_url: p.modelUrl ?? '', source: p.sourceUrl ?? '', notes: p.notes ?? '', actif: p.active ? 'oui' : 'non', ordre: String(p.sort),
  };
}

export function optionToRow(o: Option): Row {
  return {
    reference: o.ref, groupe: o.group, nom_fr: o.nameFr, nom_nl: o.nameNl ?? '', description_fr: o.descriptionFr ?? '',
    description_nl: o.descriptionNl ?? '', prix_ht: cents(o.priceHt), photo: o.image ?? '', tracteurs: o.tractorRefs,
    par_defaut: o.defaultFor ?? '', necessite_une_de: o.requiresAny ?? '', exclut: o.excludes ?? '', visuel: o.visual ?? '',
    fonction: o.feature ?? '', pneu_avant: o.tireFront ?? '', pneu_arriere: o.tireRear ?? '', largeur_cm: n(o.widthCm),
    source: o.sourceUrl ?? '', actif: o.active ? 'oui' : 'non', ordre: String(o.sort),
  };
}

export function toCsv(columns: readonly string[], rows: Row[]) {
  return '﻿' + Papa.unparse({ fields: [...columns], data: rows.map((r) => columns.map((c) => r[c] ?? '')) }, { delimiter: ';' });
}

export async function toXlsx(columns: readonly string[], rows: Row[], sheet: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet);
  ws.columns = columns.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(12, c.length + 2)) }));
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
