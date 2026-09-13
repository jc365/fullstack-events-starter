/**
 * @file restore-db.ts
 * @module scripts/restore-db
 *
 * Restaura el último backup de prisma/backups/ a dev.db
 * y ejecuta el seed automáticamente.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'dev.db');
const backupsDir = path.join(projectRoot, 'prisma', 'backups');

if (!fs.existsSync(backupsDir)) {
  console.error('❌ No hay backups disponibles. Directorio prisma/backups/ no existe.');
  process.exit(1);
}

const files = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('dev-') && f.endsWith('.db'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('❌ No hay backups disponibles.');
  process.exit(1);
}

const latest = files[0];
const latestPath = path.join(backupsDir, latest);

try {
  fs.copyFileSync(latestPath, dbPath);
  console.log(`✅ Backup restaurado: ${latest}`);
} catch (error) {
  console.error(`❌ Error al restaurar backup: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

// Ejecutar seed automáticamente
try {
  console.log('\n🌱 Ejecutando seed...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('⚠️  Error al ejecutar seed:', error instanceof Error ? error.message : error);
  // No salimos con error porque el restore fue exitoso
}
