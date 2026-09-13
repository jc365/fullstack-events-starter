/**
 * @file useVideoUrls.ts
 * @module hooks
 *
 * Hook que precarga presigned URLs para submissions con videoKey (R2).
 * Si un video da error 403, regenera todas las URLs de la página.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

interface Submission {
  id: string;
  videoUrl: string;
  videoKey?: string | null;
}

interface VideoUrlMap {
  [submissionId: string]: string;
}

export function useVideoUrls(submissions: Submission[]): {
  videoUrls: VideoUrlMap;
  loading: boolean;
  refreshAll: () => void;
} {
  const [videoUrls, setVideoUrls] = useState<VideoUrlMap>({});
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchUrls = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setLoading(true);

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await client.get(`/videos/${id}/url`);
        return { id, url: res.data.url as string };
      })
    );

    if (!mountedRef.current) return;

    const newUrls: VideoUrlMap = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newUrls[result.value.id] = result.value.url;
      }
    }
    setVideoUrls((prev) => ({ ...prev, ...newUrls }));
    setLoading(false);
  }, []);

  const refreshAll = useCallback(() => {
    const r2Ids = submissions
      .filter((s) => s.videoKey)
      .map((s) => s.id);
    fetchUrls(r2Ids);
  }, [submissions, fetchUrls]);

  useEffect(() => {
    mountedRef.current = true;
    refreshAll();
    return () => { mountedRef.current = false; };
  }, [refreshAll]);

  const handleError = useCallback((_submissionId: string) => {
    // On 403, refresh all URLs
    refreshAll();
  }, [refreshAll]);

  // Attach error handler to window for VideoPlayerModal to call
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__videoUrlError = handleError;
    return () => {
      const w = window as unknown as Record<string, unknown>;
      delete w.__videoUrlError;
    };
  }, [handleError]);

  return { videoUrls, loading, refreshAll };
}
