# Hallazgos y deuda técnica

Este documento registra **deuda viva**, **decisiones arquitectónicas** y
**limitaciones conocidas**. El histórico de cambios ya verificados vive en
`git log`, no aquí.

## Deuda viva

### Backend

- **`adminMiddleware` con DB lookup por request.** Cada request a
  `/admin/*` y a las escrituras de `/config/:key` ejecuta `findById` +
  check `role === 'admin'`. Para alta frecuencia, considerar caché de
  roles.
- **`PUT /config/:key` devuelve 201, `PATCH` 200, `DELETE` 204.**
  Códigos pre-existentes (upsert vs update). Unificarlos sería un
  breaking change para clientes existentes.
- **Errores de Prisma sin mapear → 500 `INTERNAL_ERROR`.** Solo se
  categorizan los `AppError`; un fallo crudo de Prisma (p.ej.
  `P2002` id duplicado en `POST /users`, `PrismaClientValidationError`
  en `?since=fecha-inválida` en `/admin/bitacora`) cae al 500
  genérico. Si se repite en producción, valorar mapeo
  `P2002→409`/`P2025→404` en `errorHandler` (manteniéndolo genérico
  vía una capa adapter, sin acoplar Prisma al módulo).
- **`globalSetup` usa `prisma db push --force-reset`.** Un guard de
  Prisma para agentes AI lo bloquea; el setup falla (elog ❌, no
  fatal) y los tests corren igual si el schema de la BD de tests ya
  existe. Workaround manual:
  `DATABASE_URL=<test> npx prisma db push` (sin `--force-reset`).

### Frontend

- **`ConfigPage` no valida JSON en la textarea.** Si el usuario pega
  JSON inválido, el backend rechaza y la UI no muestra un error claro.
- **`SubmitFileModal` — pestaña URL deshabilitada** (`allowUrlInput=false`).
  `PATCH /items/:id` solo acepta `title`/`description`/`status` (sin
  `fileUrl`); la subida de fichero es el único camino desde la UI.
  Ver `TODO(3.3c)` en `SubmitFileModal.tsx`.

### Seguridad

- **Secretos placeholder en `.env.example`** (`JWT_SECRET`,
  `ADMIT_TOKENS`, `SEND_TOKEN`). Funcionan en local, pero es
  **obligatorio** cambiarlos antes de desplegar a producción.
  Generar secreto: `openssl rand -hex 32`.

## Decisiones arquitectónicas

- **Config pre-login (futuro).** Hoy `ConfigProvider` solo hace
  fetch/poll con sesión activa (sin token: sin fetch, sin 401). Si
  aparece la necesidad de config antes de login (feature flags,
  idioma público, etc.),evaluar:
  - **Opción B:** endpoint público `GET /config/public` (solo claves
    whitelisted).
  - **Opción C:** segundo fetch público opcional, bajo el provider ya
    autenticado (gate actual por `useUser().id`).
- **Bitácora exclusivamente admin.** No existe `GET /bitacora` fuera
  del prefijo `/admin/`; la lectura del audit log es solo admin.

## S8 — Error handling global (módulo de errores)

- **Módulo.** `backend/src/infrastructure/errors/` portado del MR
  (F4.2): `AppError` + subclases (`NotFoundError`, `ValidationError`,
  `UnauthorizedError`, `ForbiddenError`, `ConflictError`,
  `InternalError`), `errorHandler` y `codes.ts` (códigos genéricos).
  El análogo de `mr-codes.ts` es **`starter-codes.ts`**
  (`ITEM_NOT_FOUND`, `ITEM_UPLOAD_FAILED`, `USER_NOT_FOUND`,
  `USER_EMAIL_EXISTS`, `CONFIG_NOT_FOUND`, `EVENT_NOT_FOUND`,
  `AUTH_INVALID_CREDENTIALS`, `AUTH_INVALID_TOKEN`, `FILE_NOT_FOUND`);
  `RATE_LIMITED` vive en `codes.ts` (es genérico).
- **Envelope.** Todo 4xx/5xx →
  `{ "error": { "code": string, "message": string } }` en JSON,
  montado en `backend/src/index.ts` (`app.use(errorHandler)` al final
  + catch-all 404 para rutas desconocidas). Los 5xx siempre con
  mensaje genérico `"Internal server error"` (el detalle va al log);
  fix interno del handler para que `InternalError` cumpla su propia
  documentación.
- **Migración.** Use-cases pasan de `throw new Error(...)` /
  devolver `null` a lanzar las subclases de `AppError` (los value
  objects de dominio mantienen `Error` plano y los use-cases los
  envuelven en `ValidationError`); rutas sin `try/catch` (Express 5
  propaga los `throw` async); `authMiddleware`/`adminMiddleware` con
  `next(...)`/`throw`; rate limiters → 429 `RATE_LIMITED`.
- **Portabilidad.** El módulo es genérico: no depende del dominio ni
  de Prisma, así que es reutilizable tal cual en cualquier proyecto
  (el único punto de adaptación es `starter-codes.ts`).
- **Cambios de comportamiento (S8):**
  - Email duplicado en `POST /users`: **400 → 409 `USER_EMAIL_EXISTS`**.
    Criterio acordado: si aparecen más casos de "recurso ya existe"
    (Config/Item duplicado), también 409.
  - Rutas desconocidas: 404 HTML de Express → **404 `NOT_FOUND`
    JSON**.
  - Login sin campos / demo deshabilitado / rol demo inválido:
    401 → **400 `VALIDATION_ERROR`** (las credenciales malas siguen
    401 `AUTH_INVALID_CREDENTIALS`).
  - `GET /files/:key/url` con fallo de R2: 400 → **500** (fallo
    servidor, no del cliente).
- **Frontend.** `api/client.ts` normaliza `error.response.data.error`
  (objeto o string) a string y lo copia a `error.message`, por lo que
  los componentes que leen `err.message` muestran el mensaje real
  del envelope.
