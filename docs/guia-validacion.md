# Guía de validación · Sistema de continuidad académica

Prototipo con datos ficticios para la validación del 24 al 26 de noviembre de 2026. No hay datos reales de personas. Sitio: https://breezy-lawngreen-cassowary-34.hostingersite.com (temporal, sin indexar). Las contraseñas de cada cuenta se entregan aparte.

## Cuentas

| Correo | Rol | Qué debe poder hacer |
|---|---|---|
| coordinacion@prueba.local | Coordinación de Posgrados | Ver lista vigente, decidir derecho a evaluación, aceptar o devolver entregas, preparar cierre, generar lote, ver métricas y bitácora |
| docente.a@prueba.local | Docente (Derecho Procesal, POS-01) | Capturar y enviar calificaciones de su asignación |
| docente.b@prueba.local | Docente (Teoría Jurídica, POS-02) | Lo mismo, solo en la suya |
| direccion@prueba.local | Dirección | Autorizar cierres y ver la bitácora |
| carga@prueba.local | Carga externa | Ver lotes aprobados y registrar recepción, carga y discrepancias |
| auxiliar@prueba.local | Auxiliar | Consultar e imprimir la lista de POS-01 |

## Recorrido sugerido (unos 20 minutos)

1. Coordinación: abrir el periodo 2026-B, grupo POS-01. Confirmar que la lista vigente trae 5 alumnos.
2. Docente A: abrir su asignación. La lista debe ser la misma, sin volver a escribir nombres. Capturar calificaciones y enviar.
3. Coordinación: devolver la entrega sin motivo (debe negarlo), devolver con motivo, aceptar la versión nueva y reabrir una aceptada con motivo (se crea otra versión).
4. Docente A: intentar entrar a POS-02 (debe negarlo). Auxiliar: intentar ver POS-02 (debe negarlo).
5. Coordinación: revisar el historial de un alumno (2026-A y 2026-B con pendientes), preparar el cierre de POS-01, aprobarlo y generar el lote y las boletas.
6. Carga externa: registrar recepción y carga, con una discrepancia (debe exigir el texto).
7. Dirección: revisar la bitácora; cada devolución, reapertura y acceso denegado aparece con responsable, fecha, antes y después.
8. Coordinación: pantalla de métricas (campos recapturados y minutos activos contra la línea base).

## Qué revisar y opinar

- La lista llega a todos sin recaptura.
- Cada decisión (derecho a evaluación, devolución, reapertura) conserva quién, cuándo y por qué.
- Las boletas salen "pendientes de firma institucional"; el sistema no firma ni escribe en la plataforma oficial.
- Vocabulario, orden de pantallas y lo que falta o sobra para el trabajo real de la Coordinación.
- Supuesto por confirmar: calificación mínima aprobatoria de 8.0.

Lo que se capture durante la validación queda guardado en el sitio; si algo queda raro, se pide reiniciar la demostración.

## Migrar el temporal a la administración (sin borrar nada)

El instalador de un solo uso borra todas las tablas: sirve para una base nueva, nunca para una con datos. Para subir la administración y el acceso por correo (migraciones 03 y 04, solo agregan) al temporal ya publicado:

1. Respaldo: exportar la base del temporal (hPanel, phpMyAdmin, Exportar, SQL) a `seguridad/respaldos/AAAA-MM-DD.sql`. Sin ese archivo el comando siguiente se niega.
2. `scripts/publicar.sh` y subir `publicar/` como siempre (la API nueva ya incluye la guardia de la 03; hasta aplicarla, entrar fallaría, así que 3 y 4 van seguidos).
3. Subir `scripts/migrar-remoto.php` con un nombre aleatorio y la carpeta `_sql/` con `sql/03_administracion.sql` y `sql/04_acceso_por_correo.sql`, con el hash del token puesto en lugar de `__TOKEN_HASH__` (igual que el instalador). Guardar su URL y token en `seguridad/destino.json`.
4. `node scripts/migrar-base.mjs --estado` debe decir `PENDIENTE 03_administracion.sql` o `PENDIENTE 04_acceso_por_correo.sql` (solo corre la que falta); luego `node scripts/migrar-base.mjs --aplicar --respaldo seguridad/respaldos/<volcado>.sql`. Revisar que `antes` y `despues` traigan los mismos conteos y `roles` sea 5. Se puede repetir sin efecto.
5. Llamar `accion=borrar` para que el migrador se elimine, y comprobar el inicio de sesión con cada cuenta de demostración.

Probado en local sobre una base con la semilla anterior: aplica dos veces sin error y sin cambiar datos. No se ha ejecutado en el hosting.

## Correo de invitaciones y restablecimiento

Las invitaciones y los enlaces de contraseña salen por Resend. Se agregan al archivo `ej-config.env` del hosting (un nivel arriba de `public_html`): `RESEND_API_KEY` (la llave), `CORREO_REMITENTE` (una dirección verificada en Resend) `SITIO_URL` (la dirección pública del sistema, sin diagonal final), `CORREO_PERMITIDOS` (dominios o direcciones, separados por coma, a los que sí se manda mientras los datos sean ficticios; a los demás no sale nada y la pantalla muestra el enlace) y, si hace falta cambiarlo, `CORREO_TOPE_DIARIO` (50 por omisión). Sin llave o sin `SITIO_URL` no sale ningún correo: la pantalla lo avisa y ofrece la contraseña temporal. En local, sin llave, cada correo queda como archivo en `seguridad/correos-dev/` con su enlace.
