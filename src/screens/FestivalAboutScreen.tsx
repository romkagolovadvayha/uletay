import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenTitle } from '../components/ScreenTitle';
import { ExternalLink } from '../components/ExternalLink';
import { WebFestivalGuide } from '../components/WebFestivalGuide';
import { MotionPressable } from '../components/MotionPressable';
import { FESTIVAL_CONTACTS_URL, FESTIVAL_WEBSITE, LEGAL_OPERATOR } from '../constants/legal';
import { useAppData } from '../context/DataContext';
import type { MoreStackParamList, RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenTitleSpacing } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography, appFont } from '../theme/typography';
import { formatFestivalDateRange, getFestivalDisplayName } from '../utils/festivalContent';

type Props = NativeStackScreenProps<MoreStackParamList, 'FestivalAbout'>;

export function FestivalAboutScreen({ navigation }: Props) {
  const { data } = useAppData();
  const rootNavigation = navigation.getParent<BottomTabNavigationProp<RootTabParamList>>();

  const items = [
    { label: 'О фестивале', value: getFestivalDisplayName(data.festival) },
    { label: 'Даты', value: formatFestivalDateRange(data.festival) },
    { label: 'Локация', value: data.festival.locationShort },
    { label: 'Возраст', value: data.festival.ageRating },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <MotionPressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </MotionPressable>

        <ScreenTitle style={styles.title}>О ФЕСТИВАЛЕ</ScreenTitle>
        <Text style={styles.lead}>
          Приложение {getFestivalDisplayName(data.festival)} помогает следить за
          расписанием, ориентироваться на площадке и быстро находить правила и
          контакты.
        </Text>

        {items.map((item) => (
          <View key={item.label} style={styles.card}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardValue}>{item.value}</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Организатор</Text>
          <Text style={styles.cardValue}>{LEGAL_OPERATOR.name}</Text>
          <Text style={styles.cardMeta}>ОГРНИП {LEGAL_OPERATOR.ogrnip}</Text>
          <Text style={styles.cardMeta}>ИНН {LEGAL_OPERATOR.inn}</Text>
          <Text style={styles.cardMeta}>{LEGAL_OPERATOR.address}</Text>
        </View>

        <WebFestivalGuide
          festival={data.festival}
          variant="full"
          onOpenSchedule={() =>
            rootNavigation?.navigate('ScheduleTab', { screen: 'ScheduleMain' })
          }
          onOpenMap={() => rootNavigation?.navigate('MapTab')}
          onOpenRules={() => navigation.navigate('FestivalRules')}
        />

        <View style={styles.linksSection}>
          <ExternalLink href={FESTIVAL_WEBSITE} style={styles.linkRow}>
            <Text style={styles.linkText}>Официальный сайт фестиваля</Text>
            <Ionicons name="open" size={18} color={colors.primary} />
          </ExternalLink>
          <ExternalLink href={FESTIVAL_CONTACTS_URL} style={styles.linkRow}>
            <Text style={styles.linkText}>Контакты и поддержка</Text>
            <Ionicons name="open" size={18} color={colors.primary} />
          </ExternalLink>
          <MotionPressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Legal')}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>Политика конфиденциальности</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </MotionPressable>
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 48,
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    ...screenTitleSpacing,
  },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    ...appFont('bold'),
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardValue: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  cardMeta: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  linksSection: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 14,
    flex: 1,
    paddingRight: spacing.sm,
  },
});
