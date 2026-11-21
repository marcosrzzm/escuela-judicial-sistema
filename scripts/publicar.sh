#!/usr/bin/env bash
# Arma publicar/: lo único que se sube al hosting (build de web + api, sin archivo de entorno ni credenciales).
# No sube nada: eso lo hace una persona después de revisar. Uso: scripts/publicar.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ/web" && npm run build
cd "$RAIZ"

rm -rf publicar
mkdir -p publicar/api
cp -R web/dist/. publicar/
cp api/index.php api/nucleo.php api/config.php api/permisos.php api/rutas.php publicar/api/
cp -R api/lib publicar/api/lib

cat > publicar/.htaccess <<'HTACCESS'
# Fuerza HTTPS, manda /api a index.php y el resto de la interfaz a index.html.
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteRule ^api/index\.php$ - [L]
RewriteRule ^api(/.*)?$ api/index.php [L]

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "same-origin"
</IfModule>

# Ningún archivo que empiece con punto (excepto este) se sirve.
<FilesMatch "^\.(?!htaccess)">
  Require all denied
</FilesMatch>
HTACCESS

# Revisión: nada de credenciales ni archivos de entorno en lo que se sube.
if find publicar \( -name '.env*' -o -name 'ej-config*' -o -name '*.sql' \) | grep -q .; then
  echo "ERROR: publicar/ contiene archivos de entorno o SQL" >&2
  exit 1
fi
if grep -rIl -e "Prueba2026" -e "DB_CONTRASENA=" publicar | grep -q .; then
  echo "ERROR: publicar/ contiene una credencial" >&2
  exit 1
fi
echo "publicar/ listo. Antes de subirla: crear en el hosting el archivo ej-config.env un nivel arriba de public_html (ENTORNO=produccion y los datos de la base), aplicar sql/01 y sql/02 con respaldo, y NO cargar sql/90_semilla.sql."
