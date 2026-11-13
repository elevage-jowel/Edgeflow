/** Montants en centimes HT. TVA belge standard : 21 %. */
export const VAT_RATE = 21;

export function vatOf(cents: number, rate = VAT_RATE) {
  return Math.round((cents * rate) / 100);
}
export function withVat(cents: number, rate = VAT_RATE) {
  return cents + vatOf(cents, rate);
}

/** 1234567 → « 12 345,67 € » (ou sans décimales si rond). */
export function formatEur(cents: number | null | undefined, locale: 'fr' | 'nl' = 'fr', opts: { decimals?: boolean } = {}) {
  if (cents == null) return '';
  const value = cents / 100;
  const decimals = opts.decimals ?? !Number.isInteger(value);
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-BE' : 'fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(value);
}

/** « 12 345,67 », « 12345.67 », « 12.345,67 » → 1234567 centimes ; vide → null */
export function parseEur(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return Math.round(input * 100);
  let s = input.replace(/[€\s  ]/g, '').trim();
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
