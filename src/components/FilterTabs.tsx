export type FilterTab<T extends string = string> = {
  id: T;
  label: string;
  caption?: string;
  detail?: string;
  accessibilityLabel?: string;
};

export type FilterTabsProps<T extends string = string> = {
  items: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  layout?: 'row' | 'dates';
  role?: 'tablist' | 'radiogroup';
  inset?: number;
  surface?: boolean;
};

// Web controls; callers retain their existing native implementations.
export function FilterTabs<T extends string>(_props: FilterTabsProps<T>) {
  return null;
}
