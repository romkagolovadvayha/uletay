import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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
import { openHeadlinersMain, openScheduleTabMain } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getStageName, isFestivalStarted, isStartingSoon, parseDateTime } from '../utils/scheduleHelpers';
import { getLatestHeadlinerYear, hasScheduleForYear } from '../utils/headlinerHelpers';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

type Props = {
  navigation: Navigation;
};

const HERO_BACKGROUND_HEIGHT = 580;
const PARALLAX_FACTOR = 0.42;
const HERO_VIDEO_ASPECT_RATIO = 16 / 9;

const HERO_VIDEO_POSTER = require('../../assets/images/hero-video-poster.webp');
const HERO_VIDEO_SOURCE =
  Platform.OS === 'android'
    ? require('../../assets/videos/background.webm')
    : require('../../assets/videos/background.mp4');

export function FestivalHomeScreen({ navigation }: Props) {
  const { data, refreshData } = useAppData();
  const festivalActive = useFestivalActive();
  const now = useNow(1000);
  const stagePrimaries = useStagePrimaryPerformances();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const heroPlayer = useVideoPlayer(HERO_VIDEO_SOURCE, (player) => {
    player.loop = true;
    player.muted = true;
    if (Platform.OS === 'ios') {
      player.allowsExternalPlayback = false;
    }
    player.play();
  });

  useEffect(() => {
    const playingListener = heroPlayer.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) {
        setHeroVideoReady(true);
      }
    });
    const statusListener = heroPlayer.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        heroPlayer.play();
      }
    });

    heroPlayer.play();

    return () => {
      playingListener.remove();
      statusListener.remove();
    };
  }, [heroPlayer]);

  useFocusEffect(
    useCallback(() => {
      heroPlayer.play();
      void refreshData();
      return () => {
        heroPlayer.pause();
      };
    }, [heroPlayer, refreshData]),
  );

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
    if (festivalActive) {
      navigation.navigate('MoreTab', { screen: 'HeadlinersMain' });
      return;
    }
    openHeadlinersMain(navigation);
  }, [festivalActive, navigation]);

  const openHeadlinerDetail = useCallback(
    (headlinerId: string) => {
      if (festivalActive) {
        navigation.navigate('MoreTab', {
          screen: 'HeadlinerDetail',
          params: { headlinerId },
        });
        return;
      }
      navigation.navigate('HeadlinersTab', {
        screen: 'HeadlinerDetail',
        params: { headlinerId },
      });
    },
    [festivalActive, navigation],
  );

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
        <View style={styles.parallaxVideoCrop}>
          <View style={styles.parallaxVideoLayer}>
            <Image
              source={HERO_VIDEO_POSTER}
              style={styles.parallaxVideoMedia}
              contentFit="cover"
              contentPosition="center"
            />
          </View>
          <View style={styles.parallaxVideoLayer}>
            <VideoView
              style={[
                styles.parallaxVideoMedia,
                !heroVideoReady && styles.parallaxVideoHidden,
                Platform.OS === 'web' ? styles.parallaxVideoMediaWeb : null,
              ]}
              player={heroPlayer}
              contentFit="cover"
              nativeControls={false}
              playsInline
              useExoShutter={false}
              surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
              onFirstFrameRender={() => setHeroVideoReady(true)}
            />
          </View>
        </View>
        <LinearGradient
          colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.45, 1]}
          style={styles.parallaxGradient}
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
              onPressHeadliner={(headliner) => openHeadlinerDetail(headliner.id)}
              onPressAll={openHeadlinersMainScreen}
            />
          </View>
        ) : null}

        {showPreFestivalHeadliners && latestHeadlinerYear != null ? (
          <View style={styles.section}>
            <HomeHeadlinersWidget
              year={latestHeadlinerYear}
              onPressHeadliner={(headliner) => openHeadlinerDetail(headliner.id)}
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
    aspectRatio: HERO_VIDEO_ASPECT_RATIO,
    minWidth: '100%',
  },
  parallaxVideoMediaWeb: {
    // Web maps RN styles to CSS on the underlying <video> element.
    objectPosition: 'center center',
  } as ViewStyle,
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
