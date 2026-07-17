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

async function fetchItemBlob(item: GalleryItem): Promise<Blob> {
  const response = await fetch(assetUrl(item.src));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

export async function downloadItem(item: GalleryItem): Promise<void> {
  const objectUrl = URL.createObjectURL(await fetchItemBlob(item));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = item.src.split('/').pop() ?? item.id;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
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

export async function copyItem(item: GalleryItem): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Clipboard unavailable');
  const png = fetchItemBlob(item).then(blobToPng);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export async function copyPageLink(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href);
}
