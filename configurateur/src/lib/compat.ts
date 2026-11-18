/**
 * Règles de compatibilité tracteur ↔ options ↔ machines.
 * Fonctions pures, utilisées à l'identique dans le navigateur (affichage)
 * et sur le serveur (validation du devis).
 */
import type { CMachine, COption, CTractor } from './catalog-types';

export type Verdict = 'ok' | 'warn' | 'block';
export type Reason = { level: Exclude<Verdict, 'ok'>; code: string; params?: Record<string, string | number> };
export type MachineCheck = { verdict: Verdict; reasons: Reason[] };

/** « I/II », « Cat. 1 », « catégorie I et II » → {1,2} */
export function parseHitch(v: string | null | undefined): Set<number> {
  const out = new Set<number>();
  if (!v) return out;
  const s = v.toUpperCase().replace(/CAT[ÉE]GORIE|CAT\.?/g, ' ');
  for (const tok of s.split(/[^0-9IV]+/)) {
    const t = tok.trim();
    if (!t) continue;
    const n = t === 'I' ? 1 : t === 'II' ? 2 : t === 'III' ? 3 : t === 'IV' ? 4 : Number(t);
    if (n >= 1 && n <= 4) out.add(n);
  }
  return out;
}

export function optionAppliesTo(o: COption, tractorRef: string) {
  return o.tractorRefs === '*' || o.tractorRefs.includes(tractorRef);
}

export function isDefaultFor(o: COption, tractorRef: string) {
  return o.defaultFor === '*' || o.defaultFor.includes(tractorRef);
}

/** Fonctions présentes sur la configuration (relevage avant, PDF avant…). */
export function selectedFeatures(options: COption[], selected: string[]) {
  return new Set(options.filter((o) => selected.includes(o.ref) && o.feature).map((o) => o.feature as string));
}

export function checkMachine(tractor: CTractor, machine: CMachine, features: Set<string>): MachineCheck {
  const reasons: Reason[] = [];
  const hp = tractor.powerHp;

  if (hp != null && machine.minPowerHp != null && hp < machine.minPowerHp) {
    reasons.push({ level: 'block', code: 'powerTooLow', params: { min: machine.minPowerHp, hp } });
  }

  if (machine.mount === 'avant') {
    if (!features.has('relevage-avant')) reasons.push({ level: 'block', code: 'needsFrontLift' });
    if (machine.needsPto && !features.has('pdf-avant')) reasons.push({ level: 'block', code: 'needsFrontPto' });
  } else if (machine.mount === 'chargeur') {
    if (!features.has('chargeur')) reasons.push({ level: 'block', code: 'needsLoader' });
  } else {
    if (machine.needsPto && tractor.ptoType && /^non|aucune|^-$/i.test(tractor.ptoType.trim())) {
      reasons.push({ level: 'block', code: 'needsPto' });
    }
    if (machine.mount !== 'traine') {
      const th = parseHitch(tractor.hitchCategory);
      const mh = parseHitch(machine.hitchCategory);
      if (th.size && mh.size && ![...mh].some((c) => th.has(c))) {
        reasons.push({
          level: 'block',
          code: 'hitchMismatch',
          params: { machine: machine.hitchCategory ?? '', tractor: tractor.hitchCategory ?? '' },
        });
      }
      if (tractor.liftCapacityKg && machine.weightKg && machine.weightKg > tractor.liftCapacityKg * 0.8) {
        reasons.push({
          level: machine.weightKg > tractor.liftCapacityKg ? 'block' : 'warn',
          code: 'tooHeavy',
          params: { weight: machine.weightKg, capacity: tractor.liftCapacityKg },
        });
      }
    }
  }

  // Plage de puissance du constructeur : en dessous la machine ne tourne pas, au-dessus elle casse.
  if (hp != null && machine.maxPowerHp != null && hp > machine.maxPowerHp) {
    reasons.push({ level: 'block', code: machine.maxPowerEstimated ? 'powerFarAbove' : 'powerTooHigh', params: { max: machine.maxPowerHp, min: machine.minPowerHp ?? '', hp } });
  }
  if (tractor.maxImplementWidthCm && machine.workingWidthCm && machine.workingWidthCm > tractor.maxImplementWidthCm) {
    reasons.push({
      level: 'warn',
      code: 'tooWide',
      params: { width: machine.workingWidthCm, max: tractor.maxImplementWidthCm },
    });
  }

  const verdict: Verdict = reasons.some((r) => r.level === 'block') ? 'block' : reasons.length ? 'warn' : 'ok';
  return { verdict, reasons };
}

