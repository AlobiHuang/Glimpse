import type {
  ArchiveStats,
  CityDefinition,
  CityPortrait,
  Me,
  NearbyPhoto,
  NewPhoto,
  Note,
  Photo,
  Place,
  UploadResult,
} from '../types';
import { demoApi } from './demo';
import { isSupabaseConfigured } from '../supabase';
import { supabaseApi } from './supabase';

export type GlimpseQuery = {
  /** Newest first; pass the last glimpse's createdAt to load the next page. */
  before?: string;
  limit?: number;
  /** Search place names, captions and city words. */
  q?: string;
  /** Only this daily observation. */
  prompt?: string;
  city?: string;
  placeKey?: string;
  /** Only glimpses taken at this local hour (0–23), anywhere in the world. */
  localHour?: number;
  /** Set by pull-to-refresh (the demo uses it to let new glimpses arrive). */
  fresh?: boolean;
  /**
   * Home feed lists: 'featured' = picked for everyone's home screen (newest pick first);
   * 'fresh' = new to the archive and not yet seen by many people (gets a trial slot in the feed).
   * Without it you get the whole shared archive, newest first (plus your own private glimpses).
   */
  feed?: 'featured' | 'fresh';
};

/**
 * Every screen talks to the backend only through this interface.
 * With no Supabase keys in .env, the app runs on an in-memory demo backend.
 */
export type Api = {
  mode: 'demo' | 'supabase';
  getMe(): Promise<Me>;
  acceptTerms(): Promise<Me>;

  stats(): Promise<ArchiveStats>;
  listGlimpses(query?: GlimpseQuery): Promise<Photo[]>;
  getPhoto(id: string): Promise<Photo | null>;
  listMapPhotos(): Promise<Photo[]>;
  listNearby(latitude: number, longitude: number, limit?: number): Promise<NearbyPhoto[]>;

  /** Places & Layers */
  getPlace(key: string): Promise<Place | null>;
  setFollowingPlace(key: string, following: boolean): Promise<void>;
  listFollowedPlaces(): Promise<Place[]>;

  /** Cities & definitions */
  listCities(): Promise<CityDefinition[]>;
  getCity(city: string): Promise<CityDefinition | null>;
  listPlacesInCity(city: string): Promise<Place[]>;
  /** Your portraits: one per city you've taken or kept glimpses in. */
  listMyCities(): Promise<CityPortrait[]>;
  getMyCity(city: string): Promise<CityPortrait | null>;

  /** Curation: pick or unpick a glimpse for everyone's home screen (editors only). */
  setFeatured(photoId: string, featured: boolean): Promise<void>;
  /** Notes that you saw these glimpses (once per person; never shown — feeds the fresh slot and the score). */
  recordViews(photoIds: string[]): Promise<void>;

  /** Yours */
  listMine(): Promise<Photo[]>;
  listKept(): Promise<Photo[]>;
  uploadPhoto(photo: NewPhoto): Promise<UploadResult>;
  deletePhoto(id: string): Promise<void>;

  /** Collecting: Keep (optionally with your word for the city) and "I've been here". */
  setKept(photoId: string, kept: boolean, word?: string | null): Promise<void>;
  setBeenHere(photoId: string, been: boolean): Promise<void>;

  /** Notes about a place */
  listNotes(photoId: string): Promise<Note[]>;
  addNote(photoId: string, body: string): Promise<Note>;

  /** Safety */
  reportPhoto(photoId: string, reason: string): Promise<void>;
  reportNote(noteId: string, reason: string): Promise<void>;
  /** Hides everything from whoever took this glimpse or wrote this note — without revealing who. */
  blockAuthor(target: { photoId?: string; noteId?: string }): Promise<void>;
  unblockAll(): Promise<void>;
  /** Deletes the account and everything it posted (Apple guideline 5.1.1(v)). */
  deleteAccount(): Promise<void>;
};

export const api: Api = isSupabaseConfigured ? supabaseApi : demoApi;
