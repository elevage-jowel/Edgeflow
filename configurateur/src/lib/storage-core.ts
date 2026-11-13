/**
 * Écriture de fichiers dans le stockage (Supabase Storage ou dossier local).
 * Sans dépendance à Next.js : utilisable aussi par les scripts en ligne de commande.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function uploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

/** Enregistre des octets sous `name` (chemin relatif) et renvoie l'URL publique. */
export async function saveBuffer(name: string, bytes: Buffer, contentType: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const bucket = process.env.SUPABASE_BUCKET || 'medias';
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Envoi vers le stockage impossible (${res.status})`);
    return `${url}/storage/v1/object/public/${bucket}/${name}`;
  }
  const root = uploadDir();
  await mkdir(join(root, ...name.split('/').slice(0, -1)), { recursive: true });
  await writeFile(join(root, ...name.split('/')), bytes);
  return `/uploads/${name}`;
}
