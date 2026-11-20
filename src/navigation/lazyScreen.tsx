import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { ios, webStyle } from '../theme/ios';
import { typography } from '../theme/typography';
import { webControlProps } from '../utils/webControlProps';

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.pageBackground,
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
        <Text accessibilityRole="alert" style={{ color: colors.text, textAlign: 'center', ...webStyle(typography.body) }}>
          Не удалось открыть раздел. Проверьте подключение к интернету и попробуйте ещё раз.
        </Text>
        <Pressable
          {...webControlProps()}
          accessibilityRole="button"
          onPress={this.props.onRetry}
          style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 12, ...ios.button }}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '700', ...webStyle(typography.button) }}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}

function ScreenFallback() {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),160);return()=>clearTimeout(timer);},[]);
  return (
    <View style={styles.fallback}>
      {visible?<ActivityIndicator
        size="large"
        color={colors.primary}
        accessibilityLabel="Загружаем экран"
      />:null}
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
  const InitialScreen=createScreen();

  class LazyScreen extends React.Component<any> {
    state = { attempt: 0, Screen: InitialScreen };
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
