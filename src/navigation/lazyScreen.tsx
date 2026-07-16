import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function ScreenFallback() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/**
 * Wrap a dynamically imported screen so Metro can emit a separate web chunk.
 * Named exports are adapted to React.lazy's default-export contract.
 */
export function lazyScreen(
  loader: () => Promise<React.ComponentType<any>>,
): React.ComponentType<any> {
  const LazyComponent = React.lazy(async () => {
    const Component = await loader();
    return { default: Component };
  });

  function LazyScreen(props: any) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  LazyScreen.displayName = 'LazyScreen';
  return LazyScreen;
}
