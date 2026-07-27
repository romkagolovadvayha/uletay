# Shared layouts

## AdaptiveTabBar

- Source: `src/components/AdaptiveTabBar.tsx`
- Description: switches between the phone bottom tab bar and tablet/web sidebar.

```tsx
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { TabletSidebar } from './TabletSidebar';

export function AdaptiveTabBar(props: BottomTabBarProps) {
  const isTablet = useIsTablet();

  if (isTablet) {
    return <TabletSidebar {...props} />;
  }

  return <MobileBottomTabBar {...props} />;
}
```

## Application shell

- Root: `App.tsx`
- Navigation shell: `src/navigation/RootNavigator.tsx`
- Phone navigation: `src/components/MobileBottomTabBar.tsx`
- Tablet/desktop navigation: `src/components/TabletSidebar.tsx`
- Phone overflow sheet: `src/components/MoreMenuSheet.tsx`

The application shell is a dark full-height surface. On compact widths it uses a
bottom tab bar with equal-width destinations and a bottom sheet for secondary
destinations. On tablet/desktop widths it uses a persistent left sidebar and does
not render the phone sheet. Screen content sits to the right of the sidebar.

The exact, complete source files above are the canonical render context and must
be passed directly to design drafts rather than duplicated or shortened here.
