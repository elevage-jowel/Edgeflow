/** Sert les fichiers envoyés quand le stockage local est utilisé. */
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { uploadDir } from '@/lib/storage';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  pdf: 'application/pdf', glb: 'model/gltf-binary', mp4: 'video/mp4',
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const root = normalize(uploadDir());
  const file = normalize(join(root, ...params.path));
  if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  try {
    await stat(file);
    const ext = file.split('.').pop()!.toLowerCase();
    return new Response(await readFile(file), {
      headers: {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
