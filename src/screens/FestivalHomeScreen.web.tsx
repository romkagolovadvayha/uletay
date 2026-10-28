import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SemanticHeading } from '../components/SemanticHeading';
import { colors } from '../theme/colors';

export function FestivalHomeScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SemanticHeading level={1} style={styles.message}>
        Сайт закрыт просим прощения
      </SemanticHeading>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: colors.text,
    fontFamily: 'system-ui, sans-serif',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 40,
    textAlign: 'center',
  },
});
