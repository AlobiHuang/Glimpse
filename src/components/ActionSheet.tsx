import { Pressable, StyleSheet, Text } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { colors, fonts, space, type } from '@/theme';

export type SheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/**
 * A list of choices in a bottom sheet. Works the same on iOS, Android and web.
 * Actions are responsible for closing the sheet (so one can open a follow-up step).
 */
export function ActionSheet({ visible, title, message, actions, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      {title ? <Text style={[type.place, styles.center]}>{title}</Text> : null}
      {message ? <Text style={[type.small, styles.center, { marginBottom: space.xs }]}>{message}</Text> : null}
      {actions.map((a) => (
        <Pressable
          key={a.label}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          onPress={a.onPress}
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, a.destructive && { color: colors.danger }]}>{a.label}</Text>
        </Pressable>
      ))}
      <Pressable style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.pressed]} onPress={onClose} accessibilityRole="button">
        <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  action: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.rule,
  },
  cancel: { borderBottomWidth: 0, marginTop: space.xs, backgroundColor: colors.sunken, borderRadius: 12 },
  pressed: { backgroundColor: colors.sunken },
  actionText: { ...fonts.sansMedium, fontSize: 16, color: colors.ink },
  cancelText: { ...fonts.sansSemi, fontSize: 16, color: colors.pencil },
});
