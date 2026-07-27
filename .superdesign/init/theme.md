# Theme

## Compact token summary

- Product mood: high-energy night festival; black stage environment with warm
  amber/yellow calls to action and white type.
- Font: Montserrat. Regular 400, semibold 600, bold/black 700 aliases.
- Background: `#000000`.
- Primary surface: `#1C1C1E`; muted/raised surface: `#2C2C2E`.
- Primary accent: `#FFC107`; primary foreground: `#000000`.
- Main text: `#FFFFFF`; secondary: `#AEAEB2`; muted: `#636366`.
- Live/error: `#FF3B30`; competition/orange: `#FF9F0A`.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32; screen gutter 16.
- Radius scale: 8, 12, 14, 16, 20, full pill.
- Target sizes: minimum 44px for secondary actions; 48px map FAB; 54px primary CTA.
- Layout breakpoint: compact bottom tabs; tablet/desktop persistent sidebar,
  determined by `useIsTablet`.
- Motion: short pressed scale/opacity, spring bottom sheets, reduced-motion
  support on the map.

## Raw color source

```ts
export const colors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceGlass: 'rgba(28, 28, 30, 0.8)',
  surfaceElevated: '#1C1C1E',
  surfaceCard: '#1C1C1E',
  surfaceMuted: '#2C2C2E',
  primary: '#FFC107',
  primaryText: '#000000',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: '#2C2C2E',
  live: '#FF3B30',
  liveGlow: 'rgba(255, 59, 48, 0.28)',
  tabInactive: '#8E8E93',
  tabActive: '#FFC107',
  countdownDivider: 'rgba(255, 255, 255, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayStrong: 'rgba(0, 0, 0, 0.75)',
  star: '#FFC107',
  competition: '#FF9F0A',
  competitionLabel: 'rgba(255, 193, 7, 0.58)',
  adminAccent: '#34C759',
  logoStroke: '#FFFFFF',
  pillInactive: '#1C1C1E',
  schedulePerformanceLabel: '#B8A56E',
  scheduleAutographLabel: '#B88B7D',
} as const;
```

## Raw spacing and radius source

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 16,
  section: 20,
  card: 16,
  headerTop: 12,
  headerBottom: 20,
  sectionHeaderTop: 20,
  sectionHeaderBottom: 16,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;
```

Canonical full sources:

- `src/theme/colors.ts`
- `src/theme/spacing.ts`
- `src/theme/radius.ts`
- `src/theme/layout.ts`
- `src/theme/typography.ts`
- `src/theme/map.ts`
