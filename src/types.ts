export interface GalleryItem {
  id: string;
  src: string;
  thumb: string;
  revision: string;
  animated: boolean;
  width: number;
  height: number;
}

export interface GalleryCategory {
  id: string;
  name: string;
  romanized: string;
  description: string;
  color: string;
  count: number;
  cover: string;
  coverRevision: string;
  items: GalleryItem[];
}

export interface GalleryManifest {
  version: number;
  total: number;
  categories: GalleryCategory[];
}

export type SortOrder = 'newest' | 'oldest' | 'random';
export type Theme = 'light' | 'dark';
