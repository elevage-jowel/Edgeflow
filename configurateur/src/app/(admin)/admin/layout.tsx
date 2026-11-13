import type { Metadata } from 'next';
import './admin.css';
import { body } from '../../fonts';

export const metadata: Metadata = { title: 'Administration', robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={body.variable}>
      <body className="admin">{children}</body>
    </html>
  );
}
