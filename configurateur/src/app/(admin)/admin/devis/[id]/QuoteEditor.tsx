'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { QuoteLine } from '@/db/schema';
import { parseEur } from '@/lib/money';
import { totalsOf } from '@/lib/pricing';
import { STATUSES, eur, euroInput } from '@/components/admin/Shell';
import { saveQuote } from '../../actions';

const GROUPS = ['tracteur', 'pneus', 'poste', 'option', 'chargeur', 'outil', 'machine', 'divers'];

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="a-filters">
      <button className="a-btn primary" name="intent" value="save" disabled={pending}>Enregistrer</button>
      <button className="a-btn accent" name="intent" value="send" disabled={pending}>{pending ? 'Envoi…' : 'Enregistrer et envoyer le devis définitif'}</button>
    </div>
  );
}

export function QuoteEditor(p: { id: number; lines: QuoteLine[]; discount: number; status: string; validUntil: string; adminNote: string; vatRate: number }) {
  const [state, action] = useFormState(saveQuote, null);
  const [rows, setRows] = useState(p.lines.map((l, i) => ({ ...l, key: i, price: euroInput(l.priceHt), removed: false })));
  const [discount, setDiscount] = useState(euroInput(p.discount));
  const live = totalsOf(
    rows.filter((r) => !r.removed && r.label.trim()).map((r) => ({ ...r, priceHt: r.price.trim() ? parseEur(r.price) : null })),
    parseEur(discount) ?? 0,
    p.vatRate,
  );
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="a-form">
      <input type="hidden" name="id" value={p.id} />
      <h2>Lignes du devis</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="a-table a-lines" style={{ minWidth: 640 }}>
          <thead><tr><th>Rubrique</th><th>Désignation</th><th style={{ width: 70 }}>Qté</th><th style={{ width: 130 }}>Prix HT (€)</th><th style={{ width: 60 }}>Retirer</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} style={r.removed ? { opacity: 0.4 } : undefined}>
                <td>
                  <select className="a-select" name="group" value={r.group} onChange={(e) => upd(i, { group: e.target.value as QuoteLine['group'] })}>
                    {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input type="hidden" name="ref" value={r.ref ?? ''} />
                </td>
                <td><input className="a-input" name="label" value={r.label} onChange={(e) => upd(i, { label: e.target.value })} /></td>
                <td><input className="a-input" name="qty" type="number" min={1} value={r.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} /></td>
                <td><input className="a-input" name="price" inputMode="decimal" placeholder="sur demande" value={r.price} onChange={(e) => upd(i, { price: e.target.value })} /></td>
                <td style={{ textAlign: 'center' }}><input type="checkbox" name={`remove_${i}`} checked={r.removed} onChange={(e) => upd(i, { removed: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <button type="button" className="a-btn sm" onClick={() => setRows((rs) => [...rs, { group: 'divers', ref: null, label: '', priceHt: null, qty: 1, key: Date.now(), price: '', removed: false }])}>
          + Ajouter une ligne (livraison, mise en route, frais d’immatriculation…)
        </button>
      </div>
      <div className="a-fields">
        <label className="a-field"><span>Remise HT (€)</span><input className="a-input" name="discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <label className="a-field"><span>Statut</span>
          <select className="a-select" name="status" defaultValue={p.status}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className="a-field"><span>Valable jusqu’au</span><input className="a-input" type="date" name="validUntil" defaultValue={p.validUntil} /></label>
        <label className="a-field full"><span>Note interne (non visible par le client)</span><textarea className="a-textarea" name="adminNote" defaultValue={p.adminNote} /></label>
      </div>
      <div className="a-sum">
        <div><span>Sous-total HT</span><b>{eur(live.subtotalHt)}</b></div>
        <div><span>Remise</span><b>- {eur(live.discountHt)}</b></div>
        <div><span>Total HT</span><b>{eur(live.totalHt)}</b></div>
        <div><span>TVA {p.vatRate} %</span><b>{eur(live.vatAmount)}</b></div>
        <div className="big"><span>Total TVAC</span><span>{eur(live.totalTtc)}</span></div>
      </div>
      {state?.ok && <p className="a-msg" role="status">{state.ok}</p>}
      {state?.error && <p className="a-msg err" role="alert">{state.error}</p>}
      <Buttons />
    </form>
  );
}
