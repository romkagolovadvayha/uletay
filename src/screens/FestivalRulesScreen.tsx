import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
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
import { typography } from '../theme/typography';
import { openExternalUrl } from '../utils/openExternalUrl';

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
        <PrimaryButton
          label={block.link.label}
          onPress={() => openExternalUrl(block.link!.url)}
          style={styles.linkButton}
        />
      ) : null}
    </View>
  );
}

export function FestivalRulesScreen(_props: Props) {
  const { data } = useAppData();
  const tabs = data.rules;
  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? '');

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs],
  );

  if (!activeTab) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <ScreenTitle style={styles.title}>ПРАВИЛА И БЫТ</ScreenTitle>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Раздел пока не заполнен</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>ПРАВИЛА И БЫТ</ScreenTitle>
      </View>

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
});
