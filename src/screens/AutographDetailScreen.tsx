import { NavigationProp } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HEADLINER_TOP_TRACKS_PREVIEW,
  HeadlinerTeaserCard,
  HeadlinerTopTracksPreview,
} from '../components/HeadlinerTeaserCard';
import { AutographHeroCard } from '../components/LiveArtistCard';
import { SectionHeader } from '../components/SectionHeader';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { openHeadlinerDetail } from '../navigation/scheduleNavigation';
import { AutographStackParamList, RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getHeadlinerById } from '../utils/headlinersCore';
import { resolveHeadlinerLastFm } from '../utils/headlinerGroups';
import {
  getEndDateTime,
  getTimedStatus,
  isStartingSoon,
  parseDateTime,
} from '../utils/scheduleHelpers';

type Props = NativeStackScreenProps<AutographStackParamList, 'AutographDetail'>;

export function AutographDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const now = useNow();
  const { isAutographFavorite, toggleAutographFavorite } = useFavorites();

  const session = useMemo(
    () => data.autographs.find((item) => item.id === route.params.sessionId),
    [data.autographs, route.params.sessionId],
  );

  const headliner = useMemo(
    () => (session ? getHeadlinerById(data.headliners, session.headlinerId) : undefined),
    [data.headliners, session],
  );

  const lastfm = useMemo(
    () => (headliner ? resolveHeadlinerLastFm(headliner, data.headliners) : undefined),
    [data.headliners, headliner],
  );

  const topTracks = useMemo(
    () => (lastfm?.topTracks ?? []).slice(0, HEADLINER_TOP_TRACKS_PREVIEW),
    [lastfm],
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Сессия не найдена</Text>
      </SafeAreaView>
    );
  }

  const start = parseDateTime(session.date, session.startTime);
  const end = getEndDateTime(session.date, session.startTime, session.endTime);
  const status = getTimedStatus(start, end, now);
  const isSoon = status === 'upcoming' && isStartingSoon(session.date, session.startTime, now);
  const headerTitle =
    status === 'live' ? 'СЕЙЧАС ИДЁТ' : isSoon ? 'СКОРО НАЧНЁТСЯ' : 'АВТОГРАФ-СЕССИЯ';
  const isFavorite = isAutographFavorite(session.id);

  const openHeadliner = () => {
    if (!headliner) {
      return;
    }
    const rootNavigation = navigation.getParent() as NavigationProp<RootTabParamList> | undefined;
    if (!rootNavigation) {
      return;
    }
    openHeadlinerDetail(rootNavigation, headliner.id);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          accessibilityHint="Вернуться к списку автограф-сессий"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? 'Убрать автограф-сессию из избранного'
              : 'Добавить автограф-сессию в избранное'
          }
          accessibilityState={{ selected: isFavorite }}
          onPress={() => toggleAutographFavorite(session.id)}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={22} color={colors.star} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title={headerTitle} style={styles.header} />
        <AutographHeroCard session={session} now={now} />

        <View style={styles.buttonWrap}>
          {headliner ? (
            <HeadlinerTeaserCard
              headliner={headliner}
              allHeadliners={data.headliners}
              onPress={openHeadliner}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            onPress={() => toggleAutographFavorite(session.id)}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
          >
            <Text style={styles.favoriteButtonText}>
              {isFavorite ? 'В МОЁМ РАСПИСАНИИ' : 'ДОБАВИТЬ В МОЁ РАСПИСАНИЕ'}
            </Text>
          </Pressable>
        </View>

        {headliner && topTracks.length ? (
          <HeadlinerTopTracksPreview
            headliner={headliner}
            tracks={topTracks}
            onOpenHeadliner={openHeadliner}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  header: {},
  buttonWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  favoriteButton: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  favoriteButtonText: {
    ...typography.button,
    color: colors.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.9,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
});
