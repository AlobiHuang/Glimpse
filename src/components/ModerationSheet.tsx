import { useState } from 'react';
import { ActionSheet, type SheetAction } from './ActionSheet';
import { api } from '@/lib/api';
import { REPORT_REASONS } from '@/lib/config';

export type ModerationTarget = { kind: 'photo'; id: string; isMine?: boolean } | { kind: 'note'; id: string; isMine?: boolean };

type Props = {
  target: ModerationTarget | null;
  onClose: () => void;
  /** Called after the item was deleted, reported or hidden, so the screen can refresh. */
  onDone: (result: 'deleted' | 'reported' | 'blocked') => void;
  notify: (message: string) => void;
};

/**
 * "…" menu for a glimpse or a note: report it, hide everything from whoever made it,
 * or delete your own. Nobody is ever named — not even to the person blocking.
 */
export function ModerationSheet({ target, onClose, onDone, notify }: Props) {
  const [step, setStep] = useState<'menu' | 'reason'>('menu');

  const close = () => {
    setStep('menu');
    onClose();
  };

  if (!target) return null;
  const noun = target.kind === 'photo' ? 'glimpse' : 'note';

  const run = async (fn: () => Promise<void>, result: 'deleted' | 'reported' | 'blocked', message: string) => {
    close();
    try {
      await fn();
      notify(message);
      onDone(result);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const menu: SheetAction[] = target.isMine
    ? [
        {
          label: `Delete this ${noun}`,
          destructive: true,
          onPress: () =>
            run(
              () => (target.kind === 'photo' ? api.deletePhoto(target.id) : Promise.resolve()),
              'deleted',
              `Deleted from the archive.`,
            ),
        },
      ]
    : [
        { label: `Report this ${noun}`, onPress: () => setStep('reason') },
        {
          label: 'Hide everything from whoever made this',
          destructive: true,
          onPress: () =>
            run(
              () => api.blockAuthor(target.kind === 'photo' ? { photoId: target.id } : { noteId: target.id }),
              'blocked',
              'Hidden. You won’t see their glimpses or notes again.',
            ),
        },
      ];

  const reasons: SheetAction[] = REPORT_REASONS.map((reason) => ({
    label: reason,
    onPress: () =>
      run(
        () => (target.kind === 'photo' ? api.reportPhoto(target.id, reason) : api.reportNote(target.id, reason)),
        'reported',
        'Thanks. We’ll review it within 24 hours.',
      ),
  }));

  return (
    <ActionSheet
      visible
      title={step === 'reason' ? `Why are you reporting this ${noun}?` : undefined}
      message={step === 'menu' && !target.isMine ? 'Nobody is told it was you, and nobody is named to you.' : undefined}
      actions={step === 'menu' ? menu : reasons}
      onClose={step === 'reason' ? () => setStep('menu') : close}
    />
  );
}
