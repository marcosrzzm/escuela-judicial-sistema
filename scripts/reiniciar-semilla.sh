#!/usr/bin/env bash
# Deja la base local como recién sembrada. Solo local: lo usa pruebas/aceptacion.mjs.
source "$(dirname "$0")/bd.sh"
[ "$ENTORNO" = "local" ] || { echo "Solo disponible con ENTORNO=local" >&2; exit 1; }
iniciar_mysql
recrear_base >/dev/null
echo "Semilla restaurada"
