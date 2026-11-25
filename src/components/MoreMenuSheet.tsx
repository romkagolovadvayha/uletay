import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMoreMenu } from '../context/MoreMenuContext';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { useIsTablet } from '../hooks/useIsTablet';
import { useHeadlinersInMoreTab, useMainTabContentFlags } from '../navigation/mainTabRoutes';
import { openAutographsMain, openHeadlinersMain } from '../navigation/scheduleNavigation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { appFont } from '../theme/typography';
import { DeferredIonicons } from './DeferredIonicons';
import { MotionPressable } from './MotionPressable';
import { LiquidDialog } from './LiquidDialog';
type MenuItem = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };
export function MoreMenuSheet() {
  const isTablet = useIsTablet();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { visible, close } = useMoreMenu();
  const { data } = useAppData();
  const festivalActive = useFestivalActive();
  const headlinersInMore = useHeadlinersInMoreTab();
  const content = useMainTabContentFlags();
  if (isTablet) return null;
  const menuItems: MenuItem[] = [
    {icon:'game-controller-outline',label:'Знаток Улетай',onPress:()=>{close();navigation.navigate('MoreTab',{screen:'UletayQuiz'});}},
    {icon:'sparkles-outline',label:'Кого ждём?',onPress:()=>{close();navigation.navigate('MoreTab',{screen:'ArtistWishes'});}},
    {icon:'map-outline',label:'Карта фестиваля',onPress:()=>{close();navigation.navigate('MapTab');}},
    {icon:'heart-outline',label:'Моё избранное',onPress:()=>{close();navigation.navigate('FavoritesTab');}},
    ...(headlinersInMore
      ? [
          {
            icon: 'people-outline' as const,
            label: 'Хэдлайнеры',
            onPress: () => {
              close();
              openHeadlinersMain(navigation);
            },
          },
        ]
      : []),
    ...(festivalActive && content.hasAutographs
      ? [
          {
            icon: 'ticket' as const,
            label: 'Автографы',
            onPress: () => {
              close();
              openAutographsMain(navigation);
            },
          },
        ]
      : []),
    ...(festivalActive && data.festival.startDate && data.festival.endDate
      ? [{
          icon: 'restaurant' as const,
          label: 'Еда и напитки',
          onPress: () => {
            close();
            navigation.navigate('MoreTab', { screen: 'FoodCourtMain' });
          },
        }]
      : []),
    {
      icon: 'settings',
      label: 'Настройки',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'Settings' });
      },
    },
    {
      icon: 'document-text',
      label: 'Правила и быт',
      onPress: () => {
        close();
        navigation.navigate('MoreTab', { screen: 'FestivalRules' });
      },
    },
    {
      icon: 'medical',
      label: 'Экстренная помощь',
      onPress: () => {
        close();
        navigation.navigate('HelpTab');
      },
    },
  ];

  return (
    <LiquidDialog open={visible} onClose={close} title="Ещё" variant="sheet">
      <View style={styles.webGroup}>
        {menuItems.map((item, index) => <MotionPressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label}
          onPress={item.onPress} style={[styles.webRow, index < menuItems.length - 1 && styles.webRowSeparator]}>
          <DeferredIonicons name={item.icon} size={22} color={colors.text} />
          <Text style={styles.webLabel}>{item.label}</Text>
          <DeferredIonicons name="chevron-forward" size={16} color={colors.textMuted} />
        </MotionPressable>)}
      </View>
    </LiquidDialog>
  );
}
const styles = StyleSheet.create({
  webGroup: { backgroundColor: 'rgba(255,255,255,.055)', borderRadius: 22, overflow: 'hidden' },
  webRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingHorizontal: 16, paddingVertical: 14 },
  webRowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.09)' },
  webLabel: { ...appFont('medium'), flex: 1, fontSize: 17, lineHeight: 22, color: colors.text },
});
