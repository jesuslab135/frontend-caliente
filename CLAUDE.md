# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Caliente is a sports betting operations management platform (scheduling, teams, traders). This is the **frontend** repo — a Vue 3 + Vite SPA that talks to a Django REST backend.

**SRS Document**: `Enterprise_Scheduler_SRS_v1.1.pdf` (34 pages) defines all requirements. Key user stories: HU-001 to HU-008.

## Development Commands

All commands must be run from `src/caliente/` (the Vue project root):

```sh
cd src/caliente
pnpm install        # install dependencies
pnpm dev            # dev server at http://localhost:5173
pnpm build          # production build
pnpm preview        # preview production build
```

There are no test or lint scripts configured yet.

## Docker

The Dockerfile at the repo root builds an Ubuntu-based container with Node 20 and pnpm. It exposes ports 5173 (Vite) and 3000. The app source is not copied at build time — mount or copy `src/caliente/` into `/app` at runtime.

## Architecture

### Repository Layout

```
frontend/
├── src/caliente/          # Vue project root (package.json, vite.config.js, index.html)
│   └── src/
│       ├── main.js         # App entry point
│       ├── App.vue         # Root component
│       ├── assets/         # CSS and static assets
│       ├── components/     # Vue components
│       ├── di/             # Dependency injection (singleton HTTP client)
│       ├── domain/         # Domain layer (DDD-inspired)
│       └── stores/         # Pinia stores
├── Dockerfile
└── scripts/install.sh
```

### Domain Layer (`src/domain/`)

The codebase uses a DDD-inspired layered architecture:

- **`interfaces/`** — Contracts (e.g., `IHttpClient`) that decouple HTTP implementation from business logic.
- **`services/`** — Implementations (e.g., `AxiosHttpClient` implements `IHttpClient`).
- **`repositories/`** — `BaseRepository<T>` provides generic CRUD. Specialized repos like `AuthRepository` add domain-specific methods.
- **`models/`** — Rich domain models with computed properties (e.g., `User` has `fullName`, `isAdmin`, role checks).
- **`adapters/`** — Transform backend DTOs (snake_case) into domain model instances (e.g., `UserAdapter.fromDTO()`).
- **`dtos/`** — TypeScript interfaces matching the backend's JSON response shapes (snake_case fields).
- **`types/`** — Shared type definitions (e.g., `AuthTokens`, `AuthResult`).
- **`constants/endpoints.ts`** — Centralized API route definitions for all resources.

### Dependency Injection (`src/di/`)

`http.ts` creates a singleton `AxiosHttpClient` using `VITE_API_BASE_URL` from env. All repositories receive this client via constructor injection.

### Auth Flow (`stores/useAuthStore.ts`)

Pinia store using composition API. Tokens are stored in localStorage. On app init, tokens are validated against the backend and auto-refreshed if expired. JWT access/refresh token pattern.

### Backend API

The backend is a Django REST API at `VITE_API_BASE_URL` (default `http://localhost:8000/api/`). Resources include: auth, employees, leagues, schedules, shift types/categories/cycles, sport events, swap requests, system settings, teams, vacations.

## System Modules (from SRS v1.1)

| Module | Priority | Key Endpoints |
|--------|----------|---------------|
| AUTH | MUST | `/api/auth/login/`, `/api/auth/me/`, `/api/auth/token/refresh/` |
| EMPLOYEES | MUST | `/api/employees/` (CRUD + filter by role/team) |
| SHIFTS | MUST | `/api/shift-types/`, `/api/shift-categories/`, `/api/shift-cycle-config/` |
| SCHEDULES | MUST | `/api/schedules/` (grid edit, weekly/monthly views, my-schedule) |
| ALGORITHM | MUST | `/api/schedules/generate/` (one-click monthly generation) |
| EVENTS | SHOULD | `/api/leagues/`, `/api/sport-events/` (priority 1-10 for algorithm) |
| SWAP REQUESTS | SHOULD | `/api/swap-requests/` (peer accept → admin approve workflow) |
| VACATIONS | SHOULD | `/api/vacations/` (request/approve, auto-mark VAC) |
| SETTINGS | SHOULD | `/api/settings/system/` (singleton: max_consecutive_days, etc.) |

## Grid Edit Paradigm (HU-005 — Core UX)

The schedule dashboard uses **in-place grid editing** — no external forms:

- **Left click** on cell: cycle to next shift in configured sequence
- **Shift+Click**: cycle backward (inverse direction)
- **Right click**: context menu with all available shifts
- **Hover (500ms)**: tooltip showing current → next shift
- **Ctrl+Click**: multi-select for bulk edit
- **Ctrl+Z**: undo last change
- **Auto-save**: after 2s inactivity or on cell blur
- **Latency**: <200ms per click including validation

### Default Cycle Sequences
- Monitor Trader: `MON6 → MON12 → MON14 → OFF → (repeat)`
- Inplay Trader: `IP6 → IP9 → IP10 → IP12 → IP14 → OFF → (repeat)`

## Shift Types Reference

| Code | Schedule | Category | Min Coverage |
|------|----------|----------|-------------|
| MON6 | 6:00-14:00 | AM | 3 traders (AM total) |
| MON12 | 12:00-20:00 | INS | 0 |
| MON14 | 14:00-22:00 | MID | 3 traders (MID total) |
| IP6 | 6:00-14:00 | AM | (included in AM min) |
| IP9 | 9:00-17:00 | INS | 0 |
| IP10 | 10:00-18:00 | INS | 0 |
| IP12 | 12:00-20:00 | INS | 0 |
| IP14 | 14:00-22:00 | MID | (included in MID min) |
| OFF | Libre | - | - |
| VAC | Vacaciones | - | - |

## Key Conventions

- **Path alias**: `@` maps to `src/caliente/src/` (configured in both vite.config.js and jsconfig.json).
- **Package manager**: pnpm (not npm or yarn).
- **Backend DTOs use snake_case**, frontend models use camelCase — always use adapters for conversion.
- **User roles**: `MONITOR_TRADER`, `INPLAY_TRADER`, `MANAGER`, `ADMIN`.
- **Language**: Code comments and variable names mix Spanish and English. Backend error messages are in Spanish.
- **API routes** always end with trailing slashes (Django convention).
- **Node version**: ^20.19.0 || >=22.12.0.
- **Design system**: Light theme, `arena-*` gray scale, `caliente-600` (#E30613) brand red, Inter font, borders-only depth.
