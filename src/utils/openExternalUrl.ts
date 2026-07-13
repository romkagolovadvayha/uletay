import { Linking, Platform } from 'react-native';

export const EXTERNAL_LINK_REL = 'noopener noreferrer nofollow';

export function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  void Linking.openURL(url);
}
