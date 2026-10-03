import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { bandFor } from '@/lib/hourLight';
import { colors, fonts, radius, space, type } from '@/theme';

/** Small app mark, used for empty states and the launch screen. */
export function Mark({ size = 24, color = colors.ink }: { size?: number; color?: string }) {
  return <Ionicons name="aperture-outline" size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** "Glimpse", in heavy system type. */
export function Wordmark({ size = 26, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Text accessibilityRole="header" accessibilityLabel="Glimpse" style={{ fontSize: size, lineHeight: size * 1.2, fontWeight: '800', letterSpacing: -1, color }}>
      Glimpse
    </Text>
  );
}

/** A tappable text link (blue, semibold). */
export function Link({ label, onPress, color = colors.stamp, style }: { label: string; onPress: () => void; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text onPress={onPress} accessibilityRole="link" suppressHighlighting style={[{ ...fonts.sansSemi, fontSize: 14, color }, style]}>
      {label}
    </Text>
  );
}

/** Small uppercase label for metadata. */
export function Label({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  return <Text style={[type.label, color ? { color } : null, style]}>{children}</Text>;
}

export function Rule({ style }: { style?: StyleProp<ViewStyle>; strong?: boolean }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.rule }, style]} />;
}

/** A small dot in the color of the light at that hour. */
export function HourSwatch({ localTime, size = 8 }: { localTime: string | null | undefined; size?: number }) {
  const band = bandFor(localTime);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: band.color,
        borderWidth: band.key === 'noon' ? StyleSheet.hairlineWidth * 2 : 0,
        borderColor: colors.faint,
      }}
    />
  );
}

/** Section title with an optional "See all"-style link. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** ink and stamp are both the blue primary button; outline is the gray secondary one. */
  variant?: 'ink' | 'stamp' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'ink', loading, disabled, icon, style, small }: ButtonProps) {
  const primary = variant === 'ink' || variant === 'stamp';
  const bg = primary ? colors.stamp : colors.sunken;
  const fg = primary ? '#FFFFFF' : variant === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Keep: a bookmark button. Filled once the glimpse is in your collection. */
export function Stamp({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.keep, active && styles.keepActive, pressed && { opacity: 0.7 }, style]}
    >
      <Ionicons name={active ? 'bookmark' : 'bookmark-outline'} size={15} color={active ? '#FFFFFF' : colors.ink} />
      <Text style={[styles.keepText, active && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

/** A word chip, as used in city definitions. */
export function Chip({
  label,
  count,
  selected,
  onPress,
  style,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={[styles.chipText, selected && { color: '#FFFFFF' }]}>{label}</Text>
      {count !== undefined ? <Text style={[styles.chipCount, selected && { color: colors.stampSoft }]}>{count}</Text> : null}
    </Pressable>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.body}>{label}</Text>
        {hint ? <Text style={type.small}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.stamp, false: colors.rule }} thumbColor="#FFFFFF" />
    </View>
  );
}

/** Tabs like "For you / Following": bold label, dark underline under the selected one. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, { color: selected ? colors.ink : colors.faint }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A quiet empty state. */
export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Mark size={36} color={colors.faint} />
      <Text style={[type.place, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: 'center', maxWidth: 300 }]}>{body}</Text> : null}
      {children}
    </View>
  );
}

/** A row in a settings-style list. */
export function Row({
  label,
  hint,
  onPress,
  destructive,
  right,
}: {
  label: string;
  hint?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, destructive && { color: colors.danger }]}>{label}</Text>
        {hint ? <Text style={type.small}>{hint}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  sectionTitle: { ...fonts.serif, fontSize: 17, color: colors.ink },
  sectionAction: { ...fonts.sansSemi, fontSize: 14, color: colors.stamp },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm },
  buttonText: { ...fonts.sansSemi, fontSize: 16 },
  keep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sunken,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  keepActive: { backgroundColor: colors.stamp },
  keepText: { ...fonts.sansSemi, fontSize: 13, color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: colors.sunken,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: colors.stamp },
  chipText: { ...fonts.sansMedium, fontSize: 14, color: colors.ink },
  chipCount: { fontSize: 11, color: colors.pencil },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  segmented: { flexDirection: 'row', gap: space.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.rule },
  segment: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -StyleSheet.hairlineWidth },
  segmentSelected: { borderBottomColor: colors.ink },
  segmentText: { ...fonts.sansSemi, fontSize: 15 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
});
