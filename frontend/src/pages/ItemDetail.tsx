import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useUser } from '../context/UserContext';
import { useUserCache } from '../context/UserCacheContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { getRoleBadge } from '../utils/roleConfig';

interface Participant {
  userId: string;
  role: string;
}

interface Round {
  id: string;
  number: number;
  participants: { actorId: string; role: string }[];
  submissions?: { id: string; status: string }[];
}

interface Casting {
  id: string;
  title: string;
  description: string;
  participants: Participant[];
  rounds: Round[];
}

export default function CastingDetail() {
  const { castingId } = useParams<{ castingId: string }>();
  const navigate = useNavigate();
  const { getRoleInCasting, isDirectorOf } = useUser();
  const { ensureUser } = useUserCache();
  const { showSuccess, showError } = useToast();
  const [casting, setCasting] = useState<Casting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, { total: number; pending: number; reviewed: number; selected: number; rejected: number }>>({});

  const role = castingId ? getRoleInCasting(castingId) : null;
  const isDirector = castingId ? isDirectorOf(castingId) : false;

  const fetchCasting = () => {
    if (!castingId) return;
    client.get(`/castings/${castingId}`)
      .then((res) => setCasting(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCasting(); }, [castingId]);

  useEffect(() => {
    if (!casting) return;
    casting.participants.forEach((p) => ensureUser(p.userId));
  }, [casting, ensureUser]);

  useEffect(() => {
    if (!casting) return;
    casting.rounds.forEach((round) => {
      client.get(`/rounds/${round.id}`)
        .then((res) => {
          const data = res.data as { submissions?: { id: string; status: string }[] };
          const subs = data.submissions ?? [];
          setSubmissionCounts((prev) => ({
            ...prev,
            [round.id]: {
              total: subs.length,
              pending: subs.filter((s) => s.status === 'pending').length,
              reviewed: subs.filter((s) => s.status === 'reviewed').length,
              selected: subs.filter((s) => s.status === 'selected').length,
              rejected: subs.filter((s) => s.status === 'rejected').length,
            },
          }));
        })
        .catch(() => {});
    });
  }, [casting]);

  const handleDelete = async () => {
    if (!castingId) return;
    try {
      await client.delete(`/castings/${castingId}`);
      showSuccess('Casting deleted');
      navigate('/dashboard');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete casting');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading casting...
      </div>
    );
  }

  if (error || !casting) {
    return (
      <div className="bg-error-container text-on-error-container p-4 rounded-xl">
        Error: {error || 'Casting not found'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/dashboard" className="text-primary hover:text-primary-fixed-dim transition-colors font-body-sm text-body-sm flex items-center gap-1 mb-4">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-background">
              {casting.title}
            </h1>
            <p className="text-on-surface-variant mt-2 font-body-lg text-lg leading-relaxed">
              {casting.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {role && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getRoleBadge(role).className}`}>
                <span>{getRoleBadge(role).icon}</span>
                <span className="font-label-caps text-label-caps uppercase">
                  Your role: {getRoleBadge(role).label}
                </span>
              </span>
            )}
            {isDirector && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 rounded hover:bg-surface-container transition-colors"
                  title="Edit casting"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded hover:bg-error-container/30 transition-colors"
                  title="Delete casting"
                >
                  <span className="material-symbols-outlined text-error">delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rounds */}
      <div className="bg-surface border border-outline-variant/30 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-md text-headline-md text-on-background">Rounds</h2>
        </div>
        {casting.rounds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {casting.rounds.map((round) => {
              const counts = submissionCounts[round.id];
              const actors = round.participants.filter((p) => p.role === 'actor').length;
              const preselectors = round.participants.filter((p) => p.role === 'preselector').length;
              return (
                <Link
                  key={round.id}
                  to={`/rounds/${round.id}`}
                  className="group bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 hover:border-primary/50 hover:bg-surface-container-low transition-colors duration-300 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display-lg text-display-lg text-primary">Round {round.number}</span>
                    {/* <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span> */}
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    <span className="font-body-sm text-body-sm">Participants: {round.participants.length}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-on-surface-variant mb-3 pl-[22px]">
                    <span>Preselectors: {preselectors}</span>
                    <span>Actors: {actors}</span>
                  </div>

                  <div className="w-full h-px bg-outline-variant/20" />

                  <div className="flex items-center gap-1.5 text-on-surface-variant mt-3 mb-1">
                    <span className="material-symbols-outlined text-[14px]">videocam</span>
                    <span className="font-body-sm text-body-sm">Submissions: {counts ? counts.total : '...'}</span>
                  </div>
                  {counts ? (
                    <div className="pl-[22px]">
                      <div className="flex gap-4 text-xs text-on-surface-variant">
                        <span>Pendings: <span className="text-primary font-medium">{counts.pending}</span></span>
                        <span>Revieweds: <span className="font-medium">{counts.reviewed}</span></span>
                      </div>
                      {(counts.selected > 0 || counts.rejected > 0) && (
                        <div className="flex gap-4 text-xs text-on-surface-variant mt-1">
                          <span>Selecteds: <span className="text-green-600 font-medium">{counts.selected}</span></span>
                          <span>Rejected: <span className="text-red-600 font-medium">{counts.rejected}</span></span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pl-[22px]">
                      <p className="text-xs text-on-surface-variant">Loading...</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-on-surface-variant text-sm">No rounds yet.</p>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditCastingModal
          casting={casting}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchCasting();
            showSuccess('Casting updated');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Casting"
        message={`Are you sure you want to delete "${casting.title}"? This will permanently delete all rounds and submissions.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function EditCastingModal({
  casting,
  onClose,
  onSaved,
}: {
  casting: Casting;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(casting.title);
  const [description, setDescription] = useState(casting.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await client.put(`/castings/${casting.id}`, {
        title: title.trim(),
        description: description.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update casting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit casting">
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 w-full max-w-md mx-4 p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Edit Casting</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface border border-outline-variant/50 rounded-lg p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface border border-outline-variant/50 rounded-lg p-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {error && (
            <p className="text-error font-body-sm text-body-sm">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="py-2 px-4 rounded font-title-sm text-title-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-2 px-5 rounded font-title-sm text-title-sm bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
