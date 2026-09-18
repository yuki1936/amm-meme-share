import { useEffect, useRef, type CSSProperties } from 'react';
import { ExternalLink, Info, LibraryBig, Moon, Settings, Sun, WandSparkles } from 'lucide-react';
import { assetUrl } from '../lib/gallery';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { GalleryCategory, Theme } from '../types';

const GENERATOR_COLOR = '#b53b58';

interface CategoryNavProps {
  categories: GalleryCategory[];
  activeId: string;
  generatorActive: boolean;
  onSelect: (categoryId: string) => void;
  onOpenGenerator: () => void;
}

interface SidebarProps extends CategoryNavProps {
  total: number;
  brandCover: string;
  brandCoverRevision: string;
  theme: Theme;
  onToggleTheme: () => void;
  onAbout: () => void;
}

function categoryStyle(category: GalleryCategory): CSSProperties {
  return { '--cat': category.color } as CSSProperties;
}

interface UtilityMenuProps {
  theme: Theme;
  mobile?: boolean;
  onToggleTheme: () => void;
  onAbout: () => void;
}

function UtilityMenu({ theme, mobile = false, onToggleTheme, onAbout }: UtilityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {mobile ? (
          <Button variant="outline" size="icon" title="设置" aria-label="设置" className="shadow-md">
            <Settings size={17} />
          </Button>
        ) : (
          <Button variant="ghost" className="w-full justify-start px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <Settings size={16} />
            设置
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? 'end' : 'start'} side="top" className="w-52">
        <DropdownMenuItem onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? '切换到浅色' : '切换到暗色'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAbout}>
          <Info size={16} />
          关于本站
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://yuki1936.com" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            个人主页
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar({ categories, activeId, generatorActive, total, brandCover, brandCoverRevision, theme, onSelect, onOpenGenerator, onToggleTheme, onAbout }: SidebarProps) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-card/80 backdrop-blur-xl lg:flex">
      <a href={`#${activeId}`} className="flex h-20 items-center gap-3 border-b px-5 no-underline">
        <img src={assetUrl(brandCover, brandCoverRevision)} alt="" className="size-10 rounded-lg border bg-muted object-cover" />
        <span className="min-w-0">
          <strong className="block truncate text-[15px] font-bold text-foreground">表情包分享</strong>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LibraryBig size={13} strokeWidth={1.8} />
            {total} 张收藏
          </span>
        </span>
      </a>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="内容导航">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">内容</p>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors',
            generatorActive ? 'cat-active' : 'hover:bg-accent/60',
          )}
          style={{ '--cat': GENERATOR_COLOR } as CSSProperties}
          data-active={generatorActive}
          aria-current={generatorActive ? 'page' : undefined}
          onClick={onOpenGenerator}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-md" style={{ background: 'color-mix(in oklab, var(--cat) 14%, transparent)', color: 'var(--cat)' }}>
            <WandSparkles size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-foreground">表情包生成器</strong>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">创建表情包</span>
          </span>
        </button>
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              ref={active ? activeButtonRef : undefined}
              type="button"
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors',
                active ? 'cat-active' : 'hover:bg-accent/60',
              )}
              data-active={active}
              style={categoryStyle(category)}
              aria-current={active ? 'page' : undefined}
              onClick={() => onSelect(category.id)}
            >
              <img src={assetUrl(category.cover, category.coverRevision)} alt="" className="size-11 shrink-0 rounded-md border bg-muted object-cover" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-foreground">{category.name}</strong>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{category.romanized}</span>
              </span>
              <Badge variant="secondary" className="tabular-nums group-data-[active=true]:bg-background/80 group-data-[active=true]:text-foreground">
                {category.count}
              </Badge>
            </button>
          );
        })}
      </nav>

      <footer className="border-t p-2">
        <UtilityMenu theme={theme} onToggleTheme={onToggleTheme} onAbout={onAbout} />
      </footer>
    </aside>
  );
}

export function MobileCategories({ categories, activeId, generatorActive, onSelect, onOpenGenerator }: CategoryNavProps) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeId]);

  return (
    <nav className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b bg-background/90 p-2.5 backdrop-blur-md scrollbar-none lg:hidden" aria-label="角色分类">
      <button
        type="button"
        className={cn(
          'inline-flex h-8 min-w-max shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors',
          generatorActive ? 'cat-active' : 'bg-card text-muted-foreground hover:text-foreground',
        )}
        style={{ '--cat': GENERATOR_COLOR } as CSSProperties}
        data-active={generatorActive}
        aria-current={generatorActive ? 'page' : undefined}
        onClick={onOpenGenerator}
      >
        <WandSparkles size={14} />
        <span>生成器</span>
      </button>
      {categories.map((category) => {
        const active = category.id === activeId;
        return (
          <button
            key={category.id}
            ref={active ? activeButtonRef : undefined}
            type="button"
            className={cn(
              'inline-flex h-8 min-w-max shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors',
              active ? 'cat-active' : 'bg-card text-muted-foreground hover:text-foreground',
            )}
            data-active={active}
            style={categoryStyle(category)}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(category.id)}
          >
            <span className={active ? 'cat-text' : undefined}>{category.name}</span>
            <span className="text-[10px] opacity-60 tabular-nums">{category.count}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function MobileUtilities({ theme, onToggleTheme, onAbout }: Omit<SidebarProps, keyof CategoryNavProps | 'total' | 'brandCover' | 'brandCoverRevision' | 'generatorActive' | 'onOpenGenerator'>) {
  return (
    <div className="fixed right-3 bottom-3 z-50 flex gap-2 lg:hidden" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <UtilityMenu mobile theme={theme} onToggleTheme={onToggleTheme} onAbout={onAbout} />
    </div>
  );
}
