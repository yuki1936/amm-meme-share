import type { GalleryItem } from '../types';

const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL?.replace(/\/$/, '') ?? '';

export function assetUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${assetBaseUrl}/${encodedPath}`;
}

export function parseRoute(): { categoryId: string; itemId: string } {
  try {
    const [categoryId = '', itemId = ''] = decodeURIComponent(window.location.hash.slice(1)).split('/');
    return { categoryId, itemId };
  } catch {
    return { categoryId: '', itemId: '' };
  }
}

export function updateRoute(categoryId: string, itemId = '', mode: 'push' | 'replace' = 'push'): void {
  const hash = `#${encodeURIComponent(categoryId)}${itemId ? `/${encodeURIComponent(itemId)}` : ''}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', hash);
}

export async function downloadItem(item: GalleryItem): Promise<void> {
  const response = await fetch(assetUrl(item.src));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = item.src.split('/').pop() ?? item.id;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function blobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => png ? resolve(png) : reject(new Error('PNG conversion failed')), 'image/png');
  });
}

export async function copyItem(item: GalleryItem): Promise<'image' | 'link'> {
  const absoluteUrl = new URL(assetUrl(item.src), window.location.href).href;
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Clipboard unavailable');
    const response = await fetch(assetUrl(item.src));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let blob = await response.blob();
    const clipboard = ClipboardItem as typeof ClipboardItem & { supports?: (type: string) => boolean };
    const supportsOriginal = clipboard.supports?.(blob.type) ?? false;
    if (!supportsOriginal && item.animated) throw new Error('Animated clipboard unavailable');
    if (!supportsOriginal) blob = await blobToPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return 'image';
  } catch {
    await navigator.clipboard.writeText(absoluteUrl);
    return 'link';
  }
}

export async function shareItem(title: string): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href });
      return 'shared';
    }
    await navigator.clipboard.writeText(window.location.href);
    return 'copied';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : Promise.reject(error);
  }
}
