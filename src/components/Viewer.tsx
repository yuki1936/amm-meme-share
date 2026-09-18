import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Link, LoaderCircle, Maximize2, Minus, Plus, X } from 'lucide-react';
import { assetUrl, copyItem, copyPageLink, downloadItem } from '../lib/gallery';
import type { GalleryCategory, GalleryItem } from '../types';

interface ViewerProps {
  category: GalleryCategory;
  item: GalleryItem;
  index: number;
  onClose: () => void;
  onNavigate: (offset: number) => void;
  notify: (message: string) => void;
}

const MIN_ZOOM = 0.25;
const FIT_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Viewer({ category, item, index, onClose, onNavigate, notify }: ViewerProps) {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(FIT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const zoomRef = useRef(FIT_ZOOM);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    zoomRef.current = FIT_ZOOM;
    offsetRef.current = { x: 0, y: 0 };
    setZoom(FIT_ZOOM);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  }, [item.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
      if (event.key === 'Tab') trapFocus(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onNavigate]);

  // 灯箱是全屏模态层，Tab 焦点必须锁在其中，否则键盘用户会落到被遮住的背景元素上。
  const trapFocus = (event: KeyboardEvent | ReactKeyboardEvent) => {
    const focusables = layerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === layerRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // React 会把 onWheel 注册为 passive，preventDefault 无效，这里改用原生非 passive 监听。
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyZoom(zoomRef.current * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyZoom 只读取 ref 与稳定的 setState
  }, []);

  const commitView = (nextZoom: number, nextOffset: { x: number; y: number }) => {
    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;
    setZoom(nextZoom);
    setOffset(nextOffset);
  };

  const clampOffset = (nextOffset: { x: number; y: number }, nextZoom: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || nextZoom <= FIT_ZOOM) return { x: 0, y: 0 };
    const maxX = rect.width * (nextZoom - 1) / 2;
    const maxY = rect.height * (nextZoom - 1) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextOffset.x)),
      y: Math.max(-maxY, Math.min(maxY, nextOffset.y)),
    };
  };

  const applyZoom = (requestedZoom: number, clientX?: number, clientY?: number) => {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom));
    const currentZoom = zoomRef.current;
    if (Math.abs(nextZoom - currentZoom) < 0.001) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    let nextOffset = offsetRef.current;
    if (rect && nextZoom > FIT_ZOOM) {
      const focusX = (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
      const focusY = (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
      const ratio = nextZoom / currentZoom;
      nextOffset = {
        x: focusX - (focusX - nextOffset.x) * ratio,
        y: focusY - (focusY - nextOffset.y) * ratio,
      };
    }
    commitView(nextZoom, clampOffset(nextOffset, nextZoom));
  };

  const resetView = () => commitView(FIT_ZOOM, { x: 0, y: 0 });

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (zoomRef.current <= FIT_ZOOM || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextOffset = clampOffset({
      x: drag.originX + event.clientX - drag.x,
      y: drag.originY + event.clientY - drag.y,
    }, zoomRef.current);
    commitView(zoomRef.current, nextOffset);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  };

  const handleCopy = async () => {
    try {
      await copyItem(item);
      notify(item.animated ? '已复制动图首帧' : '图片已复制');
    } catch {
      notify('当前浏览器不支持复制');
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyPageLink();
      notify('页面链接已复制');
    } catch {
      notify('复制链接失败');
    }
  };

  const handleDownload = async () => {
    try {
      await downloadItem(item);
    } catch {
      notify('下载失败');
    }
  };

  const toolButton = 'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/15 bg-white/5 text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/12 hover:text-white disabled:pointer-events-none disabled:opacity-35';

  return (
    <div
      ref={layerRef}
      className="viewer-layer"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      tabIndex={-1}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <header className="viewer-toolbar flex items-center justify-between gap-4 border-b border-white/10 px-3 pb-0 pl-5 sm:pl-5" style={{ background: 'oklch(0.16 0.005 220 / 94%)' }}>
        <div className="viewer-meta min-w-0">
          <strong className="block truncate text-sm font-semibold text-white">{category.name}</strong>
          <span className="mt-0.5 block text-[11px] text-zinc-400 tabular-nums">{index + 1} / {category.count}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={toolButton} title="缩小" aria-label="缩小" disabled={zoom <= MIN_ZOOM} onClick={() => applyZoom(zoom - ZOOM_STEP)}><Minus size={18} /></button>
          <button type="button" className={toolButton} title="适应窗口" aria-label="适应窗口" disabled={Math.abs(zoom - FIT_ZOOM) < 0.001} onClick={resetView}><Maximize2 size={17} /></button>
          <button type="button" className={toolButton} title="放大" aria-label="放大" disabled={zoom >= MAX_ZOOM} onClick={() => applyZoom(zoom + ZOOM_STEP)}><Plus size={18} /></button>
          <button type="button" className={toolButton} title="复制图片" aria-label="复制图片" onClick={handleCopy}><Copy size={18} /></button>
          <button type="button" className={toolButton} title="复制页面链接" aria-label="复制页面链接" onClick={handleCopyLink}><Link size={18} /></button>
          <button type="button" className={toolButton} title="下载原图" aria-label="下载原图" onClick={handleDownload}><Download size={18} /></button>
          <button ref={closeRef} type="button" className={toolButton} title="关闭" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        </div>
      </header>

      <button type="button" className="viewer-nav viewer-nav-left cursor-pointer" title="上一张" aria-label="上一张" onClick={() => onNavigate(-1)}><ChevronLeft size={28} /></button>
      <figure
        ref={canvasRef}
        className={`viewer-canvas ${zoom > FIT_ZOOM ? dragging ? 'is-dragging' : 'is-zoomed' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={(event) => Math.abs(zoom - FIT_ZOOM) > 0.001 ? resetView() : applyZoom(2, event.clientX, event.clientY)}
      >
        {loading && <LoaderCircle size={28} className="absolute animate-spin text-zinc-500" />}
        <div
          className="viewer-media"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`, transition: dragging ? 'none' : undefined }}
        >
          <img
            key={item.id}
            src={assetUrl(item.src, item.revision)}
            alt={`${category.name} 表情`}
            draggable={false}
            className={`h-full w-full select-none object-contain transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); notify('原图加载失败'); }}
          />
        </div>
      </figure>
      <button type="button" className="viewer-nav viewer-nav-right cursor-pointer" title="下一张" aria-label="下一张" onClick={() => onNavigate(1)}><ChevronRight size={28} /></button>
    </div>
  );
}
