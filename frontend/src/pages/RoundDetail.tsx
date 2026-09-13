import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useUser } from '../context/UserContext';
import { useUserCache } from '../context/UserCacheContext';
import { useToast } from '../context/ToastContext';
import SubmitVideoModal from '../components/SubmitVideoModal';
import VideoPlayerModal from '../components/VideoPlayerModal';
import CreateNextRoundModal from '../components/CreateNextRoundModal';
import AddParticipantsModal from '../components/AddParticipantsModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useVideoUrls } from '../hooks/useVideoUrls';
import { getStatusStyle, type SubmissionStatus } from '../utils/submissionStatus';
import { scoreToStars } from '../utils/scoring';
import { getRoleBadge } from '../utils/roleConfig';

interface Participant {
  id: string;
  role: string;
  email: string | null;
  name: string | null;
}

interface Submission {
  id: string;
  videoUrl: string;
  videoKey?: string | null;
  actorId: string;
  duration: number | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
}

interface Round {
  id: string;
  number: number;
  castingId: string;
  participants: Participant[];
  submissions: Submission[];
}

export default function RoundDetail() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const { getRoleInRound, isDirectorOf, isActorOf } = useUser();
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCreateNextRound, setShowCreateNextRound] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSubmission, setShowDeleteSubmission] = useState<string | null>(null);
  const [castingTitle, setCastingTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<SubmissionStatus>>(new Set(['pending', 'reviewed', 'selected', 'rejected']));

  const { showSuccess, showError } = useToast();
  const { getUser, ensureUser } = useUserCache();
  const role = roundId ? getRoleInRound(roundId) : null;
  const isDirector = round ? isDirectorOf(round.castingId) : false;
  const isActor = roundId ? isActorOf(roundId) : false;

  const { videoUrls, refreshAll: refreshVideoUrls } = useVideoUrls(round?.submissions || []);

  const allStatuses: SubmissionStatus[] = ['pending', 'reviewed', 'selected', 'rejected'];

  const toggleStatusFilter = (status: SubmissionStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filteredSubmissions = round ? round.submissions.filter(s => statusFilter.has(s.status)) : [];

  useEffect(() => {
    if (!roundId) return;
    client.get(`/rounds/${roundId}`)
      .then((res) => {
        const data = res.data;
        data.participants = data.participants.map((p: { actorId: string; role: string; email: string | null; name: string | null }) => ({
          id: p.actorId,
          role: p.role,
          email: p.email,
          name: p.name,
        }));
        setRound(data);
        return client.get(`/castings/${data.castingId}`);
      })
      .then((res) => {
        if (res) setCastingTitle(res.data.title);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roundId]);

  useEffect(() => {
    if (!round) return;
    round.participants.forEach((p) => {
      ensureUser(p.id);
    });
  }, [round, ensureUser]);

  const handleDeleteRound = async () => {
    if (!round) return;
    try {
      await client.delete(`/rounds/${round.id}`);
      showSuccess('Round deleted');
      navigate(`/castings/${round.castingId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete round');
    }
  };

  const [showRemoveParticipant, setShowRemoveParticipant] = useState<{ userId: string; name: string } | null>(null);

  const handleRemoveParticipant = async (userId: string) => {
    if (!round) return;
    try {
      await client.delete(`/rounds/${round.id}/participants/${userId}`);
      showSuccess('Participant removed');
      setShowRemoveParticipant(null);
      client.get(`/rounds/${roundId}`).then((res) => {
        const data = res.data;
        data.participants = data.participants.map((p: { actorId: string; role: string; email: string | null; name: string | null }) => ({
          id: p.actorId, role: p.role, email: p.email, name: p.name,
        }));
        setRound(data);
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove participant');
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await client.delete(`/submissions/${submissionId}`);
      showSuccess('Submission deleted');
      setShowDeleteSubmission(null);
      client.get(`/rounds/${roundId}`).then((res) => {
        const data = res.data;
        data.participants = data.participants.map((p: { actorId: string; role: string; email: string | null; name: string | null }) => ({
          id: p.actorId, role: p.role, email: p.email, name: p.name,
        }));
        setRound(data);
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete submission');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading round...
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="bg-error-container text-on-error-container p-4 rounded-xl">
        Error: {error || 'Round not found'}
      </div>
    );
  }

  const actors = round.participants.filter((p) => p.role === 'actor');
  const preselectors = round.participants.filter((p) => p.role === 'preselector');

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Center: Video Grid */}
      <div className="flex-1">
        <div className="mb-8">
          <Link to={`/castings/${round.castingId}`} className="text-primary hover:text-primary-fixed-dim transition-colors font-body-sm text-body-sm flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Casting
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-background">
                Round {round.number}{castingTitle && ` — ${castingTitle}`}
              </h1>
              <p className="text-on-surface-variant mt-1 font-body-lg text-body-lg">
                {filteredSubmissions.length === round.submissions.length
                  ? `${round.submissions.length} submission${round.submissions.length !== 1 ? 's' : ''} received`
                  : `${filteredSubmissions.length} of ${round.submissions.length} submissions shown`
                }
              </p>
            </div>
            <div className="flex gap-3">
              {isActor && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="bg-primary-container text-on-primary-container font-title-sm text-title-sm py-2 px-4 rounded hover:bg-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Submit Video
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Tags */}
        {round.submissions.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {allStatuses.map(status => {
              const style = getStatusStyle(status);
              const active = statusFilter.has(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full font-label-caps text-label-caps transition-colors ${active
                      ? style.chipClass
                      : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                    }`}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Video Grid */}
        {filteredSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {filteredSubmissions.map((s) => {
              const originalIdx = round.submissions.findIndex(sub => sub.id === s.id);
              return (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  isDirector={isDirector}
                  onPlay={() => setSelectedVideoIndex(originalIdx)}
                  onDelete={() => setShowDeleteSubmission(s.id)}
                  resolvedUrl={videoUrls[s.id]}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface border border-outline-variant/30 rounded-xl">
            <span className="material-symbols-outlined text-6xl text-outline mb-4 block">videocam_off</span>
            <p className="text-on-surface-variant font-body-lg text-body-lg">
              {round.submissions.length === 0 ? 'No submissions yet.' : 'No submissions match the selected filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar: Round Management */}
      <div className="w-80 flex-shrink-0 bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-[calc(100vh-8rem)] sticky top-16">
        {/* Sticky Actions - always visible */}
        {isDirector && (
          <div className="flex-shrink-0 border-b border-outline-variant/20 p-4 flex flex-col gap-2">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Actions</h4>
            <button
              onClick={() => setShowAddParticipants(true)}
              className="w-full py-2 border border-outline-variant/50 text-on-surface-variant font-label-caps text-label-caps rounded hover:bg-surface-container hover:text-on-surface transition-colors tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Add Participants
            </button>
            <button
              onClick={() => setShowCreateNextRound(true)}
              className="w-full py-2 bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:bg-primary-container/80 transition-colors tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Create Next Round
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-1.5 border border-error/30 text-error font-label-caps text-label-caps rounded hover:bg-error-container/20 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Delete Round
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-8">
          {/* Round Details */}
          <section>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Round Management</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Status</span>
                <span className="bg-primary-container/20 text-primary-fixed-dim px-2 py-1 rounded font-label-caps text-label-caps border border-primary-container/30">
                  IN PROGRESS
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Total Submissions</span>
                <span className="font-body-sm text-body-sm text-on-surface">
                  {round.submissions.length}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Round</span>
                <span className="font-body-sm text-body-sm text-on-surface">
                  {round.number}
                </span>
              </div>
            </div>
          </section>

          {/* Role Badge */}
          {role && (
            <section>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border w-full justify-center ${getRoleBadge(role).className}`}>
                <span>{getRoleBadge(role).icon}</span>
                <span className="font-label-caps text-label-caps uppercase">
                  Your role: {getRoleBadge(role).label}
                </span>
              </span>
            </section>
          )}

          {/* Pre-Selectors */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-title-sm text-title-sm text-on-surface">Pre-Selectors</h4>
              <span className="font-label-caps text-label-caps text-on-surface-variant">{preselectors.length} Total</span>
            </div>
            {preselectors.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {preselectors.map((p) => {
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container border border-outline-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-body-sm text-body-sm text-on-surface leading-tight truncate">{getUser(p.id)?.name || p.id}</p>
                        <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{getUser(p.id)?.email || p.email}</p>
                      </div>
                      {isDirector && (
                        <button
                          onClick={() => setShowRemoveParticipant({ userId: p.id, name: getUser(p.id)?.name || p.email || p.id })}
                          className="text-error/60 hover:text-error transition-colors flex-shrink-0"
                          title="Remove participant"
                        >
                          <span className="text-error material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-on-surface-variant text-sm">No pre-selectors assigned.</p>
            )}
          </section>

          {/* Actors List */}
          <section className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-title-sm text-title-sm text-on-surface">Actors</h4>
              <span className="font-label-caps text-label-caps text-on-surface-variant">{actors.length} Total</span>
            </div>
            {actors.length > 0 ? (
              <ul className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-2">
                {actors.map((a) => {
                  return (
                    <li key={a.id} className={`flex items-center gap-3`}>
                      <div className="w-8 h-8 rounded bg-surface-container border border-outline-variant flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-sm text-body-sm text-on-surface leading-tight truncate">{getUser(a.id)?.name || a.name || a.id}</p>
                        <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{getUser(a.id)?.email || a.email}</p>
                      </div>
                      {isDirector && (
                        <button
                          onClick={() => setShowRemoveParticipant({ userId: a.id, name: getUser(a.id)?.name || a.name || a.id })}
                          className="text-error/60 hover:text-error transition-colors flex-shrink-0"
                          title="Remove participant"
                        >
                          <span className="text-error material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-on-surface-variant text-sm">No actors assigned.</p>
            )}
          </section>
        </div>
      </div>

      <SubmitVideoModal
        roundId={round.id}
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={() => {
          setShowSubmitModal(false);
          window.location.reload();
        }}
      />

      <VideoPlayerModal
        isOpen={selectedVideoIndex !== null}
        submissions={round.submissions}
        currentIndex={selectedVideoIndex ?? 0}
        isDirector={isDirector}
        onClose={() => setSelectedVideoIndex(null)}
        onNavigate={(idx) => setSelectedVideoIndex(idx)}
        resolvedUrls={videoUrls}
        onVideoError={() => refreshVideoUrls()}
        onReviewUpdated={() => {
          client.get(`/rounds/${roundId}`).then((res) => {
            const data = res.data;
            data.participants = data.participants.map((p: { actorId: string; role: string; email: string | null; name: string | null }) => ({
              id: p.actorId, role: p.role, email: p.email, name: p.name,
            }));
            setRound(data);
          });
        }}
      />

      <CreateNextRoundModal
        isOpen={showCreateNextRound}
        roundId={round.id}
        submissions={round.submissions}
        participants={round.participants}
        onClose={() => setShowCreateNextRound(false)}
        onCreated={(newRoundId) => navigate(`/rounds/${newRoundId}`)}
      />

      <AddParticipantsModal
        isOpen={showAddParticipants}
        roundNumber={round.number}
        roundId={round.id}
        onClose={() => setShowAddParticipants(false)}
        onAdded={() => {
          client.get(`/rounds/${roundId}`).then((res) => {
            const data = res.data;
            data.participants = data.participants.map((p: { actorId: string; role: string; email: string | null; name: string | null }) => ({
              id: p.actorId, role: p.role, email: p.email, name: p.name,
            }));
            setRound(data);
          });
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Round"
        message={`Are you sure you want to delete Round ${round.number}? This will permanently delete all submissions.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteRound}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteSubmission !== null}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => showDeleteSubmission && handleDeleteSubmission(showDeleteSubmission)}
        onCancel={() => setShowDeleteSubmission(null)}
      />

      <ConfirmDialog
        isOpen={showRemoveParticipant !== null}
        title="Remove Participant"
        message={`Are you sure you want to remove ${showRemoveParticipant?.name} from this round?`}
        confirmLabel="Remove"
        onConfirm={() => showRemoveParticipant && handleRemoveParticipant(showRemoveParticipant.userId)}
        onCancel={() => setShowRemoveParticipant(null)}
      />
    </div>
  );
}

function SubmissionCard({
  submission,
  isDirector,
  onPlay,
  onDelete,
  resolvedUrl,
}: {
  submission: Submission;
  isDirector: boolean;
  onPlay: () => void;
  onDelete: () => void;
  resolvedUrl?: string;
}) {
  const { getUser, ensureUser } = useUserCache();
  const actor = getUser(submission.actorId);
  const statusStyle = getStatusStyle(submission.status);

  useEffect(() => {
    ensureUser(submission.actorId);
  }, [submission.actorId, ensureUser]);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden group hover:border-primary/50 transition-colors duration-300">
      {/* Video Thumbnail Placeholder */}
      <div
        onClick={onPlay}
        className="relative w-full aspect-video bg-surface-container-highest overflow-hidden cursor-pointer"
      >
        <video
          src={resolvedUrl || submission.videoUrl}
          preload="metadata"
          muted
          className="w-full h-full object-cover"
          onLoadedData={(e) => {
            const video = e.currentTarget;
            video.currentTime = 1;
          }}
        />
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-[24px]">play_arrow</span>
          </div>
        </div>
        {/* Status Chip */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded font-label-caps text-label-caps backdrop-blur-sm ${statusStyle.chipClass}`}>
          {statusStyle.label}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface truncate">{actor?.name || submission.actorId}</h3>
            {actor?.email && (
              <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{actor.email}</p>
            )}
            <p className="text-[11px] text-on-surface-variant font-mono">#{submission.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          {submission.score != null && submission.score > 0 && (
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`material-symbols-outlined text-[14px] ${s <= scoreToStars(submission.score!) ? 'text-primary' : 'text-outline-variant'}`}>
                  {s <= scoreToStars(submission.score!) ? 'star' : 'star_border'}
                </span>
              ))}
            </span>
          )}
          {submission.duration != null && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {formatDuration(submission.duration)}
            </span>
          )}
        </div>
        <div className="w-full h-px bg-outline-variant/20 my-1" />
        {submission.feedback && submission.feedback.trim() && submission.feedback !== 'No feedback yet.' && (
          <>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">Director&apos;s Note</p>
            <p className="font-body-sm text-body-sm text-on-surface line-clamp-2">{submission.feedback}</p>
          </>
        )}
        {isDirector && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="mt-1 border border-error/30 text-error font-title-sm text-title-sm py-2 px-4 rounded hover:bg-error-container/20 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete Submission
          </button>
        )}
      </div>
    </div>
  );
}
