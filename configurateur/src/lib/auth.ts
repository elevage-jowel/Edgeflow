/**
 * Accès admin : un mot de passe (ADMIN_PASSWORD) et un cookie signé HMAC.
 * Compatible Edge (middleware) grâce à Web Crypto.
 */
const COOKIE = 'admin_session';
const MAX_AGE = 60 * 60 * 12; // 12 h

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET doit contenir au moins 32 caractères');
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionValue() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await hmac(`admin.${exp}`)}`;
}

export async function verifySessionValue(value: string | undefined) {
  if (!value) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(`admin.${exp}`));
}

export async function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Comparaison sur les empreintes pour un temps constant.
  return safeEqual(await hmac(`pw.${input}`), await hmac(`pw.${expected}`));
}

export const sessionCookie = { name: COOKIE, maxAge: MAX_AGE };
