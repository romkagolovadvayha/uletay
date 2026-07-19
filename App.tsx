import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from './src/context/DataContext';
import { DemoModeProvider } from './src/context/DemoModeContext';
import { RadioPlayerProvider } from './src/context/RadioPlayerContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { IconsReadyProvider } from './src/context/IconsReadyContext';
import { NotificationSettingsProvider } from './src/context/NotificationSettingsContext';
import { useAppFonts } from './src/hooks/useAppFonts';
import { useFestivalActive } from './src/hooks/useFestivalActive';
import { linking } from './src/navigation/linking';
import { navigationRef } from './src/navigation/navigationRef';
import { syncHeadlinersNavigationTarget, syncNestedStacksWithActiveTab } from './src/navigation/scheduleNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { WebSeoManager } from './src/components/WebSeoManager';
import { syncWebSeo } from './src/seo/syncWebSeo';
import { colors } from './src/theme/colors';
import { installWebMainLandmark } from './src/utils/webMainLandmark';
import { installWebPreventInputZoom } from './src/utils/webPreventInputZoom';
import { installWebOffline } from './src/utils/installWebOffline';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.borderStrong,
    primary: colors.primary,
  },
};

function AppContent() {
  const { loaded: fontsLoaded, iconsReady } = useAppFonts();
  const festivalActive = useFestivalActive();

  syncHeadlinersNavigationTarget(festivalActive);

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <IconsReadyProvider ready={iconsReady}>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        linking={linking}
        documentTitle={
          Platform.OS === 'web'
            ? {
                enabled: false,
              }
            : undefined
        }
        onReady={() => {
          syncWebSeo();
        }}
        onStateChange={() => {
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const focusedElement = document.activeElement;
            if (focusedElement instanceof HTMLElement) {
              focusedElement.blur();
            }
          }
          requestAnimationFrame(() => {
            if (navigationRef.isReady()) {
              syncNestedStacksWithActiveTab(navigationRef);
            }
            syncWebSeo();
          });
        }}
      >
        <StatusBar style="light" />
        <WebSeoManager />
        <RootNavigator />
      </NavigationContainer>
    </IconsReadyProvider>
  );
}

export default function App() {
  useEffect(() => {
    installWebMainLandmark();
    installWebOffline();
    return installWebPreventInputZoom();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <DataProvider>
          <DemoModeProvider>
            <RadioPlayerProvider>
              <FavoritesProvider>
                <NotificationSettingsProvider>
                  <AppContent />
                </NotificationSettingsProvider>
              </FavoritesProvider>
            </RadioPlayerProvider>
          </DemoModeProvider>
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
