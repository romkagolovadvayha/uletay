import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenTitle } from '../components/ScreenTitle';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { openHeadlinerDetail } from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { setPlaylistNowPlayingTitle } from '../seo/syncWebSeo';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { resolveArtistImageSource } from '../utils/festArtistImages';
import { formatHeadlinerYears } from '../utils/headlinerHelpers';

function formatUpdatedAt(timestamp: number | null): string | null {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlaylistScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const {
    isPlaying,
    isBuffering,
    isMetadataLoading,
    error,
    lastUpdatedAt,
    nowPlaying,
    matchedHeadliner,
    togglePlayback,
    play,
    refreshNowPlaying,
    setPlaylistActive,
  } = useRadioPlayer();

  const trackTitle = nowPlaying?.title?.trim() || '';
  const trackArtist = (matchedHeadliner?.name || nowPlaying?.artist || '').trim();
  const displayArtist = trackArtist || 'Улетай радио';
  const displayTitle = trackTitle || (isBuffering ? 'Подключаемся к эфиру…' : 'Прямой эфир');
  const documentTitle = trackTitle && trackArtist ? `${trackTitle} — ${trackArtist}` : null;
  const updatedAt = formatUpdatedAt(lastUpdatedAt);
  const artworkSize = Math.min(isWide ? 280 : width - spacing.xxxl * 2, 280);

  useFocusEffect(
    useCallback(() => {
      setPlaylistActive(true);
      return () => {
        setPlaylistActive(false);
        setPlaylistNowPlayingTitle(null);
      };
    }, [setPlaylistActive]),
  );

  useEffect(() => {
    setPlaylistNowPlayingTitle(isFocused ? documentTitle : null);
  }, [documentTitle, isFocused]);

  const artworkSource = resolveArtistImageSource(
    matchedHeadliner?.imageUrl,
    matchedHeadliner?.name ?? nowPlaying?.artist ?? displayArtist,
  );

  const openMatchedHeadliner = () => {
    if (matchedHeadliner) {
      openHeadlinerDetail(navigation, matchedHeadliner.id);
    }
  };

  const retry = () => {
    if (isPlaying) {
      void refreshNowPlaying();
      return;
    }
    play();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <ScreenTitle style={styles.title}>ФЕСТИВАЛЬНОЕ РАДИО</ScreenTitle>
              <Text style={styles.subtitle}>Музыка «Улетая» круглосуточно</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>ПРЯМОЙ ЭФИР</Text>
            </View>
          </View>

          <View style={[styles.playerCard, isWide && styles.playerCardWide]}>
            <View
              style={[
                styles.artworkWrap,
                { width: artworkSize, height: artworkSize },
                isWide && styles.artworkWide,
              ]}
            >
              {artworkSource ? (
                <Image
                  source={artworkSource}
                  style={styles.artwork}
                  contentFit="cover"
                  accessibilityLabel={`${displayArtist} — ${displayTitle}`}
                  alt={`${displayArtist} — ${displayTitle}`}
                />
              ) : (
                <LinearGradient colors={['#2C2C2E', '#111111']} style={styles.artworkFallback}>
                  <Ionicons name="radio-outline" size={54} color={colors.primary} />
                </LinearGradient>
              )}
            </View>

            <View style={styles.playerInfo}>
              <Text style={styles.nowPlayingLabel}>
                {isBuffering ? 'ПОДКЛЮЧАЕМСЯ' : 'СЕЙЧАС В ЭФИРЕ'}
              </Text>
              <Text selectable style={styles.trackTitle} numberOfLines={3}>
                {displayTitle}
              </Text>
              <Text selectable style={styles.trackArtist} numberOfLines={2}>
                {displayArtist}
              </Text>

              {updatedAt ? (
                <Text style={styles.updatedAt}>Обновлено в {updatedAt}</Text>
              ) : null}

              {error ? (
                <View accessibilityRole="alert" style={styles.errorCard}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.live} />
                  <View style={styles.errorCopy}>
                    <Text selectable style={styles.errorText}>
                      {error}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={retry}
                      style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.retryText}>Повторить</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.controlsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Пауза' : 'Слушать радио'}
                  accessibilityState={{ busy: isBuffering }}
                  onPress={togglePlayback}
                  style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}
                >
                  {isBuffering && !isPlaying ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={30}
                      color={colors.primaryText}
                      style={!isPlaying ? styles.playIconOffset : undefined}
                    />
                  )}
                </Pressable>
              </View>

              {matchedHeadliner ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть артиста ${matchedHeadliner.name}`}
                  onPress={openMatchedHeadliner}
                  style={({ pressed }) => [styles.artistLink, pressed && styles.pressed]}
                >
                  <View style={styles.artistLinkCopy}>
                    <Text style={styles.artistLinkLabel}>ХЭДЛАЙНЕР «УЛЕТАЯ»</Text>
                    <Text style={styles.artistLinkName}>{matchedHeadliner.name}</Text>
                    {matchedHeadliner.years.length ? (
                      <Text style={styles.artistLinkYears}>
                        {formatHeadlinerYears(matchedHeadliner.years)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.artistLinkAction}>
                    <Text style={styles.artistLinkActionText}>Открыть артиста</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Обновить информацию о треке"
                accessibilityState={{ busy: isMetadataLoading }}
                disabled={isMetadataLoading}
                onPress={() => void refreshNowPlaying()}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && !isMetadataLoading && styles.pressed,
                ]}
              >
                {isMetadataLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color={colors.textSecondary} />
                )}
                <Text style={styles.refreshText}>Обновить информацию</Text>
              </Pressable>
            </View>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  contentInner: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  livePill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
  },
  livePillText: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  playerCard: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  playerCardWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  artworkWrap: {
    alignSelf: 'center',
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  artworkWide: {
    flexShrink: 0,
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
  playerInfo: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nowPlayingLabel: {
    ...appFont('bold'),
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.1,
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
  },
  updatedAt: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  errorCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.28)',
  },
  errorCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  retryText: {
    ...appFont('bold'),
    color: colors.primary,
    fontSize: 13,
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: {
    transform: [{ scale: 0.97 }],
  },
  playIconOffset: {
    marginLeft: 4,
  },
  artistLink: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceMuted,
  },
  artistLinkCopy: {
    flex: 1,
    gap: 3,
  },
  artistLinkLabel: {
    ...appFont('bold'),
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  artistLinkName: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  artistLinkYears: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  artistLinkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  artistLinkActionText: {
    ...appFont('semiBold'),
    color: colors.primary,
    fontSize: 11,
  },
  refreshButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  refreshText: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.84,
  },
});
