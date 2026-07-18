import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Shuffle } from 'lucide-react';
import { AboutDialog } from './components/AboutDialog';
import { MobileCategories, MobileUtilities, Sidebar } from './components/CategoryNav';
import { GalleryMasonry } from './components/GalleryMasonry';
import { Toast } from './components/Toast';
import { Viewer } from './components/Viewer';
import { assetUrl, parseRoute, updateRoute } from './lib/gallery';
import { useTheme } from './hooks/useTheme';
import type { GalleryCategory, GalleryItem, GalleryManifest, SortOrder } from './types';

const CARD_GAP = 12;

function getColumnCount(viewportWidth: number): number {
  if (viewportWidth <= 540) return 2;
  if (viewportWidth <= 1024) return 3;
  if (viewportWidth <= 1280) return 4;
  if (viewportWidth <= 1600) return 5;
  return 6;
}

function getGalleryWidth(viewportWidth: number): number {
  const pageWidth = viewportWidth >= 1024 ? viewportWidth - 288 : viewportWidth;
  const horizontalPadding = viewportWidth >= 1024 ? 64 : viewportWidth >= 640 ? 40 : 24;
  return Math.max(240, Math.min(pageWidth, 1800) - horizontalPadding);
}

function getVisibleCountForScreens(items: GalleryItem[], currentCount = 0, screens = 1.5): number {
  if (!items.length) return 0;

  const columnCount = getColumnCount(window.innerWidth);
  const columnWidth = getGalleryWidth(window.innerWidth) / columnCount;
  const columnHeights = Array<number>(columnCount).fill(0);
  const existingCount = Math.min(currentCount, items.length);

  for (let index = 0; index < existingCount; index += 1) {
    const item = items[index];
    columnHeights[index % columnCount] += columnWidth * (item.height / item.width) + CARD_GAP;
  }

  const targetHeight = (currentCount ? Math.min(...columnHeights) : 0) + window.innerHeight * screens;
  let nextCount = existingCount;
  while (nextCount < items.length && Math.min(...columnHeights) < targetHeight) {
    const item = items[nextCount];
    columnHeights[nextCount % columnCount] += columnWidth * (item.height / item.width) + CARD_GAP;
    nextCount += 1;
  }

  return nextCount;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f7f8f8] lg:pl-72 dark:bg-[#111516]">
      <main className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 h-20 w-72 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 15 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />)}
        </div>
      </main>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f8] p-6 dark:bg-[#111516]">
      <div className="max-w-md text-center">
        <strong className="text-lg text-zinc-950 dark:text-white">图库加载失败</strong>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      </div>
    </main>
  );
}

function getSavedSortOrder(): SortOrder {
  const saved = localStorage.getItem('gallery-sort');
  return saved === 'oldest' || saved === 'random' ? saved : 'newest';
}

