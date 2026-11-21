#!/usr/bin/env bash
# Funciones de la base local: instancia propia de MySQL en seguridad/ (no toca onyx-dev).
# Se usa con: source scripts/bd.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
set -a; source "$RAIZ/.env"; set +a
DATOS="$RAIZ/seguridad/mysql-datos"
SOCKET="$RAIZ/seguridad/mysql.sock"
MYSQL="$MYSQL_DIR/bin/mysql"
MYSQLD="$MYSQL_DIR/bin/mysqld"

mysql_raiz() { "$MYSQL" --protocol=socket --socket="$SOCKET" -uroot "$@"; }

mysql_activo() { "$MYSQL_DIR/bin/mysqladmin" --protocol=socket --socket="$SOCKET" -uroot ping >/dev/null 2>&1; }

iniciar_mysql() {
  mkdir -p "$RAIZ/seguridad"
  if [ ! -d "$DATOS/mysql" ]; then
    echo "Inicializando datadir en seguridad/mysql-datos"
    "$MYSQLD" --initialize-insecure --basedir="$MYSQL_DIR" --datadir="$DATOS" --log-error="$RAIZ/seguridad/mysql-init.log"
  fi
  if mysql_activo; then return; fi
  echo "Arrancando MySQL en el puerto $MYSQL_PUERTO"
  nohup "$MYSQLD" --basedir="$MYSQL_DIR" --datadir="$DATOS" --port="$MYSQL_PUERTO" \
    --bind-address=127.0.0.1 --socket="$SOCKET" --mysqlx=OFF \
    --pid-file="$RAIZ/seguridad/mysql.pid" --log-error="$RAIZ/seguridad/mysql.log" \
    >/dev/null 2>&1 &
  for _ in $(seq 1 60); do mysql_activo && return; sleep 1; done
  echo "MySQL no arrancó; revisa seguridad/mysql.log" >&2; exit 1
}

# Recrea la base y el usuario, y aplica migraciones y semilla.
recrear_base() {
  mysql_raiz -e "DROP DATABASE IF EXISTS \`$DB_NOMBRE\`; CREATE DATABASE \`$DB_NOMBRE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER IF NOT EXISTS '$DB_USUARIO'@'127.0.0.1' IDENTIFIED BY '$DB_CONTRASENA';
    CREATE USER IF NOT EXISTS '$DB_USUARIO'@'localhost' IDENTIFIED BY '$DB_CONTRASENA';
    GRANT ALL ON \`$DB_NOMBRE\`.* TO '$DB_USUARIO'@'127.0.0.1';
    GRANT ALL ON \`$DB_NOMBRE\`.* TO '$DB_USUARIO'@'localhost';"
  aplicar_sql
}

aplicar_sql() {
  for f in "$RAIZ"/sql/[0-8]*.sql "$RAIZ"/sql/90_semilla.sql; do
    [ -f "$f" ] || continue
    echo "Aplicando $(basename "$f")"
    mysql_raiz --default-character-set=utf8mb4 "$DB_NOMBRE" < "$f"
  done
}

base_vacia() {
  local n
  n=$(mysql_raiz -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NOMBRE'" 2>/dev/null || echo 0)
  [ "$n" = "0" ]
}
