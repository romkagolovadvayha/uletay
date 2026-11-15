import { Platform } from 'react-native';

/** React Native Web forwards dataSet to DOM data attributes. */
export function webControlProps(variant: 'default' | 'navigation' = 'default') {
  return Platform.OS === 'web' ? { dataSet: { uletayControl: variant } } : {};
}
