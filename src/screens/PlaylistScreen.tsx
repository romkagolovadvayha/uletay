import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RadioNowPlaying } from '../api/radioNowPlayingApi';
import { MotionPressable } from '../components/MotionPressable';
import { ScreenTitle } from '../components/ScreenTitle';
import { useRadioPlayer } from '../context/RadioPlayerContext';
import { useRadioFavorites } from '../hooks/useRadioFavorites';
import { openHeadlinerDetail } from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { SITE_URL } from '../seo/site';
import { setPlaylistNowPlayingTitle } from '../seo/syncWebSeo';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont } from '../theme/typography';
import { resolveArtistImageSource } from '../utils/festArtistImages';

function Cover({ source, label, large = false }: { source?: ImageSource | number | null; label: string; large?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sourceKey = JSON.stringify(source ?? null);
  return (
    <View style={large ? styles.coverLarge : styles.coverSmall}>
      {source && failedSource !== sourceKey ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" alt={label}
          accessibilityLabel={label} onError={() => setFailedSource(sourceKey)} transition={200} />
      ) : (
        <LinearGradient colors={[colors.fallbackGradientStart, colors.fallbackGradientDeep]} style={styles.coverFallback}>
          {large ? <View style={styles.record}><View style={styles.recordCenter}><Ionicons name="radio" size={34} color={colors.primaryText} /></View></View>
            : <Ionicons name="musical-note" size={20} color={colors.primary} />}
          {large ? <Text style={styles.coverBrand}>УЛЕТАЙ / РАДИО</Text> : null}
        </LinearGradient>
      )}
    </View>
  );
}

function durationLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function TrackProgress({ track, updatedAt }: { track: RadioNowPlaying; updatedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const duration = track.duration ?? 0;
  if (!duration) return null;
  const position = Math.min(duration, (track.position ?? 0) + Math.max(0, now - updatedAt) / 1000);
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressRail} accessibilityLabel="Ход прямого эфира">
        <View style={[styles.progressFill, { width: `${position / duration * 100}%` }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.caption}>{durationLabel(position)}</Text>
        <Text style={styles.caption}>Прямой эфир · {durationLabel(duration)}</Text>
      </View>
    </View>
  );
}

