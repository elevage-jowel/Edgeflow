import localFont from 'next/font/local';

/** Polices auto-hébergées (aucun appel à Google Fonts : plus rapide et conforme RGPD). */
export const display = localFont({
  src: '../../node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
  variable: '--font-display',
  weight: '100 900',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
});

export const body = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-body',
  weight: '100 900',
  display: 'swap',
});
