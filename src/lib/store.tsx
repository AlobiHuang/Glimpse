import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Me } from './types';

type AppState = {
  me: Me | null;
  error: string | null;
  setMe(me: Me): void;
  reloadMe(): Promise<void>;
  /** Bumps whenever the feed should refetch (after posting, deleting, blocking…). */
  feedVersion: number;
  refreshFeed(): void;
  /** Short message shown at the bottom of the screen for a few seconds. */
  toast: string | null;
  notify(message: string): void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedVersion, setFeedVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3000);
  }, []);

  const reloadMe = useCallback(async () => {
    try {
      setMe(await api.getMe());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getMe().then(
      (m) => active && (setMe(m), setError(null)),
      (e) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      me,
      error,
      setMe,
      reloadMe,
      feedVersion,
      refreshFeed: () => setFeedVersion((v) => v + 1),
      toast,
      notify,
    }),
    [me, error, reloadMe, feedVersion, toast, notify],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
