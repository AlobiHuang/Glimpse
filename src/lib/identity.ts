const ADJECTIVES = [
  'quiet', 'amber', 'misty', 'still', 'wandering', 'golden', 'hidden', 'distant',
  'soft', 'bright', 'late', 'early', 'salt', 'velvet', 'paper', 'hollow',
];
const NOUNS = [
  'heron', 'lantern', 'harbor', 'alley', 'meadow', 'window', 'tram', 'orchard',
  'pier', 'rooftop', 'fern', 'comet', 'bridge', 'fox', 'kite', 'atlas',
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Anonymous handle like "quiet-heron-42". Only ever shown if you opt in. */
export function randomHandle(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${Math.floor(Math.random() * 90) + 10}`;
}
