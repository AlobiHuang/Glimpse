import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { CONTACT_EMAIL } from '@/lib/config';
import { useApp } from '@/lib/store';
import { colors, fonts, space, type } from '@/theme';

/**
 * Community rules + terms agreement.
 * Apple asks UGC apps to have users agree to terms with "no tolerance for
 * objectionable content or abusive users" before they can post.
 */
const RULES: [string, string][] = [
  ['Places, not people', 'Glimpses are of streets, rooms, views and things. Never a stranger’s face as the subject.'],
  ['Nothing explicit or violent', 'No nudity, sexual content, gore, or anything meant to shock.'],
  ['Notes are about places', 'Write what you know about the place: its history, a tip, what changed. Never about a person.'],
  ['Keep private things private', 'No homes, licence plates, documents or contact details.'],
  ['Only your own photos', 'Add glimpses you took yourself.'],
];

export default function RulesScreen() {
  const insets = useSafeAreaInsets();
  const { me, setMe, notify } = useApp();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      setMe(await api.acceptTerms());
      router.back();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
                <Text style={type.display}>Keep the archive kind.</Text>
        <Text style={type.small}>Glimpse has no names, so it has rules instead. Five of them.</Text>
        <View style={styles.list}>
          {RULES.map(([title, body], i) => (
            <View key={title} style={styles.rule}>
              <Text style={styles.number}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.place}>{title}</Text>
                <Text style={type.small}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={type.small}>
          We have zero tolerance for objectionable content or abusive users. Anyone can report a glimpse or a note; reports are reviewed within 24 hours, and anyone who breaks
          these rules is removed. Questions?{' '}
          <Text style={{ color: colors.stamp }} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
            {CONTACT_EMAIL}
          </Text>
        </Text>
      </ScrollView>
      {me && !me.acceptedTerms ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button variant="stamp" label="I agree" onPress={accept} loading={busy} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.xl, gap: space.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  list: { marginTop: space.sm },
  rule: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.rule },
  number: { ...fonts.serif, color: colors.stamp, fontSize: 17, width: 28 },
  footer: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.rule },
});
