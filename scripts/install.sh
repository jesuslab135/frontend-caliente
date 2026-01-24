set -e

echo " Actualizando sistema y preparando dependencias "
apt-get update && apt-get upgrade -y
apt-get install -y --no-install-recommends \
    curl git nano ca-certificates gnupg

echo " Instalando Node.js "
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

apt-get update
apt-get install -y nodejs

echo " Instalando pnpm "
npm install -g pnpm

echo " Limpieza "
apt-get clean
rm -rf /var/lib/apt/lists/*