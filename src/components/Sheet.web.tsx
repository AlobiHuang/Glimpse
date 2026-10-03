import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme';

/** Where web sheets render: a layer above the whole app (tabs included), inside the phone frame. */
export const SHEET_HOST_ID = 'glimpse-sheet-host';

/**
 * A bottom sheet for the web. It's rendered into the sheet host in app/_layout.tsx, so it covers
 * the tab bar and stays inside the preview phone instead of spreading across the browser window.
 */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setHost(document.getElementById(SHEET_HOST_ID)), 0);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;

  const body = (
    <View style={styles.layer}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet}>
          <View style={styles.grip} />
          {children}
        </Pressable>
      </Pressable>
    </View>
  );
  return host ? createPortal(body, host) : body;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto' },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: space.sm,
  },
  grip: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.rule, marginBottom: space.sm },
});
