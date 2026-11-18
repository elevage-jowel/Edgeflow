import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMachine, defaultOptions, parseHitch, toggleOption } from './compat';
import { buildLines, totalsOf } from './pricing';
import { parseEur } from './money';
import type { Catalog, CMachine, COption, CTractor } from './catalog-types';

const tractor: CTractor = {
  ref: 'FT26', slug: 'ft26', brand: 'Farmtrac', category: 'compact-18-30', name: 'FT26', description: '',
  priceHt: 1_000_000, availability: 'en_stock', leadTime: null, powerHp: 24.5, transmission: 'Hydrostatique',
  liftCapacityKg: 800, hitchCategory: 'I', ptoType: '540', weightKg: 1010, widthCm: 104, maxImplementWidthCm: 150,
  usages: [], image: null, images: [], spinUrl: null, spinFrames: 36, modelUrl: null,
};
const opt = (o: Partial<COption> & Pick<COption, 'ref' | 'group'>): COption => ({
  name: o.ref, description: '', priceHt: 10_000, image: null, tractorRefs: '*', defaultFor: [], requiresAny: [], excludes: [],
  visual: null, feature: null, tireFront: null, tireRear: null, widthCm: null, ...o,
});
const options: COption[] = [
  opt({ ref: 'AGRI', group: 'pneus', priceHt: 0, defaultFor: '*' }),
  opt({ ref: 'GAZON', group: 'pneus', priceHt: 50_000 }),
  opt({ ref: 'ARCEAU', group: 'poste', priceHt: 0, defaultFor: '*' }),
  opt({ ref: 'CAB', group: 'poste', priceHt: 300_000 }),
  opt({ ref: 'LOADER', group: 'chargeur', feature: 'chargeur' }),
  opt({ ref: 'GODET', group: 'outil', requiresAny: ['LOADER'] }),
  opt({ ref: 'RAV', group: 'option', feature: 'relevage-avant', tractorRefs: ['FT26'] }),
  opt({ ref: 'AUTRE', group: 'option', tractorRefs: ['FT99'] }),
];
const mach = (m: Partial<CMachine>): CMachine => ({
  ref: 'M', slug: 'm', brand: 'Garmech', category: 'gyrobroyeur', family: 'g', familyName: null, name: 'Gyro', description: '', priceHt: 100_000,
  availability: 'en_stock', leadTime: null, workingWidthCm: 120, minPowerHp: 18, maxPowerHp: 40, hitchCategory: 'I',
  weightKg: 250, mount: 'arriere', needsPto: true, ptoType: '540', image: null, ...m,
});

test('parseHitch', () => {
  assert.deepEqual([...parseHitch('Cat. I/II')], [1, 2]);
  assert.deepEqual([...parseHitch('Catégorie 1')], [1]);
});

test('compatibilité machines', () => {
  const f = new Set<string>();
  assert.equal(checkMachine(tractor, mach({}), f).verdict, 'ok');
  assert.equal(checkMachine(tractor, mach({ minPowerHp: 30 }), f).verdict, 'block');
  assert.equal(checkMachine(tractor, mach({ hitchCategory: 'II' }), f).verdict, 'block');
  assert.equal(checkMachine(tractor, mach({ minPowerHp: 10, maxPowerHp: 20 }), f).verdict, 'block', 'tracteur trop puissant');
  assert.equal(checkMachine(tractor, mach({ minPowerHp: 20, maxPowerHp: 30 }), f).verdict, 'ok', 'dans la plage');
  const est = checkMachine(tractor, mach({ minPowerHp: 6, maxPowerHp: 18, maxPowerEstimated: true }), f);
  assert.equal(est.verdict, 'block'); assert.equal(est.reasons[0].code, 'powerFarAbove');
  assert.equal(checkMachine(tractor, mach({ workingWidthCm: 180 }), f).verdict, 'warn');
  assert.equal(checkMachine(tractor, mach({ weightKg: 700 }), f).verdict, 'warn');
  assert.equal(checkMachine(tractor, mach({ weightKg: 900 }), f).verdict, 'block');
  assert.equal(checkMachine(tractor, mach({ mount: 'avant', needsPto: false }), f).verdict, 'block');
  assert.equal(checkMachine(tractor, mach({ mount: 'avant', needsPto: false }), new Set(['relevage-avant'])).verdict, 'ok');
});

test('options : défauts, choix unique, prérequis en cascade', () => {
  assert.deepEqual(defaultOptions(options, 'FT26'), ['AGRI', 'ARCEAU']);
  let s = toggleOption(options, 'FT26', ['AGRI', 'ARCEAU'], 'GAZON');
  assert.deepEqual(s.sort(), ['ARCEAU', 'GAZON']);
  s = toggleOption(options, 'FT26', s, 'GODET');
  assert.ok(!s.includes('GODET'), 'outil sans chargeur refusé');
  s = toggleOption(options, 'FT26', s, 'LOADER');
  s = toggleOption(options, 'FT26', s, 'GODET');
  assert.ok(s.includes('GODET'));
  s = toggleOption(options, 'FT26', s, 'LOADER');
  assert.ok(!s.includes('GODET'), 'retirer le chargeur retire ses outils');
  assert.ok(toggleOption(options, 'FT26', s, 'AUTRE').every((r) => r !== 'AUTRE'));
});

test('devis : lignes, prix sur demande et TVA 21 %', () => {
  const catalog: Catalog = { tractors: [tractor], options, machines: [mach({}), mach({ ref: 'BIG', minPowerHp: 60 })] };
  const { lines, errors } = buildLines(catalog, { tractor: 'FT26', options: ['GAZON', 'CAB', 'LOADER'], machines: ['M', 'BIG'] });
  assert.equal(lines.length, 5);
  assert.ok(errors.some((e) => e.includes('BIG')));
  const t = totalsOf(lines, 10_000);
  assert.equal(t.subtotalHt, 1_000_000 + 50_000 + 300_000 + 10_000 + 100_000);
  assert.equal(t.totalHt, t.subtotalHt - 10_000);
  assert.equal(t.vatAmount, Math.round(t.totalHt * 0.21));
  const por = totalsOf([{ group: 'option', ref: 'x', label: 'x', priceHt: null, qty: 1 }]);
  assert.equal(por.hasPriceOnRequest, true);
});

test('parseEur', () => {
  assert.equal(parseEur('10 995,00 €'), 1_099_500);
  assert.equal(parseEur('12.345,67'), 1_234_567);
  assert.equal(parseEur('1234.5'), 123_450);
  assert.equal(parseEur(''), null);
});
