import React, { Suspense } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

class ScreenErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onRetry: () => void }>,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={[styles.fallback, { padding: 24, gap: 16 }]}>
        <Text accessibilityRole="alert" style={{ color: colors.text, textAlign: 'center' }}>
          Не удалось открыть раздел. Проверьте подключение к интернету и попробуйте ещё раз.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.props.onRetry}
          style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12 }}
        >
          <Text style={{ color: '#000', fontWeight: '700' }}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}

function ScreenFallback() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        accessibilityLabel="Загружаем экран"
      />
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
  const createScreen = () => React.lazy(async () => ({ default: await loader() }));

  class LazyScreen extends React.Component<any> {
    state = { attempt: 0, Screen: createScreen() };
    retry = () => this.setState((state: { attempt: number }) => ({ attempt: state.attempt + 1, Screen: createScreen() }));

    render() {
      const LazyComponent = this.state.Screen;
      return (
      <ScreenErrorBoundary key={this.state.attempt} onRetry={this.retry}>
        <Suspense fallback={<ScreenFallback />}>
          <LazyComponent {...this.props} />
        </Suspense>
      </ScreenErrorBoundary>
      );
    }
    static displayName = 'LazyScreen';
  }

  return LazyScreen;
}
