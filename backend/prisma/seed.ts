/**
 * @file seed.ts
 * @module prisma/seed
 *
 * Script de seed para insertar datos de demo en la base de datos.
 * Ejecutar con: npx dotenv -e .env -- npx tsx prisma/seed.ts
 * (fundamental la parte dotenv para que lea correctamente el backend/.env)
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const url = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = url.startsWith('postgresql://');
const adapter = isPostgres
  ? new PrismaPg(new Pool({ connectionString: url }))
  : new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD_HASH = bcrypt.hashSync('changeme', 10);

async function main() {
  console.log(`🌱 Ejecutando seed... con URL: ${url}`);

  // --- Users ---
  const director = await prisma.user.upsert({
    where: { email: 'director@demo.com' },
    update: {},
    create: {
      id: 'user-director-1',
      name: 'Director Demo',
      email: 'director@demo.com',
      password: DEMO_PASSWORD_HASH,
    },
  });

  const actor1 = await prisma.user.upsert({
    where: { email: 'actor1@demo.com' },
    update: {},
    create: {
      id: 'user-actor-1',
      name: 'Actor Uno',
      email: 'actor1@demo.com',
      password: DEMO_PASSWORD_HASH,
    },
  });

  const actor2 = await prisma.user.upsert({
    where: { email: 'actor2@demo.com' },
    update: {},
    create: {
      id: 'user-actor-2',
      name: 'Actor Dos',
      email: 'actor2@demo.com',
      password: DEMO_PASSWORD_HASH,
    },
  });

  const preselector = await prisma.user.upsert({
    where: { email: 'preselector@demo.com' },
    update: {},
    create: {
      id: 'user-preselector-1',
      name: 'Preselector Demo',
      email: 'preselector@demo.com',
      password: DEMO_PASSWORD_HASH,
    },
  });

  console.log(`  ✅ Usuarios: ${director.id}, ${actor1.id}, ${actor2.id}, ${preselector.id}`);

  // --- Casting ---
  const casting = await prisma.casting.upsert({
    where: { id: 'casting-demo-1' },
    update: {},
    create: {
      id: 'casting-demo-1',
      title: 'Demo Casting - Película Indie',
      description: 'Casting de demostración para una película indie. Buscamos actores con experiencia en drama.',
    },
  });

  // Director as participant of casting
  await prisma.participant.upsert({
    where: { id: 'participant-demo-director' },
    update: {},
    create: {
      id: 'participant-demo-director',
      userId: director.id,
      castingId: casting.id,
      role: 'director',
    },
  });

  console.log(`  ✅ Casting: ${casting.id}`);

  // --- Round 1 ---
  const round1 = await prisma.round.upsert({
    where: { id: 'round-demo-1' },
    update: {},
    create: {
      id: 'round-demo-1',
      number: 1,
      castingId: casting.id,
    },
  });

  // Actors in round 1
  await prisma.participant.upsert({
    where: { id: 'participant-demo-actor1-r1' },
    update: {},
    create: {
      id: 'participant-demo-actor1-r1',
      userId: actor1.id,
      roundId: round1.id,
      role: 'actor',
    },
  });

  await prisma.participant.upsert({
    where: { id: 'participant-demo-actor2-r1' },
    update: {},
    create: {
      id: 'participant-demo-actor2-r1',
      userId: actor2.id,
      roundId: round1.id,
      role: 'actor',
    },
  });

  // Preselector in round 1
  await prisma.participant.upsert({
    where: { id: 'participant-demo-pre-r1' },
    update: {},
    create: {
      id: 'participant-demo-pre-r1',
      userId: preselector.id,
      roundId: round1.id,
      role: 'preselector',
    },
  });

  console.log(`  ✅ Ronda 1: ${round1.id} (2 actores, 1 preselector)`);

  // --- Round 2 ---
  const round2 = await prisma.round.upsert({
    where: { id: 'round-demo-2' },
    update: {},
    create: {
      id: 'round-demo-2',
      number: 2,
      castingId: casting.id,
    },
  });

  await prisma.participant.upsert({
    where: { id: 'participant-demo-actor1-r2' },
    update: {},
    create: {
      id: 'participant-demo-actor1-r2',
      userId: actor1.id,
      roundId: round2.id,
      role: 'actor',
    },
  });

  console.log(`  ✅ Ronda 2: ${round2.id} (1 actor)`);

  // --- Submissions ---
  await prisma.submission.upsert({
    where: { id: 'submission-demo-1' },
    update: {},
    create: {
      id: 'submission-demo-1',
      actorId: actor1.id,
      roundId: round1.id,
      videoUrl: 'https://example.com/demo-video-1.mp4',
      status: 'pending',
    },
  });

  await prisma.submission.upsert({
    where: { id: 'submission-demo-2' },
    update: {},
    create: {
      id: 'submission-demo-2',
      actorId: actor2.id,
      roundId: round1.id,
      videoUrl: 'https://example.com/demo-video-2.mp4',
      status: 'pending',
    },
  });

  console.log('  ✅ Submissions: 2 videos de demo');

  // --- Config ---
  const configs = [
    { key: 'logging.level', value: 'info', description: 'Nivel de logging global', category: 'logging' },
    { key: 'feature_flags.demo_mode', value: 'true', description: 'Habilitar modo demo', category: 'feature_flags' },
    { key: 'feature_flags.registration_enabled', value: 'true', description: 'Habilitar registro de usuarios', category: 'feature_flags' },
    { key: 'limits.max_submissions_per_round', value: '10', description: 'Max submissions per round', category: 'limits' },
    { key: 'limits.max_rounds_per_casting', value: '10', description: 'Max rounds per casting', category: 'limits' },
    { key: 'integrations.r2_enabled', value: 'true', description: 'Habilitar Cloudflare R2', category: 'integrations' },
    { key: 'integrations.r2_threshold_gb', value: '7', description: 'Umbral de alerta para almacenamiento R2 (GB)', category: 'integrations' },
    { key: 'integrations.r2_notify_email', value: 'admin@demo.com', description: 'Email para alertas de almacenamiento R2', category: 'integrations' },
    { key: 'integrations.webhooks_enabled', value: 'false', description: 'Habilitar webhooks', category: 'integrations' },
    { key: 'ui.theme', value: 'dark', description: 'Tema por defecto', category: 'ui' },
    { key: 'ui.language', value: 'es', description: 'Idioma por defecto', category: 'ui' },
  ];

  for (const cfg of configs) {
    await prisma.config.upsert({
      where: { key: cfg.key },
      update: {},
      create: {
        key: cfg.key,
        value: cfg.value,
        description: cfg.description,
        category: cfg.category,
      },
    });
  }

  console.log(`  ✅ Config: ${configs.length} entries`);

  console.log('\n🎉 Seed completado correctamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
