import type { Api, GlimpseQuery } from './index';
import type { CityDefinition, CityPortrait, Me, NearbyPhoto, Note, Photo, Place, WordCount } from '../types';
import { distanceKm } from '../geo';
import { applyPrecision } from '../format';
import { randomHandle } from '../identity';
import { placeKeyOf } from '../places';
import { PHOTO_BUCKET, supabase } from '../supabase';

/**
 * Supabase backend. Everyone signs in anonymously (no email, no password).
 * The app only reads through the public views in supabase/schema.sql, which never
 * expose who took a glimpse, who kept it, or who wrote a note.
 */

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

let sessionPromise: Promise<string> | null = null;

/** Signs in anonymously once per device and makes sure a profile row exists. Returns the user id. */
function ensureSession(): Promise<string> {
  sessionPromise ??= (async () => {
    const sb = client();
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      ({ data } = await sb.auth.getSession());
    }
    const userId = data.session!.user.id;

    const { data: profile } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await sb.from('profiles').insert({ id: userId, handle: randomHandle() });
        if (!error) break;
        if (error.code !== '23505') throw error; // 23505 = handle already taken, try another
      }
    }
    return userId;
  })().catch((e) => {
    sessionPromise = null;
    throw e;
  });
  return sessionPromise;
}

type PhotoRow = {
  id: string;
  catalog_no: number;
  image_path: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  place_name: string | null;
  place_key: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  local_time: string | null;
  camera: string | null;
  created_at: string;
  word: string | null;
  prompt_key: string | null;
  note_count: number;
  is_mine: boolean;
  kept_by_me: boolean;
  been_here_by_me: boolean;
  visibility: 'private' | 'archive';
  featured: boolean;
};

type PlaceRow = {
  place_key: string;
  name: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
  first_at: string;
  last_at: string;
  cover_path: string;
  followed_by_me: boolean;
};

const PHOTO_COLUMNS =
  'id, catalog_no, image_path, width, height, caption, place_name, place_key, city, latitude, longitude, taken_at, local_time, camera, created_at, word, prompt_key, note_count, is_mine, kept_by_me, been_here_by_me, visibility, featured';
const PLACE_COLUMNS = 'place_key, name, city, latitude, longitude, count, first_at, last_at, cover_path, followed_by_me';

const publicUrl = (path: string) => client().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    catalogNo: row.catalog_no,
    imageUrl: publicUrl(row.image_path),
    width: row.width,
    height: row.height,
    caption: row.caption,
    placeName: row.place_name,
    placeKey: row.place_key,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    takenAt: row.taken_at,
    localTime: row.local_time,
    camera: row.camera,
    createdAt: row.created_at,
    word: row.word,
    noteCount: row.note_count,
    keptByMe: row.kept_by_me,
    beenHereByMe: row.been_here_by_me,
    promptKey: row.prompt_key,
    isMine: row.is_mine,
    visibility: row.visibility,
    featured: row.featured,
  };
}

function toPlace(row: PlaceRow): Place {
  return {
    key: row.place_key,
    name: row.name,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    count: row.count,
    firstAt: row.first_at,
    lastAt: row.last_at,
    coverUrl: publicUrl(row.cover_path),
    followedByMe: row.followed_by_me,
  };
}

