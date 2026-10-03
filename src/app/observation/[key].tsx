import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Label, SectionHeader } from '@/components/ui';
import { Wall } from '@/components/Wall';
import { api } from '@/lib/api';
import { nowMs } from '@/lib/cityTime';
import { useContentWidth } from '@/lib/layout';
import { dateKey, promptDayLabel, promptFor, todaysPrompt } from '@/lib/prompts';
import type { Photo } from '@/lib/types';
import { colors, space, type } from '@/theme';

/**
 * A daily observation: one small thing for everyone to notice, the same in every city.
 * It's a reason to look, not a contest — there are no winners and no counts per glimpse.
 */
export default function ObservationScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const width = useContentWidth();
  const prompt = promptFor(key);
  const isToday = key === todaysPrompt().key;
  const [photos, setPhotos] = useState<Photo[] | null>(null);

  useEffect(() => {
    let active = true;
    api.listGlimpses({ prompt: key, limit: 60 }).then(
      (list) => active && setPhotos(list),
      () => active && setPhotos([]),
    );
    return () => {
      active = false;
    };
  }, [key]);

  const earlier = Array.from({ length: 6 }, (_, i) => dateKey(new Date(nowMs() - (i + 1) * 86_400_000)));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: space.xxxl }}>
      <Stack.Screen options={{ title: 'Observation' }} />
      <View style={styles.head}>
        <Label color={colors.stamp}>Observation · {promptDayLabel(key)}</Label>
        <Text style={type.display}>{prompt.title}</Text>
        <Text style={type.body}>{prompt.description}</Text>
        {isToday ? (
          <Button
            variant="stamp"
            label="Capture one"
            onPress={() => router.navigate({ pathname: '/capture', params: { prompt: key } })}
            style={{ marginTop: space.sm }}
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        <SectionHeader title={photos ? `${photos.length} ${photos.length === 1 ? 'glimpse' : 'glimpses'} so far` : 'Glimpses'} />
      </View>
      {photos === null ? (
        <ActivityIndicator color={colors.pencil} />
      ) : photos.length ? (
        <Wall photos={photos} width={width} />
      ) : (
        <Text style={[type.small, { paddingHorizontal: space.lg }]}>Nobody has added one yet.</Text>
      )}

      <View style={styles.earlier}>
        <SectionHeader title="Earlier observations" />
        <View style={styles.chips}>
          {earlier.map((k) => (
            <Chip key={k} label={`${promptFor(k).title}`} onPress={() => router.push({ pathname: '/observation/[key]', params: { key: k } })} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: { padding: space.lg, gap: space.sm },
  earlier: { padding: space.lg, marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
