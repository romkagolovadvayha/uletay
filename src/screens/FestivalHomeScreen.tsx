import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownTimer } from '../components/CountdownTimer';
import { AutographSessionRow } from '../components/AutographSessionRow';
import { FestivalLogoImage } from '../components/FestivalLogoImage';
import { SemanticHeading } from '../components/SemanticHeading';
import { HomeHeadlinersWidget } from '../components/HomeHeadlinersWidget';
import { LiveArtistCard } from '../components/LiveArtistCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { WebFestivalGuide } from '../components/WebFestivalGuide';
import { useAppData } from '../context/DataContext';
import {
  usePrimaryAutographSessions,
  useStagePrimaryPerformances,
} from '../hooks/useCurrentLivePerformance';
import { useFavorites } from '../hooks/useFavorites';
import { useDeferredHeroVideo } from '../hooks/useDeferredHeroVideo';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { openHeadlinerDetail, openHeadlinersMain, openScheduleTabMain } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  formatSoonCountdown,
  getStageName,
  isFestivalFinished,
  isFestivalStarted,
  isStartingSoon,
  parseDateTime,
} from '../utils/scheduleHelpers';
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
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  // Native: load as soon as allowed. Web: wait for poster so LCP stays on the image.
  const shouldLoadHeroVideo = allowVideo && (Platform.OS !== 'web' || heroPosterReady);

  const onHeroVideoReady = useCallback(() => {
    setHeroVideoReady(true);
  }, []);

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
  const { data, dataSource, error, isInitialLoading, lastFetchedAt, refreshData } = useAppData();
  const now = useNow(1000);
  const stagePrimaries = useStagePrimaryPerformances();
  const autographPrimaries = usePrimaryAutographSessions(3);
  const { isAutographFavorite, toggleAutographFavorite } = useFavorites();
  const allowHeroVideo = useDeferredHeroVideo();
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
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollY],
  );

  const festivalStart = useMemo(
    () => parseDateTime(data.festival.startDate, '12:00'),
    [data.festival.startDate],
  );

  const festivalStarted = isFestivalStarted(data.festival.startDate, now);
  const festivalPhase = !festivalStarted
    ? 'before'
    : isFestivalFinished(data.festival.startDate, data.festival.endDate, data.schedule, now)
      ? 'after'
      : 'during';
  // The bundled snapshot is intentionally available offline. It contains the
  // published festival window, so a temporary API failure must not hide the
  // countdown or switch the home screen to an empty post-festival state.
  const hasReliableFestivalData = Boolean(
    data.festival.startDate && data.festival.endDate && data.festival.year,
  );
  const nextFestivalYear = data.festival.year + 1;
  const hasNextYearSchedule = hasScheduleForYear(data.schedule, nextFestivalYear);
  const showPreFestivalHeadliners = hasReliableFestivalData && festivalPhase === 'before';
  const showPostFestivalHeadliners =
    hasReliableFestivalData && festivalPhase === 'after' && !hasNextYearSchedule;
  const showLiveSection = hasReliableFestivalData && festivalPhase === 'during';
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
  const hasLiveAutographs = autographPrimaries.some((item) => item.status === 'live');
  const hasSoonAutographs = autographPrimaries.some(
    (item) =>
      item.status === 'upcoming' &&
      isStartingSoon(item.session.date, item.session.startTime, now),
  );
  const autographSectionTitle = hasLiveAutographs
    ? 'АВТОГРАФ-СЕССИИ СЕЙЧАС'
    : hasSoonAutographs
      ? 'СКОРО: АВТОГРАФ-СЕССИИ'
      : 'БЛИЖАЙШИЕ АВТОГРАФ-СЕССИИ';

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
      <HeroParallaxBackground translateY={backgroundTranslateY} allowVideo={allowHeroVideo} />

      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.webContent,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {error ? (
          <View style={styles.offlineBanner}>
            <View style={styles.offlineCopy}>
              <Text style={styles.offlineTitle}>
                {dataSource === 'cache' ? 'Офлайн-режим' : 'Данные недоступны'}
              </Text>
              <Text style={styles.offlineText}>
                {dataSource === 'cache'
                  ? `Не удалось обновить с сервера. Показаны данные${lastFetchedAt ? ` от ${new Date(lastFetchedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''} — расписание доступно.`
                  : 'Не удалось загрузить данные с сервера. Проверьте сеть и нажмите «Обновить».'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshData(true)}
              style={styles.offlineRetryButton}
            >
              <Text style={styles.offlineRetry}>Обновить</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.heroStack, festivalPhase === 'after' && styles.heroStackCompact]}>
          <View style={[styles.heroContent, festivalPhase === 'after' && styles.heroContentCompact]}>
            <FestivalLogoImage logoImageUrl={data.festival.logoImageUrl} style={styles.logoImage} />
            <SemanticHeading level={1} style={styles.tagline}>
              Фестиваль УЛЕТАЙ 2027
            </SemanticHeading>
            <Text style={styles.location}>{data.festival.location}</Text>
          </View>

          {hasReliableFestivalData ? (
            <View style={styles.overlaySection}>
              <CountdownTimer
                targetDate={festivalStart}
                festivalStartDate={data.festival.startDate}
                festivalEndDate={data.festival.endDate}
                performances={data.schedule}
              />
            </View>
          ) : null}

          {hasReliableFestivalData && festivalPhase === 'during' ? (
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

        {showLiveSection ? (
          <View style={styles.section}>
            <SectionHeader title={autographSectionTitle} />
            {autographPrimaries.length > 0 ? (
              <View style={styles.autographList}>
                {autographPrimaries.map((item) => {
                  const isSoon =
                    item.status === 'upcoming' &&
                    isStartingSoon(item.session.date, item.session.startTime, now);

                  return (
                    <AutographSessionRow
                      key={item.session.id}
                      session={item.session}
                      isLive={item.status === 'live'}
                      isUpcoming={isSoon}
                      soonCountdown={
                        isSoon
                          ? formatSoonCountdown(
                              parseDateTime(item.session.date, item.session.startTime),
                              now,
                            )
                          : undefined
                      }
                      isFavorite={isAutographFavorite(item.session.id)}
                      onToggleFavorite={() => toggleAutographFavorite(item.session.id)}
                      onPress={() =>
                        navigation.navigate('Autographs', {
                          screen: 'AutographDetail',
                          params: { sessionId: item.session.id },
                        })
                      }
                    />
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Нет предстоящих автограф-сессий</Text>
              </View>
            )}
          </View>
        ) : null}

        {Platform.OS === 'web' ? (
          <View style={styles.guideSection}>
            <WebFestivalGuide
              festival={data.festival}
              onOpenSchedule={() => openScheduleTabMain(navigation)}
              onOpenMap={() => navigation.navigate('MapTab')}
              onOpenRules={() =>
                navigation.navigate('MoreTab', { screen: 'FestivalRules' })
              }
            />
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
  webContent: {
    paddingBottom: 0,
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
  offlineBanner: {
    zIndex: 2,
    margin: spacing.screen,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(28,28,30,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  offlineCopy: {
    flex: 1,
  },
  offlineTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  offlineText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'none',
  },
  offlineRetry: {
    ...typography.body,
    color: colors.primary,
    fontSize: 14,
  },
  offlineRetryButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  heroStackCompact: {
    marginBottom: spacing.sm,
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
  heroContentCompact: {
    minHeight: 300,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  guideSection: {
    paddingHorizontal: spacing.screen,
  },
  liveCardWrap: {
    marginBottom: spacing.sm,
  },
  liveCard: {
    backgroundColor: colors.surfaceGlass,
  },
  autographList: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
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
