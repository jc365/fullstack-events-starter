# Hallazgos y deuda técnica

Este documento registra hallazgos conocidos, decisiones y deuda técnica aceptada.

## Typecheck

### Errores pre-existentes (TS2835, TS7006, TS2349)

**Estado:** deuda técnica aceptada. No bloquean desarrollo ni runtime.

**Decisión:** no arreglar masivamente. Reducir progresivamente en cada iteración.

**Detalle:**
- TS2835 (~110 errores): falta extensiones `.js` en imports (esperado con `node16` + `tsx`)
- TS7006 (~15 errores): callbacks sin tipado explícito (fácil de arreglar)
- TS2349 (1 error): `pino-http` sin call signature

**Cómo verificar que no introduces errores nuevos:**
```bash
cd backend
npx tsc --noEmit 2>&1 | wc -l
# Base actual: ~127 errores
```

**Plan de reducción (a futuro):**

1. **Fase A:** Arreglar TS7006 (tipos explícitos en callbacks de `index.ts`, `routes.ts`, `PrismaUserRepository.ts`)
2. **Fase B:** Evaluar `moduleResolution: bundler` (requiere prueba con tsx y build de producción)
3. **Fase C:** Arreglar TS2349 (pino-http) — evaluar wrapper propio o alternativa

## Prisma config

### Fallback SQLite eliminado ✅

**Estado:** resuelto en Fase 2 (post-test).

`prisma.config.ts` ahora lanza error claro si falta `DATABASE_URL`.

## Onboarding

### .env copiado automáticamente ✅

**Estado:** resuelto en Fase 2 (post-test).

`setup.sh` copia `.env.example` → `.env` para backend, frontend, orchestration y tests/REST Client.
