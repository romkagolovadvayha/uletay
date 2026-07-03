import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useHeroBackgroundPulse } from '../hooks/useHeroBackgroundPulse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownTimer } from '../components/CountdownTimer';
import { LiveArtistCard } from '../components/LiveArtistCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { useAppData } from '../context/DataContext';
import { useStagePrimaryPerformances } from '../hooks/useCurrentLivePerformance';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { openScheduleTabMain } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getStageName, isStartingSoon, parseDateTime } from '../utils/scheduleHelpers';
import { getRemoteImageSource } from '../utils/imageSource';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

type Props = {
  navigation: Navigation;
};

const HERO_BACKGROUND_HEIGHT = 580;
const PARALLAX_FACTOR = 0.42;

export function FestivalHomeScreen({ navigation }: Props) {
  const { data } = useAppData();
  const now = useNow(1000);
  const stagePrimaries = useStagePrimaryPerformances();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const { scale: heroScale, flashOpacity } = useHeroBackgroundPulse();

  const backgroundTranslateY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, HERO_BACKGROUND_HEIGHT],
        outputRange: [0, -HERO_BACKGROUND_HEIGHT * PARALLAX_FACTOR],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const festivalStart = useMemo(
    () => parseDateTime(data.festival.startDate, '12:00'),
    [data.festival.startDate],
  );

  const hasAnyLive = stagePrimaries.some((item) => item.status === 'live');
  const hasAnySoon = stagePrimaries.some(
    (item) =>
      item.status === 'upcoming' &&
      isStartingSoon(item.performance.date, item.performance.startTime, now),
  );
  const sectionTitle = hasAnyLive
    ? 'СЕЙЧАС НА СЦЕНАХ'
    : hasAnySoon
      ? 'СКОРО НА СЦЕНАХ'
      : 'СЛЕДУЮЩИЕ ВЫСТУПЛЕНИЯ';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.parallaxBackground,
          {
            transform: [{ translateY: backgroundTranslateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.parallaxImageWrap,
            {
              transform: [{ scale: heroScale }],
            },
          ]}
        >
          <Image
            source={getRemoteImageSource(
              data.festival.heroImageUrl,
              require('../../assets/images/hero-crowd.png'),
            )}
            style={styles.parallaxImage}
            contentFit="cover"
            contentPosition="top"
          />
        </Animated.View>
        <LinearGradient
          colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.45, 1]}
          style={styles.parallaxGradient}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.parallaxFlash, { opacity: flashOpacity }]}
        />
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View style={styles.heroStack}>
          <View style={styles.heroContent}>
            <Image
              source={getRemoteImageSource(
                data.festival.logoImageUrl,
                require('../../assets/images/festival-logo.png'),
              )}
              style={styles.logoImage}
              contentFit="contain"
            />
            <Text style={styles.tagline}>ФЕСТИВАЛЬ НАСТОЯЩЕЙ МУЗЫКИ</Text>
            <Text style={styles.location}>{data.festival.location}</Text>
          </View>

          <View style={styles.overlaySection}>
            <CountdownTimer targetDate={festivalStart} />
          </View>

          <View style={styles.overlaySection}>
            <PrimaryButton
              label="РАСПИСАНИЕ"
              onPress={() => openScheduleTabMain(navigation)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={sectionTitle} />
          {stagePrimaries.length > 0 ? (
            stagePrimaries.map((item) => (
              <View key={item.performance.id} style={styles.liveCardWrap}>
                <LiveArtistCard
                  performance={item.performance}
                  stageName={getStageName(item.performance.stageId, data.stages)}
                  status={item.status}
                  now={now}
                  style={styles.liveCard}
                  onPress={() =>
                    navigation.navigate('ScheduleTab', {
                      screen: 'LiveDetail',
                      params: { performanceId: item.performance.id },
                    })
                  }
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Нет предстоящих выступлений в расписании</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  parallaxBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_BACKGROUND_HEIGHT + 80,
    zIndex: 0,
    overflow: 'hidden',
  },
  parallaxImageWrap: {
    ...StyleSheet.absoluteFill,
  },
  parallaxImage: {
    ...StyleSheet.absoluteFill,
  },
  parallaxFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFF8E7',
  },
  parallaxGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroStack: {
    position: 'relative',
    marginBottom: spacing.section,
    zIndex: 1,
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    minHeight: 340,
    gap: spacing.sm,
  },
  logoImage: {
    width: '100%',
    maxWidth: 360,
    height: 156,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.logoTagline,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  location: {
    ...typography.location,
    color: colors.text,
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0.4,
    fontSize: 13,
  },
  overlaySection: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.section,
  },
  section: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.section,
  },
  liveCardWrap: {
    marginBottom: spacing.sm,
  },
  liveCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
