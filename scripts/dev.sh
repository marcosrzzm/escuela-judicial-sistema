#!/usr/bin/env bash
# Levanta todo local: MySQL propio (puerto 3311), base con semilla, API en :8080 y web en :5173.
# Uso: scripts/dev.sh [--reiniciar]
source "$(dirname "$0")/bd.sh"
[ -f "$RAIZ/.env" ] || cp "$RAIZ/.env.example" "$RAIZ/.env"

iniciar_mysql
if [ "${1:-}" = "--reiniciar" ] || base_vacia; then
  recrear_base
else
  echo "La base ya tiene datos; usa --reiniciar para recrearla con la semilla."
fi

[ -d "$RAIZ/web/node_modules" ] || (cd "$RAIZ/web" && npm install)

echo "API en http://localhost:$API_PUERTO  ·  Web en http://localhost:$WEB_PUERTO"
cd "$RAIZ"
"$PHP_BIN" -d post_max_size=20M -d upload_max_filesize=20M -d memory_limit=256M -S "localhost:$API_PUERTO" -t api api/index.php &
PHP_PID=$!
trap 'kill $PHP_PID 2>/dev/null' EXIT
cd "$RAIZ/web" && npx vite --port "$WEB_PUERTO" --host localhost
