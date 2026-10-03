import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { PULL_THRESHOLD } from '@/lib/usePullToRefresh';
import { colors, fonts } from '@/theme';

/** Web-only pull-to-refresh hint (phones use the native RefreshControl). */
export function PullIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
  if (Platform.OS !== 'web') return null;
  const ready = pull >= PULL_THRESHOLD * 0.95;
  return (
    <View style={[styles.wrap, { height: refreshing ? 48 : pull }]}>
      {refreshing ? (
        <ActivityIndicator color={colors.pencil} />
      ) : pull > 12 ? (
        <Text style={[styles.text, { opacity: Math.min(1, pull / PULL_THRESHOLD) }, ready && { color: colors.stamp }]}>
          {ready ? 'Refreshing…' : '↓ Pull to refresh'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { ...fonts.sansSemi, fontSize: 13, color: colors.pencil },
});
