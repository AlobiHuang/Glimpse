import { DefaultTheme, type Theme } from 'expo-router';

/**
 * Light, open and public: a white canvas, crisp hairlines and one friendly blue, in the
 * spirit of Instagram. The photos bring the color; the interface stays out of the way.
 *
 * (Token names like `paper`, `ink` and `stamp` are kept from an earlier visual direction
 * so screens didn't need renaming: paper = background, ink = text, stamp = accent.)
 */
export const colors = {
  paper: '#FFFFFF', // app background
  print: '#FFFFFF', // cards
  sunken: '#F2F3F5', // inputs, chips, pressed rows, empty mosaic cells
  rule: '#E3E5E8', // hairlines
  ink: '#111418', // text
  pencil: '#5F6670', // secondary text
  faint: '#9AA0A8', // placeholders, inactive
  stamp: '#2F6BFF', // primary actions and links
  stampSoft: '#EAF0FF',
  kept: '#FF3B5C', // your kept glimpses (on the map)
  danger: '#E5484D',
  scrim: 'rgba(17,20,24,0.4)',
  onPhoto: '#FFFFFF',
  sea: '#D3D6D8',
};

/**
 * Text styles by role. Everything uses the system font (SF Pro on Apple devices),
 * varying only weight, like Instagram.
 */
export const fonts = {
  serif: { fontWeight: '700' as const, letterSpacing: -0.4 }, // titles, place names
  serifItalic: { fontWeight: '700' as const }, // emphasis
  mono: { fontWeight: '400' as const }, // small meta text
  monoMedium: { fontWeight: '600' as const }, // labels
  sans: { fontWeight: '400' as const },
  sansMedium: { fontWeight: '500' as const },
  sansSemi: { fontWeight: '600' as const },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { print: 12, sm: 10, md: 12, lg: 16, pill: 999 };

export const type = {
  display: { ...fonts.serif, fontSize: 30, lineHeight: 35, color: colors.ink, letterSpacing: -0.8 },
  title: { ...fonts.serif, fontSize: 22, lineHeight: 27, color: colors.ink },
  place: { ...fonts.sansSemi, fontSize: 16, lineHeight: 21, color: colors.ink },
  body: { ...fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyStrong: { ...fonts.sansSemi, fontSize: 15, lineHeight: 21, color: colors.ink },
  small: { ...fonts.sans, fontSize: 13, lineHeight: 18, color: colors.pencil },
  label: {
    ...fonts.monoMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.faint,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  mono: { ...fonts.mono, fontSize: 12, lineHeight: 17, color: colors.pencil },
  quote: { fontSize: 15, lineHeight: 21, color: colors.ink, fontStyle: 'italic' as const },
};

export const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    card: colors.paper,
    border: colors.rule,
    text: colors.ink,
    primary: colors.stamp,
  },
};

/** Header styling for stack screens: white, bold title, hairline below. */
export const stackHeader = {
  headerStyle: { backgroundColor: colors.paper },
  headerShadowVisible: true,
  headerTintColor: colors.ink,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: colors.ink },
  headerBackButtonDisplayMode: 'minimal' as const,
};
