/** Public contact address shown in the app (Apple guideline 1.2 requires one). */
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || 'hello@example.com';

export const REPORT_REASONS = [
  'Nudity or sexual content',
  'Violence or gore',
  'Harassment or bullying',
  'Shows a private person or private info',
  'Spam',
  'Something else',
];

/**
 * The home screen says "2,481 photos people took but never posted" only once the shared archive
 * is at least this big; before that it shows the line without a number. A small number reads as
 * an empty room, and the count must always be the real one.
 */
export const ARCHIVE_COUNT_MIN = 1000;
