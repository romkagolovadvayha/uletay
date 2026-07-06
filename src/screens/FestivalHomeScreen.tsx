import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
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
const HERO_VIDEO_ASPECT_RATIO = 16 / 9;

const HERO_VIDEO_POSTER = require('../../assets/images/hero-video-poster.webp');
const HERO_VIDEO_SOURCE =
  Platform.OS === 'android'
    ? require('../../assets/videos/background.webm')
    : require('../../assets/videos/background.mp4');

export function FestivalHomeScreen({ navigation }: Props) {
  const { data } = useAppData();
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
      return () => {
        heroPlayer.pause();
      };
    }, [heroPlayer]),
  );

  const heroVideoStyle =
    Platform.OS === 'android' ? styles.parallaxVideoMediaOverlay : styles.parallaxVideoFill;

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
        <View style={styles.parallaxVideoCrop}>
          <Image
            source={HERO_VIDEO_POSTER}
            style={styles.parallaxVideoFill}
            contentFit="cover"
            contentPosition="center"
          />
          <VideoView
            style={[heroVideoStyle, !heroVideoReady && styles.parallaxVideoHidden]}
            player={heroPlayer}
            contentFit="cover"
            nativeControls={false}
            playsInline
            useExoShutter={false}
            surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
            onFirstFrameRender={() => setHeroVideoReady(true)}
          />
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
  parallaxVideoCrop: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    alignItems: 'center',
  },
  parallaxVideoMediaOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    minWidth: '100%',
    aspectRatio: HERO_VIDEO_ASPECT_RATIO,
    alignSelf: 'center',
  },
  parallaxVideoFill: {
    ...StyleSheet.absoluteFill,
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
