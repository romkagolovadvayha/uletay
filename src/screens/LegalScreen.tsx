import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExternalLink } from '../components/ExternalLink';
import { ScreenTitle } from '../components/ScreenTitle';
import {
  FESTIVAL_CONTACTS_URL,
  FESTIVAL_VK_URL,
  FESTIVAL_WEBSITE,
  LEGAL_OPERATOR,
} from '../constants/legal';
import { LEGAL_SECTIONS, type LegalSection } from '../constants/legalContent';
import { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { openExternalUrl } from '../utils/openExternalUrl';

type Props = NativeStackScreenProps<MoreStackParamList, 'Legal'>;

type ContactRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
};

function ContactRow({ icon, label, value, onPress }: ContactRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.contactTextWrap}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function LegalSectionView({ section }: { section: LegalSection }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
      {section.bullets?.map((item) => (
        <View key={item} style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
      {section.afterBullets?.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export function LegalScreen({ navigation }: Props) {
  const documentSections = LEGAL_SECTIONS.filter((section) => section.id !== 'support');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </Pressable>

        <ScreenTitle style={styles.title}>ПРАВОВАЯ ИНФОРМАЦИЯ</ScreenTitle>

        <Text style={styles.sectionLabel}>Связаться с организатором</Text>
        <View style={styles.section}>
          <ContactRow
            icon="mail-outline"
            label="Email"
            value={LEGAL_OPERATOR.email}
            onPress={() => openExternalUrl(`mailto:${LEGAL_OPERATOR.email}`)}
          />
          {LEGAL_OPERATOR.phones.map((phone, index) => (
            <ContactRow
              key={phone}
              icon="call-outline"
              label="Телефон"
              value={LEGAL_OPERATOR.phoneLabels[index]}
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            />
          ))}
          <ExternalLink href={FESTIVAL_WEBSITE} style={styles.contactLinkWrap}>
            <View style={styles.contactRow}>
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <View style={styles.contactTextWrap}>
                <Text style={styles.contactLabel}>Сайт фестиваля</Text>
                <Text style={styles.contactValue}>uletayfest.ru</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </ExternalLink>
          <ExternalLink href={FESTIVAL_CONTACTS_URL} style={styles.contactLinkWrap}>
            <View style={styles.contactRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
              <View style={styles.contactTextWrap}>
                <Text style={styles.contactLabel}>Страница контактов</Text>
                <Text style={styles.contactValue}>uletayfest.ru/contacty</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </ExternalLink>
          <ExternalLink href={FESTIVAL_VK_URL} style={styles.contactLinkWrap}>
            <View style={styles.contactRow}>
              <Ionicons name="logo-vk" size={20} color={colors.primary} />
              <View style={styles.contactTextWrap}>
                <Text style={styles.contactLabel}>Сообщество VK</Text>
                <Text style={styles.contactValue}>Написать организатору</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </ExternalLink>
        </View>

        <View style={styles.operatorCard}>
          <Text style={styles.operatorTitle}>Организатор</Text>
          <Text style={styles.operatorLine}>{LEGAL_OPERATOR.name}</Text>
          <Text style={styles.operatorLine}>ОГРНИП {LEGAL_OPERATOR.ogrnip}</Text>
          <Text style={styles.operatorLine}>ИНН {LEGAL_OPERATOR.inn}</Text>
          <Text style={styles.operatorLine}>{LEGAL_OPERATOR.address}</Text>
          <Text style={styles.operatorLine}>{LEGAL_OPERATOR.location}</Text>
        </View>

        {documentSections.map((section) => (
          <LegalSectionView key={section.id} section={section} />
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
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sectionTitle,
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  contactLinkWrap: {
    alignSelf: 'stretch',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  contactTextWrap: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 12,
  },
  contactValue: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  operatorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  operatorTitle: {
    ...appFont('bold'),
    color: colors.primary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  operatorLine: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 16,
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
  pressed: {
    opacity: 0.9,
  },
});
