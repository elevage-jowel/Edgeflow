/** Passe les images par l'optimiseur Next (redimensionnement + WebP/AVIF). Utilisable côté serveur et client. */
export function optimized(src: string, w = 1080, q = 72) {
  if (!src || src.startsWith('data:') || src.endsWith('.svg')) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}
