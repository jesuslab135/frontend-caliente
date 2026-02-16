# Caliente Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy Caliente (Django + Vue 3) to an IONOS VPS with automated CI/CD for staging (`staging.jesuslab135.com`) and production (`app.jesuslab135.com`).

**Architecture:** Two separate GitHub repos deploy independently via GitHub Actions. Each pushes Docker images to GitHub Container Registry (ghcr.io). A master `docker-compose.yml` on the VPS orchestrates 7 containers: nginx (reverse proxy + SSL), PostgreSQL (shared, 2 databases), 2 backend instances (Daphne), 2 frontend instances (nginx+static), and certbot. Staging deploys on push to `develop`, production on push to `main`.

**Tech Stack:** Docker Compose, nginx, Let's Encrypt/certbot, GitHub Actions, GitHub Container Registry, PostgreSQL 16, Daphne (ASGI), Ubuntu 24.04 VPS (2 GB RAM).

**Design Doc:** `docs/plans/2026-02-16-deployment-design.md`

---

## Phase 1: Prepare the Code for Deployment

These tasks modify the existing codebase so it can run in staging/production.

---

### Task 1: Make Django settings environment-aware

The current `settings.py` has `DEBUG = True` hardcoded and `ALLOWED_HOSTS` only allows localhost. We need it to read from environment variables.

**Files:**
- Modify: `backend/src/core/core/settings.py`

**Step 1: Edit settings.py**

Replace the hardcoded values with environment-aware ones. The key changes:

```python
# ---- REPLACE these lines (around lines 34-58) ----

# OLD:
# SECRET_KEY = os.getenv('SECRET_KEY')
# DEBUG = True
# ALLOWED_HOSTS = ['localhost', '127.0.0.1', ...]
# CORS_ALLOWED_ORIGINS = ['http://localhost:5173', ...]

# NEW:
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-insecure-key-change-in-production')

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# --- CORS section ---
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173'
).split(',')
```

Also add `STATIC_ROOT` (required for `collectstatic` in production) near `STATIC_URL`:

```python
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
```

Also add `FRONTEND_DOMAIN` to read from env:

```python
FRONTEND_DOMAIN = os.getenv('FRONTEND_DOMAIN', 'localhost:5173')
```

**Step 2: Verify locally**

Run your existing dev compose to make sure nothing broke:

```bash
cd infra
docker compose up -d
# Visit http://localhost:8000/api/ — should still work
```

**Step 3: Commit**

```bash
cd backend
git add src/core/core/settings.py
git commit -m "feat: make settings environment-aware for staging/prod deploy"
```

---

### Task 2: Fix the backend entrypoint.sh

The current `entrypoint.sh` has a bug on line 14: `python3 core/manage.py migrate` — but it already `cd`'d to `/app/core` on line 11, so the path should be `python3 manage.py migrate`.

**Files:**
- Modify: `backend/scripts/entrypoint.sh`

**Step 1: Fix the script**

```bash
#!/bin/bash
set -e

echo "Waiting for database..."
# Espera a que PostgreSQL acepte conexiones en el puerto configurado
until python3 -c "import socket; socket.create_connection(('${HOST:-db}', ${PORT:-5432}), timeout=1)" 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 1
done
echo "Database is ready!"

# Ya estamos en /app/core (WORKDIR del Dockerfile)
echo "Applying migrations..."
python3 manage.py migrate --noinput

echo "Collecting static files..."
python3 manage.py collectstatic --noinput --clear 2>/dev/null || true

echo "Starting server..."
exec "$@"
```

**Step 2: Commit**

```bash
git add scripts/entrypoint.sh
git commit -m "fix: correct manage.py path in entrypoint.sh"
```

---

### Task 3: Create production-ready backend Dockerfile

The current Dockerfile uses `ubuntu:latest` which is 800+ MB. For deployment we need a leaner image. We also need `daphne` in `requirements.txt`.

**Files:**
- Modify: `backend/Dockerfile` (rename existing to `Dockerfile.dev`, create new `Dockerfile`)
- Modify: `backend/src/requirements.txt` (add daphne + gunicorn)

