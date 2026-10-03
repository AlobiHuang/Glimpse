import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Small, quiet motion that makes the archive feel alive: things rise into place as they
 * appear, buttons spring when you use them, and numbers count up. Every animation is short
 * and runs once; nothing loops forever except the map's location pulse.
 */
const NATIVE = Platform.OS !== 'web';

/** Fades and lifts its children into place when they first appear. */
export function Rise({ children, delay = 0, distance = 16, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE });
    a.start();
    return () => a.stop();
  }, [v, delay]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }, { scale }] }]}>{children}</Animated.View>;
}

/** An icon button that squeezes when pressed and springs when it turns on (Keep, Been here). */
export function Springy({ active, children, ...rest }: PressableProps & { active?: boolean; children: ReactNode }) {
  const [s] = useState(() => new Animated.Value(1));
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current) {
      s.setValue(0.55);
      Animated.spring(s, { toValue: 1, friction: 3.2, tension: 240, useNativeDriver: NATIVE }).start();
    }
    was.current = active;
  }, [active, s]);
  const to = (toValue: number) => Animated.spring(s, { toValue, friction: 5, tension: 300, useNativeDriver: NATIVE }).start();
  return (
    <Pressable onPressIn={() => to(0.82)} onPressOut={() => to(1)} {...rest}>
      <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>
    </Pressable>
  );
}

/** A number that counts up to its value (eased), e.g. the size of the archive. */
export function CountUp({ value, duration = 1400, style }: { value: number; duration?: number; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <Text style={style}>{shown.toLocaleString('en-US')}</Text>;
}

/** On the web, let background colors glide instead of jumping (the Now screen's sky). */
export const glide: ViewStyle = Platform.OS === 'web' ? ({ transitionProperty: 'background-color, border-color, transform', transitionDuration: '600ms', transitionTimingFunction: 'ease' } as ViewStyle) : {};
