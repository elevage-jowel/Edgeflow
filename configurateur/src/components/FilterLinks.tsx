import Link from 'next/link';

/** Filtres en liens (fonctionnent sans JavaScript, URL partageables et indexables). */
export function FilterLinks({ label, param, value, items, base, params, any }: {
  label: string; param: string; value: string | undefined; items: [string, string][]; base: string; params: Record<string, string | undefined>; any: string;
}) {
  const url = (v: string | null) => {
    const q = new URLSearchParams(Object.entries(params).filter(([k, x]) => x && k !== param) as [string, string][]);
    if (v) q.set(param, v);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="filter-group">
      <span>{label}</span>
      <div className="seg">
        <Link href={url(null)} aria-current={!value ? 'true' : undefined} scroll={false}>{any}</Link>
        {items.map(([k, l]) => (
          <Link key={k} href={url(k)} aria-current={value === k ? 'true' : undefined} scroll={false}>{l}</Link>
        ))}
      </div>
    </div>
  );
}
