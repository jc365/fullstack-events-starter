/**
 * @file config.ts
 * @module infrastructure/config
 *
 * Configuração centralizada que lê a tabela Config do banco de dados.
 * Recarrega automaticamente a cada 60 segundos em produção.
 */

import prisma from '../persistence/prismaClient';
import logger from '../logging/logger';

const RELOAD_INTERVAL_MS = 60_000;

let cache = new Map<string, unknown>();
let lastLoaded = 0;
let reloadTimer: ReturnType<typeof setInterval> | null = null;

export async function loadConfig(): Promise<void> {
  try {
    const rows = await prisma.config.findMany({
      select: { key: true, value: true },
    });
    const next = new Map<string, unknown>();
    for (const row of rows) {
      next.set(row.key, row.value);
    }
    cache = next;
    lastLoaded = Date.now();
    logger.debug({ count: rows.length }, 'Config reloaded from database');
  } catch (err) {
    logger.error({ err }, 'Failed to reload config from database');
  }
}

export function getConfig<T = unknown>(key: string, defaultValue: T): T {
  const val = cache.get(key);
  return val !== undefined ? (val as T) : defaultValue;
}

export function startAutoReload(intervalMs = RELOAD_INTERVAL_MS): void {
  if (reloadTimer) return;
  loadConfig();
  reloadTimer = setInterval(() => {
    loadConfig();
  }, intervalMs);
}

export function stopAutoReload(): void {
  if (reloadTimer) {
    clearInterval(reloadTimer);
    reloadTimer = null;
  }
}

export function getLastLoadedAt(): Date {
  return new Date(lastLoaded);
}
