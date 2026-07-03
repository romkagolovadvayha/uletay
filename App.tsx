import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
      onStateChange={() => {
        if (navigationRef.isReady()) {
          syncNestedStacksWithActiveTab(navigationRef);
        }
      }}
    >
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
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
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
