export type FoodCourtCategory = 'hot' | 'drinks' | 'desserts';
export type FoodCourtFilter = FoodCourtCategory | 'all';

export const FOOD_COURT_CATEGORIES: { id: FoodCourtFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'hot', label: 'Горячее' },
  { id: 'drinks', label: 'Напитки' },
  { id: 'desserts', label: 'Десерты' },
];

export function getFoodCourtCategoryLabel(category: FoodCourtCategory): string {
  return FOOD_COURT_CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function getFoodCourtPriceLabel(vendor: { priceRange?: string; priceFrom: string }): string {
  return vendor.priceRange ?? vendor.priceFrom;
}