**Step 1: Add daphne to requirements.txt**

Append to `backend/src/requirements.txt`:

```
daphne==4.1.2
```

**Step 2: Create the production Dockerfile**

Save the old Dockerfile as `Dockerfile.dev` for local development.

Create new `backend/Dockerfile`:

```dockerfile
# =========================================================
# Caliente Backend — Production Dockerfile
# Imagen ligera basada en Python 3.12 slim (~150MB vs ~800MB Ubuntu)
# =========================================================

FROM python:3.12-slim AS base

# Evita prompts interactivos durante apt-get
ENV DEBIAN_FRONTEND=noninteractive
# Python: no generar archivos .pyc, no buffering de stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias del sistema necesarias para PostgreSQL y compilacion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar e instalar dependencias Python primero (aprovecha cache de Docker)
COPY src/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copiar el codigo fuente completo
COPY src/ /app/

# Copiar el script de arranque
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Directorio de trabajo donde vive manage.py
WORKDIR /app/core

# El entrypoint espera la BD, corre migraciones, y luego ejecuta el CMD
ENTRYPOINT ["/entrypoint.sh"]

# Puerto que expone Daphne
EXPOSE 8000

# Comando: Daphne ASGI server
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
```

**Step 3: Create .dockerignore**

Create `backend/.dockerignore`:

```
__pycache__
*.pyc
*.pyo
.git
.env
*.log
logs/
.vscode
.idea
node_modules
```

**Step 4: Commit**

```bash
git add Dockerfile Dockerfile.dev src/requirements.txt .dockerignore
git commit -m "feat: production Dockerfile (python:3.12-slim, ~150MB)"
```

---

### Task 4: Create production-ready frontend Dockerfile

The current frontend Dockerfile is a dev shell (`ubuntu:latest` + bash). For deployment we need a multi-stage build: stage 1 builds the Vue app, stage 2 serves static files via nginx:alpine.

**Files:**
- Modify: `frontend/Dockerfile` (rename existing to `Dockerfile.dev`, create new)
- Create: `frontend/nginx.conf` (container-level nginx config for serving the SPA)

**Step 1: Create the SPA nginx config**

Create `frontend/nginx.conf` — this goes INSIDE the frontend container to serve the Vue SPA correctly (all routes → index.html):

```nginx
# =========================================================
# Nginx config para el contenedor del frontend
# Sirve la SPA de Vue — todas las rutas van a index.html
# =========================================================
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Archivos estaticos con cache agresivo (JS/CSS tienen hash en el nombre)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Todas las demas rutas van a index.html (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 2: Create the production Dockerfile**

Save old Dockerfile as `Dockerfile.dev`.

Create new `frontend/Dockerfile`:

```dockerfile
# =========================================================
# Caliente Frontend — Multi-Stage Production Dockerfile
# Stage 1: Construye la app Vue con pnpm
# Stage 2: Sirve los archivos estaticos con nginx:alpine (~25MB)
# =========================================================

# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias primero (cache de Docker)
COPY src/caliente/package.json src/caliente/pnpm-lock.yaml* ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copiar el resto del codigo fuente
COPY src/caliente/ ./

# Variable de entorno para la URL de la API
# Se pasa como build arg desde GitHub Actions
ARG VITE_API_BASE_URL=http://localhost:8000/api/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Construir la app para produccion
RUN pnpm build

# --- STAGE 2: SERVE ---
FROM nginx:alpine

# Copiar los archivos construidos al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar la config de nginx para SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: Create .dockerignore**

Create `frontend/.dockerignore`:

```
node_modules
dist
.git
.env
.vscode
.idea
```

**Step 4: Commit**

```bash
cd frontend
git add Dockerfile Dockerfile.dev nginx.conf .dockerignore
git commit -m "feat: multi-stage production Dockerfile (node build + nginx:alpine)"
```

---

### Task 5: Create the GitHub Actions workflow for the BACKEND repo

This workflow builds the Docker image and deploys to the VPS.

**Files:**
- Create: `backend/.github/workflows/deploy.yml`

**Step 1: Create the workflow**

