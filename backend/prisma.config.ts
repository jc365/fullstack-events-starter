// backend/prisma.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Cargar .env solo si DATABASE_URL no está ya definida (respeta test setup)
if (!process.env.DATABASE_URL) {
  config({ path: "./.env" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts", 
  },
  datasource: {
    provider: 'postgresql',
    url: process.env["DATABASE_URL"] || "file:./dev.db",
  },
});