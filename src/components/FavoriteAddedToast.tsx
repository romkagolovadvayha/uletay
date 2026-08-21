import React, { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFavorites } from '../context/FavoritesContext';
import { navigateToMySchedule } from '../navigation/navigationRef';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const TAB_BAR_OFFSET = Platform.select({ ios: 96, android: 84, default: 84 });
const AUTO_HIDE_MS = 5000;

export function FavoriteAddedToast() {
  const { addedToastVisible, hideAddedToast } = useFavorites();
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!addedToastVisible) {
      return;
    }

    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      damping: 20,
      stiffness: 210,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    const timer = setTimeout(() => {
      hideAddedToast();
    }, AUTO_HIDE_MS);

    return () => clearTimeout(timer);
  }, [addedToastVisible, entrance, hideAddedToast]);

  if (!addedToastVisible) {
    return null;
  }

  const handleNavigate = () => {
    hideAddedToast();
    navigateToMySchedule();
  };

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          },
        ]}
      >
        <Text style={styles.message}>Добавлено в избранное</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleNavigate}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>МОЁ РАСПИСАНИЕ</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: TAB_BAR_OFFSET,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  message: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    ...typography.button,
    color: colors.primaryText,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