```yaml
# =========================================================
# CI/CD Pipeline — Caliente Backend
#
# develop → staging.jesuslab135.com
# main    → app.jesuslab135.com
# =========================================================
name: Deploy Backend

# Se ejecuta cuando hay push a develop o main
on:
  push:
    branches: [develop, main]

# Permisos para escribir en GitHub Container Registry
permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      # 1. Clonar el codigo
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Determinar el entorno segun la rama
      - name: Set environment variables
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "ENV_TAG=prod" >> $GITHUB_ENV
            echo "COMPOSE_SERVICE=backend_prod" >> $GITHUB_ENV
          else
            echo "ENV_TAG=staging" >> $GITHUB_ENV
            echo "COMPOSE_SERVICE=backend_staging" >> $GITHUB_ENV
          fi

      # 3. Login a GitHub Container Registry
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 4. Construir y subir la imagen Docker
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/caliente-backend:${{ env.ENV_TAG }}
            ghcr.io/${{ github.repository_owner }}/caliente-backend:${{ env.ENV_TAG }}-${{ github.sha }}

      # 5. Desplegar en el VPS via SSH
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/caliente

            # Login a GHCR en el VPS
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # Bajar la nueva imagen y reiniciar el servicio
            docker compose pull ${{ env.COMPOSE_SERVICE }}
            docker compose up -d ${{ env.COMPOSE_SERVICE }}

            # Esperar a que el contenedor arranque
            sleep 5

            # Ejecutar migraciones dentro del contenedor
            docker compose exec -T ${{ env.COMPOSE_SERVICE }} python3 manage.py migrate --noinput

            # Limpiar imagenes viejas para no llenar el disco
            docker image prune -f
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy pipeline (develop→staging, main→prod)"
```

---

### Task 6: Create the GitHub Actions workflow for the FRONTEND repo

**Files:**
- Create: `frontend/.github/workflows/deploy.yml`

**Step 1: Create the workflow**

```yaml
# =========================================================
# CI/CD Pipeline — Caliente Frontend
#
# develop → staging.jesuslab135.com (builds with staging API URL)
# main    → app.jesuslab135.com (builds with production API URL)
# =========================================================
name: Deploy Frontend

on:
  push:
    branches: [develop, main]

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Determinar entorno y la URL de la API segun la rama
      - name: Set environment variables
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "ENV_TAG=prod" >> $GITHUB_ENV
            echo "COMPOSE_SERVICE=frontend_prod" >> $GITHUB_ENV
            echo "API_URL=https://app.jesuslab135.com/api/" >> $GITHUB_ENV
          else
            echo "ENV_TAG=staging" >> $GITHUB_ENV
            echo "COMPOSE_SERVICE=frontend_staging" >> $GITHUB_ENV
            echo "API_URL=https://staging.jesuslab135.com/api/" >> $GITHUB_ENV
          fi

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Construir con la URL de API correcta para el entorno
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          build-args: |
            VITE_API_BASE_URL=${{ env.API_URL }}
          tags: |
            ghcr.io/${{ github.repository_owner }}/caliente-frontend:${{ env.ENV_TAG }}
            ghcr.io/${{ github.repository_owner }}/caliente-frontend:${{ env.ENV_TAG }}-${{ github.sha }}

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/caliente

            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            docker compose pull ${{ env.COMPOSE_SERVICE }}
            docker compose up -d ${{ env.COMPOSE_SERVICE }}

            docker image prune -f
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy pipeline (develop→staging, main→prod)"
```

---

## Phase 2: Create VPS Infrastructure Files

These files will be copied to the VPS. Create them locally first, then SCP them over.

---

### Task 7: Create the master docker-compose.yml

This is the orchestration file that runs on the VPS. It defines all 7 services.

**Files:**
- Create: `infra/vps/docker-compose.yml`

**Step 1: Create the compose file**

