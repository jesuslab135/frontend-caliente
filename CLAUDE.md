# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Caliente is a sports betting operations management platform (scheduling, teams, traders). This is the **frontend** repo — a Vue 3 + Vite SPA that talks to a Django REST backend.

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

## Key Conventions

- **Path alias**: `@` maps to `src/caliente/src/` (configured in both vite.config.js and jsconfig.json).
- **Package manager**: pnpm (not npm or yarn).
- **Backend DTOs use snake_case**, frontend models use camelCase — always use adapters for conversion.
- **User roles**: `MONITOR_TRADER`, `INPLAY_TRADER`, `MANAGER`, `ADMIN`.
- **Language**: Code comments and variable names mix Spanish and English. Backend error messages are in Spanish.
- **API routes** always end with trailing slashes (Django convention).
- **Node version**: ^20.19.0 || >=22.12.0.
