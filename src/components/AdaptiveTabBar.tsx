import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { useIsTablet } from '../hooks/useIsTablet';
import { MobileBottomTabBar } from './MobileBottomTabBar';
import { TabletSidebar } from './TabletSidebar';

export function AdaptiveTabBar(props: BottomTabBarProps) {
  const isTablet = useIsTablet();

  if (Platform.OS === 'web' && props.state.routes[props.state.index]?.name === 'HomeTab') {
    return null;
  }

  if (isTablet) {
    return <TabletSidebar {...props} />;
  }

  return <MobileBottomTabBar {...props} />;
}