```yaml
# =========================================================
# Caliente — Master Docker Compose (VPS)
#
# Corre en /opt/caliente/ en el servidor.
# Define 7 servicios: nginx, postgres, 2x backend, 2x frontend, certbot.
#
# Los backends y frontends usan imagenes de GitHub Container Registry.
# Para desplegar un servicio: docker compose pull <servicio> && docker compose up -d <servicio>
# =========================================================

# ---- REDES ----
# Dos redes aisladas: staging y prod no pueden comunicarse entre si.
# nginx y postgres estan en ambas redes (son el puente).
networks:
  caliente_staging:
    driver: bridge
  caliente_prod:
    driver: bridge

# ---- VOLUMENES ----
volumes:
  postgres_data:        # Datos de PostgreSQL (persistente)
  certbot_conf:         # Certificados SSL de Let's Encrypt
  certbot_www:          # Archivos del reto ACME (para renovar SSL)
  backend_staging_static:  # Archivos estaticos de Django staging
  backend_prod_static:     # Archivos estaticos de Django produccion

services:

  # ==========================================
  # NGINX — Reverse Proxy + SSL Termination
  # El unico servicio expuesto al internet.
  # Redirige trafico segun el subdominio.
  # ==========================================
  nginx:
    image: nginx:alpine
    container_name: caliente_nginx
    restart: unless-stopped
    ports:
      - "80:80"      # HTTP (redirige a HTTPS)
      - "443:443"    # HTTPS
    volumes:
      - ./nginx/staging.conf:/etc/nginx/conf.d/staging.conf:ro
      - ./nginx/prod.conf:/etc/nginx/conf.d/prod.conf:ro
      - certbot_conf:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
      - backend_staging_static:/var/www/backend_staging_static:ro
      - backend_prod_static:/var/www/backend_prod_static:ro
    networks:
      - caliente_staging
      - caliente_prod
    depends_on:
      - backend_staging
      - backend_prod
      - frontend_staging
      - frontend_prod

  # ==========================================
  # CERTBOT — Genera y renueva certificados SSL
  # Se ejecuta cada 12 horas para renovar.
  # ==========================================
  certbot:
    image: certbot/certbot
    container_name: caliente_certbot
    restart: unless-stopped
    volumes:
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    # Revisa cada 12 horas si los certificados necesitan renovarse
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  # ==========================================
  # POSTGRESQL — Base de datos compartida
  # UNA sola instancia con DOS bases de datos.
  # ==========================================
  postgres:
    image: postgres:16-alpine
    container_name: caliente_postgres
    restart: unless-stopped
    environment:
      # El usuario "caliente" tendra acceso a ambas bases de datos
      POSTGRES_USER: caliente
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      # Base de datos por defecto (se crean las dos en init)
      POSTGRES_DB: caliente_prod_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Script de inicializacion: crea la segunda base de datos
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
    networks:
      - caliente_staging
      - caliente_prod
    # NO exponer el puerto al exterior. Solo accesible dentro de Docker.
    # ports:
    #   - "5432:5432"  # NUNCA descomentar en produccion

  # ==========================================
  # BACKEND STAGING — Django/Daphne
  # ==========================================
  backend_staging:
    image: ghcr.io/${GITHUB_OWNER}/caliente-backend:staging
    container_name: caliente_backend_staging
    restart: unless-stopped
    env_file:
      - .env.staging
    volumes:
      - backend_staging_static:/app/core/staticfiles
    depends_on:
      - postgres
    networks:
      - caliente_staging

  # ==========================================
  # BACKEND PRODUCTION — Django/Daphne
  # ==========================================
  backend_prod:
    image: ghcr.io/${GITHUB_OWNER}/caliente-backend:prod
    container_name: caliente_backend_prod
    restart: unless-stopped
    env_file:
      - .env.prod
    volumes:
      - backend_prod_static:/app/core/staticfiles
    depends_on:
      - postgres
    networks:
      - caliente_prod

  # ==========================================
  # FRONTEND STAGING — nginx:alpine + dist/
  # ==========================================
  frontend_staging:
    image: ghcr.io/${GITHUB_OWNER}/caliente-frontend:staging
    container_name: caliente_frontend_staging
    restart: unless-stopped
    networks:
      - caliente_staging

  # ==========================================
  # FRONTEND PRODUCTION — nginx:alpine + dist/
  # ==========================================
  frontend_prod:
    image: ghcr.io/${GITHUB_OWNER}/caliente-frontend:prod
    container_name: caliente_frontend_prod
    restart: unless-stopped
    networks:
      - caliente_prod
```

