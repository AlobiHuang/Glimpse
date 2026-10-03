import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Springy } from '@/components/motion';
import { Label } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { bandFor } from '@/lib/hourLight';
import { catalogNumber, clock, seasonOf } from '@/lib/places';
import type { FeedSlot, Photo } from '@/lib/types';
import { colors, fonts, space, type } from '@/theme';

/** "3:12 pm · Autumn" */
export function timeLine(photo: Pick<Photo, 'localTime' | 'takenAt' | 'createdAt' | 'latitude'>): string {
  return [clock(photo.localTime), seasonOf(photo.takenAt ?? photo.createdAt, photo.latitude)].filter(Boolean).join(' · ');
}

export function openPhoto(photo: Pick<Photo, 'id'>) {
  router.push({ pathname: '/photo/[id]', params: { id: photo.id } });
}

export function openPlace(key: string) {
  router.push({ pathname: '/place/[key]', params: { key } });
}

/** A round badge in the color of the hour the photo was taken (where a profile picture would be). */
export function PlaceBadge({ localTime, size = 34 }: { localTime: string | null; size?: number }) {
  const band = bandFor(localTime);
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: band.color }]}>
      <Ionicons name="location" size={size * 0.48} color={band.ink} />
    </View>
  );
}

type Props = {
  photo: Photo;
  onKeep?: (photo: Photo) => void;
  onBeenHere?: (photo: Photo) => void;
  onShare?: (photo: Photo) => void;
  /** Extra line, e.g. "7 layers since 2023". */
  note?: string;
  /** Where it sits in the home feed; a 'fresh' glimpse is marked as new to the archive. */
  slot?: FeedSlot;
};

/**
 * A glimpse as a post: place at the top (never a person), the photo edge to edge,
 * an action row, then the caption and catalogue number. No likes, no author.
 */
export function Print({ photo, onKeep, onBeenHere, onShare, note, slot }: Props) {
  const ratio = photo.width && photo.height ? photo.width / photo.height : 4 / 5;
  return (
    <View style={styles.post}>
      <Pressable
        style={styles.header}
        onPress={() => (photo.placeKey ? openPlace(photo.placeKey) : openPhoto(photo))}
        accessibilityRole="link"
      >
        <PlaceBadge localTime={photo.localTime} />
        <View style={{ flex: 1 }}>
          <Text style={styles.place} numberOfLines={1}>
            {photo.placeName ?? 'Somewhere'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {timeLine(photo)}
          </Text>
        </View>
        {slot === 'fresh' ? (
          <View style={styles.newPill}>
            <Text style={styles.newText}>New to the archive</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        )}
      </Pressable>

      <Pressable
        onPress={() => openPhoto(photo)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Glimpse of ${photo.placeName ?? 'somewhere'}${photo.caption ? `: ${photo.caption}` : ''}`}
      >
        <Image source={photo.imageUrl} style={[styles.image, { aspectRatio: Math.min(Math.max(ratio, 0.8), 1.5) }]} contentFit="cover" transition={250} />
      </Pressable>

      <View style={styles.actions}>
        {onBeenHere ? (
          <Springy active={photo.beenHereByMe} onPress={() => onBeenHere(photo)} hitSlop={8} accessibilityRole="button" accessibilityLabel="I've been here" accessibilityState={{ selected: photo.beenHereByMe }}>
            <Ionicons name={photo.beenHereByMe ? 'footsteps' : 'footsteps-outline'} size={25} color={photo.beenHereByMe ? colors.stamp : colors.ink} />
          </Springy>
        ) : null}
        <Springy onPress={() => openPhoto(photo)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Notes">
          <Ionicons name="chatbubble-outline" size={24} color={colors.ink} />
        </Springy>
        {onShare ? (
          <Springy onPress={() => onShare(photo)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share">
            <Ionicons name="paper-plane-outline" size={24} color={colors.ink} />
          </Springy>
        ) : null}
        <View style={{ flex: 1 }} />
        {onKeep ? (
          <Springy active={photo.keptByMe} onPress={() => onKeep(photo)} hitSlop={8} accessibilityRole="button" accessibilityLabel={photo.keptByMe ? 'Kept' : 'Keep'} accessibilityState={{ selected: photo.keptByMe }}>
            <Ionicons name={photo.keptByMe ? 'bookmark' : 'bookmark-outline'} size={25} color={photo.keptByMe ? colors.stamp : colors.ink} />
          </Springy>
        ) : null}
      </View>

      <View style={styles.meta}>
        {photo.word ? (
          <Text style={type.body}>
            <Text style={styles.bold}>{photo.city ?? 'This place'}</Text> is <Text style={{ color: colors.stamp }}>#{photo.word.replace(/\s+/g, '')}</Text>
          </Text>
        ) : null}
        {photo.caption ? <Text style={type.body}>{photo.caption}</Text> : null}
        {photo.noteCount > 0 ? (
          <Pressable onPress={() => openPhoto(photo)} accessibilityRole="button">
            <Text style={styles.muted}>{photo.noteCount === 1 ? 'View 1 note about this place' : `View ${photo.noteCount} notes about this place`}</Text>
          </Pressable>
        ) : null}
        {note ? <Text style={styles.muted}>{note}</Text> : null}
        {photo.visibility === 'private' ? (
          <View style={styles.privateRow}>
            <Ionicons name="lock-closed" size={12} color={colors.pencil} />
            <Text style={styles.muted}>Only you can see this, on your map</Text>
          </View>
        ) : null}
        <Label>
          {catalogNumber(photo.catalogNo)} · {timeAgo(photo.createdAt)}
        </Label>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { backgroundColor: colors.paper, paddingBottom: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.md, paddingVertical: 10 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  place: { ...fonts.sansSemi, fontSize: 14.5, color: colors.ink },
  sub: { fontSize: 12.5, color: colors.pencil },
  image: { width: '100%', backgroundColor: colors.sunken },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: space.md, paddingTop: 10, paddingBottom: 6 },
  meta: { paddingHorizontal: space.md, gap: 4 },
  bold: { ...fonts.sansSemi },
  muted: { fontSize: 14, color: colors.pencil },
  newPill: { backgroundColor: colors.stampSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  newText: { ...fonts.sansSemi, fontSize: 11.5, color: colors.stamp },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
