import { colors } from '@/theme';

/** Map dots: yours are blue, ones you kept are pink-red; everyone else's take the color of the hour they were taken. */
export const DOT_COLORS = { mine: colors.stamp, kept: colors.kept } as const;
