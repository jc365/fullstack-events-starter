# AGENTS.md — {{PROJECT_NAME}}

## Stack

- TypeScript 6.0 (`strict: true`, ES2020)
- Backend: ESM (`"type": "module"`), `tsx` runtime, `moduleResolution: node16`
- Frontend: Vite + React, `moduleResolution: bundler`
- Express 5 + cors + dotenv + helmet + rate-limit (CORS configurable via `CORS_ORIGIN`)
- Prisma 7 with PostgreSQL (Docker) for dev, SQLite for tests
- Logging: pino + pino-pretty + pino-http + nanoid
- Auth: JWT (`jsonwebtoken`) — `JWT_SECRET` in `.env` is mandatory (app throws if missing)
- Password hashing: `bcrypt` via `HashService` (`infrastructure/security/HashService.ts`)
- Testing: Vitest 4 (backend root), Vitest + React Testing Library (frontend), Playwright (E2E)
- DB: PostgreSQL via Docker (dev), SQLite `backend/test.db` (tests)

## Rules (Always Apply)

1. **Never modify imports** — no `.js` extensions on import paths.
2. **Backup AGENTS.md** before editing → `docu/saves-agents/AGENTS_<YYYYMMDD_HHMMSS>.md`.
3. **IDs are flat strings** with prefixes (e.g. `user-...`, `item-...`). No `TypedId`.
4. **Members have roles** — `admin`, `user`, `guest`. One entity, role-based permissions.

## Commands

```bash
# Typecheck backend (no output = ok)
cd backend && npx tsc --noEmit

# Backend tests (from root)
npm test

# Integration tests (endpoints)
npm run test:integration

# Frontend tests (from root)
npm run test:front

# Orchestration tests (from root)
npm run test:orch

# All tests (backend + frontend + orchestration + integration)
npm run test:all

# Coverage (backend only)
npm run test:coverage

# Dev server
cd backend && npm run dev

# Regenerate Prisma client after schema changes
cd backend && npx prisma generate

# Sync DB with schema (no data loss)
cd backend && npm run db:push

# Backup PostgreSQL
cd backend && npm run db:backup

# Restore PostgreSQL backup
cd backend && npm run db:restore

# Seed demo data
cd backend && npx tsx prisma/seed.ts

# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests (auto-starts dev server)
cd frontend && npx playwright test

# Install Playwright browsers (first time only)
cd frontend && npx playwright install chromium

# PostgreSQL via Docker
npm run db:up           # Start PostgreSQL container
npm run db:down         # Stop PostgreSQL container
npm run db:backup       # Backup PostgreSQL
npm run db:restore      # Restore PostgreSQL backup
npm run db:push         # Sincronizar schema (db push)
npm run db:studio       # Open Prisma Studio

# Dev with all services (DB + Backend + Frontend + Orchestrator)
npm run dev:all
```

**Order:** `typecheck → test`

## Typecheck

```bash
cd backend && npx tsc --noEmit
```

Estado actual: da errores pre-existentes (TS2835, TS7006, TS2349). Esto es deuda técnica aceptada:

- El proyecto usa `tsx` como runtime, que resuelve imports sin extensión
- `tsc` con `moduleResolution: node16` exige extensiones `.js` (TS2835)
- Hay ~15 callbacks sin tipado explícito (TS7006)
- El import de `pino-http` tiene un problema de tipos (TS2349)

Los errores **NO** bloquean el desarrollo ni el runtime.

### Cómo trabajar con ellos

Al introducir código nuevo, verificar que no añades errores nuevos:

```bash
cd backend && npx tsc --noEmit 2>&1 | wc -l
# Base actual: ~127 errores
# Objetivo: ir reduciendo la deuda en cada iteración
```

### Plan de reducción (a futuro)

1. **Fase A:** Arreglar TS7006 (~15 errores) — añadir tipos explícitos a callbacks
2. **Fase B:** Evaluar `moduleResolution: bundler` (resuelve TS2835, requiere prueba con tsx y build)
3. **Fase C:** Arreglar TS2349 (pino-http) — evaluar wrapper o alternativa

### Root scripts (desde la raíz del monorepo)

