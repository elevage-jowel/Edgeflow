/** Coordonnées de la société, lues dans les variables d'environnement. */
export const company = {
  name: process.env.COMPANY_NAME || 'Forestar',
  address: process.env.COMPANY_ADDRESS || "Chaussée d'Ecaussinnes 162, 7090 Braine-le-Comte",
  phone: process.env.COMPANY_PHONE || '+32 67 83 07 06',
  email: process.env.COMPANY_EMAIL || 'info@forestar.be',
  vat: process.env.COMPANY_VAT || '',
  iban: process.env.COMPANY_IBAN || '',
  brandColor: process.env.BRAND_COLOR || '#e9b500',
  quotePrefix: process.env.QUOTE_PREFIX || 'FS',
  quoteValidityDays: Number(process.env.QUOTE_VALIDITY_DAYS || 30),
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
};
export type Company = typeof company;
