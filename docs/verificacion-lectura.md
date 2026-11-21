# Verificación de lectura

Fecha: 21 de noviembre de 2026. Sesión nueva de Claude Code (modelo Sonnet), abierta en la raíz del repositorio, con permiso solo de leer archivos. Nadie del equipo intervino entre la instrucción y la respuesta. La captura de pantalla de esta sesión se adjunta en la entrega.

## Instrucción

> Lee solo los archivos de este repositorio. Sin que nadie te explique nada más, resume: 1) qué roles existen, 2) qué puede ver, crear y modificar cada uno según la matriz de permisos, 3) qué está prohibido para todos, 4) qué no se construye. Cita el archivo y la sección de donde sale cada cosa.

## Respuesta del agente

> Marcos, resumen de `AGENTS.md` y `docs/especificacion.md` (`api/permisos.php` aún no existe, solo hay documentos):
> 
> **1. Roles** (especificación §2, AGENTS §5): Coordinación, Docente, Dirección, Carga externa y Auxiliar. El Alumno no tiene cuenta. Cada usuario tiene un solo rol.
> 
> **2. Permisos** (especificación §4; V = ver, C = crear, M = modificar o cambiar estado):
> - **Coordinación**: V en todo menos nada oculto. C de alumnos, inscripciones, decisiones, pendientes, cierres, documentos, lotes y métricas. M de inscripciones (alta y baja), entregas (aceptar, devolver, reabrir), pendientes y cierres. Solo captura calificaciones como excepción.
> - **Docente**: V de sus grupos y asignaciones. V C M de sus calificaciones y entregas, solo en borrador.
> - **Dirección**: V de casi todo. M solo en decisiones que requieren autorización y en cierres en autorización.
> - **Carga externa**: V de periodos, grupos, materias, lotes y cierres aprobados. V C M de `registro_carga_externa`. No edita nada académico.
> - **Auxiliar**: V de periodos, grupos propios, alumnos e inscripciones de sus grupos. Nada más.
> 
> **3. Prohibido para todos** (especificación §4 y §3.8; AGENTS §3):
> - Firmar documentos, escribir en la plataforma oficial y borrar registros (RN-12).
> - Editar una entrega aceptada sin reabrirla con motivo, o editar un cierre aprobado (RN-05, RN-09).
> - Ver datos fuera de su rol o asignación. Si lo intentan, el servidor responde 403 sin revelar si el registro existe.
> - Los permisos se validan en el servidor. Esconder un botón no cuenta.
> 
> **4. Lo que no se construye** (AGENTS §2, que viene de G2 §6.7):
> - Admisión, examen y selección de aspirantes.
> - Captura completa de asistencia y justificantes.
> - API o integración con la plataforma oficial.
> - Firma digital.
> - Portal para alumnos.
> - Migración del histórico.
> - Comunicaciones masivas.
> - Automatizaciones que tomen decisiones académicas.
> - Administración de cuentas, periodos, materias y asignaciones desde pantalla (se cargan por semilla).
> - Tokens de agente, conectores o API pública.
> - Datos reales de alumnos o docentes.
> 
> Tu turno:
> 1. Dime si `api/permisos.php` va primero: AGENTS §9 exige que cada permiso viva ahí, y hoy solo existe la matriz en la especificación.

## Lectura del equipo

El agente identificó los cinco roles con cuenta y al alumno sin cuenta, reprodujo la matriz de permisos de la sección 4, las prohibiciones comunes y las once exclusiones de `AGENTS.md`, sección 2, sin ayuda. Su única duda fue que `api/permisos.php` todavía no existía: es correcto, en ese momento el repositorio solo tenía la especificación.
