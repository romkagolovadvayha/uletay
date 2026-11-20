export type FavoriteType = 'performance' | 'autograph' | 'food' | 'artist';

export function favoriteKey(type: FavoriteType, id: string): string {
  const prefix = type === 'performance' ? 'perf' : type === 'autograph' ? 'auto' : type === 'artist' ? 'artist' : 'food';
  return `${prefix}:${id}`;
}

export function normalizeFavoriteKeys(items: unknown): string[] {
  if(!Array.isArray(items))return [];
  return [...new Set(items.filter((item):item is string=>typeof item==='string'&&item.length>0).map((item) => (item.includes(':') ? item : favoriteKey('performance', item))))];
}

export function isFavoriteKey(items: string[], type: FavoriteType, id: string): boolean {
  return items.includes(favoriteKey(type, id));
}

export function toggleFavoriteKey(items: string[], type: FavoriteType, id: string): string[] {
  const key = favoriteKey(type, id);
  return items.includes(key) ? items.filter((item) => item !== key) : [...items, key];
}