function orderItems(items: GalleryItem[], order: SortOrder, seed: number): GalleryItem[] {
  if (order === 'oldest') return items;
  if (order === 'newest') return [...items].reverse();

  const shuffled = [...items];
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [manifest, setManifest] = useState<GalleryManifest | null>(null);
  const [loadError, setLoadError] = useState('');
  const [activeId, setActiveId] = useState('');
  const [viewerId, setViewerId] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<SortOrder>(getSavedSortOrder);
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [brandCover, setBrandCover] = useState('');
  const [brandCoverRevision, setBrandCoverRevision] = useState('');
  const loadSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/gallery.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`gallery.json returned HTTP ${response.status}`);
        return response.json() as Promise<GalleryManifest>;
      })
      .then((data) => {
        if (!data.categories?.length) throw new Error('gallery.json contains no categories');
        const allItems = data.categories.flatMap((category) => category.items);
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        const randomThumb = randomItem?.thumb ?? data.categories[0].cover;
        const randomRevision = randomItem?.revision ?? data.categories[0].coverRevision;
        setBrandCover(randomThumb);
        setBrandCoverRevision(randomRevision);
        const favicon = document.querySelector<HTMLLinkElement>('#favicon');
        if (favicon) favicon.href = assetUrl(randomThumb, randomRevision);
        setManifest(data);
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unknown error'));
  }, []);

  const syncRoute = useCallback(() => {
    if (!manifest) return;
    const route = parseRoute();
    const savedId = localStorage.getItem('gallery-category') ?? '';
    const category = manifest.categories.find((item) => item.id === route.categoryId)
      ?? manifest.categories.find((item) => item.id === savedId)
      ?? manifest.categories[0];
    const validViewerId = category.items.some((item) => item.id === route.itemId) ? route.itemId : '';
    const items = orderItems(category.items, sortOrder, randomSeed);
    setActiveId(category.id);
    setViewerId(validViewerId);
    setVisibleCount(getVisibleCountForScreens(items));
    localStorage.setItem('gallery-category', category.id);
    if (route.categoryId !== category.id || route.itemId !== validViewerId) {
      updateRoute(category.id, validViewerId, 'replace');
    }
  }, [manifest, randomSeed, sortOrder]);

  useEffect(() => {
    if (!manifest) return;
    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [manifest, syncRoute]);

  const activeCategory = useMemo(
    () => manifest?.categories.find((category) => category.id === activeId) ?? manifest?.categories[0] ?? null,
    [activeId, manifest],
  );

  const orderedItems = useMemo(() => {
    if (!activeCategory) return [];
    return orderItems(activeCategory.items, sortOrder, randomSeed);
  }, [activeCategory, randomSeed, sortOrder]);

  const visibleItems = orderedItems.slice(0, visibleCount);
  const viewerIndex = orderedItems.findIndex((item) => item.id === viewerId);
  const viewerItem = viewerIndex >= 0 ? orderedItems[viewerIndex] : null;

  const loadNextBatch = useCallback(() => {
    setVisibleCount((count) => getVisibleCountForScreens(orderedItems, count, 1));
  }, [orderedItems]);

  useEffect(() => {
    const sentinel = loadSentinelRef.current;
    if (!sentinel || visibleCount >= orderedItems.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNextBatch();
      },
      { rootMargin: '100% 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextBatch, orderedItems.length, visibleCount]);

  useEffect(() => {
    let frame = 0;
    const handleResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setVisibleCount((count) => Math.max(count, getVisibleCountForScreens(orderedItems)));
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frame);
    };
  }, [orderedItems]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 1900);
  }, []);

  const selectCategory = useCallback((categoryId: string) => {
    const category = manifest?.categories.find((item) => item.id === categoryId);
    const items = category ? orderItems(category.items, sortOrder, randomSeed) : [];
    setActiveId(categoryId);
    setViewerId('');
    setVisibleCount(getVisibleCountForScreens(items));
    localStorage.setItem('gallery-category', categoryId);
    updateRoute(categoryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [manifest, randomSeed, sortOrder]);

  const openItem = useCallback((item: GalleryItem) => {
    if (!activeCategory) return;
    setViewerId(item.id);
    updateRoute(activeCategory.id, item.id);
  }, [activeCategory]);

  const closeViewer = useCallback(() => {
    if (!activeCategory) return;
    setViewerId('');
    updateRoute(activeCategory.id, '', 'replace');
  }, [activeCategory]);

  const navigateViewer = useCallback((offset: number) => {
    if (!activeCategory || viewerIndex < 0 || !orderedItems.length) return;
    const nextIndex = (viewerIndex + offset + orderedItems.length) % orderedItems.length;
    const nextItem = orderedItems[nextIndex];
    setViewerId(nextItem.id);
    updateRoute(activeCategory.id, nextItem.id, 'replace');
  }, [activeCategory, orderedItems, viewerIndex]);

  const changeSortOrder = (nextOrder: SortOrder) => {
    if (!activeCategory) return;
    const nextSeed = nextOrder === 'random' ? Math.floor(Math.random() * 0xffffffff) : randomSeed;
    const items = orderItems(activeCategory.items, nextOrder, nextSeed);
    if (nextOrder === 'random') setRandomSeed(nextSeed);
    setSortOrder(nextOrder);
    setVisibleCount(getVisibleCountForScreens(items));
    localStorage.setItem('gallery-sort', nextOrder);
  };

  if (loadError) return <ErrorState message={loadError} />;
  if (!manifest || !activeCategory) return <LoadingState />;

  const accentStyle = { '--accent': activeCategory.color } as CSSProperties;

  return (
    <div className="min-h-screen bg-[#f7f8f8] text-zinc-900 antialiased dark:bg-[#111516] dark:text-zinc-100" style={accentStyle}>
      <Sidebar
        categories={manifest.categories}
        activeId={activeCategory.id}
        total={manifest.total}
        brandCover={brandCover || manifest.categories[0].cover}
        brandCoverRevision={brandCoverRevision || manifest.categories[0].coverRevision}
        theme={theme}
        onSelect={selectCategory}
        onToggleTheme={toggleTheme}
        onAbout={() => setAboutOpen(true)}
      />

      <div className="min-h-screen lg:pl-72">
        <MobileCategories categories={manifest.categories} activeId={activeCategory.id} onSelect={selectCategory} />

        <main className="mx-auto max-w-[1800px] px-3 pb-20 pt-7 sm:px-5 lg:px-8 lg:pt-10">
          <section className="collection-heading">
            <div className="min-w-0">
              <p className="category-eyebrow">{activeCategory.romanized}</p>
              <h1 className="mt-1 truncate text-3xl font-black text-zinc-950 sm:text-4xl dark:text-white">{activeCategory.name}</h1>
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-zinc-500 dark:text-zinc-400">{activeCategory.description}</p>
            </div>

            <div className="segmented-control" aria-label="排序方式">
              <button type="button" data-active={sortOrder === 'newest'} onClick={() => changeSortOrder('newest')}>
                <ArrowDownNarrowWide size={15} /> 最新
              </button>
              <button type="button" data-active={sortOrder === 'oldest'} onClick={() => changeSortOrder('oldest')}>
                <ArrowUpNarrowWide size={15} /> 最早
              </button>
              <button type="button" data-active={sortOrder === 'random'} onClick={() => changeSortOrder('random')}>
                <Shuffle size={15} /> 随机
              </button>
            </div>
          </section>

          <GalleryMasonry category={activeCategory} items={visibleItems} onOpen={openItem} />

          {visibleItems.length < orderedItems.length && (
            <div ref={loadSentinelRef} className="h-px" aria-hidden="true" />
          )}
        </main>
      </div>

      <MobileUtilities
        theme={theme}
        onToggleTheme={toggleTheme}
        onAbout={() => setAboutOpen(true)}
      />

      {viewerItem && (
        <Viewer
          category={activeCategory}
          item={viewerItem}
          index={viewerIndex}
          onClose={closeViewer}
          onNavigate={navigateViewer}
          notify={notify}
        />
      )}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}
