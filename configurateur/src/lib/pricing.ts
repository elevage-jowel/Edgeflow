/**
 * Calcul du devis à partir d'une sélection. Utilisé côté client pour l'affichage
 * en direct et côté serveur pour figer les montants (le serveur ne fait jamais
 * confiance aux prix envoyés par le navigateur).
 */
import type { QuoteLine, Selection } from '@/db/schema';
import type { Catalog } from './catalog-types';
import { checkMachine, optionState, pruneOptions, selectedFeatures } from './compat';
import { VAT_RATE, vatOf } from './money';

export type Totals = {
  subtotalHt: number;
  discountHt: number;
  totalHt: number;
  vatAmount: number;
  totalTtc: number;
  hasPriceOnRequest: boolean;
};

export function totalsOf(lines: QuoteLine[], discountHt = 0, vatRate = VAT_RATE): Totals {
  const subtotalHt = lines.reduce((s, l) => s + (l.priceHt ?? 0) * (l.qty || 1), 0);
  const totalHt = Math.max(0, subtotalHt - discountHt);
  const vatAmount = vatOf(totalHt, vatRate);
  return {
    subtotalHt,
    discountHt,
    totalHt,
    vatAmount,
    totalTtc: totalHt + vatAmount,
    hasPriceOnRequest: lines.some((l) => l.priceHt == null),
  };
}

const GROUP_ORDER: QuoteLine['group'][] = ['tracteur', 'pneus', 'poste', 'option', 'chargeur', 'outil', 'machine', 'divers'];

export function buildLines(catalog: Catalog, sel: Selection): { lines: QuoteLine[]; errors: string[] } {
  const errors: string[] = [];
  const tractor = catalog.tractors.find((t) => t.ref === sel.tractor);
  if (!tractor) return { lines: [], errors: ['tracteur inconnu'] };

  const lines: QuoteLine[] = [
    { group: 'tracteur', ref: tractor.ref, label: `${tractor.brand} ${tractor.name}`.replace(/^(\S+) \1 /, '$1 '), priceHt: tractor.priceHt, qty: 1 },
  ];

  const opts = pruneOptions(catalog.options, tractor.ref, [...new Set(sel.options)]);
  if (opts.length !== new Set(sel.options).size) errors.push('options incompatibles retirées');
  for (const ref of opts) {
    const o = catalog.options.find((x) => x.ref === ref)!;
    if (!optionState(o, tractor.ref, opts).available) continue;
    const tires = o.group === 'pneus' && (o.tireFront || o.tireRear) ? ` (${[o.tireFront, o.tireRear].filter(Boolean).join(' / ')})` : '';
    lines.push({ group: o.group, ref: o.ref, label: o.name + tires, priceHt: o.priceHt, qty: 1 });
  }

  const features = selectedFeatures(catalog.options, opts);
  for (const ref of [...new Set(sel.machines)]) {
    const m = catalog.machines.find((x) => x.ref === ref);
    if (!m) {
      errors.push(`machine inconnue ${ref}`);
      continue;
    }
    if (checkMachine(tractor, m, features).verdict === 'block') {
      errors.push(`machine incompatible ${ref}`);
      continue;
    }
    lines.push({ group: 'machine', ref: m.ref, label: `${m.brand} ${m.name}`, priceHt: m.priceHt, qty: 1 });
  }

  lines.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  return { lines, errors };
}

/** Sélection nettoyée (ce qui est réellement devisé). */
export function normalizeSelection(catalog: Catalog, sel: Selection): Selection {
  const { lines } = buildLines(catalog, sel);
  return {
    tractor: sel.tractor,
    options: lines.filter((l) => l.group !== 'tracteur' && l.group !== 'machine').map((l) => l.ref!),
    machines: lines.filter((l) => l.group === 'machine').map((l) => l.ref!),
  };
}
