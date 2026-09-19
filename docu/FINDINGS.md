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

## Fase 3.2 — Deudas abiertas (frontend)

- ~~`frontend/src/pages/ItemDetail.tsx`: usa `isDirectorOf` / `getRoleInCasting`~~ ✅ Resuelto en 3.4.
- ~~`frontend/src/components/Layout.tsx`: `DEMO_USER_MAP` aún contiene roles director/actor/preselector~~ ✅ Resuelto en 3.4.
- ~~`frontend/src/pages/Dashboard.tsx`: usa `participations` de UserContext y endpoints `/castings`, `/rounds`~~ ✅ Resuelto en 3.4.
- ~~`frontend/src/App.test.tsx`: mockea endpoints `/participations`, `/castings`, `/rounds/`~~ ✅ Resuelto en 3.4.
- `frontend/src/components/FileViewerModal.tsx`: imports comentados (submissionStatus, scoring) pendientes de equivalente genérico. ✅ Resuelto en 3.3b.2.
- `frontend/src/components/SubmitFileModal.tsx`: pendiente de generalizar (quitar validaciones de video). ✅ Resuelto en 3.3b.1.
- `frontend/src/hooks/useFileUrls.ts`: pendiente de generalizar. ✅ Resuelto en 3.3b.1.
- ~~`frontend/src/pages/CreateItem.tsx`: endpoints `/castings` y navigate `/castings` sin actualizar~~ ✅ Resuelto en 3.4.
- ~~`frontend/src/pages/Items.tsx`: endpoint `/castings` sin actualizar~~ ✅ Resuelto en 3.4.

## Secretos placeholder (3.3.0c)

Los .env.example incluyen valores placeholder para que el starter
arranque out-of-the-box en local:

- JWT_SECRET=cambiame-por-un-secreto-largo-y-aleatorio

Obligatorio cambiarlos antes de desplegar a producción.
Generar secreto: `openssl rand -hex 32`

## SubmitFileModal — pestaña URL pendiente (3.3b.1)

La pestaña URL del SubmitFileModal está deshabilitada por defecto
(allowUrlInput=false). Cuando se activa, muestra un warning
("URL externa no soportada todavía") con el input deshabilitado.

El endpoint PATCH /items/:id con { fileUrl } está en el código
pero es inalcanzable desde la UI. El backend de 3.3a solo soporta
subida de fichero, no fileUrl externo.

Se resolverá en 3.3c si añadimos fileUrl al PATCH de items.

## Fase 3.5 — Admin Panel

### Creado

- `Bitacora` entity (domain/entities/Bitacora.ts) — inmutable, factory `create()`
- `IBitacoraRepository.findAll(options)` — paginación + filtros (userId, action, entityType, since, until)
- `PrismaBitacoraRepository.findAll()` — skip/take, usa índices existentes
- `adminMiddleware` (middleware/admin.ts) — verifica `user.role === 'admin'` vía DB lookup, retorna 403
- `ListBitacoraUseCase` — delega a repositorio
- `GET /admin/bitacora` — paginado, filtros, protegido con authMiddleware + adminMiddleware
- `BitacoraPage` — tabla paginada, filtros (acción, entity type, fechas), resolución de userId vía UserCacheContext
- `ConfigPage` — editor por categorías, secciones colapsables (localStorage), deep linking vía hash
- `AdminSubNav` — sub-nav reutilizable con tabs Bitacora/Config
- `AdminLayout` en App.tsx — AdminGuard + AdminSubNav + Outlet
- Dashboard placeholder "Recent activity" eliminado

### Deuda conocida

- `adminMiddleware` hace un `findById` por cada request a `/admin/*`. Para alta frecuencia, considerar caché de roles.
- `ConfigPage` no valida formato JSON en textarea — si el usuario ingresa JSON inválido, el backend rechaza silenciosamente.
- No hay ruta `GET /bitacora` fuera del prefijo `/admin/` — la bitácora es exclusivamente admin.
