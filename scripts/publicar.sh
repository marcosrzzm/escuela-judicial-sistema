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
cp api/index.php api/nucleo.php api/ajustes.php api/permisos.php api/rutas.php publicar/api/
cp -R api/lib publicar/api/lib
# Respaldo diario: se corre solo por cron con php CLI. Dentro de la carpeta pública no se sirve por web (la regla de /api
# lo manda a index.php, el .htaccess lo niega y el propio archivo se niega a correr fuera de CLI).
cp scripts/respaldo-diario.php publicar/api/

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
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>

# El respaldo es solo para cron: nunca por web.
<Files "respaldo-diario.php">
  Require all denied
</Files>

# Ningún archivo que empiece con punto (excepto este) se sirve.
<FilesMatch "^\.(?!htaccess)">
  Require all denied
</FilesMatch>
HTACCESS

# Sitio temporal de validación: sin indexar.
printf 'User-agent: *\nDisallow: /\n' > publicar/robots.txt

# Revisión: nada de credenciales ni archivos de entorno en lo que se sube.
if find publicar \( -name '.env*' -o -name 'ej-config*' -o -name '*.sql' \) | grep -q .; then
  echo "ERROR: publicar/ contiene archivos de entorno o SQL" >&2
  exit 1
fi
if grep -rIl -e "Prueba2026" -e "DB_CONTRASENA=" publicar | grep -q .; then
  echo "ERROR: publicar/ contiene una credencial" >&2
  exit 1
fi
echo "publicar/ listo. Antes de subirla: crear en el hosting ej-config.env un nivel arriba de public_html (ENTORNO=produccion y los datos de la base) y aplicar sql/01 y sql/02, y sql/03, sql/04, sql/05 y sql/06 (aditivas, se pueden repetir; con respaldo si la base ya tiene datos); crear un nivel arriba de la carpeta pública ej-archivos y ej-respaldos (permisos 750, fuera de la web); programar en el cron del hosting, una vez al día, php <ruta del sitio>/public_html/api/respaldo-diario.php; para enviar correo, en ej-config.env también RESEND_API_KEY, CORREO_REMITENTE y SITIO_URL. La semilla de demostración solo va en el temporal de validación, con contraseñas propias de cada cuenta (seguridad/accesos-demo.md)."
