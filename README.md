# fullstack-events-starter

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg)](https://www.python.org/)

Monorepo starter kit with Node/Express backend, React frontend, and Python orchestrator for event-driven workflows.

## Features

- **Backend:** Express 5 + Prisma + PostgreSQL + JWT auth + dynamic config + audit log
- **Frontend:** React + Vite + Tailwind + 6 themes + context-based state
- **Orchestrator:** FastAPI + event-driven workflows + webhooks + cron integration
- **Storage:** Cloudflare R2 with local fallback
- **Email:** Multiple providers (console, SMTP, Resend)
- **Testing:** Vitest + Playwright + pytest
- **Deployment:** Render (backend + orchestrator) + Vercel (frontend) + Neon (PostgreSQL)

## Quick Start

```bash
# 1. Clonar y personalizar
git clone https://github.com/tu-usuario/fullstack-events-starter.git mi-proyecto
cd mi-proyecto
./setup.sh mi-proyecto

# 2. Editar credenciales en .env
#    - backend/.env (DATABASE_URL, JWT_SECRET)
#    - frontend/.env (VITE_API_URL)
#    - orchestration/.env (si aplica)
#    - tests/REST Client/.env (URLs para pruebas manuales)

# 3. Instalar dependencias, levantar PostgreSQL y sembrar
./postsetup.sh

# 4. Arrancar backend y frontend
npm run dev:all
```

> **Nota:** El starter usa `prisma db push` (sin migraciones versionadas). Si necesitas migraciones versionadas, consulta [docu/MIGRATIONS.md](docu/MIGRATIONS.md).

Comandos útiles (desde la raíz):

| Comando | Descripción |
|---------|-------------|
| `./postsetup.sh` | Instalar deps, arrancar PostgreSQL y sembrar |
| `npm run db:up` | Levantar PostgreSQL (Docker) |
| `npm run db:down` | Detener PostgreSQL |
| `npm run db:push` | Sincronizar schema contra la BD |
| `npm run db:seed` | Insertar datos demo |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:backup` | Backup de PostgreSQL |
| `npm run db:restore` | Restaurar backup |

> **Note on PostgreSQL port:** This starter uses port `5433` by default to avoid conflicts with other PostgreSQL instances (which commonly use `5432`). If you prefer `5432`, edit `docker-compose.yml` and `backend/.env`.

## Project Structure

```
fullstack-events-starter/
├── backend/                  # Express 5 + Prisma + TypeScript
│   ├── prisma/               # Schema, migrations, seed
│   ├── src/
│   │   ├── domain/           # Entities, value objects, interfaces
│   │   ├── application/      # Use cases (commands, queries)
│   │   └── infrastructure/   # Repositories, API, storage, email
│   └── tests/                # Unit + integration tests
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── context/          # React context providers
│   │   ├── pages/            # Route pages
│   │   └── utils/            # Helpers
│   └── tests/e2e/            # Playwright E2E tests
├── orchestration/            # Python + FastAPI
│   ├── webhooks/             # FastAPI server
│   ├── workflows/            # Event-driven workflows
│   └── utils/                # Email, backend client
├── docs/                     # Architecture docs, diagrams
└── docu/                     # Clean Architecture guide
```

## Requirements

- **Node.js** 20+
- **Python** 3.10+
- **PostgreSQL** 15+ (or Docker)
- **Docker** (optional, for local DB)
- **ffmpeg** (optional, for video processing workflows)

## What's Included

| Feature | Stack | Description |
|---------|-------|-------------|
| REST API | Express 5 + TypeScript | Full CRUD with validation, auth, rate limiting |
| Database | Prisma + PostgreSQL | Schema-first ORM with db push (migrations optional) |
| Auth | JWT | Token-based auth with role-based access |
| Config | Dynamic config table | Runtime config via API, no restart needed |
| Audit | BitacoraService | Non-blocking audit log for all mutations |
| Frontend | React + Vite | SPA with routing, context state, themes |
| Themes | Tailwind + CSS vars | 6 built-in themes (light, dark, ocean, forest, sunset, night) |
| Workflows | FastAPI | Event-driven with webhook triggers |
| Storage | Cloudflare R2 | S3-compatible with local fallback |
| Email | Multi-provider | Console (dev), SMTP, Resend |
| Testing | Vitest + Playwright | Unit, integration, and E2E tests |

## What to Customize

This starter uses a generic **Item** model as the domain example. To adapt to your domain:

1. **Define your entities** in `backend/src/domain/entities/`
2. **Create value objects** in `backend/src/domain/value-objects/`
3. **Update the Prisma schema** in `backend/prisma/schema.prisma`
4. **Implement use cases** in `backend/src/application/use-cases/`
5. **Add API routes** in `backend/src/infrastructure/api/v1/routes.ts`
6. **Build frontend pages** in `frontend/src/pages/`

See the [Customization Guide](AGENTS.md#customization-guide) in AGENTS.md for detailed instructions.

## Optional Extensions

- **Cloudflare Worker:** Cron-based health ping to keep services alive. See `docs/cloudflare-worker.js`.

## Documentation

- [AGENTS.md](AGENTS.md) — Full project conventions, patterns, and commands
- [docu/GUIDE.md](docu/GUIDE.md) — Clean Architecture reference
- [docs/diagrams/](docs/diagrams/) — Flow diagrams

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
