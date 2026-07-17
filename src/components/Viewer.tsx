import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, LoaderCircle, Share2, X } from 'lucide-react';
import { assetUrl, copyItem, downloadItem, shareItem } from '../lib/gallery';
import type { GalleryCategory, GalleryItem } from '../types';

interface ViewerProps {
  category: GalleryCategory;
  item: GalleryItem;
  index: number;
  onClose: () => void;
  onNavigate: (offset: number) => void;
  notify: (message: string) => void;
}

export function Viewer({ category, item, index, onClose, onNavigate, notify }: ViewerProps) {
  const [loading, setLoading] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setLoading(true);
  }, [item.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onNavigate]);

  const handleCopy = async () => {
    try {
      const result = await copyItem(item);
      notify(result === 'image' ? '图片已复制' : '图片链接已复制');
    } catch {
      notify('当前浏览器不支持复制');
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareItem(`${category.name}表情`);
      if (result === 'copied') notify('分享链接已复制');
    } catch {
      notify('分享失败');
    }
  };

  const handleDownload = async () => {
    try {
      await downloadItem(item);
    } catch {
      notify('下载失败');
    }
  };

  return (
    <div className="viewer-layer" role="dialog" aria-modal="true" aria-label="图片预览" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <header className="viewer-toolbar">
        <div className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-white">{category.name}</strong>
          <span className="mt-0.5 block text-[11px] text-zinc-400 tabular-nums">{index + 1} / {category.count}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="viewer-icon-button" title="复制图片" aria-label="复制图片" onClick={handleCopy}><Copy size={18} /></button>
          <button type="button" className="viewer-icon-button" title="分享" aria-label="分享" onClick={handleShare}><Share2 size={18} /></button>
          <button type="button" className="viewer-icon-button" title="下载原图" aria-label="下载原图" onClick={handleDownload}><Download size={18} /></button>
          <button ref={closeRef} type="button" className="viewer-icon-button" title="关闭" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        </div>
      </header>

      <button type="button" className="viewer-nav viewer-nav-left" title="上一张" aria-label="上一张" onClick={() => onNavigate(-1)}><ChevronLeft size={28} /></button>
      <figure className="viewer-canvas">
        {loading && <LoaderCircle size={28} className="absolute animate-spin text-zinc-500" />}
        <img
          key={item.id}
          src={assetUrl(item.src)}
          alt={`${category.name} 表情`}
          className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); notify('原图加载失败'); }}
        />
      </figure>
      <button type="button" className="viewer-nav viewer-nav-right" title="下一张" aria-label="下一张" onClick={() => onNavigate(1)}><ChevronRight size={28} /></button>
    </div>
  );
}
