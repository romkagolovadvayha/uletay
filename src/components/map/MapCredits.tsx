import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mapControlLayout } from '../../theme/map';
import { appFont } from '../../theme/typography';
import { openExternalUrl } from '../../utils/openExternalUrl';

const credits = [
  ['OpenFreeMap', 'https://openfreemap.org/'],
  ['© OpenMapTiles', 'https://openmaptiles.org/'],
  ['© OpenStreetMap', 'https://www.openstreetmap.org/copyright'],
] as const;

export function MapCredits() {
  return <View pointerEvents="box-none" style={styles.wrap}>
    {credits.map(([label, href]) => <Text key={href} accessibilityRole="link" onPress={() => openExternalUrl(href)} style={styles.link}>{label}</Text>)}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: mapControlLayout.attributionBottom, left: 8, right: 8, flexDirection: 'row', justifyContent: 'center', gap: 5, opacity: 0.7 },
  link: { ...appFont('regular'), color: '#D4D4D8', fontSize: 10, lineHeight: mapControlLayout.attributionHeight, textDecorationLine: 'underline', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
