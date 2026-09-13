/**
 * @file backup-and-reset.ts
 * @module scripts/backup-and-reset
 *
 * Ejecuta un backup de dev.db y luego ejecuta prisma db push --force-reset
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import backupDb from './backup-db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

backupDb();

try {
  console.log('\n🔄 Ejecutando prisma db push --force-reset...');
  execSync('npx prisma db push --force-reset', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log('✅ Base de datos reseteada correctamente.');
} catch (error) {
  console.error('❌ Error al resetear la base de datos:', error);
  process.exit(1);
}
