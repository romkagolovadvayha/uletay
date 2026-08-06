import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { FestivalInfo } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { formatFestivalDateRange, getFestivalDisplayName } from '../utils/festivalContent';
import { AppRouteLink } from './AppRouteLink';
import { DeferredIonicons } from './DeferredIonicons';
import { SemanticHeading } from './SemanticHeading';

type Props = {
  festival: FestivalInfo;
  variant?: 'compact' | 'full';
  onOpenSchedule?: () => void;
  onOpenMap?: () => void;
  onOpenRules?: () => void;
};

const QUICK_LINKS = [
  { href: '/schedule', label: 'Расписание', icon: 'calendar-outline', key: 'schedule' },
  { href: '/map', label: 'Карта', icon: 'map-outline', key: 'map' },
  { href: '/rules', label: 'Правила', icon: 'document-text-outline', key: 'rules' },
] as const;

export function WebFestivalGuide({
  festival,
  variant = 'compact',
  onOpenSchedule,
  onOpenMap,
  onOpenRules,
}: Props) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const festivalName = getFestivalDisplayName(festival);
  const dateRange = formatFestivalDateRange(festival);
  const location = festival.locationShort || festival.location;
  const handlers = {
    schedule: onOpenSchedule,
    map: onOpenMap,
    rules: onOpenRules,
  };

  return (
    <View
      style={[
        styles.section,
        variant === 'compact' ? styles.compactSection : styles.fullSection,
      ]}
    >
      <SemanticHeading
        level={2}
        style={[styles.heading, variant === 'compact' && styles.compactHeading]}
      >
        Цифровой гид фестиваля
      </SemanticHeading>
      <Text style={[styles.body, variant === 'compact' && styles.compactBody]}>
        В приложении {festivalName} собраны расписание
        выступлений, карта площадки, автограф-сессии, фудкорт, правила и
        контакты. Даты: {dateRange}. Место: {location}.
      </Text>
      <Text style={[styles.note, variant === 'compact' && styles.compactNote]}>
        Состав участников и время выступлений могут меняться. Перед поездкой
        проверьте раздел «Расписание».
      </Text>

      <View style={styles.links}>
        {QUICK_LINKS.map((item) => (
          <AppRouteLink
            key={item.href}
            href={item.href}
            onPress={handlers[item.key]}
            accessibilityLabel={item.label}
            style={styles.link}
          >
            <View style={styles.linkContent}>
              <DeferredIonicons
                name={item.icon}
                size={22}
                color={colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={styles.linkText}>{item.label}</Text>
            </View>
          </AppRouteLink>
        ))}
      </View>

      {variant === 'full' ? (
        <View style={styles.faq}>
          <SemanticHeading level={2} style={styles.heading}>
            Частые вопросы
          </SemanticHeading>

          <View style={styles.answer}>
            <SemanticHeading level={3} style={styles.question}>
              Когда и где пройдёт {festivalName}?
            </SemanticHeading>
            <Text style={styles.body}>
              Указанные в приложении даты — {dateRange}, место — {location}.
            </Text>
          </View>

          <View style={styles.answer}>
            <SemanticHeading level={3} style={styles.question}>
              Где смотреть актуальное расписание?
            </SemanticHeading>
            <Text style={styles.body}>
              Откройте раздел «Расписание»: там выступления собраны по дням и сценам.
              Если новый сезон ещё не опубликован, приложение покажет доступные данные.
            </Text>
          </View>

          <View style={styles.answer}>
            <SemanticHeading level={3} style={styles.question}>
              Как подготовить приложение к поездке?
            </SemanticHeading>
            <Text style={styles.body}>
              Заранее откройте расписание, карту и правила, чтобы данные успели загрузиться.
              Избранное и настройки хранятся на устройстве.
            </Text>
          </View>

          <View style={styles.answer}>
            <SemanticHeading level={3} style={styles.question}>
              Где проверить правила и контакты?
            </SemanticHeading>
            <Text style={styles.body}>
              Правила посещения опубликованы в разделе «Правила и быт», а сведения об
              организаторе и каналы связи — на этой странице и в правовом разделе.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  compactSection: {
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  fullSection: {
    width: '100%',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  heading: {
    ...typography.screenSubtitle,
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  compactHeading: {
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  compactBody: {
    maxWidth: 820,
    textAlign: 'center',
  },
  note: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  compactNote: {
    maxWidth: 760,
    textAlign: 'center',
  },
  links: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  link: {
    minHeight: 48,
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  linkContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  linkText: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  faq: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  answer: {
    gap: spacing.sm,
  },
  question: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
