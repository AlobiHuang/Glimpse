import type Ionicons from '@expo/vector-icons/Ionicons';

export type Prompt = {
  key: string; // the date, e.g. "2026-09-29"
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/**
 * One theme per day, the same for everyone, rotating through this list.
 * Add to it freely — order is what decides which day gets which prompt.
 */
const THEMES: Omit<Prompt, 'key'>[] = [
  { title: 'Doors', description: 'A door you walked past today. Old, bright, strange — any door.', icon: 'enter-outline' },
  { title: '3pm light', description: 'Whatever the light is doing at 3 in the afternoon where you are.', icon: 'sunny-outline' },
  { title: 'Your commute', description: 'The view from the way you get anywhere.', icon: 'bus-outline' },
  { title: 'Looking up', description: 'Point your camera at the sky, a ceiling, a tree. Just look up.', icon: 'arrow-up-circle-outline' },
  { title: 'Windows', description: 'Through one, into one, or just the window itself.', icon: 'grid-outline' },
  { title: 'Something blue', description: 'Find blue somewhere unexpected.', icon: 'color-palette-outline' },
  { title: 'Empty places', description: 'A place that’s usually busy, caught empty.', icon: 'hourglass-outline' },
  { title: 'Stairs', description: 'Stairs, steps, ladders — anything that goes up.', icon: 'trending-up-outline' },
  { title: 'After rain', description: 'Puddles, reflections, wet streets.', icon: 'rainy-outline' },
  { title: 'Signs', description: 'A handwritten, funny, or beautiful sign.', icon: 'chatbox-ellipses-outline' },
  { title: 'Where you eat', description: 'The table, the counter, the bench — not the food.', icon: 'cafe-outline' },
  { title: 'Shadows', description: 'Let the shadow be the subject.', icon: 'contrast-outline' },
  { title: 'Green', description: 'Plants taking over a city corner.', icon: 'leaf-outline' },
  { title: 'Night lights', description: 'Neon, streetlights, a single lit window.', icon: 'moon-outline' },
];

const EPOCH = Date.UTC(2026, 0, 1);

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function promptFor(key: string): Prompt {
  const [y, m, d] = key.split('-').map(Number);
  const days = Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000);
  const theme = THEMES[((days % THEMES.length) + THEMES.length) % THEMES.length];
  return { key, ...theme };
}

export function todaysPrompt(): Prompt {
  return promptFor(dateKey());
}

/** "Today", "Yesterday", or "Mon, Sep 28". */
export function promptDayLabel(key: string): string {
  const today = dateKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
