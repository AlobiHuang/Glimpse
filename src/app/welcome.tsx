import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HourSwatch, Label, Wordmark } from '@/components/ui';
import { unsplashUrl } from '@/lib/api/demoPhotos';
import { setFlag } from '@/lib/prefs';
import { colors, fonts, radius, space } from '@/theme';

const WELCOME_FLAG = 'welcomed'; // also read in (tabs)/_layout.tsx

type Slide = { kicker: string; title: ReactNode; body: string; art: ReactNode };

const IMG = {
  tram: unsplashUrl('photo-1665091982331-e66db14feae6', 600, 750),
  roofs: unsplashUrl('photo-1616862890964-fd20e9dd106d', 400, 400),
  door: unsplashUrl('photo-1532575231533-48ec07b58b7b', 400, 400),
  tiles: unsplashUrl('photo-1541320779116-ec4a3d4692bc', 400, 400),
  sea: unsplashUrl('photo-1620141195936-07e57eccc6fd', 400, 400),
};

/** The three-page thesis, shown on first launch (and from Yours → How Glimpse works). */
export default function WelcomeScreen() {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const slides: Slide[] = [
    {
      kicker: '01 · What this is',
      title: (
        <>
          Map your world with the photos you <Text style={styles.em}>never post.</Text>
        </>
      ),
      body: 'The street, the window, the light at 3 pm: too ordinary for a feed, too good to forget. Glimpse pins them to a living map of your world.',
      art: <PrintArt />,
    },
    {
      kicker: '02 · How it’s different',
      title: (
        <>
          Places, <Text style={styles.em}>not people.</Text>
        </>
      ),
      body: 'There are no names, no likes and no followers. Every glimpse is filed by place and time. You keep what moves you, and only you know it.',
      art: <LabelArt />,
    },
    {
      kicker: '03 · Why it grows',
      title: (
        <>
          Every street,{'\n'}<Text style={styles.em}>layered in time.</Text>
        </>
      ),
      body: 'Keep other people’s glimpses to fill in places you haven’t been. The same corner stacks up across years, and your glimpses slowly draw each city.',
      art: <LayersArt />,
    },
  ];
  const last = index === slides.length - 1;

  const finish = () => {
    setFlag(WELCOME_FLAG, true);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Wordmark size={24} />
        {!last ? (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
            <Label>Skip</Label>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== index) setIndex(i);
            }}
          >
            {slides.map((slide) => (
              <View key={slide.kicker} style={[styles.slide, { width }]}>
                <View style={styles.artArea}>{slide.art}</View>
                <View style={styles.copy}>
                  <Label color={colors.stamp}>{slide.kicker}</Label>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.body}>{slide.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <Pressable key={s.kicker} onPress={() => goTo(i)} hitSlop={6} accessibilityLabel={`Page ${i + 1}`}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <Button variant={last ? 'stamp' : 'ink'} label={last ? 'Open the archive' : 'Next'} onPress={() => (last ? finish() : goTo(index + 1))} />
        <Text style={styles.fine}>{last ? 'By continuing you agree to keep Glimpse kind. The rules are under You.' : ' '}</Text>
      </View>
    </SafeAreaView>
  );
}

/* ——— Art for each page ——— */

function PrintArt() {
  return (
    <View style={styles.art}>
      <View style={[styles.print, { width: 150, transform: [{ rotate: '-6deg' }], left: 18, top: 40 }]}>
        <Image source={IMG.roofs} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
      </View>
      <View style={[styles.print, { width: 196, transform: [{ rotate: '2deg' }], right: 14, top: 4 }]}>
        <Image source={IMG.tram} style={{ width: '100%', aspectRatio: 4 / 5 }} contentFit="cover" />
        <View style={styles.printLabel}>
          <Label style={{ fontSize: 8.5 }}>No. 38,201</Label>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <HourSwatch localTime="15:12" size={7} />
            <Label style={{ fontSize: 8.5 }}>3:12 pm</Label>
          </View>
        </View>
        <Text style={styles.printPlace}>Tram 28, Lisbon</Text>
      </View>
    </View>
  );
}

function LabelArt() {
  return (
    <View style={[styles.art, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={[styles.print, styles.card]}>
        <View style={styles.struck}>
          <Text style={styles.strikeText}>@someone</Text>
          <Text style={styles.strikeText}>♥ 129 likes</Text>
          <Text style={styles.strikeText}>+ Follow</Text>
        </View>
        <View style={styles.cardRule} />
        <Label>No. 38,201</Label>
        <Text style={styles.cardPlace}>Alfama, Lisbon</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <HourSwatch localTime="15:12" size={9} />
          <Label>Tue 3:12 pm · Autumn</Label>
        </View>
        <View style={styles.cardFoot}>
          <Label>Lisbon = trams</Label>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>Keep</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function LayersArt() {
  const cells = Array.from({ length: 24 }, (_, i) => i);
  const lit = new Set([9, 10, 13, 14, 5, 17, 6]);
  return (
    <View style={[styles.art, { flexDirection: 'row', gap: space.lg, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ width: 120, height: 150 }}>
        {[IMG.sea, IMG.door, IMG.tiles].map((src, i) => (
          <View key={src} style={[styles.print, { position: 'absolute', width: 112, left: i * 4, top: i * 9, transform: [{ rotate: `${(i - 1) * 4}deg` }] }]}>
            <Image source={src} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" />
          </View>
        ))}
        <Label style={{ position: 'absolute', bottom: -18, left: 0 }}>2023 → 2026</Label>
      </View>
      <View style={{ gap: 8, width: 130 }}>
        <Text style={styles.cardPlace}>
          Lisbon <Text style={{ ...fonts.serifItalic, fontSize: 16, color: colors.pencil }}>(n.)</Text>
        </Text>
        <Text style={styles.defWords}>trams · tiles · uphill · sea light</Text>
        <View style={styles.mosaic}>
          {cells.map((c) => (
            <View key={c} style={[styles.cell, lit.has(c) && { backgroundColor: c % 3 === 0 ? colors.kept : colors.stamp }]} />
          ))}
        </View>
        <Label>Your Lisbon · 7 of 24</Label>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.md, height: 52 },
  slide: { flex: 1, paddingHorizontal: space.xl },
  artArea: { flex: 1, justifyContent: 'center', minHeight: 250 },
  art: { height: 290, width: '100%', maxWidth: 360, alignSelf: 'center' },
  copy: { gap: space.sm, paddingBottom: space.lg },
  title: { ...fonts.serif, fontSize: 30, lineHeight: 35, color: colors.ink, letterSpacing: -0.8 },
  em: { ...fonts.serifItalic, color: colors.stamp },
  body: { ...fonts.sans, fontSize: 16, lineHeight: 23, color: colors.pencil },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, gap: space.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.rule },
  dotActive: { backgroundColor: colors.stamp, width: 20 },
  fine: { ...fonts.sans, fontSize: 12, lineHeight: 17, color: colors.pencil, textAlign: 'center', minHeight: 34 },
  print: {
    position: 'absolute',
    backgroundColor: colors.print,
    padding: 0,
    borderRadius: radius.print,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  printLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 8 },
  printPlace: { ...fonts.sansSemi, fontSize: 14, color: colors.ink, marginTop: 2, marginBottom: 8, paddingHorizontal: 8 },
  card: { position: 'relative', width: 260, padding: space.lg, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule },
  struck: { gap: 4 },
  strikeText: { ...fonts.sansMedium, fontSize: 15, color: colors.faint, textDecorationLine: 'line-through' },
  cardRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule, marginVertical: space.sm },
  cardPlace: { ...fonts.serif, fontSize: 22, lineHeight: 27, color: colors.ink },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  stamp: { backgroundColor: colors.stamp, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  stampText: { ...fonts.sansSemi, fontSize: 12, color: '#FFFFFF' },
  defWords: { ...fonts.sans, fontSize: 13, lineHeight: 18, color: colors.ink },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap', width: 96, gap: 2, marginTop: 4 },
  cell: { width: 22, height: 22, borderRadius: 4, backgroundColor: colors.sunken },
});