```bash
npm run db:up        # Levantar PostgreSQL (Docker)
npm run db:down      # Detener PostgreSQL
npm run db:push      # Sincronizar schema (db push)
npm run db:seed      # Insertar datos demo
npm run db:studio    # Abrir Prisma Studio
npm run db:backup    # Backup de PostgreSQL
npm run db:restore   # Restaurar backup
```

## DB Backups

- Backups stored in `backend/prisma/backups/`
- `db:backup` creates timestamped `.sql` files via `pg_dump`
- `db:restore` drops and recreates the database from backup
- PostgreSQL data persisted in Docker volume `postgres_data`

## DB Safety Rules

### NEVER USE (dangerous)
- ❌ `prisma migrate dev` — drops data in development
- ❌ `prisma db push --force-reset` — drops data without backup
- ❌ `db:reset` (old SQLite) — incompatible with PostgreSQL

### ALWAYS USE
- ✅ `prisma db push` — applies schema changes WITHOUT data loss
- ✅ `npm run db:backup` — creates PostgreSQL backup before changes
- ✅ `npm run db:restore` — restores from backup

### Safe schema change flow
1. `npm run db:backup` — backup first
2. `npx prisma db push` — apply changes
3. Verify everything works
4. (Optional) `npx prisma migrate diff` — generate migration SQL file

## Seed Data

- Script: `backend/prisma/seed.ts` (configured as Prisma seed hook)
- Config entries: logging, feature_flags, limits, integrations, ui
- Uses `upsert` to avoid duplicates

## Gotchas

**Prisma 7 — datasource URL:**
`DATABASE_URL` goes in `prisma.config.ts` and `.env`, NOT in `schema.prisma`.

**Prisma client import:**
`import { PrismaClient } from '../../generated/prisma/client'`

**Tests — DATABASE_URL:**
Tests use `backend/test.db`. Configured in `vitest.config.ts` (sets `process.env.DATABASE_URL` and `process.env.JWT_SECRET`). `globalSetup.ts` runs `prisma db push --force-reset` before each suite. `fileParallelism: false` required (SQLite single-writer).

**Dev — PostgreSQL:**
`dev:all` starts PostgreSQL via `docker-compose up`. The container must be healthy before the backend starts. `DATABASE_URL` in `backend/.env` points to PostgreSQL. SQLite remains the fallback if PostgreSQL is not running.

**Security:**
- `auth.ts` throws if `JWT_SECRET` is missing (no fallback)
- `.env`, `.env.local`, `.env.*.local` are in `.gitignore`
- Request body logging removed from pino-http serializer
- Production guard: `NODE_ENV=production` + `DEMO_MODE=true` throws error at startup
- Strong 128-char hex JWT_SECRET in `.env`
- CORS configurable via `CORS_ORIGIN` env var (comma-separated)
- Helmet enabled with HSTS in production
- Rate limiting: login 10 req/15min, API 100 req/15min
- Service tokens via `ADMIT_TOKENS` env var (comma-separated). Tokens bypass JWT validation.

**File upload:**
- Multer config: `infrastructure/storage/fileUpload.ts` (memoryStorage)
- Storage: Cloudflare R2 (production) or local `backend/uploads/` (fallback)
- R2 key stored in DB record (e.g. `items/files/file-123.mp4`)
- Presigned URLs generated on-demand (2h expiry)
- `backend/uploads/.gitignore` keeps the directory in git but ignores uploaded files
- Static middleware in `index.ts` serves `/uploads`

## Configuración de Logs

### `logging.level`

Controla el nivel de logs en todos los componentes del sistema:

| Nivel | Backend (pino) | Orchestrator (Python) | Frontend (console) |
|-------|----------------|----------------------|-------------------|
| `debug` | ✅ | ✅ | ✅ |
| `info` | ✅ | ✅ | ✅ |
| `warn` | ✅ | ✅ | ✅ |
| `error` | ✅ | ✅ | ✅ |

**Comportamiento:**

- Todos los logs de la aplicación y HTTP se controlan con este único nivel
- Cambios en `logging.level` se aplican en caliente (sin reiniciar) en los tres componentes
- Los logs de cambio de configuración siempre son visibles

## Orchestrator

