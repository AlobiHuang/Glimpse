import { Platform, useWindowDimensions } from 'react-native';

/** Width the app content actually has: the phone frame on a laptop browser, else the window. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web' && width >= 700) return 393;
  return width;
}
