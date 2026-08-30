import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
};

export function CenteredHorizontalScroll({
  children,
  contentContainerStyle,
  rowStyle,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const fitsWithoutScroll = viewportWidth > 0 && contentWidth > 0 && contentWidth <= viewportWidth;

  return (
    <ScrollView
      horizontal
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={[
        contentContainerStyle,
        fitsWithoutScroll && styles.centered,
      ]}
    >
      <View
        style={[styles.row, rowStyle]}
        onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
      >
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
