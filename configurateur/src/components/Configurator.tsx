'use client';
/**
 * Configurateur en 7 étapes. L'état (tracteur, options, machines, étape) est
 * reflété dans l'URL : un simple copier-coller de l'adresse partage la configuration.
 * Le bouton « Partager » enregistre en plus un lien court côté serveur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Catalog, CMachine, COption, CTractor, Selection } from '@/lib/catalog-types';
import { checkMachine, defaultOptions, optionAppliesTo, optionState, selectedFeatures, toggleOption, visualKey, type MachineCheck } from '@/lib/compat';
import { buildLines, totalsOf } from '@/lib/pricing';
import { formatEur, withVat } from '@/lib/money';
import { fill, href, t, type Locale } from '@/lib/i18n';
import { AnimatedPrice } from './AnimatedPrice';
import { TractorVisual } from './TractorVisual';
import { optimized } from '@/lib/image';
import { QuoteForm } from './QuoteForm';

type Props = {
  locale: Locale;
  catalog: Catalog;
  initial: Selection | null;
  initialStep?: number;
  parentToken?: string;
};

const STEP_GROUPS: (COption['group'] | null)[] = [null, 'pneus', 'poste', 'option', 'chargeur', null, null];
const POWER_BANDS = ['electrique', 'compact-18-30', 'compact-30-50', 'plus-50'];

export function Configurator({ locale, catalog, initial, initialStep, parentToken }: Props) {
  const m = t(locale);
  const router = useRouter();
  const [tractorRef, setTractorRef] = useState<string | null>(initial?.tractor ?? null);
  const [opts, setOpts] = useState<string[]>(initial?.options ?? []);
  const [machines, setMachines] = useState<string[]>(initial?.machines ?? []);
  const [step, setStep] = useState(initial?.tractor ? Math.min(initialStep ?? 1, 6) : 0);
  const panelRef = useRef<HTMLDivElement>(null);

  const tractor = catalog.tractors.find((x) => x.ref === tractorRef) ?? null;
  const selection: Selection | null = tractor ? { tractor: tractor.ref, options: opts, machines } : null;
  const { lines } = useMemo(() => (selection ? buildLines(catalog, selection) : { lines: [] }), [catalog, selection?.tractor, opts, machines]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = totalsOf(lines);
  const features = useMemo(() => selectedFeatures(catalog.options, opts), [catalog.options, opts]);
  const tags = useMemo(() => visualKey(catalog.options, opts, catalog.machines, machines).split('-'), [catalog, opts, machines]);

  // Reflète la configuration dans l'URL (partage par copier-coller, retour arrière).
  useEffect(() => {
    const q = new URLSearchParams();
    if (tractorRef) q.set('t', tractorRef);
    if (opts.length) q.set('o', opts.join(','));
    if (machines.length) q.set('m', machines.join(','));
    q.set('e', String(step + 1));
    if (parentToken) q.set('from', parentToken);
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
  }, [tractorRef, opts, machines, step, parentToken]);

  const goto = useCallback((s: number) => {
    setStep(s);
    requestAnimationFrame(() => {
      const top = panelRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || window.innerWidth <= 860) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const chooseTractor = (ref: string) => {
    if (ref !== tractorRef) {
      setTractorRef(ref);
      setOpts(defaultOptions(catalog.options, ref));
      setMachines([]);
    }
    goto(1);
  };
  const toggle = (ref: string) => tractor && setOpts((cur) => toggleOption(catalog.options, tractor.ref, cur, ref));
  const toggleMachine = (ref: string, family: string) =>
    setMachines((cur) => {
      if (cur.includes(ref)) return cur.filter((r) => r !== ref);
      const sameFamily = catalog.machines.filter((x) => x.family === family).map((x) => x.ref);
      return [...cur.filter((r) => !sameFamily.includes(r)), ref];
    });

  // Si le chargeur disparaît, retire les machines qui en dépendaient.
  useEffect(() => {
    if (!tractor) return;
    setMachines((cur) => cur.filter((r) => {
      const mm = catalog.machines.find((x) => x.ref === r);
      return mm && checkMachine(tractor, mm, features).verdict !== 'block';
    }));
  }, [features, tractor, catalog.machines]);

  const stepTitle = m.cfg.stepTitles[step];
  const groupForStep = STEP_GROUPS[step];

  return (
    <div className="cfg">
      <section className="cfg-visual studio" aria-label={m.cfg.yourConfig}>
        <div className="tag">
          <small>{tractor ? `${tractor.brand} · ${m.cfg.yourConfig}` : m.cfg.yourConfig}</small>
          <b>{tractor ? tractor.name : m.cfg.stepTitles[0]}</b>
        </div>
        <div className="stage">
          {tractor ? (
            <TractorVisual
              key={tractor.ref}
              name={`${tractor.brand} ${tractor.name}`}
              images={tractor.images}
              spinUrl={tractor.spinUrl}
              spinFrames={tractor.spinFrames}
              modelUrl={tractor.modelUrl}
              variant={tags.join('-')}
              tags={tags}
              hint={m.cfg.dragHint}
              priority
            />
          ) : (
            <TractorVisual name="" images={[]} tags={['arceau']} />
          )}
        </div>
        <div className="chips">
          {lines.slice(1).map((l) => (
            <span className="chip" key={l.ref}>{l.label.length > 38 ? l.label.slice(0, 36) + '…' : l.label}</span>
          ))}
        </div>
        <MachineCard locale={locale} catalog={catalog} selected={machines} />
      </section>

      <section className="cfg-panel" ref={panelRef} aria-label={stepTitle}>
        <nav className="cfg-steps" aria-label="Étapes">
          {m.cfg.steps.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goto(i)}
              disabled={i > 0 && !tractor}
              aria-current={i === step ? 'step' : undefined}
              className={i < step ? 'done' : undefined}
            >
              {i + 1} {label}
            </button>
          ))}
        </nav>

        <div className="cfg-body step-anim" key={step}>
          <div>
            <h2>{stepTitle}</h2>
          </div>
          <p className="lead">{m.cfg.stepLeads[step]}</p>

          {step === 0 && <TractorStep locale={locale} catalog={catalog} current={tractorRef} onChoose={chooseTractor} />}
          {tractor && groupForStep && groupForStep !== 'chargeur' && (
            <OptionStep locale={locale} tractor={tractor} all={catalog.options} group={groupForStep} selected={opts} onToggle={toggle} />
          )}
          {tractor && step === 4 && (
            <>
              <OptionStep locale={locale} tractor={tractor} all={catalog.options} group="chargeur" selected={opts} onToggle={toggle} />
              <OptionStep locale={locale} tractor={tractor} all={catalog.options} group="outil" selected={opts} onToggle={toggle} hideEmpty />
            </>
          )}
          {tractor && step === 5 && (
            <MachineStep locale={locale} tractor={tractor} machines={catalog.machines} features={features} selected={machines} onToggle={toggleMachine} />
          )}
          {tractor && step === 6 && selection && (
            <Recap locale={locale} lines={lines} totals={totals} onEdit={goto} selection={selection} parentToken={parentToken} onSent={(token) => router.push(href(locale, 'quote', token))} />
          )}
        </div>

        <div className="cfg-total">
          <div>
            <small>{m.cfg.totalHt}</small>
            {tractor && totals.totalHt > 0 ? (
              <AnimatedPrice className="ht" cents={totals.totalHt} locale={locale} />
            ) : (
              <span className="ht" style={tractor ? { fontSize: 20 } : undefined}>{tractor ? m.product.priceOnRequest : '—'}</span>
            )}
            <div className="ttc">
              {tractor && totals.totalHt > 0 ? <>{formatEur(totals.totalTtc, locale)} {m.product.incl}</> : m.cfg.vat}
            </div>
            {totals.hasPriceOnRequest && totals.totalHt > 0 && <div className="por">{m.cfg.plusPor}</div>}
          </div>
          <div className="cfg-nav">
            {step > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => goto(step - 1)} aria-label={m.cfg.back}>
                ←
              </button>
            )}
            {step < 6 && (
              <button type="button" className="btn btn-primary btn-sm" disabled={!tractor} onClick={() => goto(step + 1)}>
                {m.cfg.next}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────── Étape 1 : tracteur ───────────────────────────

function TractorStep({ locale, catalog, current, onChoose }: { locale: Locale; catalog: Catalog; current: string | null; onChoose: (r: string) => void }) {
  const m = t(locale);
  const [band, setBand] = useState<string | null>(null);
  const [usage, setUsage] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const prices = catalog.tractors.map((x) => x.priceHt).filter((x): x is number => x != null);
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices) / 100000) * 100000 : 0;
  const [budget, setBudget] = useState(maxPrice);
  const brands = [...new Set(catalog.tractors.map((x) => x.brand))];
  const bands = POWER_BANDS.filter((b) => catalog.tractors.some((x) => x.category === b));
  const usages = ['prairie', 'pelouse', 'cour', 'maraichage'].filter((u) => catalog.tractors.some((x) => x.usages.includes(u)));

  const list = catalog.tractors.filter(
    (x) =>
      (!band || x.category === band) &&
      (!usage || x.usages.includes(usage)) &&
      (!brand || x.brand === brand) &&
      (budget >= maxPrice || (x.priceHt != null && x.priceHt <= budget)),
  );
  return (
    <>
      <div className="filters" style={{ marginBottom: 4 }}>
        <Seg label={m.cfg.filterPower} value={band} onChange={setBand} items={bands.map((b) => [b, m.categories[b] ?? b])} any={m.cfg.any} />
        {usages.length > 0 && <Seg label={m.cfg.filterUsage} value={usage} onChange={setUsage} items={usages.map((u) => [u, m.usages[u]])} any={m.cfg.any} />}
        {brands.length > 1 && <Seg label={m.cfg.filterBrand} value={brand} onChange={setBrand} items={brands.map((b) => [b, b])} any={m.cfg.any} />}
        {maxPrice > 0 && (
          <label className="filter-group range-input">
            <span>
              {m.cfg.filterBudget} : {budget >= maxPrice ? m.cfg.any : formatEur(budget, locale)}
            </span>
            <input type="range" min={500000} max={maxPrice} step={50000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </label>
        )}
      </div>
      <div className="opt-list" role="radiogroup" aria-label={m.cfg.stepTitles[0]}>
        {list.map((x) => (
          <button key={x.ref} type="button" role="radio" aria-checked={x.ref === current} className="opt tractor" onClick={() => onChoose(x.ref)}>
            <span className="ic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.image ? <img src={optimized(x.image, 256)} alt="" loading="lazy" /> : <span>⌁</span>}
            </span>
            <span>
              <span className="nm">
                {x.ref === current && <span className="tick">✓</span>}
                {x.brand} {x.name}
              </span>
              <span className="ds" style={{ display: 'block' }}>
                {[x.powerHp != null ? `${String(x.powerHp).replace('.', ',')} ${m.product.hp}` : null, x.transmission, x.liftCapacityKg ? `${m.product.lift} ${x.liftCapacityKg} kg` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <span className="pr">
              {x.priceHt != null ? (
                <>
                  <small>{m.product.from}</small>
                  {formatEur(x.priceHt, locale)} <small>{m.product.excl}</small>
                </>
              ) : (
                <small>{m.product.priceOnRequest}</small>
              )}
            </span>
          </button>
        ))}
        {!list.length && <p className="notice info">{m.product.noResult}</p>}
      </div>
    </>
  );
}

function Seg({ label, value, onChange, items, any }: { label: string; value: string | null; onChange: (v: string | null) => void; items: [string, string][]; any: string }) {
  return (
    <div className="filter-group">
      <span>{label}</span>
      <div className="seg">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>{any}</button>
        {items.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(value === k ? null : k)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Étapes 2 à 5 : options ───────────────────────────

const ICONS: Record<string, string> = { pneus: '◎', poste: '⌂', option: '✦', chargeur: '⌒', outil: '◫' };

function OptionStep({ locale, tractor, all, group, selected, onToggle, hideEmpty }: {
  locale: Locale; tractor: CTractor; all: COption[]; group: COption['group']; selected: string[]; onToggle: (r: string) => void; hideEmpty?: boolean;
}) {
  const m = t(locale);
  const list = all.filter((o) => o.group === group && optionAppliesTo(o, tractor.ref));
  if (!list.length) return hideEmpty ? null : <p className="notice info">{m.cfg.nothingHere}</p>;
  const radio = group === 'pneus' || group === 'poste';
  const nameOf = (ref: string) => all.find((o) => o.ref === ref)?.name ?? ref;
  return (
    <div className="opt-list" role={radio ? 'radiogroup' : 'group'} aria-label={m.quote.groups[group === 'outil' ? 'outil' : group]}>
      {group === 'outil' && <div className="eyebrow" style={{ marginTop: 8 }}>{m.quote.groups.outil}</div>}
      {list.map((o) => {
        const st = optionState(o, tractor.ref, selected);
        const on = selected.includes(o.ref);
        const details = [
          o.tireFront || o.tireRear ? `AV ${o.tireFront ?? '—'} · AR ${o.tireRear ?? '—'}` : null,
          o.widthCm ? `${m.product.width} ${o.widthCm} cm` : null,
          o.description && !o.description.startsWith('Variante Herco') ? o.description : null,
        ].filter(Boolean);
        return (
          <div key={o.ref} style={{ display: 'grid', gap: 6 }}>
            <button
              type="button"
              className="opt"
              role={radio ? 'radio' : undefined}
              aria-checked={radio ? on : undefined}
              aria-pressed={radio ? undefined : on}
              disabled={!st.available && !on}
              onClick={() => onToggle(o.ref)}
            >
              <span className="ic" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {o.image ? <img src={optimized(o.image, 128)} alt="" loading="lazy" /> : ICONS[o.group]}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="nm">
                  {on && <span className="tick">✓</span>}
                  {o.name}
                </span>
                {details.length > 0 && <span className="ds" style={{ display: 'block' }}>{details.join(' · ')}</span>}
              </span>
              <span className="pr">
                {o.priceHt == null ? <small>{m.product.priceOnRequest}</small> : o.priceHt === 0 ? m.cfg.included : `+ ${formatEur(o.priceHt, locale)}`}
                {o.priceHt ? <small>{m.product.excl}</small> : null}
              </span>
            </button>
            {!st.available && st.missing.length > 0 && (
              <p className="notice info">
                {m.cfg.requires} : {[...new Set(st.missing.map(nameOf))].join(` ${locale === 'nl' ? 'of' : 'ou'} `)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Étape 6 : machines ───────────────────────────

function familyLabel(items: CMachine[], typeLabel: string) {
  if (items[0].familyName) return items[0].familyName;
  const words = items.map((x) => x.name.split(/\s+/));
  const common: string[] = [];
  for (let i = 0; i < words[0].length; i++) {
    const w = words[0][i];
    if (words.every((ws) => ws[i]?.toLowerCase() === w.toLowerCase()) && !/^\d/.test(w)) common.push(w);
    else break;
  }
  const label = common.join(' ');
  return label.split(' ').length >= 2 ? label : `${items[0].brand} ${label && label !== items[0].brand ? label + ' – ' : ''}${typeLabel}`;
}

function widthLabel(x: CMachine, siblings: CMachine[] = []) {
  if (x.workingWidthCm) {
    const twin = siblings.some((y) => y !== x && y.workingWidthCm === x.workingWidthCm);
    const extra = twin ? x.name.match(/(sans|avec) roues avant|grand[- ]angle|HD|joystick|fléau[- ]palette|marteau/i)?.[0] : null;
    return `${x.workingWidthCm} cm${extra ? ` · ${extra.toLowerCase()}` : twin ? ' · variante' : ''}`;
  }
  const n = x.name.replace(/^(Peruzzo|Garmech|Balfor|Ecolawn|Mateng|Wallenstein|Beroni|Farmtrac)\s+/i, '');
  return n.length > 26 ? n.slice(0, 24) + '…' : n;
}

function MachineStep({ locale, tractor, machines, features, selected, onToggle }: {
  locale: Locale; tractor: CTractor; machines: CMachine[]; features: Set<string>; selected: string[]; onToggle: (ref: string, family: string) => void;
}) {
  const m = t(locale);
  const [brand, setBrand] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const checks = useMemo(() => new Map(machines.map((x) => [x.ref, checkMachine(tractor, x, features)])), [machines, tractor, features]);
  const usable = machines.filter((x) => checks.get(x.ref)!.verdict !== 'block');
  const pool = showAll ? machines : usable;
  const brands = [...new Set(pool.map((x) => x.brand))].sort();
  const types = [...new Set(pool.filter((x) => !brand || x.brand === brand).map((x) => x.category))].sort((a, b) => (m.machineTypes[a] ?? a).localeCompare(m.machineTypes[b] ?? b));
  const filtered = pool.filter((x) => (!brand || x.brand === brand) && (!type || x.category === type));
  const families = new Map<string, CMachine[]>();
  for (const x of filtered) families.set(x.family, [...(families.get(x.family) ?? []), x]);
  for (const list of families.values()) list.sort((a, b) => (a.workingWidthCm ?? 0) - (b.workingWidthCm ?? 0) || (a.priceHt ?? 0) - (b.priceHt ?? 0));
  const selectedMachines = machines.filter((x) => selected.includes(x.ref));

  return (
    <>
      <p className="notice info" style={{ marginTop: -4 }}>
        {m.cfg.machinesCount(new Set(usable.map((x) => x.family)).size)} · {tractor.name}
        {tractor.powerHp ? ` · ${String(tractor.powerHp).replace('.', ',')} ${m.product.hp}` : ''}
        {tractor.liftCapacityKg ? ` · ${m.product.lift} ${tractor.liftCapacityKg} kg` : ''}
      </p>
      {selectedMachines.map((x) => (
        <Reasons key={x.ref} locale={locale} check={checks.get(x.ref)!} title={x.name} />
      ))}
      <div className="filters" style={{ marginBottom: 0 }}>
        <Seg label={m.cfg.filterBrand} value={brand} onChange={(v) => { setBrand(v); setType(null); }} items={brands.map((b) => [b, b])} any={m.cfg.any} />
        <label className="filter-group" style={{ minWidth: 220 }}>
          <span>{m.cfg.filterType}</span>
          <select className="select" value={type ?? ''} onChange={(e) => setType(e.target.value || null)}>
            <option value="">{m.cfg.any}</option>
            {types.map((ty) => (
              <option key={ty} value={ty}>{m.machineTypes[ty] ?? ty}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="opt-list">
        {[...families.entries()].map(([fam, items]) => {
          const img = items.find((x) => x.image)?.image;
          const any = items.some((x) => selected.includes(x.ref));
          return (
            <div className="machine-group" key={fam} style={any ? { borderColor: 'var(--accent)' } : undefined}>
              <header>
                <span className="opt" style={{ padding: 0, border: 0, display: 'block' }}>
                  <span className="ic" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={optimized(img, 128)} alt="" loading="lazy" /> : '⚙'}
                  </span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="nm" style={{ fontWeight: 600, display: 'block' }}>{familyLabel(items, m.machineTypes[items[0].category] ?? '')}</span>
                  <span className="ds muted" style={{ fontSize: 12.5 }}>
                    {[items[0].brand, m.machineTypes[items[0].category], items[0].mount ? m.product.mounts[items[0].mount] : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </header>
              <div className="widths" role="group" aria-label={m.cfg.widths}>
                {items.map((x) => {
                  const c = checks.get(x.ref)!;
                  const on = selected.includes(x.ref);
                  return (
                    <button
                      key={x.ref}
                      type="button"
                      className={`width-btn ${c.verdict === 'warn' ? 'warn' : ''}`}
                      aria-pressed={on}
                      disabled={c.verdict === 'block' && !on}
                      title={c.reasons.map((r) => fill(m.cfg.reasons[r.code] ?? r.code, r.params)).join('\n') || undefined}
                      onClick={() => onToggle(x.ref, x.family)}
                    >
                      <span>{on && '✓ '}{widthLabel(x, items)}</span>
                      <small>{x.priceHt == null ? m.product.priceOnRequest : formatEur(x.priceHt, locale)}{c.verdict === 'warn' ? ` · ${m.cfg.notAdvised}` : c.verdict === 'block' ? ` · ${m.cfg.incompatible}` : ''}</small>
                    </button>
                  );
                })}
              </div>
              {showAll && items.every((x) => checks.get(x.ref)!.verdict === 'block') && (
                <Reasons locale={locale} check={checks.get(items[0].ref)!} />
              )}
            </div>
          );
        })}
        {!families.size && <p className="notice info">{m.product.noResult}</p>}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>
        {showAll ? m.cfg.hideIncompatible : m.cfg.showIncompatible}
      </button>
    </>
  );
}

function Reasons({ locale, check, title }: { locale: Locale; check: MachineCheck; title?: string }) {
  const m = t(locale);
  if (check.verdict === 'ok') return null;
  return (
    <div className={`notice ${check.verdict}`} role="status">
      <span aria-hidden>⚠</span>
      <span>
        {title && <b>{title} : </b>}
        {check.reasons.map((r) => fill(m.cfg.reasons[r.code] ?? r.code, r.params)).join(' ')}
      </span>
    </div>
  );
}

// ─────────────────────────── Étape 7 : récapitulatif ───────────────────────────

const STEP_OF_GROUP: Record<string, number> = { tracteur: 0, pneus: 1, poste: 2, option: 3, chargeur: 4, outil: 4, machine: 5 };

function Recap({ locale, lines, totals, onEdit, selection, parentToken, onSent }: {
  locale: Locale; lines: ReturnType<typeof buildLines>['lines']; totals: ReturnType<typeof totalsOf>; onEdit: (s: number) => void; selection: Selection; parentToken?: string; onSent: (token: string) => void;
}) {
  const m = t(locale);
  const [shared, setShared] = useState<string | null>(null);
  const share = async () => {
    try {
      const res = await fetch('/api/configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection) });
      const { id } = await res.json();
      const url = `${window.location.origin}${href(locale, 'configurator')}?c=${id}`;
      setShared(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    } catch {
      setShared(window.location.href);
    }
  };
  return (
    <>
      <div className="recap">
        {lines.map((l) => (
          <div className="recap-row" key={`${l.group}-${l.ref}`}>
            <span>
              <span className="cat">{m.quote.groups[l.group]}</span>
              {l.label}{' '}
              <button type="button" onClick={() => onEdit(STEP_OF_GROUP[l.group] ?? 0)}>{m.cfg.change}</button>
            </span>
            <span>{l.priceHt == null ? m.quote.por : formatEur(l.priceHt, locale, { decimals: true })}</span>
          </div>
        ))}
      </div>
      <div className="sums">
        <div><span>{m.quote.subtotal}</span><span>{formatEur(totals.totalHt, locale, { decimals: true })}</span></div>
        <div><span>{m.cfg.vat}</span><span>{formatEur(totals.vatAmount, locale, { decimals: true })}</span></div>
        <div className="grand"><span>{m.quote.totalTtc}</span><span>{formatEur(withVat(totals.totalHt), locale, { decimals: true })}</span></div>
        {totals.hasPriceOnRequest && <p className="notice warn" style={{ marginTop: 8 }}>{m.quote.porNote}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={share}>⤴ {m.cfg.share}</button>
      </div>
      {shared && (
        <p className="notice info" style={{ wordBreak: 'break-all' }}>
          {m.cfg.savedShow} {shared}
        </p>
      )}
      <QuoteForm locale={locale} selection={selection} parentToken={parentToken} onSent={onSent} />
    </>
  );
}

/** Photo de la dernière machine choisie, en vignette sur la scène du tracteur. */
function MachineCard({ locale, catalog, selected }: { locale: Locale; catalog: Catalog; selected: string[] }) {
  const m = t(locale);
  const chosen = selected.map((r) => catalog.machines.find((x) => x.ref === r)).filter((x): x is CMachine => !!x);
  const last = chosen[chosen.length - 1];
  if (!last) return null;
  const photo = last.image ?? catalog.machines.find((x) => x.family === last.family && x.image)?.image ?? null;
  return (
    <div className="machine-card step-anim" key={last.ref}>
      <span className="mc-k">{m.cfg.machineChosen}{chosen.length > 1 ? ` · ${chosen.length}` : ''}</span>
      {photo && (
        <div className="mc-ph">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={optimized(photo, 640)} alt={last.familyName ?? last.name} />
        </div>
      )}
      <b>{last.familyName ?? last.name}</b>
      <span className="mc-d">
        {[last.workingWidthCm ? `${last.workingWidthCm} cm` : null, last.priceHt != null ? `${formatEur(last.priceHt, locale)} ${m.product.excl}` : m.product.priceOnRequest].filter(Boolean).join(' · ')}
      </span>
    </div>
  );
}
