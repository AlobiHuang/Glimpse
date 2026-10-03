import { Platform, Share } from 'react-native';
import type { Photo } from './types';

/**
 * Public web address of the app, used in shared photo links. In the browser we use the
 * current site; on phones, EXPO_PUBLIC_WEB_URL if set, otherwise https://glimpse.place.
 */
function baseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'https://glimpse.place';
}

export function photoUrl(photo: Pick<Photo, 'id'>): string {
  return `${baseUrl()}/photo/${encodeURIComponent(photo.id)}`;
}

/**
 * Opens the share sheet (iPhone/Android, and browsers that support it), or copies the
 * link. Resolves to what happened so the screen can show "Link copied".
 */
export async function sharePhoto(photo: Photo): Promise<'shared' | 'copied' | 'cancelled' | { link: string }> {
  const url = photoUrl(photo);
  const title = photo.placeName ? `A glimpse of ${photo.placeName}` : 'A glimpse from the archive';
  const text = photo.caption ? `“${photo.caption}”` : title;

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text, url });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    try {
      await nav!.clipboard.writeText(url);
      return 'copied';
    } catch {
      // Clipboard can be blocked (e.g. no permission) — hand the link back so it can be shown.
      return { link: url };
    }
  }

  const result = await Share.share(
    Platform.OS === 'ios' ? { url, message: text, title } : { message: `${text}\n${url}`, title },
  );
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