Python/FastAPI service for event-driven workflows. Runs on port `8080`.

**Stack:** Python 3.10+, FastAPI, uvicorn, httpx, ffmpeg (system)

**Start:**
```bash
cd orchestration && source venv/bin/activate
python -m orchestration.main
```

**Webhooks (POST):**
- `/webhook/item.created` → FileProcessorWorkflow (thumbnail + metadata via ffprobe/ffmpeg)
- `/webhook/review.completed` → NotificationWorkflow (email with score/feedback)
- `/webhook/cleanup.daily` → CleanupWorkflow (delete files older than N days)

**Service token auth:** Orchestrator sends `SEND_TOKEN` in `Authorization: Bearer` header. Backend validates against `ADMIT_TOKENS` env var. No JWT required for service-to-service calls.

**Config:** `.env` in `orchestration/` (see `.env.example`). Uploads dir defaults to `backend/uploads/`.

**Backend integration:** `infrastructure/webhooks/webhookClient.ts` — fire-and-forget `dispatchEvent()` calls.

**Testing:**
```bash
cd orchestration && source venv/bin/activate
PYTHONPATH=.. pytest tests/ -v          # Run all orchestration tests
PYTHONPATH=.. pytest tests/test_cleanup.py -v  # Run specific file
```
- Framework: pytest + pytest-asyncio
- Unit tests: `tests/test_notifications.py`, `tests/test_cleanup.py`, `tests/test_event_poller.py`
- Integration tests: `tests/test_integration.py`
- All mocked (no backend required)

## Code Patterns

**Value Objects:** Private constructor + `static create()` factory + `static isValid()` (no throw). `getValue()`. Immutable.

**Entities:** Private constructor + `static create()` factory. Auto-generates ID via `genUUID('prefix')`. Getters with `get`. IDs: `<prefix>-<uuid>`. Receive Value Objects pre-built.

**genUUID:** `domain/utils/genUUID.ts` — `genUUID(prefix)` → `'<prefix>-<crypto.randomUUID()>'`

**User password:** `User.create(name, email, hash, id?)`. Hash NEVER plaintext. `CreateUserUseCase` hashes. `LoginUseCase` compares via `HashService.compare()`.

**Member roles:** `admin` (full access), `user` (standard access), `guest` (read-only). Stored as string in `Member.role`.

**Repositories:** Prisma-based. `upsert` in `save()`. Private `toDomain()`. Params are plain strings.

**Logging:** Use cases import from `requestContext` (not `logger`). Routes import `requestLogger` from `requestContext`.

**Bitácora:** `BitacoraService` wraps errors silently (never blocks). Use cases call `log()` after operations.

**Conventions:** 2 spaces, semicolons, single quotes, max 100 chars. `export default` for classes. JSDoc headers (`@file`, `@module`) on every file.

## Testing

- Backend tests: `tests/unit/domain/value-objects/`, `tests/unit/domain/entities/`, `tests/unit/application/use-cases/`
- Use cases in subdirs: `tests/unit/application/use-cases/<domain>/`
- Frontend tests: `frontend/src/**/*.test.tsx` (co-located)
- E2E tests: `frontend/tests/e2e/*.spec.ts`
- Mocking: `import { vi } from 'vitest'`
- Backend test imports: `import X from '../../../../backend/src/domain/value-objects/X'`
- Pattern: `.opencode/skills/testing-pattern/SKILL.md`

**VO tests:** `create()` happy + error cases, `equals()`, business methods.
**Use case tests:** Happy path + mocks, error cases (validation, not found).

**E2E gotchas:**
- `loginAs(page, role)` uses demo mode toggle (sidebar)
- Tests share dev DB — create own resources for mutation tests
- Re-seed: `cd backend && npm run db:reset && npm run db:seed`

## API Routes

**Public:** Only `POST /api/v1/auth/login`
**Protected:** All other routes (JWT required via `Authorization: Bearer <token>`)

Auth middleware applied inside `routes.ts` via `router.use(authMiddleware)` — public routes defined before it, protected after.

