# Deployment Design: Caliente Staging + Production on IONOS VPS

**Date**: 2026-02-16
**Author**: DevOps Design Session
**Status**: Approved

---

## Context

Caliente is a full-stack app (Django backend + Vue 3 frontend) in **2 separate GitHub repos**. We need automated CI/CD deploying to a single **IONOS VPS (2 GB RAM, Ubuntu)** with two environments:

- **Staging**: `staging.jesuslab135.com` (deploy on push to `develop`)
- **Production**: `app.jesuslab135.com` (deploy on push to `main`)

## Architecture

### Container Layout (7 containers)

```
VPS (2 GB RAM + 2 GB swap)
┌──────────────────────────────────────────────────┐
│                                                  │
│  nginx (reverse proxy + SSL termination)         │
│    ├── staging.jesuslab135.com                   │
│    │     /     → frontend_staging (static)       │
│    │     /api/ → backend_staging:8000            │
│    └── app.jesuslab135.com                       │
│          /     → frontend_prod (static)          │
│          /api/ → backend_prod:8000               │
│                                                  │
│  postgres:16-alpine (1 instance)                 │
│    ├── caliente_staging_db                       │
│    └── caliente_prod_db                          │
│                                                  │
│  backend_staging  (Django/Daphne)                │
│  backend_prod     (Django/Daphne)                │
│  frontend_staging (nginx:alpine + dist/)         │
│  frontend_prod    (nginx:alpine + dist/)         │
│  certbot          (SSL cert renewal)             │
│                                                  │
│  Exposed ports: ONLY 80 and 443 (via nginx)      │
└──────────────────────────────────────────────────┘
```

### RAM Budget

| Container | Estimated RAM |
|-----------|-------------|
| nginx (reverse proxy) | 30 MB |
| postgres:16-alpine | 250 MB |
| backend_staging (Daphne) | 180 MB |
| backend_prod (Daphne) | 180 MB |
| frontend_staging (nginx+static) | 15 MB |
| frontend_prod (nginx+static) | 15 MB |
| OS + system overhead | 400 MB |
| **Total** | **~1.1 GB** |

Remaining ~900 MB free + 2 GB swap = comfortable headroom.

### Docker Networks (Isolation)

```
network: caliente_staging
  nginx ←→ backend_staging ←→ postgres
  nginx ←→ frontend_staging

network: caliente_prod
  nginx ←→ backend_prod ←→ postgres
  nginx ←→ frontend_prod
```

- Staging containers CANNOT communicate with production containers
- Nginx bridges both networks (connected to both)
- PostgreSQL bridges both (different databases per env)
- No container except nginx exposes ports to the internet

### VPS Directory Structure

```
/opt/caliente/
├── docker-compose.yml       # Master compose (all 7 services)
├── .env.staging             # Backend env vars for staging
├── .env.prod                # Backend env vars for production
├── nginx/
│   ├── staging.conf         # staging.jesuslab135.com server block
│   └── prod.conf            # app.jesuslab135.com server block
├── certbot/
│   ├── conf/                # Let's Encrypt certificates (volume)
│   └── www/                 # ACME challenge files (volume)
└── init-letsencrypt.sh      # First-time SSL cert generation
```

## DNS Configuration

### IONOS DNS Panel — A Records

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | staging | `VPS_IP_ADDRESS` | 3600 |
| A | app | `VPS_IP_ADDRESS` | 3600 |

Both subdomains point to the same VPS. Nginx routes based on the `Host` header.

## Docker Image Strategy

### GitHub Container Registry (ghcr.io)

Each repo builds and pushes Docker images tagged by environment:

- Backend repo → `ghcr.io/USERNAME/caliente-backend:staging` and `:prod`
- Frontend repo → `ghcr.io/USERNAME/caliente-frontend:staging` and `:prod`

The master `docker-compose.yml` on the VPS references these GHCR images. A deploy = `docker compose pull <service> && docker compose up -d <service>`.

### Frontend Multi-Stage Build

