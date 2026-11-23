# AGENTS.md · Sistema de continuidad académica, Escuela Judicial

Archivo de configuración para cualquier agente que construya o modifique este sistema. `CLAUDE.md` y `GEMINI.md` son enlaces a este archivo: se edita solo aquí.

**Regla principal: lo que no está escrito en `docs/especificacion.md` no se construye.** Si una tarea pide algo que no aparece ahí, primero se agrega a la especificación y se registra en `docs/correspondencia-g2.md`, y después se programa.

Proyecto del Equipo 4, materia Ecosistemas de negocios, innovación abierta y plataformas (ITESO, otoño 2026), para la Coordinación de Posgrados de la Escuela Judicial del Supremo Tribunal de Justicia del Estado de Jalisco. Fuente de la arquitectura: compuerta G2 del 14 de octubre de 2026 (`E4_G2_Arquitectura.pdf`).

## 1. Alcance

El sistema no es un control escolar completo. Resuelve un solo problema: que un dato académico ya validado se reutilice en los pasos siguientes sin volver a escribirlo.

Flujo que sí se construye (detalle en `docs/especificacion.md`, sección 5):

1. Coordinación elige periodo y grupo con su lista vigente.
2. La misma lista llega a docentes y auxiliares sin recapturar nombres ni identificadores.
3. Coordinación registra el derecho a evaluación. La decisión la toma una persona; el sistema solo la guarda.
4. El docente entrega las calificaciones de su asignación.
5. Coordinación acepta la entrega o la devuelve con motivo.
6. La versión aceptada actualiza historial y pendientes del alumno.
7. Coordinación prepara el cierre; si se requiere, Dirección lo autoriza.
8. Del cierre aprobado salen los documentos y el lote de entrega, con versión.
9. El área de carga externa registra recepción, carga y discrepancias. La plataforma oficial se opera fuera del sistema.

Inicio del flujo: grupo y periodo con lista vigente. Fin: cierre aprobado, documentos y lote preparados, traspaso registrado.

## 2. Lo que NO se construye

Estas exclusiones vienen de G2 (sección 6.7) y no se abren sin una decisión nueva registrada. La administración de cuentas, roles y catálogos desde pantalla se abrió el 22 de noviembre de 2026 (especificación, sección 10; correspondencia, filas 22 a 27):

- Admisión, examen y selección de aspirantes.
- Captura completa de asistencia y justificantes. Solo se guarda el resultado del derecho a evaluación.
- Integración directa o API con la plataforma oficial. Nada se escribe en ella.
- Firma digital o cualquier sustitución de la firma institucional. Los documentos salen "pendientes de firma".
- Portal de alumnos abierto: desde el 23 de noviembre de 2026 el alumno tiene una cuenta propia, creada solo por Coordinación, con acceso únicamente a sus datos (especificación, 11.8; correspondencia, fila 32). Nada más de un portal se abre: sin captura del alumno, sin mensajes.
- Migración del histórico de la Escuela.
- Comunicaciones masivas (correos, avisos a alumnos). Los correos uno a uno de invitación y restablecimiento sí existen (especificación, 10.6).
- Cualquier automatización que tome una decisión académica en lugar de una persona.
- Tokens de agente, conectores o API pública.
- Datos reales de alumnos o docentes. Todo es ficticio mientras no exista autorización escrita de la Escuela.

## 3. Reglas de negocio (no se negocian)

- RN-01. Un alumno no puede tener dos inscripciones activas en el mismo grupo y periodo.
- RN-02. Toda lista se deriva de `inscripcion_grupo`. No existe una segunda lista maestra.
- RN-03. Un docente solo crea o modifica entregas de sus propias asignaciones.
- RN-04. Toda entrega conserva versión, fecha, responsable y estado.
- RN-05. Una devolución exige motivo. Corregir una entrega aceptada exige reapertura con motivo y genera una versión nueva.
- RN-06. Solo la versión aceptada vigente alimenta historial y cierre.
- RN-07. Toda decisión de derecho a evaluación conserva responsable, fecha y motivo.
- RN-08. Un pendiente académico conserva materia, periodo de origen, estado y resolución.
- RN-09. Un cierre aprobado no se sobrescribe; si cambia, se genera una versión nueva.
- RN-10. Todo lote apunta a una versión de cierre.
- RN-11. Todo cambio sensible queda en `bitacora_cambio`.
- RN-12. El sistema no firma documentos ni escribe en la plataforma oficial.

Reglas técnicas que salen de las anteriores:

- Los permisos se validan en el servidor en cada petición. Esconder un botón no cuenta como permiso.
- Nada se borra. Una baja, devolución o reapertura es un cambio de estado con motivo, nunca un `DELETE`.
- Entregas, cierres y lotes no se editan después de cambiar de estado: se crea la versión siguiente.

## 4. Vocabulario

Se usa siempre la misma palabra para lo mismo, en la interfaz y en el código.

| Término | Significa |
|---|---|
| Periodo | Ciclo académico (por ejemplo 2026-B) con fecha de inicio y fin. |
| Grupo | Conjunto de alumnos de un programa y turno dentro de un periodo. |
| Lista vigente | Alumnos con inscripción activa en un grupo. |
| Inscripción | Pertenencia de un alumno a un grupo; tiene alta, baja y estado. |
| Materia | Asignatura con clave y nombre. |
| Asignación | Grupo + materia + docente. Define dónde puede capturar cada docente. |
| Decisión de evaluación | Resultado del derecho a evaluación de un alumno en una asignación: con derecho, sin derecho, pendiente de revisión o requiere autorización. |
| Entrega | Versión de las calificaciones de una asignación que el docente envía. |
| Versión | Número consecutivo de una entrega, cierre o lote. Nunca se reutiliza. |
| Devolver | Coordinación regresa una entrega enviada al docente, con motivo. |
| Reabrir | Coordinación abre una entrega ya aceptada para corregirla, con motivo. Genera versión nueva. |
| Pendiente | Materia que el alumno debe resolver (reprobada o sin derecho a evaluación). |
| Cierre | Versión aprobada de un grupo en un periodo que sirve de base para documentos y lote. |
| Documento | Boleta o constancia derivada del cierre, pendiente de firma institucional. |
| Lote | Paquete del cierre aprobado que se entrega al área de carga externa. |
| Traspaso | Registro de recepción, carga y discrepancias de un lote. |
| Recaptura | Volver a escribir un dato que ya existía en otro lugar. Se cuenta (CA-11). |
| Tiempo activo | Minutos que Coordinación trabaja en una lista o cierre. Se mide (CA-12). |

