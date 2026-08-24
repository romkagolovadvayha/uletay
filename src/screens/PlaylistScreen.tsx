import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionPressable } from '../components/MotionPressable';
import { ScreenTitle } from '../components/ScreenTitle';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { useRadioFavorites } from '../hooks/useRadioFavorites';
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
    recentTracks,
    matchedHeadliner,
    togglePlayback,
    play,
    refreshNowPlaying,
    setPlaylistActive,
  } = useRadioPlayer();
  const { favorites, isFavorite, toggleFavorite } = useRadioFavorites();
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);

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

  const shareTrack = (track = nowPlaying) => {
    if (!track) return;
    const label = [track.artist, track.title].filter(Boolean).join(' — ') || track.raw;
    void Share.share({ message: `Сейчас на «Улетай радио»: ${label}\nhttps://www.uletayradio.ru/` });
  };

  const openMusic = (track = nowPlaying) => {
    if (!track) return;
    const query = encodeURIComponent([track.artist, track.title].filter(Boolean).join(' '));
    void Linking.openURL(`https://music.yandex.ru/search?text=${query}`);
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
                    <MotionPressable
                      accessibilityRole="button"
                      onPress={retry}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>Повторить</Text>
                    </MotionPressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.controlsRow}>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Пауза' : 'Слушать радио'}
                  accessibilityState={{ busy: isBuffering }}
                  aria-busy={isBuffering}
                  onPress={togglePlayback}
                  style={styles.playButton}
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
                </MotionPressable>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite(nowPlaying) ? 'Убрать трек из избранного' : 'Добавить трек в избранное'}
                  disabled={!nowPlaying?.raw}
                  onPress={() => nowPlaying && toggleFavorite(nowPlaying)}
                  style={styles.roundAction}
                >
                  <Ionicons name={isFavorite(nowPlaying) ? 'heart' : 'heart-outline'} size={23} color={colors.primary} />
                </MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel="Поделиться треком" disabled={!nowPlaying?.raw} onPress={() => shareTrack()} style={styles.roundAction}>
                  <Ionicons name="share-outline" size={23} color={colors.text} />
                </MotionPressable>
              </View>

              {nowPlaying?.raw ? (
                <MotionPressable onPress={() => openMusic()} style={styles.musicLink}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
                  <Text style={styles.musicLinkText}>Найти трек в Яндекс Музыке</Text>
                </MotionPressable>
              ) : null}

              {matchedHeadliner ? (
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть артиста ${matchedHeadliner.name}`}
                  onPress={openMatchedHeadliner}
                  style={styles.artistLink}
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
                </MotionPressable>
              ) : null}

              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel="Обновить информацию о треке"
                accessibilityState={{ busy: isMetadataLoading }}
                aria-busy={isMetadataLoading}
                disabled={isMetadataLoading}
                onPress={() => void refreshNowPlaying()}
                style={styles.refreshButton}
              >
                {isMetadataLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Ionicons name="refresh-outline" size={17} color={colors.textSecondary} />
                )}
                <Text style={styles.refreshText}>Обновить информацию</Text>
              </MotionPressable>
            </View>
          </View>

          {recentTracks.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.sectionTitle}>Недавно в эфире</Text>
                  <Text style={styles.sectionCaption}>История не требует аккаунта</Text>
                </View>
                {recentTracks.length > 5 ? (
                  <MotionPressable onPress={() => setShowAllRecent((value) => !value)}>
                    <Text style={styles.sectionAction}>{showAllRecent ? 'Свернуть' : 'Все'}</Text>
                  </MotionPressable>
                ) : null}
              </View>
              {(showAllRecent ? recentTracks : recentTracks.slice(0, 5)).map((track) => (
                <View key={`${track.raw}-${track.playedAt}`} style={styles.trackRow}>
                  <View style={styles.trackIndex}>
                    <Ionicons name="musical-note" size={16} color={colors.textMuted} />
                  </View>
                  <View style={styles.trackCopy}>
                    <Text style={styles.trackRowTitle} numberOfLines={1}>{track.title || track.raw}</Text>
                    <Text style={styles.trackRowArtist} numberOfLines={1}>{track.artist || 'Улетай радио'}</Text>
                  </View>
                  <MotionPressable accessibilityLabel="Найти трек" onPress={() => openMusic(track)} style={styles.smallAction}>
                    <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
                  </MotionPressable>
                  <MotionPressable accessibilityLabel="Добавить в избранное" onPress={() => toggleFavorite(track)} style={styles.smallAction}>
                    <Ionicons name={isFavorite(track) ? 'heart' : 'heart-outline'} size={19} color={colors.primary} />
                  </MotionPressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.sectionTitle}>Избранные треки</Text>
                  <Text style={styles.sectionCaption}>
                    {favorites.length
                      ? `Сохранены только на этом устройстве · ${favorites.length}`
                      : 'Нажмите сердце у трека — он появится здесь'}
                  </Text>
                </View>
                {favorites.length > 5 ? (
                  <MotionPressable onPress={() => setShowAllFavorites((value) => !value)}>
                    <Text style={styles.sectionAction}>
                      {showAllFavorites ? 'Свернуть' : 'Все'}
                    </Text>
                  </MotionPressable>
                ) : null}
              </View>
              {favorites.length ? (
                (showAllFavorites ? favorites : favorites.slice(0, 5)).map((track) => (
                <View key={track.raw} style={styles.trackRow}>
                  <View style={styles.trackIndex}>
                    <Ionicons name="heart" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.trackCopy}>
                    <Text style={styles.trackRowTitle} numberOfLines={1}>
                      {track.title || track.raw}
                    </Text>
                    <Text style={styles.trackRowArtist} numberOfLines={1}>
                      {track.artist || 'Улетай радио'}
                    </Text>
                  </View>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Найти трек"
                    onPress={() => openMusic(track)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Поделиться треком"
                    onPress={() => shareTrack(track)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="share-outline" size={19} color={colors.textSecondary} />
                  </MotionPressable>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Удалить из избранного"
                    onPress={() => toggleFavorite(track)}
                    style={styles.smallAction}
                  >
                    <Ionicons name="heart-dislike-outline" size={20} color={colors.primary} />
                  </MotionPressable>
                </View>
                ))
              ) : (
                <View style={styles.emptyFavorites}>
                  <Ionicons name="heart-outline" size={24} color={colors.textMuted} />
                  <Text style={styles.emptyFavoritesText}>Пока нет избранных треков</Text>
                </View>
              )}
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
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 12,
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
    fontSize: 12,
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
    minHeight: 44,
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
    gap: spacing.md,
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
  roundAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  musicLinkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
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
    fontSize: 12,
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
    fontSize: 12,
  },
  artistLinkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  artistLinkActionText: {
    ...appFont('semiBold'),
    color: colors.primary,
    fontSize: 12,
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
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  sectionCaption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionAction: {
    ...typography.button,
    color: colors.primary,
  },
  trackRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trackIndex: {
    width: 28,
    alignItems: 'center',
  },
  trackCopy: {
    flex: 1,
  },
  trackRowTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  trackRowArtist: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  smallAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFavorites: {
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyFavoritesText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
