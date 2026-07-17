import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ExternalLink, Info, LibraryBig, Moon, Settings, Sun } from 'lucide-react';
import { assetUrl } from '../lib/gallery';
import type { GalleryCategory, Theme } from '../types';

interface CategoryNavProps {
  categories: GalleryCategory[];
  activeId: string;
  onSelect: (categoryId: string) => void;
}

interface SidebarProps extends CategoryNavProps {
  total: number;
  brandCover: string;
  theme: Theme;
  onToggleTheme: () => void;
  onAbout: () => void;
}

function categoryStyle(category: GalleryCategory): CSSProperties {
  return { '--category-color': category.color } as CSSProperties;
}

interface UtilityMenuProps {
  theme: Theme;
  mobile?: boolean;
  onToggleTheme: () => void;
  onAbout: () => void;
}

function UtilityMenu({ theme, mobile = false, onToggleTheme, onAbout }: UtilityMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={mobile ? 'utility-menu-wrap' : 'utility-menu-wrap w-full'}>
      <button
        type="button"
        className={mobile ? 'icon-button' : 'sidebar-action w-full'}
        title="设置"
        aria-label="设置"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings size={17} />
        {!mobile && <span>设置</span>}
      </button>
      {open && (
        <div className="utility-menu-panel" role="menu">
          <button type="button" role="menuitem" className="utility-menu-item" onClick={() => { onToggleTheme(); setOpen(false); }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? '切换到浅色' : '切换到暗色'}
          </button>
          <button type="button" role="menuitem" className="utility-menu-item" onClick={() => { onAbout(); setOpen(false); }}>
            <Info size={16} />
            关于本站
          </button>
          <a
            role="menuitem"
            href="https://www.youtube.com/channel/UCkIimWZ9gBJRamKF0rmPU8w?sub_confirmation=1"
            target="_blank"
            rel="noreferrer"
            className="utility-menu-item"
            onClick={() => setOpen(false)}
          >
            <ExternalLink size={16} />
            关注阿喵喵
          </a>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ categories, activeId, total, brandCover, theme, onSelect, onToggleTheme, onAbout }: SidebarProps) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-zinc-200/80 bg-white/95 backdrop-blur-xl lg:flex dark:border-white/8 dark:bg-zinc-950/95">
      <a href={`#${activeId}`} className="flex h-20 items-center gap-3 border-b border-zinc-200/80 px-5 no-underline dark:border-white/8">
        <img crossOrigin="anonymous" src={assetUrl(brandCover)} alt="" className="size-10 rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800" />
        <span className="min-w-0">
          <strong className="block truncate text-[15px] font-bold text-zinc-950 dark:text-white">表情包分享</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <LibraryBig size={13} strokeWidth={1.8} />
            {total} 张收藏
          </span>
        </span>
      </a>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="角色分类">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold text-zinc-400 uppercase">角色分类</p>
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              ref={active ? activeButtonRef : undefined}
              type="button"
              className="category-nav-button group"
              data-active={active}
              style={categoryStyle(category)}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(category.id)}
            >
              <img crossOrigin="anonymous" src={assetUrl(category.cover)} alt="" className="size-11 rounded-md bg-zinc-100 object-cover dark:bg-zinc-800" />
              <span className="min-w-0 flex-1 text-left">
                <strong className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{category.name}</strong>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">{category.romanized}</span>
              </span>
              <span className="rounded-md bg-zinc-100 px-1.5 py-1 text-[10px] font-semibold text-zinc-500 tabular-nums group-data-[active=true]:bg-white/70 dark:bg-zinc-800 dark:text-zinc-400 dark:group-data-[active=true]:bg-black/20">
                {category.count}
              </span>
            </button>
          );
        })}
      </nav>

      <footer className="border-t border-zinc-200/80 p-3 dark:border-white/8">
        <UtilityMenu theme={theme} onToggleTheme={onToggleTheme} onAbout={onAbout} />
      </footer>
    </aside>
  );
}

export function MobileCategories({ categories, activeId, onSelect }: CategoryNavProps) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeId]);

  return (
    <nav className="mobile-category-strip" aria-label="角色分类">
      {categories.map((category) => {
        const active = category.id === activeId;
        return (
          <button
            key={category.id}
            ref={active ? activeButtonRef : undefined}
            type="button"
            className="mobile-category-button"
            data-active={active}
            style={categoryStyle(category)}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(category.id)}
          >
            <span>{category.name}</span>
            <span className="text-[10px] opacity-60">{category.count}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function MobileUtilities({ theme, onToggleTheme, onAbout }: Omit<SidebarProps, keyof CategoryNavProps | 'total' | 'brandCover'>) {
  return (
    <div className="mobile-utilities lg:hidden">
      <UtilityMenu mobile theme={theme} onToggleTheme={onToggleTheme} onAbout={onAbout} />
    </div>
  );
}
