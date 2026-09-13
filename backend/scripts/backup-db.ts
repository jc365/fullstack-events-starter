/**
 * @file backup-db.ts
 * @module scripts/backup-db
 *
 * Crea una copia de seguridad de dev.db en prisma/backups/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'dev.db');
const backupsDir = path.join(projectRoot, 'prisma', 'backups');

export default function backupDb(): string | null {
  if (!fs.existsSync(dbPath)) {
    console.warn('⚠️  No se encontró dev.db. Nada que respaldar.');
    return null;
  }

  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `dev-${timestamp}.db`);

  fs.copyFileSync(dbPath, backupPath);

  const stats = fs.statSync(backupPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`✅ Backup creado: prisma/backups/dev-${timestamp}.db (${sizeMB} MB)`);
  return backupPath;
}

// Ejecutar directamente si se llama con tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  backupDb();
}
