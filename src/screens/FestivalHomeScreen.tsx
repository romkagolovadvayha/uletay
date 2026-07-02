import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownTimer } from '../components/CountdownTimer';
import { LiveArtistCard } from '../components/LiveArtistCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { useAppData } from '../context/DataContext';
import { useStagePrimaryPerformances } from '../hooks/useCurrentLivePerformance';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getFestivalDates, getStageName, parseDateTime } from '../utils/scheduleHelpers';
import { getRemoteImageSource } from '../utils/imageSource';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

type Props = {
  navigation: Navigation;
};

export function FestivalHomeScreen({ navigation }: Props) {
  const { data } = useAppData();
  const now = useNow(1000);
  const stagePrimaries = useStagePrimaryPerformances();

  const festivalStart = useMemo(
    () => parseDateTime(data.festival.startDate, '12:00'),
    [data.festival.startDate],
  );

  const festivalDatesLabel = useMemo(() => {
    const dates = getFestivalDates(data.festival.startDate, data.festival.endDate);
    if (dates.length === 0) {
      return '';
    }
    const first = new Date(`${dates[0]}T12:00:00`);
    const last = new Date(`${dates[dates.length - 1]}T12:00:00`);
    const startDay = first.getDate();
    const endDay = last.getDate();
    const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' })
      .format(first)
      .replace('.', '')
      .toUpperCase();
    return `${startDay}-${endDay} ${month}`;
  }, [data.festival.endDate, data.festival.startDate]);

  const hasAnyLive = stagePrimaries.some((item) => item.status === 'live');
  const sectionTitle = hasAnyLive ? 'СЕЙЧАС НА СЦЕНАХ' : 'СКОРО НА СЦЕНАХ';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
            <Image
              source={getRemoteImageSource(
                data.festival.heroImageUrl,
                require('../../assets/images/hero-crowd.png'),
              )}
              style={styles.heroImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)', colors.overlayStrong]}
              locations={[0, 0.55, 1]}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <View style={styles.logoBlock}>
                <Text style={styles.logoTop}>ФЕСТИВАЛЬ НАСТОЯЩЕЙ МУЗЫКИ</Text>
                <Text style={styles.logoMain}>УЛЕТАЙ</Text>
                <Text style={styles.logoYear}>{data.festival.year}</Text>
                <Text style={styles.logoDates}>{festivalDatesLabel}</Text>
              </View>
              <Text style={styles.location}>{data.festival.location}</Text>
              <Text style={styles.age}>{data.festival.ageRating}</Text>
            </View>
          </View>

        <View style={styles.section}>
          <CountdownTimer targetDate={festivalStart} />
        </View>

        <View style={styles.section}>
          <PrimaryButton
            label="РАСПИСАНИЕ"
            onPress={() => navigation.navigate('ScheduleTab', { screen: 'ScheduleMain' })}
          />
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
    paddingBottom: spacing.xxl,
  },
  hero: {
    minHeight: 310,
    marginBottom: spacing.section,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xxxl,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoTop: {
    ...typography.logoTagline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  logoMain: {
    ...typography.logoMain,
    color: colors.primary,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  logoYear: {
    ...typography.logoYear,
    color: colors.text,
    marginTop: -6,
  },
  logoDates: {
    ...typography.logoDates,
    color: colors.text,
    marginTop: spacing.xs,
  },
  location: {
    ...typography.location,
    color: colors.text,
    marginTop: spacing.sm,
  },
  age: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
  },
  section: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.section,
  },
  liveCardWrap: {
    marginBottom: spacing.sm,
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
