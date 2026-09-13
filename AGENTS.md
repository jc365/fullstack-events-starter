# AGENTS.md — Castant

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

## Project Status

- **Backend:** ✅ 198/198 tests passing
- **Frontend:** ✅ 18/18 tests passing
- **E2E:** ✅ 13/13 tests passing
- **Desktop:** ✅ Functional (Login, Dashboard, Casting Detail, Video Player, Export)

## Rules (Always Apply)

1. **Never modify imports** — no `.js` extensions on import paths.
2. **Backup AGENTS.md** before editing → `docu/saves-agents/AGENTS_<YYYYMMDD_HHMMSS>.md`.
3. **IDs are flat strings** with prefixes (e.g. `user-...`). No `TypedId`.
4. **Director is a `Participant`** with `role: 'director'`.

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
npm run db:migrate      # Run Prisma migrations
npm run db:studio       # Open Prisma Studio

# Dev with all services (DB + Backend + Frontend + OpenCode + Orchestrator)
npm run dev:all
```

**Order:** `typecheck → test`

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
- Users: `director@demo.com`, `actor1@demo.com`, `actor2@demo.com`, `preselector@demo.com` (password: `changeme`)
- Demo casting with 2 rounds, participants, 2 submissions
- Config entries: logging, feature_flags, limits, integrations, ui (9 entries)
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
- `console.log(authHeader)` removed — never log tokens
- `.env`, `.env.local`, `.env.*.local` are in `.gitignore`
- **M1:** Request body logging removed from pino-http serializer (`index.ts:76`)
- **M2:** Production guard: `NODE_ENV=production` + `DEMO_MODE=true` throws error at startup
- **H3:** Strong 128-char hex JWT_SECRET in `.env`
- **H4:** CORS configurable via `CORS_ORIGIN` env var (comma-separated)
- **H5:** Helmet enabled with HSTS in production
- **H6:** Rate limiting: login 10 req/15min, API 100 req/15min
- **H7:** Service tokens via `ADMIT_TOKENS` env var (comma-separated). Tokens in the list bypass JWT validation and get `req.user = { id: 'service', role: 'service' }`. Used by the orchestration server.

**Video upload:**
- Multer config: `infrastructure/storage/videoUpload.ts` (memoryStorage)
- Storage: Cloudflare R2 (production) or local `backend/uploads/videos/` (fallback)
- R2 key stored in `Submission.videoKey` (e.g. `castant/videos/video-123.mp4`)
- Presigned URLs generated on-demand via `GET /videos/:submissionId/url` (2h expiry)
- `backend/uploads/videos/.gitignore` keeps the directory in git but ignores uploaded videos
- Static middleware in `index.ts` serves `/uploads`
- MIME types: MP4, WebM, OGG, MOV, AVI, MKV; max 100MB

**Presigned URL strategy:**
- `videoKey` in DB is the stable reference (never expires)
- `videoUrl` in DB stores the original URL (presigned at upload time, or external URL)
- Frontend uses `useVideoUrls` hook to resolve keys → fresh presigned URLs
- On 403 error, hook regenerates all URLs for the page

## Configuración de Logs

### `logging.level`

Controla el nivel de logs en todos los componentes del sistema:

| Nivel | Backend (pino) | Orquestador (Python) | Frontend (console) |
|-------|----------------|----------------------|-------------------|
| `debug` | ✅ | ✅ | ✅ |
| `info` | ✅ | ✅ | ✅ |
| `warn` | ✅ | ✅ | ✅ |
| `error` | ✅ | ✅ | ✅ |

**Comportamiento:**

- Todos los logs de la aplicación y HTTP se controlan con este único nivel
- Cambios en `logging.level` se aplican en caliente (sin reiniciar) en los tres componentes
- Los logs de cambio de configuración (`🔄 [Config] Log level changed`) siempre son visibles

**Ejemplo:**

```bash
# Cambiar a modo debug para depuración
PATCH /api/v1/config/logging.level
{ "value": "debug" }
```

### Logs de cambio de configuración

Los logs de cambio de nivel (`🔄 [Config] Log level changed`) siempre son visibles, independientemente del nivel configurado:

- **Backend:** `console.log()`
- **Orquestador:** `logger.info()` (siempre visible)
- **Frontend:** `console.log()`

Esto garantiza que el administrador siempre vea los cambios de configuración, incluso si el nivel de logs es `warn` o `error`.

## Orchestration Server

Python/FastAPI service for event-driven workflows. Runs on port `8080`.

**Stack:** Python 3.10+, FastAPI, uvicorn, httpx, ffmpeg (system)

**Start:**
```bash
cd orchestration && source venv/bin/activate
python -m orchestration.main
```

**Webhooks (POST):**
- `/webhook/submission.created` → VideoProcessorWorkflow (thumbnail + metadata via ffprobe/ffmpeg, PATCH to backend)
- `/webhook/review.completed` → NotificationWorkflow (email to actor with score/feedback)
- `/webhook/cleanup.daily` → CleanupWorkflow (delete videos older than N days)

**Service token auth:** Orchestration sends `SEND_TOKEN` in `Authorization: Bearer` header. Backend validates against `ADMIT_TOKENS` env var. No JWT required for service-to-service calls.

**Config:** `.env` in `orchestration/` (see `.env.example`). Uploads dir defaults to `backend/uploads/videos/`.

**Backend integration:** `infrastructure/webhooks/webhookClient.ts` — fire-and-forget `dispatchEvent()` calls after submission creation and review completion.

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

**LoginUseCase:** Supports demo via optional `xUserId` in `LoginInput`. Validates `DEMO_MODE=true`. Uses `DEMO_USERS` map: `{ director: 'director@demo.com', actor: 'actor1@demo.com', preselector: 'preselector@demo.com' }`.

**Casting participants:** `CastingParticipantEntry` = `{ userId, role: 'director' | 'reviewer' }`. Casting-level participants have `castingId` set, `roundId` null.

**Round participants:** `RoundParticipantEntry` = `{ id, role: 'actor' | 'preselector' }`. Round-level participants have `roundId` set, `castingId` null.

**CreateCastingUseCase:** Auto-creates Round 1 with empty participants.

**ManageRoundParticipantsUseCase:** `actors` and `preselectors` as separate lists. `createNewRound=true` marks submissions `selected`/`rejected` and creates new round.

**ReviewSubmissionUseCase:** Allows re-evaluation (`pending→reviewed`, `reviewed→reviewed`). Blocks `selected`/`rejected`. Empty feedback → `Feedback.none()`.

**Repositories:** Prisma-based. `upsert` in `save()`. Private `toDomain()`. Params are plain strings.

**Logging:** Use cases import from `requestContext` (not `logger`). Routes import `requestLogger` from `requestContext`.

**Bitácora:** `BitacoraService` wraps errors silently (never blocks). Use cases call `log()` after operations. Actions: `create_user`, `create_casting`, `submit_video`, `review_submission`, `add_participants`, `create_round`.

**Conventions:** 2 spaces, semicolons, single quotes, max 100 chars. `export default` for classes. JSDoc headers (`@file`, `@module`) on every file.

## Testing

- Backend tests: `tests/unit/domain/value-objects/`, `tests/unit/domain/entities/`, `tests/unit/application/use-cases/`
- Use cases in subdirs: `tests/unit/application/use-cases/rounds/`
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
- `GET /api/v1/users/me/participations` → authenticated user's participations
- `GET /api/v1/users/:id` → user or 404
- `POST /api/v1/users` → create user `{ id?, name, email, password }`
- `DELETE /api/v1/users/:id` → delete user or 404
- `GET /api/v1/castings` → list castings with participants
- `GET /api/v1/castings/:id` → casting with participants and rounds
- `POST /api/v1/castings` → create casting `{ title, description, directorEmail, directorName }`
- `PUT /api/v1/castings/:id` → update `{ title?, description? }`
- `DELETE /api/v1/castings/:id` → delete with cascade
- `GET /api/v1/rounds/:id` → round with participants and submissions
- `GET /api/v1/rounds/:id/submissions` → list submissions
- `PATCH /api/v1/rounds/:id` → update `{ number }`
- `DELETE /api/v1/rounds/:id` → delete with cascade
- `DELETE /api/v1/rounds/:roundId/participants/:userId` → remove participant (director only, returns `{ success, hadSubmissions }`)
- `POST /api/v1/rounds/participants` → manage participants or create new round `{ roundId, actors, preselectors, createNewRound? }`
- `POST /api/v1/submissions` → submit video (JSON `{ roundId, videoUrl }` or multipart with `video` field) — `actorId` from `req.user.id`
- `GET /api/v1/submissions/:id` → submission by ID
- `GET /api/v1/videos/:submissionId/url` → presigned URL for R2 video (2h expiry)
- `DELETE /api/v1/submissions/:id` → delete submission
- `PATCH /api/v1/submissions/:id/review` → review `{ score, feedback }` — `directorId` from `req.user.id`
- `PATCH /api/v1/submissions/:id/metadata` → update metadata `{ duration }` — used by VideoPlayerModal
- `GET /api/v1/config` → list all configs
- `GET /api/v1/config/category/:category` → list configs by category
- `GET /api/v1/config/:key` → get config by key
- `PUT /api/v1/config/:key` → upsert config `{ value, description?, category? }`
- `PATCH /api/v1/config/:key` → partial update config `{ value?, description?, category? }`
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
  - `themes` is the array of `{ id, label, cssClass }` objects (not `allThemes`/`themeLabels`)
  - Persisted in `localStorage('theme')`, detects system preference via `matchMedia`

### Layout

- Collapsible sidebar (280px open / 64px closed), persisted in `localStorage('sidebar-collapsed')`
- Theme selector in sidebar (dropdown when expanded, palette icon when collapsed)
- Header shows user info only when authenticated AND not in demo mode; shows `Demo: {selectedRole}` badge in demo mode
- `handleLogout` resets `demoEnabled` state

### Auth Flow

- `/login` route redirects to `/dashboard` — login is NOT a standalone page
- `Layout` renders `LoginForm` when `!localStorage.getItem('token')`, otherwise renders `<Outlet />`
- Demo mode: sidebar toggle calls `POST /auth/login` with `{ xUserId: selectedRole }`, stores JWT
- `UserContext` provides: `user`, `participations`, `refreshUser()`, `isAuthenticated`, role helpers
- Polling: refreshes participations every 30s, pauses when tab hidden

### Components

- **`SubmitVideoModal`** — Two tabs: File Upload (default, drag-and-drop, progress bar) and URL
- **`VideoPlayerModal`** — YouTube/Vimeo/local detection, `< >` nav with counter, `<< >>` first/last with vertical divider, star review (⭐/☆), film strip border, captures video duration via `loadedmetadata`
- **`CreateNextRoundModal`** — Score filter (1-5 stars), actor checkboxes, Select All/Deselect All, "Create empty round" option
- **`AddParticipantsModal`** — Two textareas (actors, pre-selectors), email parsing
- **`ConfirmDialog`** — Focus management, Escape key, danger-styled confirm
- **`ToastProvider`** — `showSuccess/showError/showInfo`, auto-close 4s, bottom-right

### Frontend Utils

- `utils/scoring.ts` — `scoreToStars(score: number): number` (0-10 → 0-5)
- `utils/submissionStatus.ts` — `STATUS_STYLES`, `getStatusStyle()`, `SubmissionStatus` type

### UserCacheContext

- `getUser(id)` → `{ name, email }` from cache or null
- `ensureUser(id)` → fetches from `GET /users/:id`, caches, deduplicates concurrent requests
- Guards against falsy `id`

### E2E Testing (Playwright)

- Config: `frontend/playwright.config.ts` (baseURL: `localhost:5173`, auto-starts dev server)
- Helpers: `tests/e2e/helpers/auth.ts` (`loginAs`), `helpers/wait.ts` (`waitForToast`)
- Run: `cd frontend && npx playwright test`
- Single test: `cd frontend && npx playwright test -g "test name"`

### Frontend Structure

```
frontend/src/
├── api/client.ts              ← Axios with JWT Bearer interceptor
├── components/                ← Layout, LoginForm, SubmitVideoModal, VideoPlayerModal,
│                                CreateNextRoundModal, AddParticipantsModal, ConfirmDialog
├── context/                   ← UserContext, ThemeContext, ToastContext, UserCacheContext
├── pages/                     ← Dashboard, Castings, CreateCasting, CastingDetail, RoundDetail
├── utils/                     ← scoring.ts, submissionStatus.ts
├── App.tsx                    ← Routes + UserProvider + ThemeProvider
└── index.css                  ← Tailwind + CSS custom properties
```

## Desktop Client

### Stack

- Python 3.10+
- CustomTkinter (modern UI)
- requests (HTTP client)
- pywebview (embedded video playback)

### Structure

```
desktop/
├── src/
│   ├── main.py          # App entry point
│   ├── api/
│   │   └── client.py    # HTTP client with JWT auth
│   ├── ui/
│   │   ├── login.py     # Login window
│   │   ├── dashboard.py # Dashboard with castings list
│   │   ├── casting_detail.py  # Casting details with rounds
│   │   ├── round_detail.py    # Round detail with submissions
│   │   ├── video_player.py    # Video player with review (mpv)
│   │   └── export_dialog.py   # Export dialog (ZIP, compression)
│   ├── models/
│   │   └── types.py     # Data classes
│   └── utils/
│       ├── config.py    # Configuration
│       ├── paths.py     # Cross-platform paths (Downloads)
│       ├── video_compressor.py  # ffmpeg compression
│       └── zip_exporter.py      # ZIP export with manifest
├── requirements.txt
├── run.py               # Launcher script
└── README.md
```

### Commands

```bash
# Install dependencies
cd desktop && pip install -r requirements.txt

