/** Convertit un lien YouTube / Vimeo en URL d'intégration respectueuse de la vie privée. */
export function embedUrl(url: string | null | undefined) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}?dnt=1`;
  return null;
}