/** Strip characters that have meaning in PostgREST filters. */
const clean = (s: string) => s.replace(/[,()%*\\."]/g, ' ').trim();

async function getMe(): Promise<Me> {
  const userId = await ensureSession();
  const sb = client();
  const [profile, editor] = await Promise.all([
    sb.from('profiles').select('handle, accepted_terms_at').eq('id', userId).single(),
    sb.from('editors').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  return { handle: profile.data.handle, acceptedTerms: !!profile.data.accepted_terms_at, isEditor: !!editor.data };
}

async function listGlimpses({ before, limit = 30, q, prompt, city, placeKey, localHour, feed }: GlimpseQuery = {}): Promise<Photo[]> {
  await ensureSession();
  // Featured: newest pick first. Fresh: a view of new, little-seen glimpses (see schema.sql).
  const source = feed === 'fresh' ? 'fresh_photos' : 'archive_photos';
  const orderBy = feed === 'featured' ? 'featured_at' : 'created_at';
  let query = client().from(source).select(PHOTO_COLUMNS).order(orderBy, { ascending: false }).limit(limit);
  if (feed === 'featured') query = query.eq('featured', true);
  if (before) query = query.lt(orderBy, before);
  if (prompt) query = query.eq('prompt_key', prompt);
  if (city) query = query.eq('city', city);
  if (placeKey) query = query.eq('place_key', placeKey);
  if (localHour !== undefined) query = query.eq('local_hour', localHour);
  const needle = q ? clean(q) : '';
  if (needle) query = query.or(`place_name.ilike.%${needle}%,caption.ilike.%${needle}%,city.ilike.%${needle}%,word.ilike.%${needle}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data as PhotoRow[]).map(toPhoto);
}

async function cityDefinition(city: string): Promise<CityDefinition | null> {
  const sb = client();
  const [stats, words, covers] = await Promise.all([
    sb.from('city_stats').select('city, glimpse_count, place_count, definer_count').eq('city', city).maybeSingle(),
    sb.from('city_words').select('word, count').eq('city', city).order('count', { ascending: false }).limit(12),
    sb.from('archive_photos').select('image_path').eq('city', city).order('created_at', { ascending: false }).limit(4),
  ]);
  if (stats.error) throw stats.error;
  if (!stats.data) return null;
  return {
    city,
    country: null,
    words: (words.data ?? []) as WordCount[],
    glimpseCount: stats.data.glimpse_count,
    definerCount: stats.data.definer_count,
    placeCount: stats.data.place_count,
    coverUrls: (covers.data ?? []).map((r) => publicUrl(r.image_path as string)),
  };
}

/** Your glimpses and kept glimpses, with the word you used for each. */
async function collected(): Promise<{ photo: Photo; word: string | null }[]> {
  const userId = await ensureSession();
  const sb = client();
  const [rows, keeps] = await Promise.all([
    sb.from('archive_photos').select(PHOTO_COLUMNS).or('is_mine.eq.true,kept_by_me.eq.true').order('created_at', { ascending: false }).limit(1000),
    sb.from('keeps').select('photo_id, word').eq('user_id', userId),
  ]);
  if (rows.error) throw rows.error;
  const keptWords = new Map((keeps.data ?? []).map((k) => [k.photo_id as string, (k.word as string | null) ?? null]));
  return (rows.data as PhotoRow[]).map(toPhoto).map((photo) => ({ photo, word: photo.isMine ? photo.word : (keptWords.get(photo.id) ?? null) }));
}

function portraitOf(city: string, items: { photo: Photo; word: string | null }[]): CityPortrait | null {
  const list = items.filter((i) => i.photo.city === city);
  if (!list.length) return null;
  const counts = new Map<string, number>();
  for (const { word } of list) if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
  return {
    city,
    photos: list.map((i) => i.photo),
    takenCount: list.filter((i) => i.photo.isMine).length,
    keptCount: list.filter((i) => !i.photo.isMine).length,
    words: [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count),
    places: [...new Set(list.map((i) => i.photo.placeName).filter((n): n is string => !!n))],
    firstAt: list[list.length - 1].photo.createdAt,
  };
}

export const supabaseApi: Api = {
  mode: 'supabase',

  getMe,

  acceptTerms: async () => {
    const userId = await ensureSession();
    const { error } = await client().from('profiles').update({ accepted_terms_at: new Date().toISOString() }).eq('id', userId);
    if (error) throw error;
    return getMe();
  },

  stats: async () => {
    await ensureSession();
    const { data, error } = await client().from('archive_stats').select('glimpses, places, cities').single();
    if (error) throw error;
    return data;
  },

  listGlimpses,

  getPhoto: async (id) => {
    await ensureSession();
    const { data, error } = await client().from('archive_photos').select(PHOTO_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPhoto(data as PhotoRow) : null;
  },

  listMapPhotos: async () => {
    await ensureSession();
    const { data, error } = await client()
      .from('archive_photos')
      .select(PHOTO_COLUMNS)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data as PhotoRow[]).map(toPhoto);
  },

  listNearby: async (latitude, longitude, limit = 20) => {
    await ensureSession();
    // Look in a growing box around you until there are enough glimpses, then sort by real distance.
    for (const deg of [0.1, 0.5, 2, 10, 180]) {
      const { data, error } = await client()
        .from('archive_photos')
        .select(PHOTO_COLUMNS)
        .gte('latitude', latitude - deg)
        .lte('latitude', latitude + deg)
        .gte('longitude', longitude - deg * 1.5)
        .lte('longitude', longitude + deg * 1.5)
        .limit(200);
      if (error) throw error;
      if ((data?.length ?? 0) >= limit || deg === 180) {
        return (data as PhotoRow[])
          .map(toPhoto)
          .map((p): NearbyPhoto => ({ ...p, distanceKm: distanceKm(latitude, longitude, p.latitude!, p.longitude!) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, limit);
      }
    }
    return [];
  },

  getPlace: async (key) => {
    await ensureSession();
    const { data, error } = await client().from('places').select(PLACE_COLUMNS).eq('place_key', key).maybeSingle();
    if (error) throw error;
    return data ? toPlace(data as PlaceRow) : null;
  },

  setFollowingPlace: async (key, following) => {
    const userId = await ensureSession();
    const sb = client();
    const { error } = following
      ? await sb.from('place_follows').upsert({ place_key: key }, { onConflict: 'place_key,user_id', ignoreDuplicates: true })
      : await sb.from('place_follows').delete().eq('place_key', key).eq('user_id', userId);
    if (error) throw error;
  },

  listFollowedPlaces: async () => {
    await ensureSession();
    const { data, error } = await client().from('places').select(PLACE_COLUMNS).eq('followed_by_me', true).order('last_at', { ascending: false });
    if (error) throw error;
    return (data as PlaceRow[]).map(toPlace);
  },

  listCities: async () => {
    await ensureSession();
    const { data, error } = await client().from('city_stats').select('city').order('glimpse_count', { ascending: false }).limit(40);
    if (error) throw error;
    const defs = await Promise.all((data ?? []).map((r) => cityDefinition(r.city as string)));
    return defs.filter((d): d is CityDefinition => !!d);
  },

  getCity: async (city) => {
    await ensureSession();
    return cityDefinition(city);
  },

  listPlacesInCity: async (city) => {
    await ensureSession();
    const { data, error } = await client().from('places').select(PLACE_COLUMNS).eq('city', city).order('count', { ascending: false }).limit(30);
    if (error) throw error;
    return (data as PlaceRow[]).map(toPlace);
  },

  listMyCities: async () => {
    const items = await collected();
    const cities = [...new Set(items.map((i) => i.photo.city).filter((c): c is string => !!c))];
    return cities
      .map((c) => portraitOf(c, items))
      .filter((p): p is CityPortrait => !!p)
      .sort((a, b) => b.photos.length - a.photos.length);
  },

  getMyCity: async (city) => portraitOf(city, await collected()),

  listMine: async () => {
    await ensureSession();
    const { data, error } = await client().from('archive_photos').select(PHOTO_COLUMNS).eq('is_mine', true).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PhotoRow[]).map(toPhoto);
  },

  listKept: async () => {
    const userId = await ensureSession();
    const sb = client();
    const { data: keeps, error } = await sb.from('keeps').select('photo_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    const ids = (keeps ?? []).map((k) => k.photo_id as string);
    if (!ids.length) return [];
    const { data, error: readError } = await sb.from('archive_photos').select(PHOTO_COLUMNS).in('id', ids);
    if (readError) throw readError;
    const byId = new Map((data as PhotoRow[]).map((r) => [r.id, toPhoto(r)]));
    return ids.map((id) => byId.get(id)).filter((p): p is Photo => !!p);
  },

  uploadPhoto: async (input) => {
    const userId = await ensureSession();
    const sb = client();

    // 1. Upload the image file to Storage under the user's own folder.
    const ext = input.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const bytes = await (await fetch(input.localUri)).arrayBuffer();
    const upload = await sb.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: input.mimeType });
    if (upload.error) throw upload.error;

    // 2. Save the record. Location is blurred or removed on the phone, before it's sent.
    const hidden = input.locationPrecision === 'hidden';
    const { latitude, longitude } = applyPrecision(input.latitude, input.longitude, input.locationPrecision);
    const placeName = hidden ? null : input.placeName?.trim() || null;
    const { data, error } = await sb
      .from('photos')
      .insert({
        image_path: path,
        width: input.width,
        height: input.height,
        caption: input.caption.trim() || null,
        place_name: placeName,
        place_key: placeKeyOf(placeName),
        city: hidden ? null : input.city?.trim() || null,
        latitude,
        longitude,
        taken_at: input.takenAt,
        local_time: input.localTime,
        camera: input.camera,
        word: input.word?.trim().toLowerCase() || null,
        prompt_key: input.promptKey,
        // From the phone's photo checks: who can see it, what the checks found, and its hash.
        visibility: input.visibility,
        quality: input.quality,
        image_hash: input.imageHash,
      })
      .select('id')
      .single();
    if (error) {
      await sb.storage.from(PHOTO_BUCKET).remove([path]);
      throw error;
    }

    const photo = await supabaseApi.getPhoto(data.id);
    if (!photo) throw new Error('Your glimpse was saved but could not be loaded.');
    const [layers, city] = await Promise.all([
      photo.placeKey ? sb.from('archive_photos').select('id', { count: 'exact', head: true }).eq('place_key', photo.placeKey) : null,
      photo.city ? sb.from('city_stats').select('glimpse_count').eq('city', photo.city).maybeSingle() : null,
    ]);
    return { photo, layerNumber: layers?.count ?? 1, cityGlimpses: (city?.data?.glimpse_count as number | undefined) ?? 0 };
  },

  setFeatured: async (photoId, featured) => {
    await ensureSession();
    const { error } = await client().rpc('feature_photo', { target: photoId, featured });
    if (error) throw error;
  },

  recordViews: async (photoIds) => {
    if (!photoIds.length) return;
    await ensureSession();
    const { error } = await client().rpc('record_views', { ids: photoIds.slice(0, 50) });
    if (error) throw error;
  },

  deletePhoto: async (id) => {
    await ensureSession();
    const sb = client();
    const { data, error } = await sb.from('photos').delete().eq('id', id).select('image_path').single();
    if (error) throw error;
    await sb.storage.from(PHOTO_BUCKET).remove([data.image_path]);
  },

  setKept: async (photoId, kept, word) => {
    const userId = await ensureSession();
    const sb = client();
    const { error } = kept
      ? await sb.from('keeps').upsert({ photo_id: photoId, word: word?.trim().toLowerCase() || null }, { onConflict: 'photo_id,user_id' })
      : await sb.from('keeps').delete().eq('photo_id', photoId).eq('user_id', userId);
    if (error) throw error;
  },

  setBeenHere: async (photoId, been) => {
    const userId = await ensureSession();
    const sb = client();
    const { error } = been
      ? await sb.from('been_here').upsert({ photo_id: photoId }, { onConflict: 'photo_id,user_id', ignoreDuplicates: true })
      : await sb.from('been_here').delete().eq('photo_id', photoId).eq('user_id', userId);
    if (error) throw error;
  },

  listNotes: async (photoId) => {
    await ensureSession();
    const { data, error } = await client()
      .from('archive_notes')
      .select('id, photo_id, body, created_at, is_mine')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r): Note => ({ id: r.id, photoId: r.photo_id, body: r.body, createdAt: r.created_at, isMine: r.is_mine }));
  },

  addNote: async (photoId, body) => {
    await ensureSession();
    const { data, error } = await client().from('notes').insert({ photo_id: photoId, body: body.trim() }).select('id, photo_id, body, created_at').single();
    if (error) throw error;
    return { id: data.id, photoId: data.photo_id, body: data.body, createdAt: data.created_at, isMine: true };
  },

  reportPhoto: async (photoId, reason) => {
    await ensureSession();
    const { error } = await client().from('reports').insert({ photo_id: photoId, reason });
    if (error && error.code !== '23505') throw error; // already reported by this user
  },

  reportNote: async (noteId, reason) => {
    await ensureSession();
    const { error } = await client().from('reports').insert({ note_id: noteId, reason });
    if (error && error.code !== '23505') throw error;
  },

  blockAuthor: async ({ photoId, noteId }) => {
    await ensureSession();
    const { error } = await client().rpc('block_author', { target_photo: photoId ?? null, target_note: noteId ?? null });
    if (error) throw error;
  },

  unblockAll: async () => {
    await ensureSession();
    const { error } = await client().rpc('unblock_all');
    if (error) throw error;
  },

  deleteAccount: async () => {
    const userId = await ensureSession();
    const sb = client();
    // Remove image files first (storage can't be cleaned up from SQL), then the account itself.
    const { data: files } = await sb.storage.from(PHOTO_BUCKET).list(userId, { limit: 1000 });
    if (files?.length) await sb.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw error;
    await sb.auth.signOut();
    sessionPromise = null;
  },
};
