// frontend/src/api/client.ts
import axios from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Guardar estado anterior para comparar
let previousParticipationsData = '';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

const TTL_CONFIG: Record<string, number> = {
  '/castings': 5 * 60 * 1000,
  '/rounds': 2 * 60 * 1000,
  '/submissions': 30 * 1000,
  '/participations': 30 * 1000,
  '/users': 10 * 60 * 1000,
};

const DEFAULT_TTL = 2 * 60 * 1000;

function getTTL(url: string): number {
  for (const [pattern, ttl] of Object.entries(TTL_CONFIG)) {
    if (url.includes(pattern)) return ttl;
  }
  return DEFAULT_TTL;
}

function getCacheKey(config: AxiosRequestConfig): string | null {
  if (config.method && config.method.toUpperCase() !== 'GET') return null;
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.url || ''}${params}`;
}

function isValidEntry(entry: CacheEntry, ttl: number): boolean {
  return Date.now() - entry.timestamp < ttl;
}

function invalidateExact(key: string): void {
  cache.delete(key);
}

function invalidateByPattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

function extractIdFromUrl(url: string, segment: string): string | null {
  const parts = url.split('/');
  const idx = parts.indexOf(segment);
  if (idx !== -1 && idx + 1 < parts.length) {
    return parts[idx + 1];
  }
  return null;
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // -- Retirado el log de required en DEV (no tiene utilidad en la consola del browser) 
  // if (import.meta.env.DEV) {
  //   const method = config.method?.toUpperCase() || 'GET';
  //   const url = config.url || '';
  //   console.log(`🚀 ${method} ${url}`);
  // }

  if (config.method && config.method.toUpperCase() === 'GET') {
    const cacheKey = getCacheKey(config);
    if (cacheKey) {
      const entry = cache.get(cacheKey);
      const ttl = getTTL(config.url || '');
      if (entry && isValidEntry(entry, ttl)) {
        if (import.meta.env.DEV) console.log(`... usando CACHE en ${cacheKey}`);
        (config as AxiosRequestConfig & { adapter: unknown }).adapter = () =>
          Promise.resolve({
            data: entry.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          });
      }
    }
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    const url = response.config.url || '';
    const method = response.config.method?.toUpperCase();

    if (import.meta.env.DEV) {
      if (url.includes('/me/participations')) {
        //-- Solo log si los datos cambiaron
        const dataStr = JSON.stringify(response.data);
        if (dataStr !== previousParticipationsData) {
          console.log('✅ GET </users/me/participations> updated:', response.data);
          previousParticipationsData = dataStr;
        }
      } else {
        //-- Log normal para otras peticiones
        console.log(`✅ ${method} ${url}`, response.data);
      }
    }

    if (method === 'GET') {
      const cacheKey = getCacheKey(response.config);
      if (cacheKey) {
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
    }

    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (url.includes('/submissions')) {
        const roundId = response.data?.roundId;
        if (roundId) {
          invalidateExact(`/rounds/${roundId}`);
        }
        const submissionId = extractIdFromUrl(url, 'submissions');
        if (submissionId) {
          invalidateExact(`/submissions/${submissionId}`);
        }
      }

      if (url.includes('/castings')) {
        invalidateByPattern('/castings');
        const castingId = extractIdFromUrl(url, 'castings');
        if (castingId) {
          invalidateExact(`/castings/${castingId}`);
        }
      }

      if (url.includes('/rounds')) {
        const roundId = response.data?.id || extractIdFromUrl(url, 'rounds');
        if (roundId) {
          invalidateExact(`/rounds/${roundId}`);
          for (const key of cache.keys()) {
            if (key.includes('/rounds/') && !key.endsWith(`/${roundId}`)) continue;
          }
        }
        if (url.includes('/participants')) {
          invalidateByPattern('/participations');
        }
      }

      if (url.includes('/users')) {
        invalidateByPattern('/users');
        invalidateByPattern('/participations');
      }
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
