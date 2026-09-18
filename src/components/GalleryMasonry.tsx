import { useState } from 'react';
import Masonry from 'react-masonry-css';
import { ImageOff } from 'lucide-react';
import { assetUrl } from '../lib/gallery';
import type { GalleryCategory, GalleryItem } from '../types';

interface GalleryMasonryProps {
  category: GalleryCategory;
  items: GalleryItem[];
  onOpen: (item: GalleryItem) => void;
}

const breakpointColumns = {
  default: 6,
  1600: 5,
  1280: 4,
  1024: 3,
  760: 3,
  540: 2,
};

function MemeTile({ item, categoryName, priority, onOpen }: { item: GalleryItem; categoryName: string; priority: boolean; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="group mb-3 overflow-hidden rounded-xl border bg-card shadow-xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-within:border-primary/40 focus-within:shadow-lg sm:mb-3">
      <button type="button" className="block w-full cursor-pointer text-left outline-none" onClick={onOpen} aria-label={`预览 ${categoryName} 表情`}>
        <span className="relative block overflow-hidden rounded-t-[calc(var(--radius-xl)-1px)] bg-muted" style={{ aspectRatio: `${item.width} / ${item.height}` }}>
          {failed ? (
            <span className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageOff size={22} /></span>
          ) : (
            <img
              src={assetUrl(item.thumb, item.revision)}
              alt={`${categoryName} 表情`}
              width={item.width}
              height={item.height}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
              onError={() => setFailed(true)}
            />
          )}
        </span>
      </button>
    </article>
  );
}

export function GalleryMasonry({ category, items, onOpen }: GalleryMasonryProps) {
  return (
    <Masonry breakpointCols={breakpointColumns} className="masonry-grid" columnClassName="masonry-column">
      {items.map((item, index) => (
        <MemeTile
          key={item.id}
          item={item}
          categoryName={category.name}
          priority={index < 10}
          onOpen={() => onOpen(item)}
        />
      ))}
    </Masonry>
  );
}
