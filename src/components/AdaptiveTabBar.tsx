import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { RadioMiniPlayer } from './radio-mini-player';
import { TabletSidebar } from './TabletSidebar';

export function AdaptiveTabBar(props: BottomTabBarProps) {
  const isTablet = useIsTablet();

  if (isTablet) {
    return (
      <>
        <TabletSidebar {...props} />
        <RadioMiniPlayer />
      </>
    );
  }

  return (
    <>
      <MobileBottomTabBar {...props} />
      <RadioMiniPlayer />
    </>
  );
}
