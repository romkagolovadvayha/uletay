import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerformanceTimeDateRow } from '../components/PerformanceTimeDateRow';
import { ScreenTitle } from '../components/ScreenTitle';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { useAppData } from '../context/DataContext';
import { openHeadlinerDetail } from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { screenTitleSpacing } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography, appFont } from '../theme/typography';
import { resolveArtistImageSource } from '../utils/festArtistImages';
import { RADIO_STATION_NAME } from '../config/radio';
import { formatDayMonthLabel, formatTimeRange, getStageName } from '../utils/scheduleHelpers';
import { formatHeadlinerYears } from '../utils/headlinerHelpers';

export function PlaylistScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { data } = useAppData();
  const {
    isPlaying,
    isLoading,
    error,
    nowPlaying,
    matchedPerformance,
    matchedHeadliner,
    togglePlayback,
    refreshNowPlaying,
    setPlaylistActive,
  } = useRadioPlayer();

  useFocusEffect(
    useCallback(() => {
      setPlaylistActive(true);
      return () => setPlaylistActive(false);
    }, [setPlaylistActive]),
  );

  const displayArtist = nowPlaying?.artist || 'Улетайрадио';
  const displayTitle = nowPlaying?.title || 'В эфире';
  const artworkSource = resolveArtistImageSource(
    matchedPerformance?.imageUrl ?? matchedHeadliner?.imageUrl,
    matchedPerformance?.artist ?? matchedHeadliner?.name ?? nowPlaying?.artist ?? displayArtist,
  );
  const stageName = matchedPerformance ? getStageName(matchedPerformance.stageId, data.stages) : null;

  const openMatchedHeadliner = () => {
    if (!matchedHeadliner) {
      return;
    }
    openHeadlinerDetail(navigation, matchedHeadliner.id);
  };

  const openMatchedPerformance = () => {
    if (!matchedPerformance) {
      return;
    }
    navigation.navigate('ScheduleTab', {
      screen: 'LiveDetail',
      params: { performanceId: matchedPerformance.id },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle style={styles.title}>ПЛЕЙЛИСТ</ScreenTitle>
        <Text style={styles.subtitle}>{RADIO_STATION_NAME}</Text>

        <View style={styles.playerCard}>
          <View style={styles.artworkWrap}>
            {artworkSource ? (
              <Image source={artworkSource} style={styles.artwork} contentFit="cover" />
            ) : (
              <LinearGradient colors={['#2C2C2E', '#111111']} style={styles.artworkFallback}>
                <Ionicons name="radio-outline" size={48} color={colors.primary} />
              </LinearGradient>
            )}
            {isPlaying ? (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>В ЭФИРЕ</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.nowPlayingLabel}>Сейчас играет</Text>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={2}>
            {displayArtist}
          </Text>

          {matchedPerformance ? (
            <Pressable
              accessibilityRole="button"
              onPress={openMatchedPerformance}
              style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchLabel}>На фестивале</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <Text style={styles.matchArtist}>{matchedPerformance.artist}</Text>
              {stageName ? <Text style={styles.matchStage}>{stageName}</Text> : null}
              <PerformanceTimeDateRow
                style={styles.matchTimeRow}
                time={formatTimeRange(matchedPerformance.startTime, matchedPerformance.endTime)}
                date={formatDayMonthLabel(matchedPerformance.date)}
              />
            </Pressable>
          ) : matchedHeadliner ? (
            <Pressable
              accessibilityRole="button"
              onPress={openMatchedHeadliner}
              style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchLabel}>Хэдлайнер</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              <Text style={styles.matchArtist}>{matchedHeadliner.name}</Text>
              {matchedHeadliner.years.length ? (
                <Text style={styles.matchStage}>
                  Улетай {formatHeadlinerYears(matchedHeadliner.years)}
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Пауза' : 'Слушать'}
            onPress={togglePlayback}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
          >
            {isLoading && !isPlaying ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={colors.primaryText}
                style={!isPlaying ? styles.playIconOffset : undefined}
              />
            )}
          </Pressable>

          <Text style={styles.hint}>
            {isPlaying
              ? 'Радио продолжит играть при сворачивании приложения'
              : 'Нажмите, чтобы включить прямой эфир'}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshNowPlaying()}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.refreshText}>Обновить трек</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    ...screenTitleSpacing,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  artworkWrap: {
    width: 188,
    height: 188,
    alignSelf: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceCard,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.live,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  liveBadgeText: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  nowPlayingLabel: {
    ...appFont('bold'),
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  trackTitle: {
    ...typography.artistName,
    color: colors.text,
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 30,
  },
  trackArtist: {
    ...typography.artistStage,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  matchCard: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matchLabel: {
    ...appFont('bold'),
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  matchArtist: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  matchStage: {
    ...typography.artistStage,
    color: colors.textSecondary,
    marginTop: 2,
  },
  matchTimeRow: {
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.live,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontSize: 13,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  refreshText: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
  },
});
