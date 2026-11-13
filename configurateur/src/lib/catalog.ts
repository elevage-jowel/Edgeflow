import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { options, products, type Option, type Product } from '@/db/schema';
import type { Catalog, CMachine, COption, CTractor } from './catalog-types';
import type { Locale } from './i18n';

const refs = (v: string | null): string[] | '*' =>
  !v || v.trim() === '*' ? '*' : v.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
const refList = (v: string | null) =>
  (v ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean);

export const nameOf = (p: { nameFr: string; nameNl: string | null }, l: Locale) => (l === 'nl' && p.nameNl) || p.nameFr;
export const descOf = (p: { descriptionFr: string | null; descriptionNl: string | null }, l: Locale) =>
  (l === 'nl' && p.descriptionNl) || p.descriptionFr || '';
export const highlightsOf = (p: Product, l: Locale) =>
  ((l === 'nl' && p.highlightsNl) || p.highlightsFr || '').split('\n').map((x) => x.trim()).filter(Boolean);

export function toTractor(p: Product, l: Locale): CTractor {
  return {
    ref: p.ref, slug: p.slug, brand: p.brand, category: p.category, name: nameOf(p, l), description: descOf(p, l),
    priceHt: p.priceHt, availability: p.availability, leadTime: p.leadTime, powerHp: p.powerHp, transmission: p.transmission,
    liftCapacityKg: p.liftCapacityKg, hitchCategory: p.hitchCategory, ptoType: p.ptoType, weightKg: p.weightKg, widthCm: p.widthCm,
    maxImplementWidthCm: p.maxImplementWidthCm, usages: (p.usages ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean),
    image: p.images[0] ?? null, images: p.images, spinUrl: p.spinUrl, spinFrames: p.spinFrames ?? 36, modelUrl: p.modelUrl,
  };
}

export function toMachine(p: Product, l: Locale): CMachine {
  return {
    ref: p.ref, slug: p.slug, brand: p.brand, category: p.category, family: p.family || p.ref, familyName: p.familyName, name: nameOf(p, l),
    description: descOf(p, l), priceHt: p.priceHt, availability: p.availability, leadTime: p.leadTime,
    workingWidthCm: p.workingWidthCm, minPowerHp: p.minPowerHp, maxPowerHp: p.maxPowerHp, hitchCategory: p.hitchCategory,
    weightKg: p.weightKg, mount: p.mount, needsPto: p.needsPto, ptoType: p.ptoType, image: p.images[0] ?? null,
  };
}

export function toOption(o: Option, l: Locale): COption {
  return {
    ref: o.ref, group: o.group, name: nameOf(o, l), description: descOf(o, l), priceHt: o.priceHt, image: o.image,
    tractorRefs: refs(o.tractorRefs), defaultFor: o.defaultFor?.trim() === '*' ? '*' : refList(o.defaultFor),
    requiresAny: refList(o.requiresAny), excludes: refList(o.excludes), visual: o.visual, feature: o.feature,
    tireFront: o.tireFront, tireRear: o.tireRear, widthCm: o.widthCm,
  };
}

/** Catalogue complet actif, mis en cache 60 s (invalidé à chaque modification admin). */
export const getCatalog = (locale: Locale) =>
  unstable_cache(
    async (): Promise<Catalog> => {
      const [ps, os] = await Promise.all([
        db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.sort), asc(products.nameFr)),
        db.select().from(options).where(eq(options.active, true)).orderBy(asc(options.group), asc(options.sort), asc(options.nameFr)),
      ]);
      return {
        tractors: ps.filter((p) => p.kind === 'tractor').map((p) => toTractor(p, locale)),
        machines: ps.filter((p) => p.kind === 'machine').map((p) => toMachine(p, locale)),
        options: os.map((o) => toOption(o, locale)),
      };
    },
    ['catalog', locale],
    { revalidate: 60, tags: ['catalog'] },
  )();

export async function getProductBySlug(kind: 'tractor' | 'machine', slug: string) {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.kind, kind), eq(products.active, true)))
    .limit(1);
  return p ?? null;
}

export async function getProductRefsForSitemap() {
  return db.select({ kind: products.kind, slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.active, true));
}