- `GET /health` → `{ status: 'ok' }` (outside versioned router)
- `POST /api/v1/auth/login` → `{ email, password, xUserId? }` → `{ token, userId }`
- `GET /api/v1/users` → list all users
- `GET /api/v1/users/me` → authenticated user profile
- `GET /api/v1/users/:id` → user or 404
- `POST /api/v1/users` → create user `{ id?, name, email, password }`
- `DELETE /api/v1/users/:id` → delete user or 404
- `GET /api/v1/items` → list items
- `GET /api/v1/items/:id` → item by ID
- `POST /api/v1/items` → create item `{ title, description, ... }`
- `PUT /api/v1/items/:id` → update item
- `DELETE /api/v1/items/:id` → delete item
- `GET /api/v1/config` → list all configs
- `GET /api/v1/config/category/:category` → list configs by category
- `GET /api/v1/config/:key` → get config by key
- `PUT /api/v1/config/:key` → upsert config `{ value, description?, category? }`
- `PATCH /api/v1/config/:key` → partial update config
- `DELETE /api/v1/config/:key` → delete config

## API Versioning

Routes versioned by URL prefix (`/api/v1`, `/api/v2`). Each version independent.
- `infrastructure/api/v1/routes.ts` — version 1
- `infrastructure/api/v2/routes.ts` — version 2 (placeholder)
- `/health` outside versioning (system endpoint)
- Each route file creates its own repository/use-case instances

## Frontend

### Theme System

6 themes: `light`, `dark`, `ocean`, `forest`, `sunset`, `night`.
- CSS custom properties in `index.css` (`:root` for light, `.dark` for dark, `.theme-*` for others)
- `tailwind.config.js` references `var(--color-*)` (no hardcoded colors)
- `ThemeContext` (`src/context/ThemeContext.tsx`): `ThemeProvider` + `useTheme()` hook
  - Returns: `{ theme, setTheme, toggleTheme, themes, getThemeLabel, getThemeClass }`
  - `themes` is the array of `{ id, label, cssClass }` objects
  - Persisted in `localStorage('theme')`, detects system preference via `matchMedia`

### Layout

- Collapsible sidebar (280px open / 64px closed), persisted in `localStorage('sidebar-collapsed')`
- Theme selector in sidebar (dropdown when expanded, palette icon when collapsed)
- Header shows user info when authenticated

### Auth Flow

- `/login` route redirects to `/dashboard` — login is NOT a standalone page
- `Layout` renders `LoginForm` when `!localStorage.getItem('token')`, otherwise renders `<Outlet />`
- Demo mode: sidebar toggle calls `POST /auth/login` with `{ xUserId: selectedRole }`, stores JWT
- `UserContext` provides: `user`, `participations`, `refreshUser()`, `isAuthenticated`, role helpers
- Polling: refreshes data every 30s, pauses when tab hidden

### Components

- **`SubmitModal`** — Two tabs: File Upload (drag-and-drop, progress bar) and URL
- **`PlayerModal`** — YouTube/Vimeo/local detection, navigation, star review
- **`ConfirmDialog`** — Focus management, Escape key, danger-styled confirm
- **`ToastProvider`** — `showSuccess/showError/showInfo`, auto-close 4s, bottom-right

### Frontend Utils

- `utils/scoring.ts` — `scoreToStars(score: number): number` (0-10 → 0-5)
- `utils/status.ts` — `STATUS_STYLES`, `getStatusStyle()`, `StatusType` type

### UserCacheContext

- `getUser(id)` → `{ name, email }` from cache or null
- `ensureUser(id)` → fetches from `GET /users/:id`, caches, deduplicates concurrent requests

### E2E Testing (Playwright)

- Config: `frontend/playwright.config.ts` (baseURL: `localhost:5173`, auto-starts dev server)
- Helpers: `tests/e2e/helpers/auth.ts` (`loginAs`), `helpers/wait.ts` (`waitForToast`)
- Run: `cd frontend && npx playwright test`
- Single test: `cd frontend && npx playwright test -g "test name"`

### Frontend Structure

```
frontend/src/
├── api/client.ts              ← Axios with JWT Bearer interceptor
├── components/                ← Layout, LoginForm, Modals, ConfirmDialog
├── context/                   ← UserContext, ThemeContext, ToastContext, UserCacheContext
├── pages/                     ← Dashboard, Items, ItemDetail
├── utils/                     ← scoring.ts, status.ts
├── App.tsx                    ← Routes + UserProvider + ThemeProvider
└── index.css                  ← Tailwind + CSS custom properties
```

