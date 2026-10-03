import { useEffect, useRef, useState, type RefObject } from 'react';
import { Platform } from 'react-native';

type Scrollable = { getScrollableNode?: () => unknown } | null;

export const PULL_THRESHOLD = 70;

/**
 * Pull-to-refresh for the web build. (On iPhone/Android the native
 * RefreshControl already does this.) Works with a trackpad or mouse wheel
 * (keep scrolling up while at the top) and with touch (drag down at the top).
 *
 * Returns how far the user has pulled, in px, so the screen can draw an indicator.
 */
export function useWebPullToRefresh(
  listRef: RefObject<Scrollable>,
  { enabled, refreshing, onRefresh }: { enabled: boolean; refreshing: boolean; onRefresh: () => void },
): number {
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const refreshingRef = useRef(refreshing);
  const onRefreshRef = useRef(onRefresh);
  const cooldownUntil = useRef(0);

  useEffect(() => {
    refreshingRef.current = refreshing;
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const node = listRef.current?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node || typeof node.addEventListener !== 'function') return;

    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let touchStartY: number | null = null;

    const update = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };
    const blocked = () => refreshingRef.current || Date.now() < cooldownUntil.current;
    const trigger = () => {
      update(0);
      // Ignore trackpad momentum for a moment so one gesture = one refresh.
      cooldownUntil.current = Date.now() + 1200;
      onRefreshRef.current();
    };

    const onWheel = (e: WheelEvent) => {
      if (blocked()) return;
      if (node.scrollTop > 0 || e.deltaY >= 0) {
        if (pullRef.current) update(0);
        return;
      }
      const next = Math.min(PULL_THRESHOLD, pullRef.current + -e.deltaY * 0.35);
      clearTimeout(resetTimer);
      if (next >= PULL_THRESHOLD) {
        trigger();
      } else {
        update(next);
        resetTimer = setTimeout(() => update(0), 300);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = node.scrollTop <= 0 && !blocked() ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY === null) return;
      const dy = e.touches[0].clientY - touchStartY;
      update(dy > 0 ? Math.min(PULL_THRESHOLD * 1.3, dy * 0.5) : 0);
    };
    const onTouchEnd = () => {
      if (touchStartY === null) return;
      touchStartY = null;
      if (pullRef.current >= PULL_THRESHOLD) trigger();
      else update(0);
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd);
    return () => {
      clearTimeout(resetTimer);
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, listRef]);

  return pull;
}
