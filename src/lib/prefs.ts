/**
 * Tiny on-device settings (e.g. "has seen the welcome guide").
 * Uses localStorage, which exists on the web and on iOS/Android via expo-sqlite
 * (installed in lib/supabase.ts). Never throws — storage can be unavailable.
 */
const PREFIX = 'glimpse:';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function getFlag(name: string): boolean {
  try {
    return storage()?.getItem(PREFIX + name) === '1';
  } catch {
    return false;
  }
}

export function setFlag(name: string, value: boolean): void {
  try {
    if (value) storage()?.setItem(PREFIX + name, '1');
    else storage()?.removeItem(PREFIX + name);
  } catch {
    // ignore
  }
}

export function getText(name: string): string | null {
  try {
    return storage()?.getItem(PREFIX + name) ?? null;
  } catch {
    return null;
  }
}

export function setText(name: string, value: string): void {
  try {
    storage()?.setItem(PREFIX + name, value);
  } catch {
    // ignore
  }
}