# Run desktop app
cd desktop && python3 run.py

# Or from root
cd desktop && python3 -m src.main

# With venv (recommended)
cd desktop && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

### Configuration

- API URL: `CASTANT_API_URL` env var (default: `http://localhost:3000/api/v1`)
- Theme: `dark` (default in config.py)

### API Endpoints Used

- `POST /api/v1/auth/login` — Login with email/password or demo mode
- `GET /api/v1/castings` — List castings
- `GET /api/v1/castings/:id` — Casting details with rounds
- `GET /api/v1/rounds/:id` — Round with participants and submissions
- `PATCH /api/v1/submissions/:id/review` — Submit review (score + feedback)

### Features

- Login with email/password or demo mode
- Dashboard with castings list and role badges
- Casting Detail (participants, rounds)
- Round Detail (submissions, scores, export button)
- Video Player with mpv (play, navigate, review)
- Star-based scoring and feedback for directors
- Video export: compression (ffmpeg, CRF 18/23/28), ZIP packaging, manifest.json
- Export location: user's Downloads folder (cross-platform)

### Testing

- Framework: pytest
- Unit tests: `desktop/tests/unit/`
- Integration tests: `desktop/tests/integration/`
- Run tests: `cd desktop && pytest`

## Deployment

### Base de Datos
- **Plataforma:** Neon.tech
- **Tipo:** PostgreSQL serverless
- **URL:** (no documentar la URL real)
- **Plan:** Free Tier (0.5 GB)
- **Región:** AWS US East 2 (Ohio)

