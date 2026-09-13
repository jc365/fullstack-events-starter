import { useState, useRef, useEffect } from 'react';
import client from '../api/client';

interface SubmitVideoModalProps {
  roundId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'url' | 'file';

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export default function SubmitVideoModal({ roundId, isOpen, onClose, onSuccess }: SubmitVideoModalProps) {
  const [tab, setTab] = useState<Tab>('file');
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVideoUrl('');
      setFile(null);
      setError('');
      setTab('file');
      setUploadProgress(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return `Invalid file type: ${f.type || 'unknown'}. Accepted: MP4, WebM, OGG, MOV`;
    }
    if (f.size > MAX_SIZE) {
      return `File too large: ${(f.size / 1024 / 1024).toFixed(1)}MB. Max: 100MB`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
    } else {
      setError('');
      setFile(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
    } else {
      setError('');
      setFile(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'url') {
      const trimmed = videoUrl.trim();
      if (!trimmed) {
        setError('Please enter a video URL');
        return;
      }
      setLoading(true);
      try {
        await client.post('/submissions', { roundId, videoUrl: trimmed });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit video');
      } finally {
        setLoading(false);
      }
    } else {
      if (!file) {
        setError('Please select a video file');
        return;
      }
      setLoading(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append('roundId', roundId);
        formData.append('video', file);
        await client.post('/submissions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e: { loaded: number; total?: number }) => {
            if (e.total) {
              setUploadProgress(Math.round((e.loaded * 100) / e.total));
            }
          },
        });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload video');
      } finally {
        setLoading(false);
        setUploadProgress(null);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit video"
        className="relative w-full max-w-md bg-surface border border-outline-variant/30 rounded-xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">Submit Video</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/30 mb-5">
          <button
            type="button"
            onClick={() => { setTab('file'); setError(''); }}
            className={`flex-1 py-2.5 font-title-sm text-title-sm border-b-2 transition-colors ${
              tab === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] align-middle mr-1.5">upload_file</span>
            File Upload
          </button>
          <button
            type="button"
            onClick={() => { setTab('url'); setError(''); }}
            className={`flex-1 py-2.5 font-title-sm text-title-sm border-b-2 transition-colors ${
              tab === 'url'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] align-middle mr-1.5">link</span>
            URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Tab */}
          {tab === 'file' && (
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                Video File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px]">movie</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-sm text-body-sm text-on-surface truncate">{file.name}</p>
                      <p className="text-xs text-on-surface-variant">{formatSize(file.size)}</p>
                    </div>
                    {uploadProgress === null && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); fileInputRef.current?.click(); }}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      </button>
                    )}
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-body-xs text-body-xs text-on-surface-variant">Uploading...</span>
                        <span className="font-body-xs text-body-xs text-on-surface font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/50 hover:border-primary/50 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-[36px] block mb-2">
                    cloud_upload
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface mb-1">
                    Click or drag a video file here
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    MP4, WebM, OGG, MOV — Max 100MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* URL Tab */}
          {tab === 'url' && (
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                Video URL
              </label>
              <input
                ref={inputRef}
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-surface-container border-b-2 border-outline-variant/30 text-on-surface px-3 py-2 rounded focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Paste a YouTube, Vimeo, or direct video URL
              </p>
            </div>
          )}

          {error && (
            <div className="bg-error-container text-on-error-container p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-outline-variant/50 text-on-surface-variant font-title-sm text-title-sm rounded hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (tab === 'file' && !file)}
              className="flex-1 py-2.5 bg-primary-container text-on-primary-container font-title-sm text-title-sm rounded hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  {tab === 'file' ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    {tab === 'file' ? 'upload_file' : 'upload'}
                  </span>
                  {tab === 'file' ? 'Upload' : 'Submit'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
