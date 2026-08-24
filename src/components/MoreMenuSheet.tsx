import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMoreMenu } from '../context/MoreMenuContext';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useIsTablet } from '../hooks/useIsTablet';
import {
  useHeadlinersInMoreTab,
  useMainTabContentFlags,
} from '../navigation/mainTabRoutes';
import {
  openAutographsMain,
  openHeadlinersMain,
} from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { resolveAndroidBottomInset } from '../utils/safeArea';
import { DeferredIonicons } from './DeferredIonicons';
import { ScreenTitle } from './ScreenTitle';
import { MotionPressable } from './MotionPressable';

type MoreNavigation = BottomTabNavigationProp<RootTabParamList>;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export function MoreMenuSheet() {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const navigation = useNavigation<MoreNavigation>();
  const { visible, close } = useMoreMenu();
  const { data } = useAppData();
  const festivalActive = useFestivalActive();
  const headlinersInMore = useHeadlinersInMoreTab();
  const content = useMainTabContentFlags();
  const bottomInset = resolveAndroidBottomInset(insets.bottom);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const sheetHeight = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const webHiddenProps = Platform.OS === 'web'
    ? ({ 'aria-hidden': !visible, inert: visible ? undefined : true } as const)
    : {};

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });

    return () => subscription.remove();
  }, [visible, close]);

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(
        withTiming(1, {
          duration: reduceMotion ? 160 : 220,
          easing: reduceMotion ? EASE_OUT : EASE_SHEET,
        }),
      );
      return;
    }

    progress.set(
      withTiming(0, {
        duration: reduceMotion ? 120 : 160,
        easing: EASE_OUT,
      }),
    );
  }, [dragY, progress, reduceMotion, visible]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!reduceMotion)
        .activeOffsetY([-10, 10])
        .onStart(() => {
          dragStartY.set(dragY.get());
        })
        .onUpdate((event) => {
          const next = dragStartY.get() + event.translationY;
          dragY.set(
            next >= 0
              ? next
              : rubberband(next, Math.max(1, sheetHeight.get())),
          );
        })
        .onEnd((event) => {
          const height = Math.max(1, sheetHeight.get());
          const projected = dragY.get() + project(event.velocityY);

          if (projected > height * 0.4) {
            scheduleOnRN(
              Haptics.impactAsync,
              Haptics.ImpactFeedbackStyle.Light,
            );
            dragY.set(
              withSpring(
                height,
                {
                  duration: 300,
                  dampingRatio: 1,
                  velocity: event.velocityY,
                  overshootClamping: true,
                },
                (finished) => {
                  if (finished) {
                    scheduleOnRN(close);
                  }
                },
              ),
            );
            return;
          }

          dragY.set(
            withSpring(0, {
              duration: 300,
              dampingRatio: 0.8,
              velocity: event.velocityY,
            }),
          );
          scheduleOnRN(
            Haptics.impactAsync,
            Haptics.ImpactFeedbackStyle.Light,
          );
        }),
    [close, dragStartY, dragY, reduceMotion, sheetHeight],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.get() *
      interpolate(
        dragY.get(),
        [0, Math.max(1, sheetHeight.get())],
        [1, 0],
        Extrapolation.CLAMP,
      ),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      {
        translateY:
          (reduceMotion ? 0 : (1 - progress.get()) * 28) + dragY.get(),
      },
    ],
  }));

  if (isTablet) {
    return null;
  }

  const menuItems: MenuItem[] = [
    ...(headlinersInMore
      ? [
          {
            icon: 'mic-outline' as const,
            label: 'Хэдлайнеры',
            onPress: () => {
              close();
              openHeadlinersMain(navigation);
            },
          },
        ]
      : []),
    ...(festivalActive && content.hasAutographs
      ? [
          {
            icon: 'ticket-outline' as const,
            label: 'Автографы',
            onPress: () => {
              close();
              openAutographsMain(navigation);
            },
          },
        ]
      : []),
    ...(festivalActive && data.festival.startDate && data.festival.endDate
      ? [{
          icon: 'restaurant-outline' as const,
          label: 'Еда и напитки',
          onPress: () => {
            close();
            navigation.navigate('MoreTab', { screen: 'FoodCourtMain' });
          },
        }]
      : []),
    {
      icon: 'settings-outline',
      label: 'Настройки',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'Settings' });
      },
    },
    {
      icon: 'document-text-outline',
      label: 'Правила и быт',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FestivalRules' });
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'О фестивале',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FestivalAbout' });
      },
    },
    {
      icon: 'medical-outline',
      label: 'Экстренная помощь',
      onPress: () => {
        close();
        navigation.navigate('HelpTab');
      },
    },
    {
      icon: 'help-circle-outline',
      label: 'Юридическая информация',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'Legal' });
      },
    },
  ];

  return (
    <Animated.View
      {...webHiddenProps}
      pointerEvents={visible ? 'auto' : 'none'}
      style={styles.overlay}
      accessibilityViewIsModal={visible}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Закрыть меню нажатием вне панели"
        style={[styles.backdrop, backdropStyle]}
        onPress={close}
      />
      <Animated.View
        onLayout={(event) => {
          sheetHeight.set(Math.max(1, event.nativeEvent.layout.height));
        }}
        style={[
          styles.sheet,
          { paddingBottom: Math.max(bottomInset, spacing.lg) },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View collapsable={false} style={styles.handleTouch}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть меню"
          onPress={close}
          style={styles.closeButton}
        >
          <DeferredIonicons name="close" size={22} color={colors.textSecondary} />
        </MotionPressable>
        <ScreenTitle style={styles.title}>Ещё</ScreenTitle>
        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => (
            <MotionPressable
              key={item.label}
              accessibilityRole="button"
              onPress={item.onPress}
              style={styles.menuRow}
            >
              <DeferredIonicons name={item.icon} size={22} color={colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <DeferredIonicons name="chevron-forward" size={18} color={colors.textMuted} />
            </MotionPressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 200,
    elevation: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlayStrong,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  handleTouch: {
    height: 44,
    marginTop: -20,
    marginBottom: -8,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.screen,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    flexShrink: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuLabel: {
    ...typography.body,
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
});
