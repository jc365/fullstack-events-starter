import { useState, useMemo } from 'react';
import client from '../api/client';
import { useUserCache } from '../context/UserCacheContext';
import type { SubmissionStatus } from '../utils/submissionStatus';

interface Submission {
  id: string;
  videoUrl: string;
  actorId: string;
  duration: number | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
}

interface Participant {
  id: string;
  role: string;
  email: string | null;
  name: string | null;
}

interface ActorData {
  id: string;
  name: string;
  bestScore: number;
  bestStars: number;
  email: string;
  feedbacks: string[];
  selected: boolean;
}

const SCORE_TO_STARS = (s: number): number => Math.min(5, Math.max(1, Math.round(s / 2)));
const STARS_TO_MIN_SCORE = (stars: number): number => stars * 2;

export default function CreateNextRoundModal({
  isOpen,
  roundId,
  submissions,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  roundId: string;
  submissions: Submission[];
  participants: Participant[];
  onClose: () => void;
  onCreated: (newRoundId: string) => void;
}) {
  const { getUser } = useUserCache();
  const [minStars, setMinStars] = useState(3);
  const [actorStates, setActorStates] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createEmpty, setCreateEmpty] = useState(false);

  const minScore = STARS_TO_MIN_SCORE(minStars);
  const hasAnyReviewed = submissions.some((s) => s.score !== null);


  const actorData = useMemo<ActorData[]>(() => {
    const filteredSubs = submissions.filter((s) => s.score !== null && s.score >= minScore);

    const map = new Map<string, ActorData>();
    for (const s of filteredSubs) {
      const user = getUser(s.actorId);
      if (!user?.email) continue;

      let entry = map.get(s.actorId);
      if (!entry) {
        entry = {
          id: s.actorId,
          name: user.name ?? s.actorId,
          email: user.email,
          bestScore: s.score!,
          bestStars: SCORE_TO_STARS(s.score!),
          feedbacks: [],
          selected: actorStates[s.actorId] ?? true,
        };
        map.set(s.actorId, entry);
      }
      if (s.score! > entry.bestScore) {
        entry.bestScore = s.score!;
        entry.bestStars = SCORE_TO_STARS(s.score!);
      }
      if (s.feedback) {
        entry.feedbacks.push(s.feedback);
      }
    }
    
    return Array.from(map.values());
  }, [submissions, minScore, actorStates, getUser]);

  const selectedCount = actorData.filter((a) => a.selected).length;
  const noActorsMatch = hasAnyReviewed && actorData.length === 0;

  const toggleActor = (id: string) => {
    setActorStates((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    actorData.forEach((a) => { next[a.id] = true; });
    setActorStates(next);
  };

  const deselectAll = () => {
    const next: Record<string, boolean> = {};
    actorData.forEach((a) => { next[a.id] = false; });
    setActorStates(next);
  };

  const handleCreate = async () => {
    const selected = actorData.filter((a) => a.selected);
    if (selected.length === 0 && !createEmpty) {
      setError('Select at least one actor');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const actorEmails = selected
        .map((a) => a.email)
        .filter((email): email is string => !!email);
      const res = await client.post('/rounds/participants', {
        roundId,
        actors: actorEmails.map((email) => ({ email })),
        preselectors: [],
        createNewRound: true,
      });
      onCreated(res.data.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create round';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Create Next Round">
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Create Next Round</h2>
            <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">Select actors to carry forward</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Score Filter */}
        <div className="px-6 pb-4">
          <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-2 block">Minimum Score</label>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setMinStars(s)}
                  className={`p-1 rounded transition-colors ${s <= minStars ? 'text-primary' : 'text-outline-variant hover:text-on-surface-variant'}`}
                  aria-label={`${s} star${s !== 1 ? 's' : ''}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {s <= minStars ? 'star' : 'star_border'}
                  </span>
                </button>
              ))}
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {minStars}+ stars
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant/20 mx-6" />

        {/* Actor List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!hasAnyReviewed ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">rate_review</span>
              <p className="text-on-surface-variant font-body-lg text-body-lg">No actors with reviews yet</p>
            </div>
          ) : noActorsMatch ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">filter_list_off</span>
              <p className="text-on-surface-variant font-body-lg text-body-lg">
                No actors with {minStars} stars or more
              </p>
              <label className="flex items-center gap-2 mt-4 justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={createEmpty}
                  onChange={(e) => setCreateEmpty(e.target.checked)}
                  className="accent-[var(--color-primary)] w-4 h-4"
                />
                <span className="font-body-sm text-body-sm text-on-surface">Create empty round</span>
              </label>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {actorData.length} actor{actorData.length !== 1 ? 's' : ''} match filter
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-primary hover:text-primary-fixed-dim font-label-caps text-label-caps transition-colors">
                    Select All
                  </button>
                  <span className="text-outline-variant">·</span>
                  <button onClick={deselectAll} className="text-primary hover:text-primary-fixed-dim font-label-caps text-label-caps transition-colors">
                    Deselect All
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {actorData.map((a) => (
                  <li key={a.id}>
                    <label className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${a.selected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-outline-variant/30 bg-surface hover:bg-surface-container'
                      }`}>
                      <input
                        type="checkbox"
                        checked={a.selected}
                        onChange={() => toggleActor(a.id)}
                        className="mt-1 accent-[var(--color-primary)] w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{a.name}</span>
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={`material-symbols-outlined text-[14px] ${i < a.bestStars ? 'text-primary' : 'text-outline-variant'}`}>
                                star
                              </span>
                            ))}
                          </span>
                        </div>
                        {a.email && (
                          <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{a.email}</p>
                        )}
                        {a.feedbacks.length > 0 && (
                          <div className="mt-1 flex flex-col gap-1">
                            {a.feedbacks.map((f, i) => (
                              <p key={i} className="text-on-surface-variant font-body-xs text-body-xs line-clamp-2 italic">
                                &ldquo;{f}&rdquo;
                              </p>
                            ))}
                          </div>
                        )}
                        <span className="font-label-caps text-label-caps text-on-surface-variant mt-1 inline-block">
                          Best: {a.bestStars} star{a.bestStars !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant/20">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {selectedCount > 0 ? `${selectedCount} actor${selectedCount !== 1 ? 's' : ''} selected` : createEmpty ? 'Empty round' : '0 actors selected'}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="py-2 px-4 rounded font-title-sm text-title-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || (selectedCount === 0 && !createEmpty)}
              className="py-2 px-5 rounded font-title-sm text-title-sm bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Create Round
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
