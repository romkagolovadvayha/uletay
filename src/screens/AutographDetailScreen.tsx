import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArtistImage } from '../components/ArtistImage';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { AutographStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatDateLabel, formatTimeRange } from '../utils/scheduleHelpers';

type Props = NativeStackScreenProps<AutographStackParamList, 'AutographDetail'>;

export function AutographDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const { isAutographFavorite, toggleAutographFavorite } = useFavorites();

  const session = useMemo(
    () => data.autographs.find((item) => item.id === route.params.sessionId),
    [data.autographs, route.params.sessionId],
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Сессия не найдена</Text>
      </SafeAreaView>
    );
  }

  const isFavorite = isAutographFavorite(session.id);
  const dateParts = formatDateLabel(session.date).split(',');
  const dateLabel = dateParts.length > 1 ? dateParts.join(',').toUpperCase() : formatDateLabel(session.date).toUpperCase();
  const location = session.location ?? 'ПАЛАТОЧНЫЙ ГОРОДОК';

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <ArtistImage imageUrl={session.imageUrl} artist={session.artist} style={styles.heroImage} variant="hero" />
          <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']} style={styles.heroGradient} />
          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => toggleAutographFavorite(session.id)} hitSlop={12}>
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={colors.star}
              />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <ScreenTitle style={styles.artist}>{session.artist}</ScreenTitle>
          <Text style={styles.label}>АВТОГРАФ-СЕССИЯ</Text>
          <Text style={styles.time}>{formatTimeRange(session.startTime, session.endTime)}</Text>
          <Text style={styles.date}>{dateLabel}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.location}>{location}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => toggleAutographFavorite(session.id)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Text style={styles.addButtonText}>
              {isFavorite ? 'В МОЁМ РАСПИСАНИИ' : 'ДОБАВИТЬ В МОЁ РАСПИСАНИЕ'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  heroWrap: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
  },
  artist: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  time: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  location: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  addButton: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radius.pill,
    paddingVertical: 17,
    alignItems: 'center',
  },
  addButtonText: {
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
