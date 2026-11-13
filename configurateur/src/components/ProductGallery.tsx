'use client';
import { useState } from 'react';
import { TractorVisual } from './TractorVisual';
import { optimized } from '@/lib/image';

type Mode = 'photo' | 'spin' | 'model';

/** Grande photo + galerie, vue 360° (séquence ou 3D) et vignettes. */
export function ProductGallery({ name, images, spinUrl, spinFrames, modelUrl, labels }: {
  name: string; images: string[]; spinUrl: string | null; spinFrames: number; modelUrl: string | null; labels: { photos: string; spin: string; drag: string };
}) {
  const modes: Mode[] = [...(images.length ? (['photo'] as Mode[]) : []), ...(spinUrl ? (['spin'] as Mode[]) : []), ...(modelUrl ? (['model'] as Mode[]) : [])];
  const [mode, setMode] = useState<Mode>(spinUrl ? 'spin' : modes[0] ?? 'photo');
  const [index, setIndex] = useState(0);
  return (
    <div>
      <div className="viewer studio">
        {modes.length > 1 && (
          <div className="viewer-tabs" role="group">
            {modes.map((md) => (
              <button key={md} type="button" aria-pressed={md === mode} onClick={() => setMode(md)}>
                {md === 'photo' ? labels.photos : md === 'spin' ? labels.spin : '3D'}
              </button>
            ))}
          </div>
        )}
        {mode === 'photo' && <TractorVisual name={name} images={images} photo={images[index]} priority />}
        {mode === 'spin' && <TractorVisual name={name} images={[]} spinUrl={spinUrl} spinFrames={spinFrames} hint={labels.drag} />}
        {mode === 'model' && <TractorVisual name={name} images={[]} modelUrl={modelUrl} />}
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((src, i) => (
            <button key={src} type="button" aria-pressed={mode === 'photo' && i === index} aria-label={`${labels.photos} ${i + 1}`} onClick={() => { setMode('photo'); setIndex(i); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimized(src, 256)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
