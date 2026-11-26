import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDownloadBanner } from './src/components/AppDownloadBanner';
import {
  DEMO_MODE_BANNER_HEIGHT,
  DemoModeBanner,
} from './src/components/demo-mode-banner';
import { DataProvider,useAppData } from './src/context/DataContext';
import { DemoModeProvider, useDemoMode } from './src/context/DemoModeContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { IconsReadyProvider } from './src/context/IconsReadyContext';
import { NotificationSettingsProvider } from './src/context/NotificationSettingsContext';
import {CommunityAuthProvider} from './src/context/CommunityAuthContext';
import { useAppFonts } from './src/hooks/useAppFonts';
import { linking } from './src/navigation/linking';
import { useHeadlinersInMoreTab } from './src/navigation/mainTabRoutes';
import { navigationRef } from './src/navigation/navigationRef';
import { syncHeadlinersNavigationTarget, syncNestedStacksWithActiveTab } from './src/navigation/scheduleNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { WebSeoManager } from './src/components/WebSeoManager';
import { WebMcpBridge } from './src/components/WebMcpBridge';
import { syncWebSeo } from './src/seo/syncWebSeo';
import { colors } from './src/theme/colors';
import { installExternalLinkRel } from './src/utils/installExternalLinkRel';
import { installWebMainLandmark } from './src/utils/webMainLandmark';
import { installWebOffline } from './src/utils/installWebOffline';
import { installWebPreventInputZoom } from './src/utils/webPreventInputZoom';
import { installWebScrollbarStyles } from './src/utils/webScrollbarStyles';
import { trackWebPageView } from './src/utils/webAnalytics';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.pageBackground,
    card: colors.background,
    text: colors.text,
    border: colors.borderStrong,
    primary: colors.primary,
  },
};

function AppContent() {
  const { loaded: fontsLoaded, iconsReady } = useAppFonts();
  const {isInitialLoading}=useAppData();
  const headlinersInMore = useHeadlinersInMoreTab();
  const { mode, ready: demoModeReady } = useDemoMode();
  const demoModeActive = demoModeReady && mode === 'demo';

  syncHeadlinersNavigationTarget(headlinersInMore);

  if (!fontsLoaded||(Platform.OS!=='web'&&isInitialLoading)) {
    return (
      <View style={[styles.loader,Platform.OS!=='web'&&{backgroundColor:colors.festivalBackground}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <IconsReadyProvider ready={iconsReady}>
      <View style={styles.appContent}>
        <View style={[styles.navigation, demoModeActive && styles.navigationWithDemoBanner]}>
          <AppDownloadBanner />
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
              trackWebPageView();
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
                trackWebPageView();
              });
            }}
          >
            <StatusBar style={demoModeActive ? 'dark' : 'light'} />
            <WebSeoManager />
            <RootNavigator />
          </NavigationContainer>
        </View>
        {demoModeActive ? <DemoModeBanner /> : null}
      </View>
    </IconsReadyProvider>
  );
}

export default function App() {
  useEffect(() => {
    installWebMainLandmark();
    installWebOffline();
    const disposeZoom = installWebPreventInputZoom();
    const disposeScrollbars = installWebScrollbarStyles();
    const disposeExternalRel = installExternalLinkRel();
    return () => {
      disposeZoom();
      disposeScrollbars();
      disposeExternalRel();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <DataProvider>
          <WebMcpBridge />
          <DemoModeProvider>
              <FavoritesProvider>
                <NotificationSettingsProvider>
                  <CommunityAuthProvider><AppContent /></CommunityAuthProvider>
                </NotificationSettingsProvider>
              </FavoritesProvider>
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
  appContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navigation: {
    flex: 1,
  },
  navigationWithDemoBanner: {
    paddingTop: DEMO_MODE_BANNER_HEIGHT,
  },
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
