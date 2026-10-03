/**
 * Glimpse is an archive of the everyday city.
 * Three principles shape this model:
 *   1. Place over person — glimpses carry no author at all.
 *   2. Record over performance — no likes or public counts on a single photo.
 *   3. Time is a dimension — every glimpse is a dated layer of a place.
 */

/** How precisely a glimpse's location is shared. */
export type LocationPrecision = 'exact' | 'approximate' | 'hidden';

/** One glimpse in the archive. Never contains who took it. */
export type Photo = {
  id: string;
  /** Catalogue number, like a museum label: No. 00412. */
  catalogNo: number;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  /** Neighborhood-level place, e.g. "Alfama, Lisbon". Glimpses with the same place stack into Layers. */
  placeName: string | null;
  placeKey: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** When it was taken (ISO). */
  takenAt: string | null;
  /** Local clock time where it was taken, "15:12" — powers the Now view. */
  localTime: string | null;
  camera: string | null;
  createdAt: string;
  /** The word the photographer used to define their city with this glimpse, e.g. "trams". */
  word: string | null;
  noteCount: number;
  /** You kept it in your collection (private). */
  keptByMe: boolean;
  /** You marked "I've been here" (private; adds a quiet witness to the place). */
  beenHereByMe: boolean;
  /** Daily observation this belongs to, e.g. "2026-10-02". */
  promptKey: string | null;
  /** Photographer credit, for licensed sample photos (demo mode). */
  credit?: string | null;
  /** You took it. Only ever known to you. */
  isMine?: boolean;
  /**
   * Who can see it: 'archive' = everyone (places, cities, maps, search); 'private' = only you,
   * on your own map (it didn't pass the photo checks, or you chose to keep it to yourself).
   */
  visibility: Visibility;
  /** Picked for everyone's home screen (by an editor, later by the score). */
  featured: boolean;
};

export type Visibility = 'private' | 'archive';

/** What the phone's photo checks found, stored with the glimpse (see lib/photoQuality.ts). */
export type QualitySummary = {
  passed: boolean;
  /** Soft checks failed but you chose "Share anyway". Never auto-Featured. */
  override: boolean;
  failed: string[];
  shortSide: number | null;
  sharpness: number | null;
  brightness: number | null;
};

/** Where a post sits in the home feed. */
export type FeedSlot = 'featured' | 'fresh' | 'newest';
export type FeedItem = { photo: Photo; slot: FeedSlot };

/** A glimpse with its distance from you, for "Around you". */
export type NearbyPhoto = Photo & { distanceKm: number };

/** An anonymous, factual note about a place, attached to a glimpse. */
export type Note = {
  id: string;
  photoId: string;
  body: string;
  createdAt: string;
  isMine?: boolean;
};

/** A place: every glimpse with the same placeKey, across time. */
export type Place = {
  key: string;
  name: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
  firstAt: string;
  lastAt: string;
  coverUrl: string;
  followedByMe: boolean;
};

export type WordCount = { word: string; count: number };

/** How everyone defines a city, built from the words people collect glimpses with. */
export type CityDefinition = {
  city: string;
  country: string | null;
  words: WordCount[];
  glimpseCount: number;
  definerCount: number;
  placeCount: number;
  coverUrls: string[];
};

/** Your own portrait of a city: what you took, what you kept, and your words for it. */
export type CityPortrait = {
  city: string;
  photos: Photo[]; // yours + kept, newest first
  takenCount: number;
  keptCount: number;
  words: WordCount[];
  places: string[];
  firstAt: string;
};

export type ArchiveStats = { glimpses: number; places: number; cities: number };

/** What the upload returns: your glimpse, and where it sits in the record. */
export type UploadResult = { photo: Photo; layerNumber: number; cityGlimpses: number };

/** Everything the capture screen collects before sending. */
export type NewPhoto = {
  localUri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  caption: string;
  placeName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  takenAt: string | null;
  localTime: string | null;
  camera: string | null;
  word: string | null;
  promptKey: string | null;
  visibility: Visibility;
  quality: QualitySummary | null;
  /** Difference hash of the image, to spot duplicates. */
  imageHash: string | null;
};

export type Me = {
  handle: string; // private, never shown on glimpses
  acceptedTerms: boolean; // must accept the community rules before posting or writing notes
  /** Can pick photos for the Featured home feed (added by the operator in Supabase → editors). */
  isEditor: boolean;
};
