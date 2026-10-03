import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneFrame } from '@/components/PhoneFrame';
import { SHEET_HOST_ID } from '@/components/Sheet';
import { AppProvider, useApp } from '@/lib/store';
import { colors, navTheme, radius, space, stackHeader } from '@/theme';

function Toast() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 84 }]}>
      <View style={styles.toast}>
        <Text style={styles.toastText}>{toast}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <AppProvider>
          <StatusBar style="dark" />
          <PhoneFrame>
            <>
                <Stack screenOptions={{ ...stackHeader, contentStyle: { backgroundColor: colors.paper } }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="photo/[id]" options={{ title: '' }} />
                  <Stack.Screen name="place/[key]" options={{ title: 'Layers' }} />
                  <Stack.Screen name="city/[name]" options={{ title: '' }} />
                  <Stack.Screen name="mosaic/[city]" options={{ title: 'Your mosaic', presentation: 'modal' }} />
                  <Stack.Screen name="observation/[key]" options={{ title: 'Observation' }} />
                  <Stack.Screen name="rules" options={{ title: 'Community rules', presentation: 'modal' }} />
                  <Stack.Screen name="welcome" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
                </Stack>
                {/* Sheets on the web render here, above the tab bar. */}
                <View nativeID={SHEET_HOST_ID} pointerEvents="box-none" style={StyleSheet.absoluteFill} />
                <Toast />
            </>
          </PhoneFrame>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    maxWidth: 480,
  },
  toastText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, textAlign: 'center', flexShrink: 1 },
});
