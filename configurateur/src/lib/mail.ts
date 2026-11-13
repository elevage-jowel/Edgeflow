import 'server-only';
import nodemailer from 'nodemailer';

type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

let transport: nodemailer.Transporter | null = null;

/** Envoie un e-mail via SMTP. Sans SMTP configuré, l'e-mail est affiché dans la console. */
export async function sendMail(mail: Mail) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info(`[e-mail non envoyé : SMTP non configuré] À : ${[mail.to].flat().join(', ')} — ${mail.subject}\n${mail.text}`);
    return { delivered: false };
  }
  transport ??= nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...mail });
  return { delivered: true };
}

export function dealerEmails() {
  return (process.env.DEALER_NOTIFY_EMAILS || process.env.COMPANY_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Gabarit HTML sobre, lisible dans tous les clients e-mail. */
export function emailLayout(opts: { brandColor: string; company: string; title: string; paragraphs: string[]; button?: { label: string; url: string }; footer: string }) {
  const p = opts.paragraphs.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1d241f">${esc(x)}</p>`).join('');
  const btn = opts.button
    ? `<p style="margin:22px 0"><a href="${esc(opts.button.url)}" style="background:${esc(opts.brandColor)};color:#14130b;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;display:inline-block">${esc(opts.button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#eef1ed;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#132018;padding:18px 26px;color:#ffffff;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px">${esc(opts.company)}</td></tr>
<tr><td style="padding:26px"><h1 style="margin:0 0 16px;font-size:21px;color:#132018">${esc(opts.title)}</h1>${p}${btn}</td></tr>
<tr><td style="padding:16px 26px;background:#f5f7f4;color:#5c665f;font-size:12px;line-height:1.5">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
