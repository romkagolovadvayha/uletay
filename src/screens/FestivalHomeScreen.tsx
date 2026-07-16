import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownTimer } from '../components/CountdownTimer';
import { FestivalLogoImage } from '../components/FestivalLogoImage';
import { HomeHeadlinersWidget } from '../components/HomeHeadlinersWidget';
import { LiveArtistCard } from '../components/LiveArtistCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useStagePrimaryPerformances } from '../hooks/useCurrentLivePerformance';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { openHeadlinerDetail, openHeadlinersMain, openScheduleTabMain } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getStageName, isFestivalStarted, isStartingSoon, parseDateTime } from '../utils/scheduleHelpers';
import { getLatestHeadlinerYear, hasScheduleForYear } from '../utils/headlinerHelpers';
import { HERO_POSTER_SOURCE } from '../utils/heroPosterSource';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

type Props = {
  navigation: Navigation;
};

const HERO_BACKGROUND_HEIGHT = 580;
const PARALLAX_FACTOR = 0.42;

const LazyHeroBackgroundVideo = React.lazy(() =>
  import('../components/HeroBackgroundVideo').then((m) => ({ default: m.HeroBackgroundVideo })),
);

type HeroParallaxBackgroundProps = {
  translateY: Animated.AnimatedInterpolation<number>;
  allowVideo: boolean;
};

function HeroParallaxBackground({ translateY, allowVideo }: HeroParallaxBackgroundProps) {
  const [heroPosterReady, setHeroPosterReady] = useState(Platform.OS !== 'web');
  const [shouldLoadHeroVideo, setShouldLoadHeroVideo] = useState(Platform.OS !== 'web');
  const [heroVideoReady, setHeroVideoReady] = useState(false);

  const onHeroVideoReady = useCallback(() => {
    setHeroVideoReady(true);
  }, []);

  useEffect(() => {
    if (!allowVideo || shouldLoadHeroVideo) {
      return;
    }
    // Start video as soon as the poster is ready (web) or immediately (native).
    if (Platform.OS !== 'web' || heroPosterReady) {
      setShouldLoadHeroVideo(true);
    }
  }, [allowVideo, heroPosterReady, shouldLoadHeroVideo]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.parallaxBackground,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.parallaxVideoCrop}>
        <View style={styles.parallaxVideoLayer}>
          <Image
            source={HERO_POSTER_SOURCE}
            style={styles.parallaxVideoMedia}
            contentFit="cover"
            contentPosition="center"
            priority="high"
            loading="eager"
            accessibilityLabel=""
            alt=""
            onLoad={() => setHeroPosterReady(true)}
          />
        </View>
        {shouldLoadHeroVideo ? (
          <View
            style={[styles.parallaxVideoLayer, !heroVideoReady && styles.parallaxVideoHidden]}
          >
            <Suspense fallback={null}>
              <LazyHeroBackgroundVideo onReady={onHeroVideoReady} />
            </Suspense>
          </View>
        ) : null}
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.parallaxGradient}
      />
    </Animated.View>
  );
}

export function FestivalHomeScreen({ navigation }: Props) {
  const { data, isInitialLoading } = useAppData();
  const festivalActive = useFestivalActive();
  const now = useNow(1000);
  const stagePrimaries = useStagePrimaryPerformances();
  const scrollY = useMemo(() => new Animated.Value(0), []);

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

  const festivalStarted = isFestivalStarted(data.festival.startDate, now);
  const nextFestivalYear = data.festival.year + 1;
  const hasNextYearSchedule = hasScheduleForYear(data.schedule, nextFestivalYear);
  const showPreFestivalHeadliners = festivalActive && !festivalStarted;
  const showPostFestivalHeadliners = !festivalActive && !hasNextYearSchedule;
  const showLiveSection = festivalActive && festivalStarted;
  const latestHeadlinerYear = useMemo(
    () => getLatestHeadlinerYear(data.headliners),
    [data.headliners],
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

  const openHeadlinersMainScreen = useCallback(() => {
    openHeadlinersMain(navigation);
  }, [navigation]);

  const openHeadlinerDetailScreen = useCallback(
    (headlinerId: string) => {
      openHeadlinerDetail(navigation, headlinerId);
    },
    [navigation],
  );

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <HeroParallaxBackground translateY={backgroundTranslateY} allowVideo={false} />
        <View style={styles.homeLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.homeLoaderText}>Загружаем данные фестиваля…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeroParallaxBackground translateY={backgroundTranslateY} allowVideo />

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View style={styles.heroStack}>
          <View style={styles.heroContent}>
            <FestivalLogoImage logoImageUrl={data.festival.logoImageUrl} style={styles.logoImage} />
            <Text style={styles.tagline}>ФЕСТИВАЛЬ НАСТОЯЩЕЙ МУЗЫКИ</Text>
            <Text style={styles.location}>{data.festival.location}</Text>
          </View>

          <View style={styles.overlaySection}>
            <CountdownTimer
              targetDate={festivalStart}
              festivalStartDate={data.festival.startDate}
              festivalEndDate={data.festival.endDate}
              performances={data.schedule}
            />
          </View>

          {festivalActive ? (
            <View style={styles.overlaySection}>
              <PrimaryButton
                label="РАСПИСАНИЕ"
                onPress={() => openScheduleTabMain(navigation)}
              />
            </View>
          ) : null}
        </View>

        {showPostFestivalHeadliners && latestHeadlinerYear != null ? (
          <View style={styles.section}>
            <HomeHeadlinersWidget
              year={latestHeadlinerYear}
              limit={5}
              moreLabel="ЕЩЁ"
              hint=""
              onPressHeadliner={(headliner) => openHeadlinerDetailScreen(headliner.id)}
              onPressAll={openHeadlinersMainScreen}
            />
          </View>
        ) : null}

        {showPreFestivalHeadliners && latestHeadlinerYear != null ? (
          <View style={styles.section}>
            <HomeHeadlinersWidget
              year={latestHeadlinerYear}
              onPressHeadliner={(headliner) => openHeadlinerDetailScreen(headliner.id)}
              onPressAll={openHeadlinersMainScreen}
            />
          </View>
        ) : null}

        {showLiveSection ? (
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
        ) : null}
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
  homeLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    zIndex: 1,
  },
  homeLoaderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  parallaxVideoCrop: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  parallaxVideoLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parallaxVideoMedia: {
    height: '100%',
    aspectRatio: 16 / 9,
    minWidth: '100%',
  },
  parallaxVideoHidden: {
    opacity: 0,
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
    width: 360,
    maxWidth: '100%',
    height: 156,
    alignSelf: 'center',
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
    backgroundColor: colors.surfaceGlass,
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
