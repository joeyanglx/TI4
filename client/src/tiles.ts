import { useEffect, useState } from 'react';

export function systemImageUrl(system: string): string {
  return `${import.meta.env.BASE_URL}tiles/ST_${system}.webp`;
}

const cache = new Map<string, HTMLImageElement>();

/** Load an image once and share it across every Konva node that uses it. */
export function useImage(src: string): HTMLImageElement | undefined {
  const [image, setImage] = useState(() => loaded(cache.get(src)));

  useEffect(() => {
    let el = cache.get(src);
    if (!el) {
      el = new window.Image();
      el.src = src;
      cache.set(src, el);
    }
    if (loaded(el)) {
      setImage(el);
      return;
    }
    const img = el;
    const onLoad = () => setImage(img);
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [src]);

  return image;
}

function loaded(img: HTMLImageElement | undefined) {
  return img?.complete && img.naturalWidth > 0 ? img : undefined;
}
