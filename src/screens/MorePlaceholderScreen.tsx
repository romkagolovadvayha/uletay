import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMoreMenu } from '../context/MoreMenuContext';
import { useIsTablet } from '../hooks/useIsTablet';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';

/**
 * Host route for the More stack. On phone the menu is a sheet, so landing here
 * (deep link / accidental navigate) opens the sheet and leaves to Home.
 */
export function MorePlaceholderScreen() {
  const navigation = useNavigation();
  const isTablet = useIsTablet();
  const { open } = useMoreMenu();

  useFocusEffect(
    useCallback(() => {
      const root = (navigation.getParent() ?? navigation) as NavigationProp<RootTabParamList>;

      if (!isTablet) {
        open();
      }

      root.navigate('HomeTab');
    }, [isTablet, navigation, open]),
  );

  return <View style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
