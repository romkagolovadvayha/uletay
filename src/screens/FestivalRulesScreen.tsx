import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from '../components/ExternalLink';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RulesTabBar } from '../components/RulesTabBar';
import { ScreenTitle } from '../components/ScreenTitle';
import { useAppData } from '../context/DataContext';
import { MoreStackParamList } from '../navigation/types';
import { FestivalRulesBlock } from '../types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

type Props = NativeStackScreenProps<MoreStackParamList, 'FestivalRules'>;

function RulesBlockView({ block }: { block: FestivalRulesBlock }) {
  return (
    <View style={[styles.block, block.important && styles.blockImportant]}>
      {block.title ? <Text style={styles.blockTitle}>{block.title}</Text> : null}
      {block.paragraphs?.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
      {block.items?.map((item) => (
        <View key={item} style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
      {block.link ? (
        <ExternalLink
          href={block.link.url}
          accessibilityLabel={block.link.label}
          style={styles.linkButton}
        >
          <Text style={styles.linkButtonLabel}>{block.link.label}</Text>
        </ExternalLink>
      ) : null}
    </View>
  );
}

export function FestivalRulesScreen({ navigation }: Props) {
  const { data } = useAppData();
  const tabs = data.rules;
  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? '');

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs],
  );

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад"
        accessibilityHint="Вернуться в раздел «Ещё»"
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        <Text style={styles.backLabel}>Назад</Text>
      </Pressable>
      <ScreenTitle style={styles.title}>ПРАВИЛА И БЫТ</ScreenTitle>
    </View>
  );

  if (!activeTab) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Раздел пока не заполнен</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}

      <View style={styles.tabsWrap}>
        <RulesTabBar tabs={tabs} selectedId={activeTab.id} onSelect={setSelectedTabId} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab.blocks.map((block, index) => (
          <RulesBlockView key={`${activeTab.id}-${index}`} block={block} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: screenHeaderStyle,
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  tabsWrap: {
    paddingHorizontal: spacing.screen,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  blockImportant: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  blockTitle: {
    ...appFont('bold'),
    color: colors.primary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  paragraph: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  bullet: {
    ...typography.body,
    color: colors.primary,
    fontSize: 16,
    lineHeight: 21,
    marginTop: -1,
  },
  listText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 17,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  linkButtonLabel: {
    ...typography.button,
    color: colors.primaryText,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
  },
});
