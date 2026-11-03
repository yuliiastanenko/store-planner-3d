import type { Size } from '../lib/layout';

export interface CatalogItem {
  type: string;
  label: string;
  size: Size;
  color: string;
  /** Visual style used by the 3D renderer. */
  shape: 'shelf' | 'table' | 'counter' | 'rack' | 'mannequin' | 'checkout';
}

/**
 * Fixture catalogue. In a real system this would come from a headless CMS or
 * a product-data API; it is static here so the demo runs without a backend.
 */
export const CATALOG: CatalogItem[] = [
  { type: 'wall-shelf', label: 'Wall shelf', size: { w: 2, d: 0.5, h: 2 }, color: '#4f7cac', shape: 'shelf' },
  { type: 'gondola', label: 'Gondola unit', size: { w: 2.5, d: 1, h: 1.6 }, color: '#5b8f6b', shape: 'shelf' },
  { type: 'display-table', label: 'Display table', size: { w: 1.5, d: 1, h: 0.8 }, color: '#c08b4a', shape: 'table' },
  { type: 'clothes-rack', label: 'Clothes rack', size: { w: 1.5, d: 0.5, h: 1.5 }, color: '#8a6fb0', shape: 'rack' },
  { type: 'mannequin', label: 'Mannequin', size: { w: 0.5, d: 0.5, h: 1.8 }, color: '#d9d4cb', shape: 'mannequin' },
  { type: 'checkout', label: 'Checkout', size: { w: 2, d: 0.75, h: 1 }, color: '#b0524f', shape: 'checkout' },
];

const BY_TYPE = new Map(CATALOG.map((c) => [c.type, c]));

export const getItem = (type: string): CatalogItem => {
  const item = BY_TYPE.get(type);
  if (!item) throw new Error(`Unknown fixture type: ${type}`);
  return item;
};

export const sizeOf = (type: string): Size => getItem(type).size;
export const KNOWN_TYPES = CATALOG.map((c) => c.type);
