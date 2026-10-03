import type { Api, GlimpseQuery } from './index';
import type { CityDefinition, CityPortrait, Me, NearbyPhoto, Note, Photo, Place, WordCount } from '../types';
import { distanceKm } from '../geo';
import { dateKey } from '../prompts';
import { applyPrecision } from '../format';
import { randomHandle } from '../identity';
import { placeKeyOf } from '../places';
import { CITY_COUNTRY, DEMO_ARCHIVE_SIZE, DEMO_CITY_SIZE, GLIMPSES, INCOMING, NOTES, unsplashUrl, type DemoPhoto } from './demoPhotos';

/**
 * In-memory backend used when Supabase isn't configured.
 * Sample glimpses come from Unsplash (free to use — see demoPhotos.ts and DEMO_PHOTO_CREDITS.md).
 * Anything you capture, keep or note here disappears when the app reloads.
 *
 * For prototyping, the archive's total, catalogue numbers and city counts are padded with
 * DEMO_ARCHIVE_SIZE and DEMO_CITY_SIZE (demoPhotos.ts); set both to null to see the true
 * sample counts. The real backend never pads anything.
 */

const DAY = 86_400_000;
const TODAY = dateKey();

/** What's stored. Per-viewer fields (keptByMe, isMine…) are added when read. */
type StoredPhoto = Omit<Photo, 'keptByMe' | 'beenHereByMe' | 'noteCount' | 'isMine'> & { featuredAt: string | null };

// In the demo you're also an editor, so the "Feature on the home screen" control can be tried.
let me: Me = { handle: randomHandle(), acceptedTerms: false, isEditor: true };
// Catalogue numbers continue from the prototype archive size, so the newest sample is No. 38,214.
let nextCatalogNo = DEMO_ARCHIVE_SIZE ? DEMO_ARCHIVE_SIZE.glimpses - GLIMPSES.length + 1 : 1;

function fromDemo(d: DemoPhoto, createdAtMs = Date.now() - d.ago * DAY): StoredPhoto {
  // The sample's editor picks: photos someone wrote a line about, that "you" didn't take.
  const featured = !!d.caption && !d.mine && d.ago > 0;
  return {
    id: d.id,
    catalogNo: 0, // assigned below, oldest first
    imageUrl: unsplashUrl(d.unsplash, d.w, d.h),
    width: d.w,
    height: d.h,
    caption: d.caption,
    placeName: d.place,
    placeKey: placeKeyOf(d.place),
    city: d.city,
    latitude: d.lat,
    longitude: d.lng,
    takenAt: new Date(createdAtMs - 10 * 60_000).toISOString(),
    localTime: d.time,
    camera: d.camera ?? null,
    createdAt: new Date(createdAtMs).toISOString(),
    word: d.word,
    promptKey: d.prompt ? TODAY : null,
    credit: `${d.credit} on Unsplash`,
    visibility: 'archive',
    featured,
    featuredAt: featured ? new Date(createdAtMs + DAY / 2).toISOString() : null,
  };
}

let photos: StoredPhoto[] = GLIMPSES.map((d) => fromDemo(d))
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  .map((p) => ({ ...p, catalogNo: nextCatalogNo++ }));
const incoming = [...INCOMING];

let notes: Note[] = Object.entries(NOTES).flatMap(([photoId, bodies]) =>
  bodies.map((body, j) => ({
    id: `n-${photoId}-${j}`,
    photoId,
    body,
    createdAt: new Date(Date.now() - (j + 1) * 3 * 3600_000).toISOString(),
  })),
);

const myIds = new Set(GLIMPSES.filter((d) => d.mine).map((d) => d.id));
/** photo id → when kept, and your word for the city (if any) */
const kept = new Map<string, { at: number; word: string | null }>(
  GLIMPSES.filter((d) => d.kept).map((d, i) => [
    d.id,
    { at: Date.now() - (i + 1) * DAY, word: typeof d.kept === 'string' ? d.kept : null },
  ]),
);
const beenHere = new Set<string>();
const followedPlaces = new Set<string>(['alfama-lisbon']);
const hiddenIds = new Set<string>();
/** Glimpses you've seen (there's only one viewer in the demo). */
const seen = new Set<string>();
/** A glimpse leaves the fresh slot once this many people have seen it. */
const FRESH_VIEWERS = 50;

