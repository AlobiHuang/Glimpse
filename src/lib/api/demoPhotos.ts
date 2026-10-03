/**
 * Sample glimpses for demo mode.
 *
 * Every image is from Unsplash (https://unsplash.com) under the Unsplash License:
 * free to use, including commercially, no permission or attribution required
 * (we credit photographers anyway). No "Unsplash+" (paid) images are used.
 * Full list: DEMO_PHOTO_CREDITS.md.
 *
 * The Unsplash License doesn't allow compiling their photos into a similar or competing
 * service — so these are for the demo/prototype only, not for the public app.
 *
 * Places, dates, times and words below are illustrative sample data. There are no made-up
 * totals: every count the demo shows is counted from these glimpses.
 * Several places (Alfama, Beacon Hill, Shibuya) have many glimpses across years so
 * Layers can show a place changing over time.
 */

export type DemoPhoto = {
  id: string;
  unsplash: string; // image id on images.unsplash.com
  credit: string; // photographer
  caption: string | null;
  place: string | null; // neighborhood-level place
  city: string | null;
  lat: number | null;
  lng: number | null;
  w: number; // shape we request (Unsplash crops to it)
  h: number;
  ago: number; // days ago it was taken
  time: string; // local clock time where it was taken
  word: string | null; // the photographer's word for the city
  mine?: boolean; // "you" took it
  kept?: string | true; // "you" kept it (string = your word for the city)
  prompt?: boolean; // part of today's observation
  camera?: string;
};

