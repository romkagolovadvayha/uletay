import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from './src/context/DataContext';
import { RadioPlayerProvider } from './src/context/RadioPlayerContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { NotificationSettingsProvider } from './src/context/NotificationSettingsContext';
import { useAppFonts } from './src/hooks/useAppFonts';
import { linking } from './src/navigation/linking';
import { navigationRef } from './src/navigation/navigationRef';
import { syncNestedStacksWithActiveTab } from './src/navigation/scheduleNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { WebSeoManager } from './src/components/WebSeoManager';
import { syncWebSeo } from './src/seo/syncWebSeo';
import { colors } from './src/theme/colors';

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
  const { loaded: fontsLoaded } = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
      onReady={() => {
        syncWebSeo();
      }}
      onStateChange={() => {
        if (navigationRef.isReady()) {
          syncNestedStacksWithActiveTab(navigationRef);
        }
        requestAnimationFrame(() => syncWebSeo());
      }}
    >
      <StatusBar style="light" />
      <WebSeoManager />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <DataProvider>
          <RadioPlayerProvider>
            <FavoritesProvider>
              <NotificationSettingsProvider>
                <AppContent />
              </NotificationSettingsProvider>
            </FavoritesProvider>
          </RadioPlayerProvider>
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
