import { useState, useMemo } from 'react';
import client from '../api/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return [...new Set(
    raw.split(/[,;\s\n\r\t]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
  )];
}

function validateEmails(emails: string[]): string[] {
  return emails.filter((e) => !EMAIL_REGEX.test(e));
}

export default function AddParticipantsModal({
  isOpen,
  roundNumber,
  roundId,
  onClose,
  onAdded,
}: {
  isOpen: boolean;
  roundNumber: number;
  roundId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [actorsRaw, setActorsRaw] = useState('');
  const [preselectorsRaw, setPreselectorsRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const actors = useMemo(() => parseEmails(actorsRaw), [actorsRaw]);
  const preselectors = useMemo(() => parseEmails(preselectorsRaw), [preselectorsRaw]);

  const actorErrors = useMemo(() => validateEmails(actors), [actors]);
  const preselectorErrors = useMemo(() => validateEmails(preselectors), [preselectors]);

  const hasAnyEmail = actors.length > 0 || preselectors.length > 0;
  const hasValidationErrors = actorErrors.length > 0 || preselectorErrors.length > 0;

  const handleSubmit = async () => {
    if (!hasAnyEmail || hasValidationErrors) return;

    setSubmitting(true);
    setError('');

    try {
      await client.post('/rounds/participants', {
        roundId,
        actors: actors.map((email) => ({ email })),
        preselectors: preselectors.map((email) => ({ email })),
        createNewRound: false,
      });
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add participants';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add Participants">
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Add Participants to Round {roundNumber}</h2>
            <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">Enter emails separated by commas or spaces</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
          {/* Actors */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-title-sm text-title-sm text-on-surface">Actors</label>
              {actors.length > 0 && (
                <span className="font-label-caps text-label-caps text-primary">{actors.length} email{actors.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <textarea
              value={actorsRaw}
              onChange={(e) => setActorsRaw(e.target.value)}
              placeholder="actor1@demo.com, actor2@demo.com"
              rows={3}
              className="w-full bg-surface border border-outline-variant/50 rounded-lg p-3 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
            />
            {actorErrors.length > 0 && (
              <p className="text-error font-body-xs text-body-xs mt-1">
                Invalid: {actorErrors.join(', ')}
              </p>
            )}
          </div>

          {/* Pre-Selectors */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-title-sm text-title-sm text-on-surface">Pre-Selectors</label>
              {preselectors.length > 0 && (
                <span className="font-label-caps text-label-caps text-primary">{preselectors.length} email{preselectors.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <textarea
              value={preselectorsRaw}
              onChange={(e) => setPreselectorsRaw(e.target.value)}
              placeholder="preselector1@demo.com, preselector2@demo.com"
              rows={3}
              className="w-full bg-surface border border-outline-variant/50 rounded-lg p-3 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
            />
            {preselectorErrors.length > 0 && (
              <p className="text-error font-body-xs text-body-xs mt-1">
                Invalid: {preselectorErrors.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant/20">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {actors.length + preselectors.length} participant{(actors.length + preselectors.length) !== 1 ? 's' : ''} to add
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="py-2 px-4 rounded font-title-sm text-title-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !hasAnyEmail || hasValidationErrors}
              className="py-2 px-5 rounded font-title-sm text-title-sm bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Adding...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Add Participants
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-error-container text-on-error-container p-3 rounded-lg font-body-sm text-body-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
