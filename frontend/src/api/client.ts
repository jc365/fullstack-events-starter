// frontend/src/api/client.ts
import axios from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

const TTL_CONFIG: Record<string, number> = {
  '/items': 5 * 60 * 1000,
  '/users': 10 * 60 * 1000,
  '/bitacora': 30 * 1000,
  '/files': 2 * 60 * 1000,
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

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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
      console.log(`✅ ${method} ${url}`, response.data);
    }

    if (method === 'GET') {
      const cacheKey = getCacheKey(response.config);
      if (cacheKey) {
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
    }

    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (url.includes('/items')) {
        invalidateByPattern('/items');
        const parts = url.split('/');
        const idx = parts.indexOf('items');
        if (idx !== -1 && idx + 1 < parts.length) {
          invalidateExact(`/items/${parts[idx + 1]}`);
        }
      }
      if (url.includes('/users')) {
        invalidateByPattern('/users');
      }
      if (url.includes('/bitacora')) {
        invalidateByPattern('/bitacora');
      }
    }

    return response;
  },
  (error) => {
    // Normaliza el envelope global de errores `{ error: { code, message } }`
    // (S8): `data.error` → string, y se copia a `error.message` para que
    // los componentes que leen `err.message` muestren el mensaje real.
    const data = error?.response?.data;
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      const raw = data.error;
      const message = typeof raw === 'string'
        ? raw
        : typeof raw?.message === 'string'
          ? raw.message
          : null;
      if (message !== null) {
        data.error = message;
        error.message = message;
      }
    }
    return Promise.reject(error);
  }
);

export default client;
