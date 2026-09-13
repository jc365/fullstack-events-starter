import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { useUserCache } from '../context/UserCacheContext';
import { getStatusStyle, type SubmissionStatus } from '../utils/submissionStatus';
import { scoreToStars } from '../utils/scoring';

interface Submission {
  id: string;
  videoUrl: string;
  actorId: string;
  duration: number | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
}

interface VideoPlayerModalProps {
  isOpen: boolean;
  submissions: Submission[];
  currentIndex: number;
  isDirector: boolean;
  isActor?: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onReviewUpdated: () => void;
  resolvedUrls?: Record<string, string>;
  onVideoError?: (submissionId: string) => void;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function getVideoType(url: string): 'youtube' | 'vimeo' | 'local' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'local';
}

function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', ogv: 'video/ogg',
    mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  };
  return mimeMap[ext] || 'video/mp4';
}

function starsToScore(stars: number): number {
  return stars * 2;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayerModal({
  isOpen, submissions, currentIndex, isDirector, isActor = false, onClose, onNavigate, onReviewUpdated,
  resolvedUrls = {}, onVideoError,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStars, setSelectedStars] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [localDuration, setLocalDuration] = useState<number | null>(null);

  const { getUser, ensureUser } = useUserCache();
  const submission = submissions[currentIndex];
  const hasReview = submission?.score !== null;
  const duration = localDuration ?? submission?.duration ?? null;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!submission) return;
    setSelectedStars(submission.score !== null ? Math.max(1, Math.min(5, scoreToStars(submission.score))) : null);
    setFeedback(submission.feedback || '');
    setError('');
    setSuccess('');
    setLocalDuration(null);
  }, [submission]);

  useEffect(() => {
    if (!isOpen || !submission) return;
    ensureUser(submission.actorId);
  }, [isOpen, submission, ensureUser]);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, [isOpen, currentIndex]);

  const handleLoadedMetadata = async () => {
    if (!videoRef.current || !submission) return;
    const dur = videoRef.current.duration;
    if (!isFinite(dur) || dur <= 0) return;
    setLocalDuration(dur);
    if (submission.duration == null) {
      try {
        await client.patch(`/submissions/${submission.id}/metadata`, { duration: Math.round(dur) });
      } catch {
        // silently ignore
      }
    }
  };

  if (!isOpen || !submission) return null;

  const resolvedUrl = resolvedUrls[submission.id] || submission.videoUrl;
  const type = getVideoType(resolvedUrl);
  const actorUser = getUser(submission.actorId);
  const actorDisplay = actorUser?.name || submission.actorId;
  const actorEmail = actorUser?.email;
  const statusStyle = getStatusStyle(submission.status);
  const prev = () => { if (currentIndex > 0) onNavigate(currentIndex - 1); };
  const next = () => { if (currentIndex < submissions.length - 1) onNavigate(currentIndex + 1); };
  const first = () => { if (currentIndex > 0) onNavigate(0); };
  const last = () => { if (currentIndex < submissions.length - 1) onNavigate(submissions.length - 1); };

  const handleSubmitReview = async () => {
    if (selectedStars === null) {
      setError('Please select a score');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await client.patch(`/submissions/${submission.id}/review`, {
        score: starsToScore(selectedStars),
        feedback: feedback.trim(),
      });
      setSuccess(hasReview ? 'Review updated!' : 'Review submitted!');
      onReviewUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Video: ${actorDisplay}`}
        className="relative w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Previous submission"
              className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
            </button>
            <span className="font-body-sm text-body-sm text-on-surface-variant px-2">
              {currentIndex + 1} / {submissions.length}
            </span>
            <button
              onClick={next}
              disabled={currentIndex === submissions.length - 1}
              aria-label="Next submission"
              className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>

            <div className="w-px h-6 bg-outline-variant/30 mx-2" />

            <button
              onClick={first}
              disabled={currentIndex === 0}
              aria-label="First submission"
              className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">first_page</span>
            </button>
            <button
              onClick={last}
              disabled={currentIndex === submissions.length - 1}
              aria-label="Last submission"
              className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">last_page</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-title-sm text-title-sm text-on-surface">{actorDisplay}</span>
            {actorEmail && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">{actorEmail}</span>
            )}
            <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps ${statusStyle.badgeClass}`}>
              {statusStyle.label}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Film strip container wrapping everything */}
        <div className="bg-black rounded-xl overflow-hidden">
          {/* Top perforations */}
          <div className="flex h-3">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-black'}`} />
            ))}
          </div>

          {/* Content area */}
          <div className="bg-surface">
            <div className="flex gap-4 p-4">
              {/* Video Container */}
              <div className="flex-1 min-w-0">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  {type === 'youtube' && (
                    <iframe
                      key={submission.id}
                      src={`https://www.youtube.com/embed/${extractYouTubeId(resolvedUrl)}?autoplay=1&rel=0`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={`Video: ${actorDisplay}`}
                    />
                  )}
                  {type === 'vimeo' && (
                    <iframe
                      key={submission.id}
                      src={`https://player.vimeo.com/video/${extractVimeoId(resolvedUrl)}?autoplay=1`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={`Video: ${actorDisplay}`}
                    />
                  )}
                  {type === 'local' && (
                    <video
                      key={submission.id}
                      ref={videoRef}
                      controls
                      autoPlay
                      className="absolute inset-0 w-full h-full object-contain"
                      onLoadedMetadata={handleLoadedMetadata}
                      onError={() => onVideoError?.(submission.id)}
                    >
                      <source src={resolvedUrl} type={getMimeType(resolvedUrl)} />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </div>

              {/* Review Panel (director only) */}
              {isDirector && (
                <div className="w-72 flex-shrink-0 bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4">
                  <h3 className="font-title-sm text-title-sm text-on-surface">Review</h3>

                  {/* Stars - only visible for directors, not actors */}
                  {!isActor && (
                    <div>
                      <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                        Score
                      </label>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => {
                          const starNum = i + 1;
                          const isSelected = selectedStars !== null && starNum <= selectedStars;
                          return (
                            <button
                              key={starNum}
                              type="button"
                              onClick={() => setSelectedStars(starNum === selectedStars ? null : starNum)}
                              aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
                              className="text-2xl transition-colors"
                            >
                              {isSelected ? '⭐' : '☆'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="flex-1">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Optional feedback..."
                      rows={4}
                      className="w-full bg-surface-container border-b-2 border-outline-variant/30 text-on-surface px-3 py-2 rounded focus:outline-none focus:border-primary transition-colors resize-none text-sm"
                    />
                  </div>

                  {/* Messages */}
                  {error && (
                    <div className="bg-error-container text-on-error-container p-2 rounded text-xs">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-primary-container/20 text-primary-fixed-dim p-2 rounded text-xs border border-primary-container/30">
                      {success}
                    </div>
                  )}

                  {/* Submit Button - only visible for directors, not actors */}
                  {!isActor && (
                    <button
                      onClick={handleSubmitReview}
                      disabled={loading || selectedStars === null}
                      className="w-full py-2.5 bg-primary-container text-on-primary-container font-title-sm text-title-sm rounded hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            {hasReview ? 'edit' : 'rate_review'}
                          </span>
                          {hasReview ? 'Update Review' : 'Submit Review'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Metadata bar below video + review */}
            <div className="px-5 pb-4 flex items-center gap-4 text-on-surface-variant">
              <span className="font-body-sm text-body-sm">{actorDisplay}</span>
              {actorEmail && (
                <span className="font-body-sm text-body-sm text-on-surface-variant/70">{actorEmail}</span>
              )}
              {duration != null && (
                <span className="font-body-sm text-body-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {formatDuration(duration)}
                </span>
              )}
            </div>
          </div>

          {/* Bottom perforations */}
          <div className="flex h-3">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-black'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