```dockerfile
# Stage 1: Build Vue app
FROM node:20-alpine AS builder
# pnpm install + build with VITE_API_BASE_URL baked in

# Stage 2: Serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

`VITE_API_BASE_URL` is passed as a build arg:
- Staging: `https://staging.jesuslab135.com/api/`
- Prod: `https://app.jesuslab135.com/api/`

### Backend Dockerfile (existing, minor tweaks)

Current Dockerfile is kept mostly as-is. Changes:
- Use `python:3.12-slim` base instead of Ubuntu (smaller, faster)
- Entrypoint runs migrations + collectstatic + Daphne

## GitHub Actions Pipelines

### Branch Routing

| Branch | Environment | Subdomain | Image Tag |
|--------|------------|-----------|-----------|
| `develop` | Staging | staging.jesuslab135.com | `:staging` |
| `main` | Production | app.jesuslab135.com | `:prod` |

### Backend Repo Pipeline

```
push to develop/main
  → Build Docker image
  → Push to ghcr.io/USER/caliente-backend:<tag>
  → SSH to VPS
  → docker compose pull backend_<env>
  → docker compose up -d backend_<env>
  → docker compose exec backend_<env> python3 manage.py migrate --noinput
```

### Frontend Repo Pipeline

```
push to develop/main
  → Build Docker image (with correct VITE_API_BASE_URL)
  → Push to ghcr.io/USER/caliente-frontend:<tag>
  → SSH to VPS
  → docker compose pull frontend_<env>
  → docker compose up -d frontend_<env>
```

### Required GitHub Secrets (both repos)

| Secret | Description | How to obtain |
|--------|------------|---------------|
| `VPS_HOST` | IONOS VPS IP address | IONOS panel → Server → IP |
| `VPS_USER` | SSH username | Usually `root` |
| `VPS_SSH_KEY` | ed25519 private key | `ssh-keygen -t ed25519` locally, add pubkey to VPS |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` | GitHub Settings → Developer Settings → Personal Access Tokens |

## Django Settings Changes

Current `settings.py` needs environment-based configuration:

```python
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'change-me')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
```

### .env.staging

```
DEBUG=True
SECRET_KEY=staging-secret-key-random-string
ALLOWED_HOSTS=staging.jesuslab135.com
CORS_ALLOWED_ORIGINS=https://staging.jesuslab135.com
DB_NAME=caliente_staging_db
DB_USER=caliente
DB_PASSWORD=<staging-password>
HOST=postgres
PORT=5432
```

### .env.prod

```
DEBUG=False
SECRET_KEY=production-secret-key-different-random-string
ALLOWED_HOSTS=app.jesuslab135.com
CORS_ALLOWED_ORIGINS=https://app.jesuslab135.com
DB_NAME=caliente_prod_db
DB_USER=caliente
DB_PASSWORD=<production-password>
HOST=postgres
PORT=5432
```

## SSL Strategy

- **Certbot** runs as a container alongside nginx
- First-time setup via `init-letsencrypt.sh` (manual, one-time)
- Auto-renewal via certbot's built-in cron (every 12 hours)
- Certificates stored in `/opt/caliente/certbot/conf/` (Docker volume)
- Nginx reloads certs via `docker compose exec nginx nginx -s reload`

## First-Time Deployment Order

1. **Phase 1**: Configure DNS A records in IONOS (wait for propagation ~5-30 min)
2. **Phase 2**: Prepare VPS (install Docker, UFW firewall, swap, SSH key)
3. **Phase 3**: Copy infra files to VPS `/opt/caliente/`
4. **Phase 4**: Run `init-letsencrypt.sh` to generate SSL certs
5. **Phase 5**: Start all services with `docker compose up -d`
6. **Phase 6**: Set up GitHub Secrets in both repos
7. **Phase 7**: Push to `develop` → verify staging auto-deploys
8. **Phase 8**: Push to `main` → verify production auto-deploys

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 2 GB RAM tight | 2 GB swap + alpine images + shared PostgreSQL |
| SSL cert expiry | Certbot auto-renewal every 12h |
| Database corruption | Daily pg_dump cron job to /opt/caliente/backups/ |
| Deploy breaks prod | Staging tests first; prod requires manual merge to main |
| VPS disk full | Docker prune cron job weekly |