export function PlaylistScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const {
    isPlaying, isBuffering, isMetadataLoading, isMetadataStale, stationAvailable,
    error, lastUpdatedAt, nowPlaying, upcomingTracks, previousTrack, matchedHeadliner,
    togglePlayback, refreshNowPlaying, setPlaylistActive,
  } = useRadioPlayer();
  const { favorites, isFavorite, toggleFavorite } = useRadioFavorites();
  const [showQueue, setShowQueue] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const displayArtist = nowPlaying?.artist || 'Рок станция (Улетай)';
  const displayTitle = nowPlaying?.title || (stationAvailable === false ? 'Эфир временно недоступен' : 'Музыка, которая объединяет');
  const documentTitle = nowPlaying?.raw && !isMetadataStale ? `${nowPlaying.raw} | Улетай радио` : null;
  const artworkSource = nowPlaying?.artworkUrl
    ? { uri: nowPlaying.artworkUrl }
    : resolveArtistImageSource(matchedHeadliner?.imageUrl, matchedHeadliner?.name ?? nowPlaying?.artist ?? '');

  useFocusEffect(useCallback(() => {
    setPlaylistActive(true);
    return () => { setPlaylistActive(false); setPlaylistNowPlayingTitle(null); };
  }, [setPlaylistActive]));
  useEffect(() => { setPlaylistNowPlayingTitle(isFocused ? documentTitle : null); }, [documentTitle, isFocused]);

  const shareTrack = async () => {
    setActionError(null);
    try {
      await Share.share({ message: `Улетай радио${nowPlaying?.raw ? `: ${nowPlaying.raw}` : ''}\n${SITE_URL}/playlist` });
    } catch { setActionError('Не удалось поделиться. Попробуйте ещё раз.'); }
  };
  const openMusic = async (track: RadioNowPlaying) => {
    setActionError(null);
    try { await Linking.openURL(`https://music.yandex.ru/search?text=${encodeURIComponent([track.artist, track.title].filter(Boolean).join(' '))}`); }
    catch { setActionError('Не удалось открыть поиск музыки.'); }
  };
  const trackRow = (track: RadioNowPlaying, index: number, queue = false) => (
    <View key={`${track.id ?? track.raw}-${index}`} style={[styles.trackRow, queue && index === 0 && styles.nextTrack]}>
      {queue ? <Text style={styles.trackNumber}>{String(index + 1).padStart(2, '0')}</Text> : null}
      <Cover source={track.artworkUrl ? { uri: track.artworkUrl } : null} label={[track.artist, track.title].filter(Boolean).join(' — ')} />
      <View style={styles.trackCopy}>
        {queue && index === 0 ? <Text style={styles.nextLabel}>СЛЕДУЮЩИЙ ТРЕК</Text> : null}
        <Text style={styles.rowTitle} numberOfLines={2}>{track.title || track.raw}</Text>
        <Text style={styles.rowArtist} numberOfLines={2}>{track.artist || 'Улетай радио'}</Text>
      </View>
      {!queue ? <MotionPressable accessibilityRole="button" accessibilityLabel={`Найти ${track.title} в Яндекс Музыке`}
        onPress={() => void openMusic(track)} style={styles.smallAction}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
      </MotionPressable> : null}
      <MotionPressable accessibilityRole="button" accessibilityLabel={`${isFavorite(track) ? 'Убрать из избранного' : 'В избранное'}: ${track.title}`}
        aria-pressed={isFavorite(track)} onPress={() => toggleFavorite(track)} style={styles.smallAction}>
        <Ionicons name={isFavorite(track) ? 'heart' : 'heart-outline'} size={21} color={isFavorite(track) ? colors.primary : colors.textSecondary} />
      </MotionPressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, wide && styles.contentWide]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>НА ОДНОЙ ВОЛНЕ С ФЕСТИВАЛЕМ</Text>
            <ScreenTitle style={[styles.title, wide ? styles.titleWide : {}]}>УЛЕТАЙ РАДИО</ScreenTitle>
            <Text style={styles.lead}>Любимый рок. Знакомые голоса. Твой «Улетай» — где бы ты ни был.</Text>
          </View>

          <View style={[styles.playerCard, wide && styles.playerCardWide]}>
            <View style={[styles.artworkColumn, wide && styles.artworkColumnWide, width < 600 && styles.artworkColumnCompact, width < 360 && styles.artworkColumnSmall]}>
              <Cover source={artworkSource} label={`${displayArtist} — ${displayTitle}`} large />
            </View>
            <View style={styles.playerInfo}>
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, (!stationAvailable || isMetadataStale) && styles.statusDotMuted]} />
                  <Text style={styles.statusText}>{isMetadataStale ? 'ОБНОВЛЯЕМ ЭФИР' : stationAvailable ? 'ПРЯМОЙ ЭФИР' : stationAvailable === false ? 'ПЕРЕРЫВ В ЭФИРЕ' : 'РОК СТАНЦИЯ'}</Text>
                </View>
                <Text style={styles.stationLabel}>Рок станция (Улетай)</Text>
              </View>
              <View style={styles.currentCopy}>
                <Text style={styles.eyebrow}>{isMetadataStale && nowPlaying ? 'ПОСЛЕДНИЙ ИЗВЕСТНЫЙ ТРЕК' : nowPlaying ? 'СЕЙЧАС ИГРАЕТ' : 'ВКЛЮЧАЙ НАСТРОЕНИЕ'}</Text>
                <Text selectable style={[styles.trackTitle, wide && styles.trackTitleWide]}>{displayTitle}</Text>
                <Text selectable style={styles.trackArtist}>{displayArtist}</Text>
              </View>
              {nowPlaying?.duration && lastUpdatedAt && !isMetadataStale ? <TrackProgress track={nowPlaying} updatedAt={lastUpdatedAt} /> : null}
              <View style={styles.controls}>
                <MotionPressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Остановить радио' : 'Слушать радио'}
                  accessibilityState={{ busy: isBuffering }} onPress={togglePlayback} style={styles.playButton}>
                  {isBuffering ? <ActivityIndicator color={colors.primaryText} /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={colors.primaryText} />}
                  <Text style={styles.playButtonText}>{isBuffering ? 'Подключаемся' : isPlaying ? 'Остановить' : 'Слушать эфир'}</Text>
                </MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel={isFavorite(nowPlaying) ? 'Убрать трек из избранного' : 'Добавить трек в избранное'}
                  aria-pressed={isFavorite(nowPlaying)} disabled={!nowPlaying?.raw} onPress={() => nowPlaying && toggleFavorite(nowPlaying)}
                  style={[styles.roundAction, !nowPlaying?.raw && styles.disabled]}>
                  <Ionicons name={isFavorite(nowPlaying) ? 'heart' : 'heart-outline'} size={24} color={colors.primary} />
                </MotionPressable>
                <MotionPressable accessibilityRole="button" accessibilityLabel="Поделиться радио" onPress={() => void shareTrack()} style={styles.roundAction}>
                  <Ionicons name="share-outline" size={23} color={colors.text} />
                </MotionPressable>
              </View>
              {error || actionError ? <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.primary} />
                <Text style={styles.errorText}>{actionError || error}</Text>
              </View> : null}
              {stationAvailable === false && !error ? <Text style={styles.caption}>Станция восстанавливает трансляцию. Информация обновится автоматически.</Text> : null}
              <View style={styles.secondaryActions}>
                {nowPlaying?.raw ? <MotionPressable accessibilityRole="button" onPress={() => void openMusic(nowPlaying)} style={styles.textButton}>
                  <Ionicons name="musical-notes-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.textButtonLabel}>Найти трек</Text>
                </MotionPressable> : null}
                <MotionPressable accessibilityRole="button" accessibilityLabel="Обновить эфир" disabled={isMetadataLoading}
                  onPress={() => void refreshNowPlaying()} style={styles.textButton}>
                  {isMetadataLoading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Ionicons name="refresh" size={17} color={colors.textSecondary} />}
                  <Text style={styles.textButtonLabel}>Обновить эфир</Text>
                </MotionPressable>
              </View>
              {matchedHeadliner ? <MotionPressable accessibilityRole="button" onPress={() => openHeadlinerDetail(navigation, matchedHeadliner.id)} style={styles.artistLink}>
                <Ionicons name="mic-outline" size={20} color={colors.primary} />
                <Text style={styles.artistLinkText}>{matchedHeadliner.name} на «Улетай»</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primary} />
              </MotionPressable> : null}
            </View>
          </View>

          <View style={[styles.collections, wide && styles.collectionsWide]}>
            <View style={styles.queueColumn}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Далее в эфире</Text>
                  <Text style={styles.caption}>Очередь обновляется вместе со станцией</Text>
                </View>
                <Text style={styles.count}>{upcomingTracks.length ? String(upcomingTracks.length).padStart(2, '0') : '—'}</Text>
              </View>
              <View style={styles.listCard}>
                {upcomingTracks.length ? (showQueue ? upcomingTracks : upcomingTracks.slice(0, 5)).map((track, index) => trackRow(track, index, true)) : (
                  <View style={styles.emptyState}><Ionicons name="list-outline" size={28} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{isMetadataStale ? 'Очередь временно недоступна' : isMetadataLoading ? 'Загружаем очередь…' : 'Станция готовит следующие треки'}</Text></View>
                )}
                {upcomingTracks.length > 5 ? <MotionPressable accessibilityRole="button" onPress={() => setShowQueue(!showQueue)} style={styles.expandButton}>
                  <Text style={styles.expandText}>{showQueue ? 'Свернуть очередь' : `Вся очередь · ${upcomingTracks.length}`}</Text>
                  <Ionicons name={showQueue ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
                </MotionPressable> : null}
              </View>
            </View>
            <View style={styles.savedColumn}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>Мои треки</Text>
                  <Text style={styles.caption}>Избранное на этом устройстве</Text>
                </View>
                <Ionicons name="heart-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.listCard}>
                {favorites.length ? (showFavorites ? favorites : favorites.slice(0, 5)).map((track, index) => trackRow(track, index)) : (
                  <View style={styles.emptyState}><Ionicons name="heart-outline" size={32} color={colors.primary} />
                    <Text style={styles.emptyTitle}>Понравилась песня?</Text>
                    <Text style={styles.emptyText}>Нажми на сердце у трека. Сохрани любимое и вернись к нему после эфира.</Text></View>
                )}
                {favorites.length > 5 ? <MotionPressable accessibilityRole="button" onPress={() => setShowFavorites(!showFavorites)} style={styles.expandButton}>
                  <Text style={styles.expandText}>{showFavorites ? 'Свернуть' : `Все избранные · ${favorites.length}`}</Text>
                </MotionPressable> : null}
              </View>
              {previousTrack && !isMetadataStale ? <View style={styles.previous}>
                <Text style={styles.eyebrow}>ТОЛЬКО ЧТО ЗВУЧАЛО</Text>
                {trackRow(previousTrack, 0)}
              </View> : null}
            </View>
          </View>
          <View style={styles.about}>
            <Ionicons name="radio-outline" size={24} color={colors.primary} />
            <View style={styles.trackCopy}>
              <Text accessibilityRole="header" aria-level={2} style={styles.aboutTitle}>Улетай радио — слушать рок онлайн</Text>
              <Text style={styles.aboutText}>Рок станция (Улетай) — любимая музыка и артисты фестиваля в прямом эфире. Слушай онлайн на телефоне или компьютере, смотри названия песен, обложки и очередь следующих треков. Для прослушивания не нужна регистрация.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.screen, paddingTop: 24, paddingBottom: 36 },
  contentWide: { paddingHorizontal: 40, paddingTop: 36, paddingBottom: 56 },
  inner: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 28 },
  heading: { gap: 10 },
  kicker: { ...appFont('bold'), fontSize: 10, letterSpacing: 1.8, color: colors.primary },
  title: { ...appFont('black'), fontSize: 30, lineHeight: 38, color: colors.text, letterSpacing: -0.8 },
  titleWide: { fontSize: 48, lineHeight: 58, letterSpacing: -1.6 },
  lead: { ...appFont('regular'), fontSize: 14, lineHeight: 22, color: colors.textSecondary, maxWidth: 680 },
  playerCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 24 },
  playerCardWide: { flexDirection: 'row', padding: 28, gap: 36, alignItems: 'center' },
  artworkColumn: { width: '100%', maxWidth: 340, alignSelf: 'center' },
  artworkColumnWide: { width: '36%', maxWidth: 360 },
  artworkColumnCompact: { maxWidth: 240 },
  artworkColumnSmall: { maxWidth: 176 },
  coverLarge: { aspectRatio: 1, width: '100%', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  coverSmall: { width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  record: { width: '70%', aspectRatio: 1, borderRadius: 200, borderColor: colors.borderStrong, borderWidth: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  recordCenter: { width: '40%', aspectRatio: 1, borderRadius: 100, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  coverBrand: { ...appFont('bold'), fontSize: 12, letterSpacing: 2, color: colors.text, marginTop: 20 },
  playerInfo: { flex: 1, minWidth: 0, gap: 20 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.background, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  statusDotMuted: { backgroundColor: colors.textMuted },
  statusText: { ...appFont('bold'), fontSize: 9, letterSpacing: 0.9, color: colors.text },
  stationLabel: { ...appFont('regular'), fontSize: 11, color: colors.textSecondary },
  currentCopy: { gap: 8 },
  eyebrow: { ...appFont('bold'), fontSize: 9, letterSpacing: 1.4, color: colors.textMuted },
  trackTitle: { ...appFont('bold'), fontSize: 26, lineHeight: 34, color: colors.text, letterSpacing: -0.5 },
  trackTitleWide: { fontSize: 36, lineHeight: 44, letterSpacing: -0.8 },
  trackArtist: { ...appFont('regular'), fontSize: 17, lineHeight: 25, color: colors.textSecondary },
  progressBlock: { gap: 8 },
  progressRail: { height: 3, borderRadius: 2, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  caption: { ...appFont('regular'), fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  playButton: { minHeight: 56, flexDirection: 'row', gap: 9, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, flexGrow: 1 },
  playButtonText: { ...appFont('bold'), fontSize: 14, color: colors.primaryText },
  roundAction: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 },
  textButton: { flexDirection: 'row', gap: 7, minHeight: 44, alignItems: 'center' },
  textButtonLabel: { ...appFont('regular'), fontSize: 11, color: colors.textSecondary },
  artistLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 48 },
  artistLinkText: { ...appFont('semiBold'), fontSize: 12, lineHeight: 19, color: colors.text, flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorText: { ...appFont('regular'), fontSize: 12, lineHeight: 18, color: colors.textSecondary, flex: 1 },
  collections: { gap: 28 },
  collectionsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  queueColumn: { flex: 1.4, minWidth: 0, gap: 16 },
  savedColumn: { flex: 1, minWidth: 0, gap: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionHeadingCopy: { flex: 1, gap: 5 },
  sectionTitle: { ...appFont('bold'), fontSize: 21, lineHeight: 29, color: colors.text },
  count: { ...appFont('bold'), fontSize: 20, color: colors.textMuted },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  nextTrack: { backgroundColor: colors.surfaceElevated },
  trackNumber: { ...appFont('regular'), fontSize: 10, color: colors.textMuted, width: 18 },
  trackCopy: { flex: 1, minWidth: 0, gap: 4 },
  nextLabel: { ...appFont('bold'), fontSize: 8, letterSpacing: 0.7, color: colors.primary, marginBottom: 2 },
  rowTitle: { ...appFont('semiBold'), fontSize: 13, lineHeight: 19, color: colors.text },
  rowArtist: { ...appFont('regular'), fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  smallAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  expandButton: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  expandText: { ...appFont('semiBold'), fontSize: 12, color: colors.primary },
  emptyState: { padding: 28, alignItems: 'center', gap: 12 },
  emptyTitle: { ...appFont('semiBold'), fontSize: 15, color: colors.text, textAlign: 'center' },
  emptyText: { ...appFont('regular'), fontSize: 12, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', maxWidth: 290 },
  previous: { gap: 6, paddingTop: 12 },
  about: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 },
  aboutTitle: { ...appFont('semiBold'), fontSize: 14, lineHeight: 22, color: colors.text },
  aboutText: { ...appFont('regular'), fontSize: 12, lineHeight: 21, color: colors.textSecondary, maxWidth: 850 },
});
