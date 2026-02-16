# =========================================================
# Caliente Frontend — Multi-Stage Production Dockerfile
# Stage 1: Construye la app Vue con pnpm
# Stage 2: Sirve los archivos estaticos con nginx:alpine (~25MB)
# =========================================================

# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias primero (cache de Docker)
COPY src/caliente/package.json src/caliente/pnpm-lock.yaml* ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copiar el resto del codigo fuente
COPY src/caliente/ ./

# URL de la API — se pasa como build arg desde GitHub Actions
ARG VITE_API_BASE_URL=http://localhost:8000/api/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Construir la app para produccion
RUN pnpm build

# --- STAGE 2: SERVE ---
FROM nginx:alpine

# Copiar los archivos construidos al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar config de nginx para SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