## Deployment

### Database
- **Platform:** Neon.tech (PostgreSQL serverless)
- **Plan:** Free Tier (0.5 GB)

### Backend
- **Platform:** Render
- **Start command:** `npx tsx src/index.ts`
- **Key env vars:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`

### Frontend
- **Platform:** Vercel
- **Framework:** React + Vite
- **Key env vars:** `VITE_API_URL=https://tu-backend.onrender.com/api/v1`

### Orchestrator
- **Platform:** Render
- **Start command:** `python -m uvicorn orchestration.webhooks.server:app --host 0.0.0.0 --port 10000`
- **Key env vars:** `SEND_TOKEN`, `BACKEND_URL`

### Cloudflare Worker (Ping)
- **Platform:** Cloudflare Workers
- **Purpose:** Keep backend alive (prevent sleep)
- **Schedule:** Every 15 minutes during business hours
- **Code:** `docs/cloudflare-worker.js`

## Estrategia de .gitignore

- **Root `.gitignore`**: reglas globales (node_modules, .env, __pycache__, venv, dist, etc.)
- **Subdirectorios**: solo reglas específicas de cada módulo (Vite en frontend, Prisma en backend, pytest en orchestration)
- **No duplicar** reglas entre niveles
- **`package-lock.json` NO se ignora** (debe versionarse tras el setup)
- **`.opencode/skills/` SÍ se versiona** (útil para cualquier usuario)
- **`.opencode/node_modules/` y `cache/` NO se versionan**
- **`backend/uploads/.gitignore`** mantiene el directorio vacío en git pero ignora archivos subidos

## Plans Location

Plans are stored in `/.opencode/plans/<YYYYMMDD>_<nombre>.md`.

## Versioned AGENTS.md

Backup rule: Before editing, copy current file to `docu/saves-agents/AGENTS_<YYYYMMDD_HHMMSS>.md`.
Purpose: Revert bad agent changes, track rule evolution, reference past decisions.

## Customization Guide

### How to rename the domain

1. Run `./setup.sh your-project-name` to rename all references
2. Update `AGENTS.md` header and references
3. Update `README.md` title and description
4. Update `docker-compose.yml` container and DB names
5. Update `.env.example` files with new defaults

### How to add a new model

1. **Domain:** Create entity in `backend/src/domain/entities/YourModel.ts`
2. **Value Objects:** Create in `backend/src/domain/value-objects/`
3. **Repository:** Create in `backend/src/infrastructure/repositories/`
4. **Use Cases:** Create in `backend/src/application/use-cases/`
5. **Routes:** Add endpoints in `backend/src/infrastructure/api/v1/routes.ts`
6. **Schema:** Update `backend/prisma/schema.prisma` with new model
7. **Frontend:** Add page in `frontend/src/pages/YourModel.tsx`

### How to add a new workflow

1. Create file in `orchestration/workflows/your_workflow.py`
2. Extend `BaseWorkflow` with `event_type` and `execute()`
3. Register in `orchestration/main.py`
4. Add webhook endpoint in `orchestration/webhooks/server.py`

### How to add a new config key

1. Use `PUT /api/v1/config/your.key` with `{ "value": "...", "category": "..." }`
2. Access in backend: `ConfigRepository.get('your.key')`
3. Access in orchestrator: `get_config('your.key')`
4. Config categories: `logging`, `feature_flags`, `limits`, `integrations`, `ui`

### How to customize member roles

The starter uses three roles: `admin`, `user`, `guest`. To customize:

1. Update `backend/src/domain/entities/Member.ts` — add/modify role enum
2. Update `backend/src/application/use-cases/auth/` — adjust permission checks
3. Update frontend role helpers in `UserContext`
4. Document new roles in this file

### How to add a new email provider

1. Create provider class in `orchestration/utils/email_client.py`
2. Add provider to `EmailClient.send_email()` switch
3. Configure via `EMAIL_PROVIDER` env var (console, smtp, resend)