/** Resized, cropped image URL (Unsplash's image CDN does the work). */
export function unsplashUrl(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=75`;
}

export const GLIMPSES: DemoPhoto[] = [
  // ——— Alfama, Lisbon: layers across three years ———
  { id: 'g-alfama-tram', unsplash: 'photo-1665091982331-e66db14feae6', credit: 'Ari Dinar', caption: 'The yellow tram squeezes through with an inch to spare.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7118, lng: -9.13, w: 1080, h: 1350, ago: 0.1, time: '15:12', word: 'trams', prompt: true, camera: 'Apple iPhone 15 Pro' },
  { id: 'g-alfama-sea', unsplash: 'photo-1620141195936-07e57eccc6fd', credit: 'João Reguengos', caption: 'Morning haze over the river, rooftops still cold.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7112, lng: -9.1298, w: 1440, h: 1080, ago: 45, time: '08:40', word: 'sea light' },
  { id: 'g-alfama-sunset', unsplash: 'photo-1644773525278-7d3a3036ca39', credit: 'Benjamin Pazdernik', caption: 'Ten minutes of gold, then everyone goes home.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7125, lng: -9.1305, w: 1080, h: 1350, ago: 210, time: '19:48', word: 'golden hour' },
  { id: 'g-alfama-grey-door', unsplash: 'photo-1519261646199-6351365654be', credit: 'Nik Guiney', caption: 'Paint peeling in exactly the right places.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7116, lng: -9.1291, w: 1080, h: 1440, ago: 400, time: '11:05', word: 'doors' },
  { id: 'g-alfama-blue-door', unsplash: 'photo-1532575231533-48ec07b58b7b', credit: 'David Klein', caption: null, place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7121, lng: -9.1312, w: 1080, h: 1620, ago: 620, time: '16:30', word: 'blue doors' },
  { id: 'g-alfama-tiles', unsplash: 'photo-1541320779116-ec4a3d4692bc', credit: 'Annie Spratt', caption: 'Every wall is a pattern if you get close enough.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7119, lng: -9.1302, w: 1080, h: 1080, ago: 900, time: '13:20', word: 'tiles', kept: 'tiles' },
  { id: 'g-alfama-roofs', unsplash: 'photo-1616862890964-fd20e9dd106d', credit: 'João Reguengos', caption: 'First morning in the city.', place: 'Alfama, Lisbon', city: 'Lisbon', lat: 38.7109, lng: -9.1296, w: 1620, h: 1080, ago: 1150, time: '07:15', word: 'rooftops' },
  // ——— elsewhere in Lisbon ———
  { id: 'g-lisbon-alley', unsplash: 'photo-1562762562-8670c946876c', credit: 'Patrick Robert Doyle', caption: 'Every alley here goes uphill.', place: 'Bairro Alto, Lisbon', city: 'Lisbon', lat: 38.712, lng: -9.144, w: 1080, h: 1620, ago: 3, time: '18:10', word: 'uphill' },
  { id: 'g-lisbon-graca-tiles', unsplash: 'photo-1518899150575-5ac29fbe2f3e', credit: 'Natalia Y.', caption: null, place: 'Graça, Lisbon', city: 'Lisbon', lat: 38.7167, lng: -9.1308, w: 1080, h: 1350, ago: 5, time: '14:45', word: 'tiles' },
  { id: 'g-lisbon-cobbles', unsplash: 'photo-1660727970101-68c75363e893', credit: 'Arthur Hinton', caption: 'The cobblestones are older than anything I own.', place: 'Baixa, Lisbon', city: 'Lisbon', lat: 38.711, lng: -9.137, w: 1440, h: 1080, ago: 30, time: '10:00', word: 'cobblestones' },

  // ——— Beacon Hill, Boston: layers ———
  { id: 'g-beacon-brick', unsplash: 'photo-1608845920884-3c88800feebc', credit: 'Matt Collamer', caption: 'Brick, ivy, and a window box someone clearly loves.', place: 'Beacon Hill, Boston', city: 'Boston', lat: 42.3584, lng: -71.0679, w: 1080, h: 1350, ago: 1.5, time: '09:20', word: 'brick' },
  { id: 'g-beacon-mine', unsplash: 'photo-1663519304174-6c2b1f308664', credit: 'Bernd Dittrich', caption: 'Brick, gas lamps, and a very steep hill.', place: 'Beacon Hill, Boston', city: 'Boston', lat: 42.358, lng: -71.068, w: 1080, h: 1620, ago: 6, time: '17:40', word: 'steep hills', mine: true },
  { id: 'g-beacon-sidewalk', unsplash: 'photo-1610891068146-87e9689d0f45', credit: 'Sydney Angove', caption: null, place: 'Beacon Hill, Boston', city: 'Boston', lat: 42.3587, lng: -71.0684, w: 1080, h: 1440, ago: 90, time: '12:10', word: 'gas lamps' },
  { id: 'g-beacon-flag', unsplash: 'photo-1637171952337-0b87ed20b01c', credit: 'James Frewin', caption: 'The sidewalk bricks tilt in every direction.', place: 'Beacon Hill, Boston', city: 'Boston', lat: 42.3578, lng: -71.0672, w: 1080, h: 1350, ago: 300, time: '08:05', word: 'brick' },
  { id: 'g-beacon-corner', unsplash: 'photo-1491249149628-28cb9a16356a', credit: 'Clifford', caption: null, place: 'Beacon Hill, Boston', city: 'Boston', lat: 42.3591, lng: -71.069, w: 1440, h: 1080, ago: 700, time: '15:55', word: 'steep hills' },
  // ——— elsewhere in Boston (several of "yours") ———
  { id: 'g-boston-harbor', unsplash: 'photo-1565127803082-69dd82351360', credit: 'jacob Licht', caption: 'The skyline comes and goes behind the fog.', place: 'Boston Harbor', city: 'Boston', lat: 42.36, lng: -71.045, w: 1620, h: 1080, ago: 4, time: '07:50', word: 'harbor fog' },
  { id: 'g-boston-night', unsplash: 'photo-1606373664971-bf9b25eb508d', credit: 'Venti Views', caption: 'Last train home.', place: 'Downtown Boston', city: 'Boston', lat: 42.3555, lng: -71.0605, w: 1080, h: 1350, ago: 2.5, time: '23:30', word: 'late trains' },
  { id: 'g-boston-clock', unsplash: 'photo-1672145628181-c87086173a94', credit: 'Yoav Aziz', caption: 'The clock tower is always five minutes ahead of me.', place: 'Downtown Boston', city: 'Boston', lat: 42.359, lng: -71.054, w: 1080, h: 1350, ago: 12, time: '08:55', word: 'clock towers', mine: true },
  { id: 'g-boston-alley', unsplash: 'photo-1648154684502-faf53c2eb6aa', credit: 'Justin Yeung', caption: 'A shortcut I’ll never tell anyone about. Oops.', place: 'Financial District, Boston', city: 'Boston', lat: 42.356, lng: -71.056, w: 1080, h: 1440, ago: 20, time: '13:15', word: 'shortcuts', mine: true },
  { id: 'g-boston-backbay', unsplash: 'photo-1716561810502-54f175032905', credit: 'Zoshua Colah', caption: 'Parking here is a competitive sport.', place: 'Back Bay, Boston', city: 'Boston', lat: 42.35, lng: -71.08, w: 1620, h: 1080, ago: 33, time: '10:40', word: 'brownstones', mine: true },
  { id: 'g-boston-library', unsplash: 'photo-1501691223387-dd0500403074', credit: 'Nick Nice', caption: 'Library window, finals week.', place: 'Copley Square, Boston', city: 'Boston', lat: 42.3495, lng: -71.0779, w: 1080, h: 1920, ago: 60, time: '16:20', word: 'rain', mine: true },
  { id: 'g-boston-common', unsplash: 'photo-1625259527735-1e273e7d43eb', credit: 'Yassine Khalfalli', caption: 'First autumn here.', place: 'Boston Common', city: 'Boston', lat: 42.355, lng: -71.066, w: 1080, h: 1080, ago: 80, time: '11:30', word: 'autumn', mine: true },
  { id: 'g-boston-common-old', unsplash: 'photo-1611839234426-21de3ee58176', credit: 'Sean Sweeney', caption: 'The whole city lies on this grass in June.', place: 'Boston Common', city: 'Boston', lat: 42.3548, lng: -71.0655, w: 1620, h: 1080, ago: 250, time: '14:00', word: 'summer' },
  { id: 'g-boston-fog', unsplash: 'photo-1487621167305-5d248087c724', credit: 'Paul Pastourmatzis', caption: 'Fog so thick the trees disappear.', place: 'Arnold Arboretum, Boston', city: 'Boston', lat: 42.301, lng: -71.123, w: 1080, h: 1440, ago: 150, time: '06:50', word: 'fog', mine: true },

  // ——— Shibuya, Tokyo: layers ———
  { id: 'g-shibuya-neon', unsplash: 'photo-1601042879364-f3947d3f9c16', credit: 'Valentin Beauvais', caption: 'Neon on wet asphalt.', place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.659, lng: 139.7, w: 1080, h: 1350, ago: 0.4, time: '23:10', word: 'neon' },
  { id: 'g-shibuya-crossing', unsplash: 'photo-1740820930196-203acb0a4f5c', credit: 'Ben George', caption: 'Lunch hour. The crossing breathes in and out.', place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6595, lng: 139.7005, w: 1440, h: 1080, ago: 30, time: '12:30', word: 'crowds' },
  { id: 'g-shibuya-umbrellas', unsplash: 'photo-1540072985388-8bfdf6490f93', credit: 'Andre Benz', caption: null, place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6598, lng: 139.6998, w: 1080, h: 1620, ago: 70, time: '20:15', word: 'umbrellas' },
  { id: 'g-shibuya-sidewalk', unsplash: 'photo-1651052585426-660c04bccc81', credit: 'Taiki Ishikawa', caption: 'A river of umbrellas.', place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6588, lng: 139.7012, w: 1080, h: 1350, ago: 260, time: '18:40', word: 'rain' },
  { id: 'g-shibuya-commute', unsplash: 'photo-1655821535288-0033302ed8fb', credit: 'ayumi kubo', caption: null, place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6601, lng: 139.6992, w: 1080, h: 1440, ago: 480, time: '08:30', word: 'rain' },
  { id: 'g-shibuya-dawn', unsplash: 'photo-1651412980609-c5474810cff5', credit: 'ayumi kubo', caption: 'The only quiet hour.', place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6592, lng: 139.7008, w: 1080, h: 1350, ago: 760, time: '06:20', word: 'quiet mornings' },
  { id: 'g-shibuya-night-cars', unsplash: 'photo-1547981609-ad4e1dde4d41', credit: 'Ling Tang', caption: null, place: 'Shibuya, Tokyo', city: 'Tokyo', lat: 35.6585, lng: 139.7015, w: 1620, h: 1080, ago: 1000, time: '01:30', word: 'late nights' },
  // ——— elsewhere in Tokyo & Japan ———
  { id: 'g-tokyo-lanterns', unsplash: 'photo-1573455494060-c5595004fb6c', credit: 'Denys Nevozhai', caption: 'Red lanterns, narrow alley, 11pm.', place: 'Shinjuku, Tokyo', city: 'Tokyo', lat: 35.694, lng: 139.703, w: 1080, h: 1440, ago: 0.6, time: '23:00', word: 'lanterns', kept: 'lanterns' },
  { id: 'g-tokyo-vending', unsplash: 'photo-1621139151681-5ac8d73128ce', credit: 'Mylène Larnaud', caption: 'Power lines and one glowing vending machine.', place: 'Shimokitazawa, Tokyo', city: 'Tokyo', lat: 35.661, lng: 139.668, w: 1080, h: 1440, ago: 8, time: '22:10', word: 'vending machines' },
  { id: 'g-kyoto-gates', unsplash: 'photo-1558862107-d49ef2a04d72', credit: 'David Emrich', caption: 'Walk long enough and the gates never end.', place: 'Fushimi Inari, Kyoto', city: 'Kyoto', lat: 34.967, lng: 135.773, w: 1080, h: 1620, ago: 1, time: '06:10', word: 'torii' },
  { id: 'g-kyoto-pagoda', unsplash: 'photo-1624253321171-1be53e12f5f4', credit: 'Roméo A.', caption: 'Golden hour finds the pagoda first.', place: 'Higashiyama, Kyoto', city: 'Kyoto', lat: 34.998, lng: 135.781, w: 1080, h: 1350, ago: 15, time: '17:30', word: 'golden hour' },
  { id: 'g-fuji', unsplash: 'photo-1528164344705-47542687000d', credit: 'Manuel Cosentino', caption: '398 steps up for this.', place: 'Chureito Pagoda, Fujiyoshida', city: 'Fujiyoshida', lat: 35.501, lng: 138.801, w: 1620, h: 1080, ago: 40, time: '06:45', word: 'Fuji', kept: true },

  // ——— around the world ———
  { id: 'g-nyc-steam', unsplash: 'photo-1519121785383-3229633bb75b', credit: 'Luke Stackpoole', caption: '5am. Steam from the street, one taxi, nobody else.', place: 'Midtown, New York', city: 'New York', lat: 40.754, lng: -73.984, w: 1080, h: 1440, ago: 0.8, time: '05:00', word: 'steam', kept: 'steam' },
  { id: 'g-nyc-dumbo', unsplash: 'photo-1492666673288-3c4b4576ad9a', credit: 'Redd Francisco', caption: 'The bridge, framed exactly where everyone says it is. Still worth it.', place: 'DUMBO, Brooklyn', city: 'New York', lat: 40.703, lng: -73.989, w: 1080, h: 1350, ago: 9, time: '16:20', word: 'bridges' },
  { id: 'g-nyc-times', unsplash: 'photo-1602940659805-770d1b3b9911', credit: 'Andreas Niendorf', caption: 'Too bright to be night.', place: 'Times Square, New York', city: 'New York', lat: 40.758, lng: -73.985, w: 1080, h: 1350, ago: 26, time: '21:45', word: 'neon' },
  { id: 'g-hk-windows', unsplash: 'photo-1507940951817-904be81ae43b', credit: 'Florian Wehde', caption: 'Every window a different evening.', place: 'Quarry Bay, Hong Kong', city: 'Hong Kong', lat: 22.285, lng: 114.217, w: 1080, h: 1620, ago: 1.2, time: '19:30', word: 'windows', kept: 'windows', prompt: true },
  { id: 'g-hk-harbour', unsplash: 'photo-1689817675970-130577e6c247', credit: 'Emma Lau', caption: 'The harbour lights come on all at once.', place: 'Victoria Harbour, Hong Kong', city: 'Hong Kong', lat: 22.293, lng: 114.169, w: 1620, h: 1080, ago: 18, time: '20:10', word: 'harbour lights' },
  { id: 'g-seoul-rain', unsplash: 'photo-1509635022432-0220ac12960b', credit: 'Suhyeon Choi', caption: 'Rain on the café window. Nobody wanted to leave.', place: 'Mapo-gu, Seoul', city: 'Seoul', lat: 37.556, lng: 126.922, w: 1080, h: 1350, ago: 0.3, time: '15:40', word: 'rain', prompt: true },
  { id: 'g-brighton-chair', unsplash: 'photo-1720265358478-4f3ec2ad79bb', credit: 'Kirill Fokin', caption: 'Someone left a single chair facing the sea.', place: 'Brighton Seafront', city: 'Brighton', lat: 50.8197, lng: -0.1368, w: 1080, h: 1080, ago: 2, time: '07:30', word: 'the sea' },
  { id: 'g-oaxaca-door', unsplash: 'photo-1546045515-b53f3dacb638', credit: 'Tatiana Rodriguez', caption: 'I would like to know what’s behind this door.', place: 'Centro, Oaxaca', city: 'Oaxaca', lat: 17.061, lng: -96.725, w: 1080, h: 1440, ago: 7, time: '11:20', word: 'doors' },
  { id: 'g-rome-spiral', unsplash: 'photo-1507097489474-c9212a8f8597', credit: 'Dan Freeman', caption: 'Looked down. Regretted it. Took the photo anyway.', place: 'Vatican, Rome', city: 'Rome', lat: 41.906, lng: 12.454, w: 1080, h: 1080, ago: 11, time: '13:00', word: 'stairs' },
  { id: 'g-paris-marais', unsplash: 'photo-1558900493-3b6cc10d7aff', credit: 'Zdenek Klein', caption: 'Sunday morning, before the cafés open.', place: 'Le Marais, Paris', city: 'Paris', lat: 48.857, lng: 2.36, w: 1440, h: 1080, ago: 14, time: '08:15', word: 'Sunday mornings' },
  { id: 'g-fog-forest', unsplash: 'photo-1418065460487-3e41a6c84dc5', credit: 'Jay Mantri', caption: 'Fog rolling in over the ridge.', place: null, city: null, lat: null, lng: null, w: 1440, h: 1080, ago: 3.5, time: '06:30', word: null },
];

/** Glimpses that "arrive" one at a time when you pull to refresh. */
export const INCOMING: DemoPhoto[] = [
  { id: 'g-new-melbourne', unsplash: 'photo-1511634829096-045a111727eb', credit: 'C. G.', caption: 'Rain on the tram window, 8am.', place: 'Melbourne CBD', city: 'Melbourne', lat: -37.81, lng: 144.96, w: 1080, h: 1440, ago: 0, time: '08:00', word: 'rain', prompt: true },
  { id: 'g-new-berlin', unsplash: 'photo-1448454050639-2f8d4bf26975', credit: 'Ludde Lorentz', caption: 'Found a staircase that goes nowhere.', place: 'Kreuzberg, Berlin', city: 'Berlin', lat: 52.5, lng: 13.4, w: 1080, h: 1350, ago: 0, time: '15:30', word: 'stairs' },
  { id: 'g-new-sf', unsplash: 'photo-1711829566063-8b7a0a3ecd87', credit: 'Riccardo Farinazzo', caption: null, place: 'Ocean Beach, San Francisco', city: 'San Francisco', lat: 37.76, lng: -122.51, w: 1440, h: 1080, ago: 0, time: '07:10', word: 'fog' },
];

/**
 * The country each sample city is in. That's the only city fact the demo is given — glimpse
 * counts, word counts and "defined by N people" are all counted from the sample glimpses.
 */
export const CITY_COUNTRY: Record<string, string> = {
  Lisbon: 'Portugal',
  Boston: 'United States',
  Tokyo: 'Japan',
  'New York': 'United States',
  'Hong Kong': 'Hong Kong SAR',
  Kyoto: 'Japan',
  Fujiyoshida: 'Japan',
  Seoul: 'South Korea',
  Paris: 'France',
  Brighton: 'United Kingdom',
  Melbourne: 'Australia',
  Berlin: 'Germany',
  'San Francisco': 'United States',
};

export const NOTES: Record<string, string[]> = {
  'g-alfama-tram': ['Tram 28 — get on at Martim Moniz to skip the queue.', 'The tiles on the left wall were restored last year.'],
  'g-alfama-grey-door': ['This door was painted green in 2025.'],
  'g-brighton-chair': ['The chair is still there as of last week.'],
  'g-nyc-steam': ['The steam comes from the city’s old heating pipes.'],
  'g-kyoto-gates': ['Go at 6am and you’ll have it to yourself.', 'The foxes at the top are worth the climb.'],
  'g-beacon-brick': ['Acorn Street is two blocks down — even steeper.'],
};

/**
 * Prototype only: how big the demo archive pretends to be, so the headline and catalogue
 * numbers ("No. 38,214") look like a living archive. The real backend never uses this —
 * there every number is counted from shared glimpses. Set to null to show the true sample counts.
 */
export const DEMO_ARCHIVE_SIZE: { glimpses: number; places: number; cities: number } | null = { glimpses: 38214, places: 6120, cities: 412 };

/**
 * Prototype only, like DEMO_ARCHIVE_SIZE: how many people have "already" defined each city and
 * with which words, so city pages look like they would with a real community. The sample
 * glimpses' own counts are added on top. Set to null to show only the true sample counts.
 */
export const DEMO_CITY_SIZE: Record<string, { definers: number; glimpses: number; words: [string, number][] }> | null = {
  Lisbon: { definers: 1204, glimpses: 9310, words: [['trams', 214], ['tiles', 188], ['uphill', 151], ['sea light', 102], ['laundry lines', 96], ['golden hour', 88], ['cobblestones', 70]] },
  Boston: { definers: 986, glimpses: 7420, words: [['brick', 240], ['harbor fog', 132], ['snow on stoops', 120], ['steep hills', 98], ['autumn', 90], ['late trains', 64], ['gas lamps', 58]] },
  Tokyo: { definers: 2410, glimpses: 18730, words: [['neon', 260], ['rain', 150], ['umbrellas', 140], ['vending machines', 120], ['quiet alleys', 110], ['lanterns', 96], ['late nights', 80]] },
  'New York': { definers: 3120, glimpses: 22040, words: [['steam', 180], ['bridges', 170], ['yellow cabs', 160], ['fire escapes', 150], ['neon', 120]] },
  'Hong Kong': { definers: 1510, glimpses: 11200, words: [['windows', 220], ['harbour lights', 160], ['density', 140], ['neon', 120], ['trams', 90]] },
  Kyoto: { definers: 870, glimpses: 5120, words: [['torii', 190], ['temples', 160], ['golden hour', 80], ['moss', 70]] },
  Seoul: { definers: 640, glimpses: 4100, words: [['rain', 90], ['cafés', 85], ['hills', 60]] },
  Paris: { definers: 2050, glimpses: 15400, words: [['Sunday mornings', 110], ['zinc roofs', 105], ['cafés', 100]] },
};
