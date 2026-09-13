// backend/src/infrastructure/persistence/prismaClient.ts
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'file:./dev.db';

// 🔥 Detectar si es PostgreSQL o SQLite
const isPostgres = connectionString.startsWith('postgresql://');

let prisma: PrismaClient;

if (isPostgres) {
  // Usar adaptador de PostgreSQL
  const pool = new Pool({ connectionString, });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Usar adaptador libsql para SQLite
  const adapter = new PrismaLibSql({ url: connectionString });
  prisma = new PrismaClient({ adapter });
}

export default prisma;