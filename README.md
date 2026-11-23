# Sistema de continuidad académica · Escuela Judicial

Prototipo funcional del Equipo 4 (ITESO, Ecosistemas de negocios, innovación abierta y plataformas, otoño 2026) para la Coordinación de Posgrados de la Escuela Judicial del STJ Jalisco. Todos los datos son ficticios.

Qué leer:

1. `AGENTS.md`: alcance, reglas, vocabulario, comandos, cuentas de prueba y lo que no se construye.
2. `docs/especificacion.md`: roles, entidades, matriz de permisos, flujo core y criterios de aceptación.
3. `docs/correspondencia-g2.md`: qué cambió respecto a la arquitectura G2 y por qué.
4. `docs/verificacion-lectura.md`: resumen que hizo un agente leyendo solo estos archivos.

Aula (desde el 23 nov 2026, especificación sección 12): cada asignación es un curso con módulos, archivos, tareas con rúbrica, exámenes con reloj del servidor, foros, mensajes uno a uno y calificación calculada. Los archivos viven fuera de la carpeta pública (`ARCHIVOS_DIR`; en local `seguridad/archivos`). El respaldo diario es `scripts/respaldo-diario.php` (cron con php CLI; en local `php scripts/respaldo-diario.php` deja el archivo en `seguridad/respaldos`). Aviso de privacidad en `/privacidad` (borrador para revisión de la Escuela). Migración: `sql/06_aula.sql`.

Para correrlo: `scripts/dev.sh` (detalle en `AGENTS.md`, sección 7).

Temporal de validación (desde el 22 nov 2026): https://breezy-lawngreen-cassowary-34.hostingersite.com, en el plan de Elevalia, noindex. Accesos y datos de la base en seguridad/ (fuera de git). Guía para el cliente: docs/guia-validacion.md.
