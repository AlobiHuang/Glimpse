import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/theme';

// iPhone 15 / 16 Pro screen size in points.
const PHONE = { width: 393, height: 852 };
const STATUS_BAR = 54;
const HOME_BAR = 34;

/**
 * Web preview only: on a laptop-sized browser window, shows the app inside an
 * iPhone-shaped frame so you can judge the design at real phone size.
 * On phones (and in the native app) it renders the app unchanged.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 700) return <>{children}</>;

  // Shrink the whole phone to fit short laptop screens.
  const scale = Math.min(1, (height - 48) / (PHONE.height + 24));

  return (
    <View style={styles.page}>
      <View style={[styles.device, { transform: [{ scale }] }]}>
        <View style={styles.screen}>
          <View style={styles.statusBar}>
            <Text style={styles.time}>9:41</Text>
            <View style={styles.island} />
            <View style={styles.statusIcons}>
              {/* Cellular: four bars of rising height */}
              <View style={styles.signal}>
                {[4, 6.5, 9, 11.5].map((h) => (
                  <View key={h} style={[styles.bar, { height: h }]} />
                ))}
              </View>
              <Ionicons name="wifi" size={16} color={colors.ink} style={{ marginTop: -1 }} />
              {/* Battery: outlined body, fill, and the small cap on the right */}
              <View style={styles.batteryWrap}>
                <View style={styles.battery}>
                  <View style={styles.batteryFill} />
                </View>
                <View style={styles.batteryCap} />
              </View>
            </View>
          </View>
          <View style={styles.app}>{children}</View>
          <View style={styles.homeBar}>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EBEF',
  },
  device: {
    width: PHONE.width + 24,
    height: PHONE.height + 24,
    padding: 12,
    borderRadius: 64,
    backgroundColor: '#1B1C1F',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  screen: {
    flex: 1,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  statusBar: {
    height: STATUS_BAR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    backgroundColor: colors.paper,
  },
  time: { fontSize: 16, fontWeight: '600', color: colors.ink, width: 78, paddingLeft: 10 },
  island: { width: 122, height: 35, borderRadius: 18, backgroundColor: '#000' },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 78, justifyContent: 'flex-end' },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 12 },
  bar: { width: 3, borderRadius: 1, backgroundColor: colors.ink },
  batteryWrap: { flexDirection: 'row', alignItems: 'center' },
  battery: {
    width: 25,
    height: 12.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(26,24,20,0.4)',
    padding: 1.5,
  },
  batteryFill: { width: '78%', height: '100%', borderRadius: 2, backgroundColor: colors.ink },
  batteryCap: { width: 1.5, height: 4.5, marginLeft: 1, borderTopRightRadius: 1, borderBottomRightRadius: 1, backgroundColor: 'rgba(26,24,20,0.4)' },
  // The transform makes this the containing block for sheets (position: fixed) on the web,
  // so they open inside the phone rather than across the whole browser window.
  app: { flex: 1, overflow: 'hidden', transform: [{ translateX: 0 }] },
  homeBar: { height: HOME_BAR, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  homeIndicator: { width: 134, height: 5, borderRadius: 3, backgroundColor: colors.ink },
});