const delay = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), 120));
/** Everything you can see: the shared archive plus your own private glimpses. */
const visible = () => photos.filter((p) => !hiddenIds.has(p.id) && (p.visibility === 'archive' || myIds.has(p.id)));
/** Only the shared archive — what every count is made of. */
const shared = () => visible().filter((p) => p.visibility === 'archive');

function view(p: StoredPhoto): Photo {
  const { featuredAt: _featuredAt, ...rest } = p;
  return {
    ...rest,
    keptByMe: kept.has(p.id),
    beenHereByMe: beenHere.has(p.id),
    noteCount: notes.filter((n) => n.photoId === p.id && !hiddenIds.has(n.id)).length,
    isMine: myIds.has(p.id),
  };
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

function matches(p: StoredPhoto, q: GlimpseQuery): boolean {
  if (q.prompt && p.promptKey !== q.prompt) return false;
  if (q.city && p.city !== q.city) return false;
  if (q.placeKey && p.placeKey !== q.placeKey) return false;
  if (q.localHour !== undefined && (!p.localTime || Number(p.localTime.slice(0, 2)) !== q.localHour)) return false;
  const needle = q.q?.trim().toLowerCase();
  if (needle) {
    const hay = `${p.placeName ?? ''} ${p.city ?? ''} ${p.caption ?? ''} ${p.word ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

function placeFrom(key: string): Place | null {
  const list = visible()
    .filter((p) => p.placeKey === key)
    .sort(newestFirst);
  if (list.length === 0) return null;
  const located = list.find((p) => p.latitude !== null) ?? list[0];
  return {
    key,
    name: list[0].placeName ?? 'Somewhere',
    city: list[0].city,
    latitude: located.latitude,
    longitude: located.longitude,
    count: list.length,
    firstAt: list[list.length - 1].takenAt ?? list[list.length - 1].createdAt,
    lastAt: list[0].takenAt ?? list[0].createdAt,
    coverUrl: list[0].imageUrl,
    followedByMe: followedPlaces.has(key),
  };
}

function countWords(words: (string | null | undefined)[], base: [string, number][] = []): WordCount[] {
  const counts = new Map<string, number>(base);
  for (const w of words) {
    if (!w) continue;
    const trimmed = w.trim();
    const existing = [...counts.keys()].find((k) => k.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    counts.set(existing, (counts.get(existing) ?? 0) + 1);
  }
  return [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

/** A city's definition, counted from the shared archive: its glimpses' words plus the words people kept them with. */
function cityDefinition(city: string): CityDefinition | null {
  const list = shared()
    .filter((p) => p.city === city)
    .sort(newestFirst);
  const pad = DEMO_CITY_SIZE?.[city];
  if (list.length === 0 && !pad) return null;
  const keptWords = [...kept.entries()].filter(([id]) => list.some((p) => p.id === id)).map(([, k]) => k.word);
  return {
    city,
    country: CITY_COUNTRY[city] ?? null,
    words: countWords([...list.map((p) => p.word), ...keptWords], pad?.words).slice(0, 12),
    glimpseCount: (pad?.glimpses ?? 0) + list.length,
    // In the demo each sample glimpse stands for one person, and so does each of your keeps.
    definerCount: (pad?.definers ?? 0) + list.length + [...kept.keys()].filter((id) => list.some((p) => p.id === id)).length,
    placeCount: new Set(list.map((p) => p.placeKey).filter(Boolean)).size,
    coverUrls: list.slice(0, 4).map((p) => p.imageUrl),
  };
}

function portraitOf(city: string): CityPortrait | null {
  const list = visible()
    .filter((p) => p.city === city && (myIds.has(p.id) || kept.has(p.id)))
    .map(view)
    .sort(newestFirst);
  if (list.length === 0) return null;
  const myWords = list.map((p) => (p.isMine ? p.word : (kept.get(p.id)?.word ?? null)));
  return {
    city,
    photos: list,
    takenCount: list.filter((p) => p.isMine).length,
    keptCount: list.filter((p) => !p.isMine).length,
    words: countWords(myWords),
    places: [...new Set(list.map((p) => p.placeName).filter((n): n is string => !!n))],
    firstAt: list[list.length - 1].createdAt,
  };
}

export const demoApi: Api = {
  mode: 'demo',

  getMe: () => delay(me),

  acceptTerms: async () => {
    me = { ...me, acceptedTerms: true };
    return delay(me);
  },

  stats: async () => {
    const glimpses = shared().length;
    const places = new Set(shared().map((p) => p.placeKey).filter(Boolean)).size;
    const cities = new Set(shared().map((p) => p.city).filter(Boolean)).size;
    if (!DEMO_ARCHIVE_SIZE) return delay({ glimpses, places, cities });
    // Prototype padding: the pretend archive, plus anything shared during this session.
    return delay({
      glimpses: DEMO_ARCHIVE_SIZE.glimpses + (glimpses - GLIMPSES.length),
      places: DEMO_ARCHIVE_SIZE.places + places,
      cities: DEMO_ARCHIVE_SIZE.cities,
    });
  },

  listGlimpses: async (q = {}) => {
    if (q.fresh && incoming.length) {
      photos = [...photos, { ...fromDemo(incoming.shift()!, Date.now()), catalogNo: nextCatalogNo++ }];
    }
    let list: StoredPhoto[];
    if (q.feed === 'featured') {
      list = shared()
        .filter((p) => p.featuredAt && matches(p, q))
        .sort((a, b) => b.featuredAt!.localeCompare(a.featuredAt!));
    } else if (q.feed === 'fresh') {
      // New to the archive, not Featured, not yours, and not yet seen by enough people.
      // (One viewer in the demo, so the 30-day window the real backend uses is skipped.)
      list = shared()
        .filter((p) => !p.featuredAt && !myIds.has(p.id) && (seen.has(p.id) ? 1 : 0) < FRESH_VIEWERS && matches(p, q))
        .sort(newestFirst);
    } else {
      list = visible()
        .filter((p) => matches(p, q))
        .sort(newestFirst);
    }
    if (q.before) list = list.filter((p) => p.createdAt < q.before!);
    return delay(list.slice(0, q.limit ?? 30).map(view));
  },

  getPhoto: async (id) => {
    const p = visible().find((x) => x.id === id);
    return delay(p ? view(p) : null);
  },

  listMapPhotos: async () => delay(visible().filter((p) => p.latitude !== null).map(view)),

  listNearby: async (latitude, longitude, limit = 20) =>
    delay(
      visible()
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p): NearbyPhoto => ({ ...view(p), distanceKm: distanceKm(latitude, longitude, p.latitude!, p.longitude!) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit),
    ),

  getPlace: async (key) => delay(placeFrom(key)),

  setFollowingPlace: async (key, following) => {
    if (following) followedPlaces.add(key);
    else followedPlaces.delete(key);
    return delay(undefined);
  },

  listFollowedPlaces: async () => delay([...followedPlaces].map(placeFrom).filter((p): p is Place => !!p)),

  listCities: async () => {
    const names = new Set([...Object.keys(DEMO_CITY_SIZE ?? {}), ...shared().map((p) => p.city).filter((c): c is string => !!c)]);
    return delay(
      [...names]
        .map(cityDefinition)
        .filter((c): c is CityDefinition => !!c)
        .sort((a, b) => b.glimpseCount - a.glimpseCount),
    );
  },

  getCity: async (city) => delay(cityDefinition(city)),

  listPlacesInCity: async (city) => {
    const keys = new Set(visible().filter((p) => p.city === city && p.placeKey).map((p) => p.placeKey!));
    return delay(
      [...keys]
        .map(placeFrom)
        .filter((p): p is Place => !!p)
        .sort((a, b) => b.count - a.count),
    );
  },

  listMyCities: async () => {
    const cities = new Set(
      visible()
        .filter((p) => p.city && (myIds.has(p.id) || kept.has(p.id)))
        .map((p) => p.city!),
    );
    return delay(
      [...cities]
        .map(portraitOf)
        .filter((c): c is CityPortrait => !!c)
        .sort((a, b) => b.photos.length - a.photos.length),
    );
  },

  getMyCity: async (city) => delay(portraitOf(city)),

  setFeatured: async (photoId, featured) => {
    if (!me.isEditor) throw new Error('Only editors can feature glimpses.');
    photos = photos.map((p) =>
      p.id === photoId && p.visibility === 'archive' ? { ...p, featured, featuredAt: featured ? new Date().toISOString() : null } : p,
    );
    return delay(undefined);
  },

  recordViews: async (ids) => {
    for (const id of ids) if (!myIds.has(id)) seen.add(id);
    return delay(undefined);
  },

  listMine: async () => delay(visible().filter((p) => myIds.has(p.id)).map(view).sort(newestFirst)),

  listKept: async () =>
    delay(
      visible()
        .filter((p) => kept.has(p.id))
        .sort((a, b) => kept.get(b.id)!.at - kept.get(a.id)!.at)
        .map(view),
    ),

  uploadPhoto: async (input) => {
    const { latitude, longitude } = applyPrecision(input.latitude, input.longitude, input.locationPrecision);
    const placeName = input.locationPrecision === 'hidden' ? null : input.placeName;
    const now = new Date().toISOString();
    const photo: StoredPhoto = {
      id: `local-${Date.now()}`,
      catalogNo: nextCatalogNo++,
      imageUrl: input.localUri,
      width: input.width,
      height: input.height,
      caption: input.caption.trim() || null,
      placeName,
      placeKey: placeKeyOf(placeName),
      city: input.locationPrecision === 'hidden' ? null : input.city,
      latitude,
      longitude,
      takenAt: input.takenAt ?? now,
      localTime: input.localTime,
      camera: input.camera,
      createdAt: now,
      word: input.word?.trim() || null,
      promptKey: input.promptKey,
      visibility: input.visibility,
      featured: false,
      featuredAt: null,
    };
    photos = [...photos, photo];
    myIds.add(photo.id);
    const layerNumber = photo.placeKey ? visible().filter((p) => p.placeKey === photo.placeKey).length : 1;
    const cityGlimpses = photo.city ? (cityDefinition(photo.city)?.glimpseCount ?? 0) : 0;
    return delay({ photo: view(photo), layerNumber, cityGlimpses });
  },

  deletePhoto: async (id) => {
    photos = photos.filter((p) => p.id !== id);
    notes = notes.filter((n) => n.photoId !== id);
    myIds.delete(id);
    kept.delete(id);
    return delay(undefined);
  },

  setKept: async (photoId, value, word) => {
    if (value) kept.set(photoId, { at: Date.now(), word: word?.trim() || kept.get(photoId)?.word || null });
    else kept.delete(photoId);
    return delay(undefined);
  },

  setBeenHere: async (photoId, value) => {
    if (value) beenHere.add(photoId);
    else beenHere.delete(photoId);
    return delay(undefined);
  },

  listNotes: async (photoId) =>
    delay(
      notes
        .filter((n) => n.photoId === photoId && !hiddenIds.has(n.id))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    ),

  addNote: async (photoId, body) => {
    const note: Note = {
      id: `n-local-${Date.now()}`,
      photoId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      isMine: true,
    };
    notes = [...notes, note];
    return delay(note);
  },

  reportPhoto: async () => delay(undefined),
  reportNote: async () => delay(undefined),

  // Demo data has no real accounts, so blocking just hides that one item.
  blockAuthor: async ({ photoId, noteId }) => {
    if (photoId) hiddenIds.add(photoId);
    if (noteId) hiddenIds.add(noteId);
    return delay(undefined);
  },

  unblockAll: async () => {
    hiddenIds.clear();
    return delay(undefined);
  },

  deleteAccount: async () => {
    photos = photos.filter((p) => !myIds.has(p.id));
    notes = notes.filter((n) => !n.isMine);
    myIds.clear();
    kept.clear();
    beenHere.clear();
    followedPlaces.clear();
    me = { handle: randomHandle(), acceptedTerms: false, isEditor: true };
    return delay(undefined);
  },
};