## 5. Roles

| Rol | Resumen |
|---|---|
| Coordinación de Posgrados | Usuario principal. Lista vigente, decisiones, revisión de entregas, historial, cierre, lote, métricas y bitácora. |
| Docente | Solo sus asignaciones: captura y envía calificaciones, corrige cuando se las devuelven. |
| Dirección | Autoriza decisiones y cierres que lo requieran. No captura calificaciones. |
| Carga externa | Ve lotes aprobados y registra recepción, carga y discrepancias. No edita nada académico. |
| Auxiliar | Solo consulta e imprime la lista de los grupos que le corresponden. |
| Alumno | Cuenta propia creada por Coordinación; solo ve sus datos (especificación, 11.8). |
| Rol personalizado | Lo crea Coordinación a partir de un rol base, con una parte de sus permisos. |

La matriz completa rol por entidad está en `docs/especificacion.md`, sección 4.

## 6. Stack y estructura

Estándar de Sistemas-Elevalia: frontend React 19 + Vite + TypeScript estricto + Tailwind 4 + react-router + TanStack Query + react-hook-form + zod; backend PHP 8 sin framework con PDO; MySQL 8 o superior.

```
web/          interfaz (React). Componentes propios en src/componentes/, primitivos en src/components/ui/
api/          backend PHP. index.php es el único punto de entrada
sql/          migraciones numeradas (01_esquema.sql, ...) y 90_semilla.sql con datos ficticios
pruebas/      aceptacion.mjs: corre los 14 criterios de aceptación contra la API con dos cuentas
scripts/      dev.sh (levanta todo local) y publicar.sh (arma la carpeta publicar/)
docs/         especificacion.md, correspondencia-g2.md, verificacion-lectura.md
seguridad/    fuera de git: datos locales de MySQL, config real
```

Estilo visual: institucional y sobrio (tinta, papel y un dorado discreto). Sin logotipo oficial: toda pantalla indica "Prototipo · datos ficticios".

## 7. Comandos

Requisitos locales: Node 22 o superior, PHP 8.3 con `pdo_mysql`, binarios de MySQL. Las rutas se configuran con `PHP_BIN` y `MYSQL_DIR` (ver `.env.example`).

| Para | Comando |
|---|---|
| Instalar dependencias del frontend | `cd web && npm install` |
| Levantar todo local (MySQL, migraciones, semilla, API en :8080, web en :5173) | `scripts/dev.sh` |
| Reiniciar la base con la semilla | `scripts/dev.sh --reiniciar` |
| Revisar tipos y lint | `cd web && npm run lint && npx tsc -b` |
| Pruebas del frontend | `cd web && npm test` |
| Criterios de aceptación CA-01 a CA-31 (con la API corriendo) | `node pruebas/aceptacion.mjs` |
| Compilar | `cd web && npm run build` |
| Armar la carpeta para el hosting | `scripts/publicar.sh` |
| Primera cuenta de Coordinación en una base sin semilla | `php scripts/crear-coordinacion.php` |
| Migrar el temporal ya publicado a la administración (solo la migración 03, sin borrar; pide respaldo) | `node scripts/migrar-base.mjs --aplicar --respaldo seguridad/respaldos/<volcado>.sql`; pasos en `docs/guia-validacion.md`, sección "Migrar el temporal" |

Antes de dar una tarea por terminada: lint, tipos, build y `pruebas/aceptacion.mjs` en verde.

## 8. Cuentas de prueba

Todas son ficticias y solo existen en la semilla. En local la contraseña de la semilla es la de `sql/90_semilla.sql`; en el temporal cada cuenta tiene la suya, guardada en `seguridad/accesos-demo.md` (fuera de git).

| Correo | Rol | Alcance |
|---|---|---|
| coordinacion@prueba.local | Coordinación | Todo el periodo 2026-B |
| docente.a@prueba.local | Docente (Dra. Ana Torres) | POS-01 · Derecho Procesal |
| docente.b@prueba.local | Docente (Mtro. Luis Méndez) | POS-02 · Teoría Jurídica |
| direccion@prueba.local | Dirección | Autorizaciones |
| carga@prueba.local | Carga externa | Lotes aprobados |
| auxiliar@prueba.local | Auxiliar | Lista de POS-01 |
| alumno@prueba.local | Alumno (ficticio) | Solo sus propios datos en POS-01 |

## 9. Cómo trabajar en este repo

1. Leer este archivo y `docs/especificacion.md` antes de tocar código.
2. Cada cambio de alcance, entidad, permiso o regla se anota primero en la especificación y en `docs/correspondencia-g2.md` con su razón.
3. Un permiso nuevo va en la matriz de la especificación y en `api/permisos.php`. No hay permisos fuera de ese archivo: los roles personalizados solo eligen entre los permisos que su rol base tiene ahí.
4. Texto de la interfaz en español de México, sin "—" ni "~".
5. Commits pequeños, en español, que digan qué cambia para el usuario.
