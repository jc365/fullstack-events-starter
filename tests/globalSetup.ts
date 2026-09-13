// tests/globalSetup.ts
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export default async function globalSetup() {
  const testDbUrl = process.env.DATABASE_URL || 'postgresql://castant:castant@localhost:5432/castant_test';

  console.log('🔄 Configurando base de datos de tests:', testDbUrl);

  try {
    execSync(
      `cd ${path.join(projectRoot, 'backend')} && npx prisma db push --force-reset`,
      {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
        },
      }
    );
    console.log('✅ Base de datos de tests lista');
  } catch (error: any) {
    console.error('❌ Error al crear la base de datos de tests:', error.stdout?.toString() || error.message);
  }
}
