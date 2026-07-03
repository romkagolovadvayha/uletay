import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { TabletSidebar } from './TabletSidebar';

export function AdaptiveTabBar(props: BottomTabBarProps) {
  const isTablet = useIsTablet();

  if (isTablet) {
    return <TabletSidebar {...props} />;
  }

  return <BottomTabBar {...props} />;
}