**Step 2: Create the PostgreSQL init script**

Create `infra/vps/init-db.sh` — this runs on first PostgreSQL start to create the staging database:

```bash
#!/bin/bash
# =========================================================
# Crea la base de datos de staging (la de prod se crea por defecto).
# Este script se ejecuta SOLO la primera vez que PostgreSQL arranca.
# =========================================================
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE caliente_staging_db;
    GRANT ALL PRIVILEGES ON DATABASE caliente_staging_db TO $POSTGRES_USER;
EOSQL

echo "Base de datos caliente_staging_db creada exitosamente."
```

**Step 3: Commit**

```bash
git add infra/vps/
git commit -m "infra: master docker-compose.yml + postgres init for VPS"
```

---

### Task 8: Create nginx configuration files

Two server blocks: one for staging, one for production. Both do SSL termination and proxy to the correct backend/frontend containers.

**Files:**
- Create: `infra/vps/nginx/staging.conf`
- Create: `infra/vps/nginx/prod.conf`

**Step 1: Create staging.conf**

```nginx
# =========================================================
# staging.jesuslab135.com — Entorno de Pruebas
#
# /         → frontend_staging (contenedor nginx con la SPA)
# /api/     → backend_staging (Django/Daphne en puerto 8000)
# /admin/   → backend_staging (Django admin)
# /static/  → archivos estaticos de Django
# =========================================================

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name staging.jesuslab135.com;

    # Reto ACME de Let's Encrypt (necesario para renovar SSL)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Todo lo demas redirige a HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name staging.jesuslab135.com;

    # Certificados SSL (generados por certbot)
    ssl_certificate /etc/letsencrypt/live/staging.jesuslab135.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.jesuslab135.com/privkey.pem;

    # Configuracion SSL moderna y segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Tamano maximo de subida (para importaciones Excel)
    client_max_body_size 10M;

    # --- Backend: API y Admin ---
    location /api/ {
        proxy_pass http://backend_staging:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://backend_staging:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Archivos estaticos de Django ---
    location /static/ {
        alias /var/www/backend_staging_static/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # --- Frontend: SPA de Vue ---
    location / {
        proxy_pass http://frontend_staging:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 2: Create prod.conf**

```nginx
# =========================================================
# app.jesuslab135.com — Entorno de Produccion
#
# Identico a staging.conf pero apuntando a los contenedores _prod.
# =========================================================