### Backend
- **Plataforma:** Render
- **URL:** https://castant-backend.onrender.com
- **Comando de inicio:** `npx tsx src/index.ts`
- **Variables clave:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- **Plan:** Starter (750h/mes)

### Frontend
- **Plataforma:** Vercel
- **URL:** https://castant.vercel.app
- **Framework:** React + Vite
- **Variables clave:** `VITE_API_URL=https://castant-backend.onrender.com/api/v1`

### Orquestador (OpenClaw)
- **Plataforma:** Render
- **URL:** https://castant-orchestrator.onrender.com
- **Comando de inicio:** `python -m uvicorn orchestration.webhooks.server:app --host 0.0.0.0 --port 10000`
- **Variables clave:** `SEND_TOKEN`, `CASTANT_BACKEND_URL`

### Cloudflare Worker (Ping)
- **Plataforma:** Cloudflare Workers
- **URL:** https://castant-ping.workers.dev
- **Propósito:** Mantener el backend de Render activo (evitar el dormido)
- **Cron:** `*/15 * * * *` (cada 15 minutos)
- **Horario:** 16:00 - 20:00 (Lunes a Viernes)
- **Variables:** `START_HOUR=16`, `END_HOUR=20`, `DAYS_ALLOWED=1-5`
- **Código:** `docs/cloudflare-worker.js`

## Plans Location

Plans are stored in `/.opencode/plans/<YYYYMMDD>_<nombre>.md`.

## Versioned AGENTS.md

Backup rule: Before editing, copy current file to `docu/saves-agents/AGENTS_<YYYYMMDD_HHMMSS>.md`.
Purpose: Revert bad agent changes, track rule evolution, reference past decisions.