export type OptionState = { available: boolean; missing: string[] };

/** Une option est disponible si elle concerne ce tracteur et si ses prérequis sont choisis. */
export function optionState(o: COption, tractorRef: string, selected: string[]): OptionState {
  if (!optionAppliesTo(o, tractorRef)) return { available: false, missing: [] };
  if (o.requiresAny.length && !o.requiresAny.some((r) => selected.includes(r))) {
    return { available: false, missing: o.requiresAny };
  }
  return { available: true, missing: [] };
}

const SINGLE_CHOICE = new Set(['pneus', 'poste', 'chargeur']);

/**
 * Applique un clic sur une option et renvoie la nouvelle liste :
 *  - pneus, poste et chargeur sont à choix unique ;
 *  - les exclusions sont retirées ;
 *  - les options dont un prérequis disparaît sont retirées (en cascade).
 */
export function toggleOption(all: COption[], tractorRef: string, selected: string[], ref: string): string[] {
  const o = all.find((x) => x.ref === ref);
  if (!o) return selected;
  let next = [...selected];
  if (next.includes(ref)) {
    if (o.group === 'pneus' || o.group === 'poste') return selected; // toujours un choix
    next = next.filter((r) => r !== ref);
  } else {
    if (SINGLE_CHOICE.has(o.group)) {
      const same = all.filter((x) => x.group === o.group).map((x) => x.ref);
      next = next.filter((r) => !same.includes(r));
    }
    next = next.filter((r) => !o.excludes.includes(r));
    next = next.filter((r) => !(all.find((x) => x.ref === r)?.excludes ?? []).includes(ref));
    next.push(ref);
  }
  return pruneOptions(all, tractorRef, next);
}

export function pruneOptions(all: COption[], tractorRef: string, selected: string[]): string[] {
  let cur = selected.filter((r) => {
    const o = all.find((x) => x.ref === r);
    return o && optionAppliesTo(o, tractorRef);
  });
  for (let i = 0; i < 5; i++) {
    const next = cur.filter((r) => optionState(all.find((x) => x.ref === r)!, tractorRef, cur).available);
    if (next.length === cur.length) break;
    cur = next;
  }
  return cur;
}

/** Choix par défaut quand on sélectionne un tracteur. */
export function defaultOptions(all: COption[], tractorRef: string): string[] {
  const out: string[] = [];
  for (const group of ['pneus', 'poste'] as const) {
    const candidates = all.filter((o) => o.group === group && optionAppliesTo(o, tractorRef));
    const def = candidates.find((o) => isDefaultFor(o, tractorRef)) ?? candidates[0];
    if (def) out.push(def.ref);
  }
  for (const o of all) {
    if (o.group !== 'pneus' && o.group !== 'poste' && optionAppliesTo(o, tractorRef) && isDefaultFor(o, tractorRef) && o.defaultFor !== '*') {
      out.push(o.ref);
    }
  }
  return pruneOptions(all, tractorRef, out);
}

/** Mots-clés visuels de la configuration, triés : « arceau-chargeur-gazon ». */
export function visualKey(options: COption[], selected: string[], machines: CMachine[] = [], selectedMachines: string[] = []) {
  const tags = new Set<string>();
  for (const o of options) if (selected.includes(o.ref) && o.visual) tags.add(o.visual);
  if (machines.some((m) => selectedMachines.includes(m.ref) && m.mount !== 'chargeur')) tags.add('machine');
  return [...tags].sort().join('-') || 'base';
}
