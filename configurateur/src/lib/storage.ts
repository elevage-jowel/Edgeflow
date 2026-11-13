import 'server-only';
/**
 * Stockage des fichiers envoyés (photos de reprise, médias produits).
 *  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY renseignés → Supabase Storage (bucket public)
 *  - sinon → dossier UPLOAD_DIR (par défaut ./uploads), servi par la route /uploads/…
 */
import { randomUUID } from 'node:crypto';
import { saveBuffer, uploadDir } from './storage-core';

export { uploadDir };

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
};
const MEDIA_TYPES: Record<string, string> = {
  ...IMAGE_TYPES, 'application/pdf': 'pdf', 'model/gltf-binary': 'glb', 'application/octet-stream': 'glb', 'video/mp4': 'mp4',
};

export async function saveUpload(file: File, folder: string, opts: { imagesOnly?: boolean; maxBytes?: number } = {}) {
  const types = opts.imagesOnly ? IMAGE_TYPES : MEDIA_TYPES;
  let ext = types[file.type];
  if (!ext && /\.glb$/i.test(file.name) && !opts.imagesOnly) ext = 'glb';
  if (!ext) throw new Error(`Type de fichier refusé : ${file.type || file.name}`);
  const max = opts.maxBytes ?? 8 * 1024 * 1024;
  if (file.size > max) throw new Error(`Fichier trop lourd (max. ${Math.round(max / 1024 / 1024)} Mo)`);
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '');
  const name = `${safeFolder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  return saveBuffer(name, bytes, file.type || 'application/octet-stream');
}
