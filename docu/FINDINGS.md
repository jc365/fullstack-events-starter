# Hallazgos y deuda técnica

Este documento registra hallazgos conocidos, decisiones y deuda técnica aceptada.

## Typecheck

### Errores pre-existentes (TS2835, TS7006, TS2349)

**Estado:** deuda técnica aceptada. No bloquean desarrollo ni runtime.

**Decisión:** no arreglar masivamente. Reducir progresivamente en cada iteración.

**Detalle:**
- TS2835 (~128 errores): falta extensiones `.js` en imports (esperado con `node16` + `tsx`)
- TS7006 (~15 errores): callbacks sin tipado explícito (fácil de arreglar)
- TS2349 (1 error): `pino-http` sin call signature
- Total: ~146 errores (subió de ~128 por archivos nuevos de Fases 3.5 y 5.4; no hay errores nuevos de otros tipos)

**Cómo verificar que no introduces errores nuevos:**
```bash
cd backend
npx tsc --noEmit 2>&1 | wc -l
# Base actual: ~146 errores
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

## Fase 5 — Limpieza y Pulido

### Cambios
- **5.1:** Frontend 100% libre de Castant — Items.tsx, CreateItem.tsx reescritos con endpoints /items, LoginForm.tsx con branding "Events Starter"
- **5.2:** Orquestador 100% libre de Castant — main.py y test_email.py actualizados
- **5.3:** Scripts y dependencias limpiados — SQLite legacy eliminado, venv Python en postsetup.sh, requirements split
- **5.4:** Backend libre de SQLite — prismaClient.ts y seed.ts PostgreSQL-only, `@libsql/client` y `@prisma/adapter-libsql` eliminados, dead code (console.logs, DEMO_MODE guard) limpiado
- **5.5a:** .gitignore y SKILL.md verificados — sin cambios necesarios
- **5.5b:** AGENTS.md y README.md reescritos — documentación completa del starter
- **5.6:** Verificación end-to-end — starter funciona desde cero (setup, postsetup, API). Bug encontrado: `uploadFile()` no creaba subdirectorios — corregido
- **5.7:** Arranque coordinado — backend espera a DB (30s, retry con WARN), orquestador espera a backend (30s, WARN sin bloquear), tokens de servicio con placeholder funcional en .env.example

### Deuda conocida

- `webhookClient.ts` en backend existe pero no se usa en ningún use-case. El orquestador recibe eventos que nadie emite todavía. Pendiente conectar en un use-case (ej: `CreateItemUseCase` → `dispatchEvent('item.created', ...)`).
- `adminMiddleware` hace un `findById` por cada request a `/admin/*`. Para alta frecuencia, considerar caché de roles.

### Hallazgos 5.6

- **Static:** frontend tsc 0 errores, vitest 17/17, playwright 8 tests listados, backend tsc ~146 (baseline), pytest 30/30
- **E2E:** setup.sh + postsetup.sh funcionan desde cero. API completa verificada: login, create item, list items, bitacora, config, PATCH config, file upload
- **Bug corregido:** `storageService.ts:uploadFile()` solo creaba `uploads/files/` pero no subdirectorios anidados (`items/{id}/`). Corregido con `fs.mkdirSync(fileDir, { recursive: true })`
- **Orquestador:** no verificado en E2E (requiere inicio separado)

## Fase 5.8 — Fix: Bucle infinito GET /files/:key/url → 429

### Problema

Al abrir el detalle de un item con fichero asociado (ej: `item-demo-3`), la UI mostraba "network error" y el navegador entraba en bucle invocando `GET /api/v1/files/{key}/url`. El backend respondía 429 (Too Many Requests) repetidamente.

### Causa raíz

Bucle infinito de re-render en `FileViewerModal` → `useFileUrls`:

1. `FileViewerModal.tsx:85-86` creaba un array inline `file ? [{ id: 'current', fileKey: file.key }] : []` como argumento a `useFileUrls`.
2. Cada render creaba una **nueva referencia** de array, aunque los valores fueran idénticos.
3. `useFileUrls` dependía de `files` en `useCallback` para `refreshAll`, que a su vez alimentaba un `useEffect`.
4. El `useEffect` re-ejecutaba `fetchUrls` → petición HTTP → `setFileUrls`/`setLoading` → re-render → nuevo array → ciclo infinito.
5. `apiLimiter` (100 req/15min en prod) se agotaba en segundos → 429.

### Fix aplicado

| Archivo | Cambio |
|---------|--------|
| `frontend/src/components/FileViewerModal.tsx:8` | Import `useMemo` añadido |
| `frontend/src/components/FileViewerModal.tsx:84-91` | Array memoizado con `useMemo(() => ..., [file?.key])` — rompe la cadena de re-render |
| `frontend/src/hooks/useFileUrls.ts:28` | `lastKeysRef` añadido para recordar el último set de keys fetcheadas |
| `frontend/src/hooks/useFileUrls.ts:53-65` | Guard en `refreshAll`: compara keys sort+join, salta si idénticas |
| `backend/src/infrastructure/api/v1/routes.ts:94` | `apiLimiter` subido de 100/500 a 1000/15min (defensa adicional) |

### Verificación

- Frontend tsc: 0 errores
- Frontend vitest: 17/17
- Branch: `feature/5.8` (sin merge a main)
