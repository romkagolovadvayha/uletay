import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite(nowPlaying) ? 'Убрать трек из избранного' : 'Добавить трек в избранное'}
                  disabled={!nowPlaying?.raw}
                  onPress={() => nowPlaying && toggleFavorite(nowPlaying)}
                  style={styles.roundAction}
                >
                  <Ionicons name={isFavorite(nowPlaying) ? 'heart' : 'heart-outline'} size={23} color={colors.primary} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Поделиться треком" disabled={!nowPlaying?.raw} onPress={() => shareTrack()} style={styles.roundAction}>
                  <Ionicons name="share-outline" size={23} color={colors.text} />
                </Pressable>
              </View>

              {nowPlaying?.raw ? (
                <Pressable onPress={() => openMusic()} style={styles.musicLink}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
                  <Text style={styles.musicLinkText}>Найти трек в Яндекс Музыке</Text>
                </Pressable>
              ) : null}

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

          {recentTracks.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>Недавно в эфире</Text>
                  <Text style={styles.sectionCaption}>История не требует аккаунта</Text>
                </View>
                {recentTracks.length > 5 ? (
                  <Pressable onPress={() => setShowAllRecent((value) => !value)}>
                    <Text style={styles.sectionAction}>{showAllRecent ? 'Свернуть' : 'Все'}</Text>
                  </Pressable>
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
                  <Pressable accessibilityLabel="Найти трек" onPress={() => openMusic(track)} style={styles.smallAction}>
                    <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable accessibilityLabel="Добавить в избранное" onPress={() => toggleFavorite(track)} style={styles.smallAction}>
                    <Ionicons name={isFavorite(track) ? 'heart' : 'heart-outline'} size={19} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {favorites.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Любимые треки</Text>
              <Text style={styles.sectionCaption}>Сохранены только на этом устройстве · {favorites.length}</Text>
            </View>
          ) : null}

          <View style={styles.promoGrid}>
            <PromoCard
              icon="trophy-outline"
              title="Улётная десятка"
              caption="Голосуйте на сайте радио — без отдельной регистрации в приложении."
              action="Голосовать"
              onPress={() => void Linking.openURL('https://www.uletayradio.ru/')}
            />
            <PromoCard
              icon="rocket-outline"
              title="Молодым группам"
              caption="Правила отбора и подача заявки — на официальном сайте фестиваля."
              action="Подать заявку"
              onPress={() => void Linking.openURL('https://uletayfest.ru/otborochnie_tury')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PromoCard({
  icon,
  title,
  caption,
  action,
  onPress,
}: {
  icon: 'trophy-outline' | 'rocket-outline';
  title: string;
  caption: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.promoCard, pressed && styles.pressed]}>
      <Ionicons name={icon} size={26} color={colors.primary} />
      <Text style={styles.promoTitle}>{title}</Text>
      <Text style={styles.promoCaption}>{caption}</Text>
      <Text style={styles.promoAction}>{action} →</Text>
    </Pressable>
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
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  promoCard: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 180,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  promoTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  promoCaption: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  promoAction: {
    ...typography.button,
    color: colors.primary,
  },
});
