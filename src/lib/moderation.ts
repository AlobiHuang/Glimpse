/**
 * First-line text filter, run on the phone before anything is posted.
 * Apple guideline 1.2 requires "a method for filtering objectionable material".
 *
 * This is intentionally simple. Before launch, add server-side checks too:
 * a Supabase Edge Function that runs text + image moderation (for example
 * OpenAI's free moderation endpoint, or AWS Rekognition / Google SafeSearch
 * for nudity and violence in photos) and rejects or hides the post.
 */

// Keep this list short and extend it for your audience. Matches whole words, case-insensitive.
const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut',
  'kill yourself', 'kys',
];

const PATTERNS = BLOCKED_WORDS.map(
  (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`, 'i'),
);

// Posting personal contact details is a common harassment / spam vector.
const PHONE = /(\+?\d[\d\s().-]{8,}\d)/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;

export type CheckResult = { ok: true } | { ok: false; reason: string };

export function checkText(text: string): CheckResult {
  const t = text.normalize('NFKC');
  if (PATTERNS.some((p) => p.test(t))) {
    return { ok: false, reason: 'That contains language that breaks the community rules.' };
  }
  if (PHONE.test(t) || EMAIL.test(t)) {
    return { ok: false, reason: 'Please don’t post phone numbers or email addresses.' };
  }
  return { ok: true };
}