server {
    listen 80;
    server_name app.jesuslab135.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name app.jesuslab135.com;

    ssl_certificate /etc/letsencrypt/live/app.jesuslab135.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.jesuslab135.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://backend_prod:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://backend_prod:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/backend_prod_static/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://frontend_prod:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 3: Commit**

```bash
git add infra/vps/nginx/
git commit -m "infra: nginx configs for staging and prod subdomains"
```

---

### Task 9: Create environment files and SSL init script

**Files:**
- Create: `infra/vps/.env.staging.example`
- Create: `infra/vps/.env.prod.example`
- Create: `infra/vps/.env.example`
- Create: `infra/vps/init-letsencrypt.sh`

**Step 1: Create .env.staging.example**

```bash
# =========================================================
# Backend Staging — Variables de entorno
# Copiar como .env.staging y llenar los valores reales
# =========================================================
DEBUG=True
SECRET_KEY=cambia-esto-a-una-cadena-aleatoria-larga-staging
ALLOWED_HOSTS=staging.jesuslab135.com
CORS_ALLOWED_ORIGINS=https://staging.jesuslab135.com
FRONTEND_DOMAIN=staging.jesuslab135.com

# Base de datos (debe coincidir con docker-compose.yml)
DB_NAME=caliente_staging_db
DB_USER=caliente
DB_PASSWORD=cambia-esto-password-staging
HOST=postgres
PORT=5432
```

**Step 2: Create .env.prod.example**

```bash
# =========================================================
# Backend Production — Variables de entorno
# Copiar como .env.prod y llenar los valores reales
# =========================================================
DEBUG=False
SECRET_KEY=cambia-esto-a-una-cadena-aleatoria-larga-produccion-diferente
ALLOWED_HOSTS=app.jesuslab135.com
CORS_ALLOWED_ORIGINS=https://app.jesuslab135.com
FRONTEND_DOMAIN=app.jesuslab135.com

DB_NAME=caliente_prod_db
DB_USER=caliente
DB_PASSWORD=cambia-esto-password-produccion
HOST=postgres
PORT=5432
```

**Step 3: Create .env.example (compose-level)**

```bash
# =========================================================
# Variables para docker-compose.yml
# Copiar como .env y llenar los valores reales
# =========================================================
POSTGRES_PASSWORD=cambia-esto-password-postgres
GITHUB_OWNER=tu-usuario-de-github
```

**Step 4: Create init-letsencrypt.sh**

```bash
#!/bin/bash
# =========================================================
# Generacion inicial de certificados SSL con Let's Encrypt
#
# Este script se ejecuta UNA SOLA VEZ al configurar el servidor.
# Despues, certbot renueva automaticamente cada 12 horas.
#
# IMPORTANTE: Los registros DNS deben estar propagados ANTES
# de ejecutar este script (staging.jesuslab135.com y app.jesuslab135.com
# deben resolver a la IP de este servidor).
#
# Uso:
#   chmod +x init-letsencrypt.sh
#   sudo ./init-letsencrypt.sh
# =========================================================
set -e

# ---- CONFIGURACION ----
# Cambia este email al tuyo (Let's Encrypt te avisara antes de que expiren)
EMAIL="jefeinge.esteban@gmail.com"

# Los dos subdominios para los que necesitamos certificados
DOMAINS=("staging.jesuslab135.com" "app.jesuslab135.com")

# Directorio del proyecto en el VPS
PROJECT_DIR="/opt/caliente"

# ---- PASO 1: Crear nginx temporal sin SSL ----
echo "=== Paso 1: Creando configs temporales de nginx (sin SSL) ==="

# Guardar las configs reales
for domain in "${DOMAINS[@]}"; do
  conf_name=$(echo $domain | cut -d. -f1)
  if [ -f "$PROJECT_DIR/nginx/${conf_name}.conf" ]; then
    cp "$PROJECT_DIR/nginx/${conf_name}.conf" "$PROJECT_DIR/nginx/${conf_name}.conf.bak"
  fi
done

# Crear config temporal que solo sirve el reto ACME
for domain in "${DOMAINS[@]}"; do
  conf_name=$(echo $domain | cut -d. -f1)
  cat > "$PROJECT_DIR/nginx/${conf_name}.conf" <<NGINX
server {
    listen 80;
    server_name ${domain};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'SSL certificate pending...';
        add_header Content-Type text/plain;
    }
}
NGINX
done

# ---- PASO 2: Levantar nginx y certbot ----
echo "=== Paso 2: Levantando nginx temporal ==="
cd "$PROJECT_DIR"
docker compose up -d nginx

# Esperar a que nginx arranque
sleep 3

# ---- PASO 3: Generar certificados ----
echo "=== Paso 3: Generando certificados SSL ==="
for domain in "${DOMAINS[@]}"; do
  echo "Generando certificado para: $domain"
  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$domain"
done

# ---- PASO 4: Restaurar configs reales ----
echo "=== Paso 4: Restaurando configs de nginx con SSL ==="
for domain in "${DOMAINS[@]}"; do
  conf_name=$(echo $domain | cut -d. -f1)
  if [ -f "$PROJECT_DIR/nginx/${conf_name}.conf.bak" ]; then
    mv "$PROJECT_DIR/nginx/${conf_name}.conf.bak" "$PROJECT_DIR/nginx/${conf_name}.conf"
  fi
done

# ---- PASO 5: Reiniciar nginx con SSL ----
echo "=== Paso 5: Reiniciando nginx con SSL habilitado ==="
docker compose restart nginx

echo ""
echo "==========================================="
echo " SSL configurado exitosamente!"
echo " - https://staging.jesuslab135.com"
echo " - https://app.jesuslab135.com"
echo "==========================================="
```

**Step 5: Commit**

```bash
git add infra/vps/
git commit -m "infra: env examples + SSL init script"
```

---

## Phase 3: VPS Setup (Manual, One-Time)

These steps are run manually on the VPS via SSH. They are commands, not code to commit.

---

### Task 10: Prepare the VPS

SSH into your IONOS VPS and run these commands.

**Step 1: Connect to the VPS**

```bash
# Desde tu computadora local
ssh root@TU_IP_DEL_VPS
```

**Step 2: Update the system and install Docker**

```bash
# Actualizar el sistema
apt-get update && apt-get upgrade -y

# Instalar dependencias para Docker
apt-get install -y ca-certificates curl gnupg

# Agregar la llave GPG oficial de Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Agregar el repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine + Docker Compose
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar que Docker funciona
docker --version
docker compose version
```

**Step 3: Configure the firewall (UFW)**

```bash
# Permitir SSH (para no quedarte fuera del servidor!)
ufw allow OpenSSH

# Permitir HTTP y HTTPS (para nginx)
ufw allow 80/tcp
ufw allow 443/tcp

# Activar el firewall
ufw --force enable

# Verificar reglas
ufw status
```

**Step 4: Create 2 GB swap (tu VPS tiene solo 2 GB RAM)**

```bash
# Crear archivo de swap de 2 GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Hacer permanente (sobrevive reinicios)
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verificar
free -h
# Deberias ver: Swap: 2.0G
```

**Step 5: Create the project directory**

```bash
mkdir -p /opt/caliente/nginx
mkdir -p /opt/caliente/certbot
```

---

### Task 11: Configure DNS in IONOS

**Step 1: Go to IONOS DNS settings**

1. Login to https://my.ionos.com
2. Go to **Domains & SSL** → click on `jesuslab135.com`
3. Click on **DNS** tab

**Step 2: Create A records**

Add these two records:

| Type | Host | Points to | TTL |
|------|------|-----------|-----|
| A | staging | `YOUR_VPS_IP` | 1 hour |
| A | app | `YOUR_VPS_IP` | 1 hour |

**Step 3: Verify DNS propagation**

Wait 5-30 minutes, then test from your local machine:

```bash
# Desde tu computadora local (no el VPS)
ping staging.jesuslab135.com
ping app.jesuslab135.com

# Ambos deben resolver a la IP de tu VPS
```

---

### Task 12: Copy infrastructure files to VPS and bootstrap

**Step 1: Generate SSH key for GitHub Actions**

On your LOCAL machine (not the VPS):

```bash
# Generar un par de llaves SSH
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/caliente_deploy

# El archivo ~/.ssh/caliente_deploy es la LLAVE PRIVADA (para GitHub Secrets)
# El archivo ~/.ssh/caliente_deploy.pub es la LLAVE PUBLICA (para el VPS)
```

**Step 2: Add public key to VPS**

```bash
# Copiar la llave publica al VPS
ssh-copy-id -i ~/.ssh/caliente_deploy.pub root@TU_IP_DEL_VPS

# Verificar que puedes conectarte sin password
ssh -i ~/.ssh/caliente_deploy root@TU_IP_DEL_VPS
```

**Step 3: Copy infra files to VPS**

```bash
# Desde tu computadora, copia los archivos de infra al VPS
scp infra/vps/docker-compose.yml root@TU_IP:/opt/caliente/
scp infra/vps/init-db.sh root@TU_IP:/opt/caliente/
scp infra/vps/init-letsencrypt.sh root@TU_IP:/opt/caliente/
scp infra/vps/nginx/staging.conf root@TU_IP:/opt/caliente/nginx/
scp infra/vps/nginx/prod.conf root@TU_IP:/opt/caliente/nginx/
scp infra/vps/.env.staging.example root@TU_IP:/opt/caliente/.env.staging
scp infra/vps/.env.prod.example root@TU_IP:/opt/caliente/.env.prod
scp infra/vps/.env.example root@TU_IP:/opt/caliente/.env
```

**Step 4: Edit the .env files on the VPS with real values**

```bash
ssh root@TU_IP

# Editar cada archivo y poner las passwords reales
nano /opt/caliente/.env
# → Cambiar POSTGRES_PASSWORD y GITHUB_OWNER

nano /opt/caliente/.env.staging
# → Cambiar SECRET_KEY, DB_PASSWORD

nano /opt/caliente/.env.prod
# → Cambiar SECRET_KEY, DB_PASSWORD (diferente al de staging!)
```

**Step 5: Make scripts executable and generate SSL certs**

```bash
chmod +x /opt/caliente/init-letsencrypt.sh
chmod +x /opt/caliente/init-db.sh

# Primero, levantar solo postgres para que se cree la BD
cd /opt/caliente
docker compose up -d postgres
sleep 10

# Luego, generar los certificados SSL
./init-letsencrypt.sh
```

**Step 6: Start all services**

```bash
cd /opt/caliente
docker compose up -d

# Verificar que todos los contenedores estan corriendo
docker compose ps
```

---

### Task 13: Configure GitHub Secrets

**Step 1: Get the SSH private key**

On your LOCAL machine:

```bash
# Mostrar la llave privada (copiar TODO el contenido)
cat ~/.ssh/caliente_deploy
```

**Step 2: Add secrets to BOTH repos**

For each repo (backend AND frontend), go to:

1. GitHub → your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each one:

| Name | Value |
|------|-------|
| `VPS_HOST` | The IP address of your IONOS VPS (e.g., `82.165.xxx.xxx`) |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Paste the ENTIRE content of `~/.ssh/caliente_deploy` (including the `-----BEGIN` and `-----END` lines) |

**Note:** `GITHUB_TOKEN` is automatically available in GitHub Actions — you do NOT need to create it manually.

---

### Task 14: First deploy — verify everything works

**Step 1: Push backend to develop**

```bash
cd backend
git checkout -b develop  # si no existe
git push origin develop
```

Go to GitHub → backend repo → **Actions** tab. Watch the workflow run. It should:
1. Build the Docker image
2. Push to ghcr.io
3. SSH to VPS and update the container

**Step 2: Push frontend to develop**

```bash
cd frontend
git checkout -b develop
git push origin develop
```

**Step 3: Verify staging works**

Open `https://staging.jesuslab135.com` in your browser. You should see the Vue app.
Open `https://staging.jesuslab135.com/api/` — you should see the DRF browsable API or a JSON response.

**Step 4: Merge to main and verify production**

```bash
# Backend
cd backend
git checkout main
git merge develop
git push origin main

# Frontend
cd frontend
git checkout main
git merge develop
git push origin main
```

Open `https://app.jesuslab135.com` — production should be live.

---

## Summary: File Checklist

| File | Repo | Action |
|------|------|--------|
| `src/core/core/settings.py` | backend | Modify (env-aware) |
| `scripts/entrypoint.sh` | backend | Fix (manage.py path) |
| `Dockerfile` | backend | Rewrite (python:3.12-slim) |
| `Dockerfile.dev` | backend | Rename (keep old for local dev) |
| `src/requirements.txt` | backend | Add daphne |
| `.dockerignore` | backend | Create |
| `.github/workflows/deploy.yml` | backend | Create |
| `Dockerfile` | frontend | Rewrite (multi-stage build) |
| `Dockerfile.dev` | frontend | Rename (keep old for local dev) |
| `nginx.conf` | frontend | Create (SPA routing) |
| `.dockerignore` | frontend | Create |
| `.github/workflows/deploy.yml` | frontend | Create |
| `infra/vps/docker-compose.yml` | either repo or local | Create |
| `infra/vps/init-db.sh` | either repo or local | Create |
| `infra/vps/nginx/staging.conf` | either repo or local | Create |
| `infra/vps/nginx/prod.conf` | either repo or local | Create |
| `infra/vps/.env.staging.example` | either repo or local | Create |
| `infra/vps/.env.prod.example` | either repo or local | Create |
| `infra/vps/.env.example` | either repo or local | Create |
| `infra/vps/init-letsencrypt.sh` | either repo or local | Create |
