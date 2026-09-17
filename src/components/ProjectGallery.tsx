import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '../types';
import { galleryAspectRatio, normalizeGalleryDisplaySettings } from '../lib/projects';
import { categoryAspectRatio, categoryById } from '../lib/categories';
import { useContent } from '../lib/content';

export function ProjectGallery({ project }: { project: Project }) {
  const { categories } = useContent();
  const category = categoryById(project.category, categories);
  const items = project.gallery;
  const [active, setActive] = useState(() => Math.max(0, items.findIndex((item) => item.id === project.coverImageId)));
  const [loadedRatios, setLoadedRatios] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const multiple = items.length > 1;

  useEffect(() => {
    setActive(Math.max(0, items.findIndex((item) => item.id === project.coverImageId)));
    setUserPaused(false);
    setLoadedRatios({});
  }, [project.id, project.coverImageId, items.length]);

  useEffect(() => {
    if (!multiple || hovered || focused || userPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % items.length), 5000);
    return () => window.clearInterval(timer);
  }, [multiple, hovered, focused, userPaused, items.length]);

  if (!items.length) return null;
  const activeItem = items[active] || items[0];
  const activeDisplay = normalizeGalleryDisplaySettings(activeItem.display);
  const hasStoredOriginalRatio = !!(activeDisplay.naturalWidth && activeDisplay.naturalHeight);
  const ratio = activeDisplay.ratioMode === 'original' && !hasStoredOriginalRatio && loadedRatios[activeItem.id]
    ? loadedRatios[activeItem.id]
    : galleryAspectRatio(activeItem, categoryAspectRatio(category));
  const move = (direction: -1 | 1) => {
    setUserPaused(true);
    setActive((current) => (current + direction + items.length) % items.length);
  };
  const select = (index: number) => { setUserPaused(true); setActive(index); };

  return (
    <div
      data-gallery-frame
      data-display-ratio={ratio}
      data-fit={activeDisplay.fit}
      className="group relative mx-auto w-full max-w-full overflow-hidden rounded-xl border border-[#c8c4d8]/70 bg-[#f1f3f5] transition-[width,aspect-ratio] duration-300 motion-reduce:transition-none"
      style={{ aspectRatio: String(ratio), maxWidth: `min(100%, ${72 * ratio}vh, ${760 * ratio}px)`, maxHeight: 'min(72vh, 760px)' }}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${project.title} image gallery`}
      tabIndex={multiple ? 0 : -1}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      }}
      onTouchStart={(event) => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; }}
      onTouchEnd={(event) => {
        if (!touch.current) return;
        const point = event.changedTouches[0];
        const dx = point.clientX - touch.current.x;
        const dy = point.clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx > 0 ? -1 : 1);
      }}
    >
      {items.map((item, index) => (
        <figure key={item.id} className={`${index === active ? 'opacity-100' : 'pointer-events-none opacity-0'} absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none`} aria-hidden={index !== active}>
          <img
            src={item.url}
            alt={item.alt}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`h-full w-full ${normalizeGalleryDisplaySettings(item.display).fit === 'cover' ? 'object-cover' : 'object-contain'}`}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (!image.naturalWidth || !image.naturalHeight) return;
              const next = image.naturalWidth / image.naturalHeight;
              setLoadedRatios((current) => current[item.id] === next ? current : { ...current, [item.id]: next });
            }}
          />
          {item.caption && index === active && (
            <figcaption className="absolute inset-x-0 bottom-0 bg-[#141b2b]/85 px-4 py-2 text-sm text-white backdrop-blur-sm">{item.caption}</figcaption>
          )}
        </figure>
      ))}
      {multiple && (
        <>
          <button type="button" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#141b2b] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4cf0]">
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next image" className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#141b2b] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b4cf0]">
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-[#141b2b]/70 px-3 py-2" aria-label="Choose gallery image">
            {items.map((item, index) => (
              <button key={item.id} type="button" aria-label={`Show image ${index + 1} of ${items.length}`} aria-current={index === active ? 'true' : undefined} onClick={() => select(index)} className={`${index === active ? 'bg-white' : 'bg-white/45'} h-2.5 w-2.5 rounded-full outline-offset-4`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
