# Extractable components

## AdaptiveTabBar

- Source: `src/components/AdaptiveTabBar.tsx`
- Category: layout
- Description: responsive navigation that switches between compact bottom tabs
  and a persistent tablet/web sidebar.
- Extractable props: activeItem, isTablet.
- Hardcoded: destination labels, icon family, black/yellow festival styling.

## MobileBottomTabBar

- Source: `src/components/MobileBottomTabBar.tsx`
- Category: layout
- Description: equal-width phone navigation with safe-area handling.
- Extractable props: activeItem.
- Hardcoded: destination text, icons, safe-area layout.

## TabletSidebar

- Source: `src/components/TabletSidebar.tsx`
- Category: layout
- Description: persistent navigation and secondary festival destinations.
- Extractable props: activeItem, festivalActive.
- Hardcoded: brand wordmark, destination text, icons.

## MapFilterChips

- Source: `src/components/map/MapFilterChips.tsx`
- Category: basic
- Description: horizontally scrollable category filter with selected state.
- Extractable props: activeFilter.
- Hardcoded: map category labels and capsule styling.

## PrimaryButton

- Source: `src/components/PrimaryButton.tsx`
- Category: basic
- Description: amber primary CTA.
- Extractable props: label.
- Hardcoded: colors, radius, typography, pressed motion.
