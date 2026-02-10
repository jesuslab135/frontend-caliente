FROM ubuntu:latest
ENV DEBIAN_FRONTEND=noninteractive

COPY scripts/install.sh /tmp/install.sh
RUN chmod +x /tmp/install.sh && /tmp/install.sh

WORKDIR /app

EXPOSE 5173 3000

CMD ["/bin/bash"]

# FROM node:20-alpine

# WORKDIR /app

# # Copiar archivos de dependencias primero (para cache de Docker)
# COPY package.json ./
# COPY package-lock.json* ./

# # Instalar dependencias con npm (mas compatible con Firebase)
# RUN npm install

# # Copiar el resto del codigo
# COPY . .

# # Exponer puerto de Vite
# EXPOSE 5173

# # Comando por defecto: servidor de desarrollo con hot reload
# CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
