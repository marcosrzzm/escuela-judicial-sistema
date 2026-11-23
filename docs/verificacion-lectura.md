# Verificación de lectura

Fecha: 22 de noviembre de 2026. Sesión nueva de Claude Code (modelo Sonnet), abierta en la raíz del repositorio, con permiso solo de leer archivos. Nadie del equipo intervino entre la instrucción y la respuesta. La captura de pantalla de esta sesión se adjunta en la entrega.

## Instrucción

> Lee solo los archivos de este repositorio. Sin que nadie te explique nada más, resume en español y en menos de 30 líneas: 1) qué roles existen, 2) qué puede ver, crear y modificar cada uno según la matriz de permisos, 3) qué está prohibido para todos, 4) qué no se construye. Cita el archivo y la sección de cada cosa.

## Respuesta del agente

> Marcos, leí solo `AGENTS.md` (`CLAUDE.md` es su enlace), `docs/especificacion.md` y `api/permisos.php`.
> 
> 1. **Roles** (`especificacion.md` §2 y `AGENTS.md` §5): Coordinación, Docente, Dirección, Carga externa y Auxiliar. El Alumno no tiene cuenta. Cada usuario tiene un solo rol.
> 2. **Qué puede cada rol** (`especificacion.md` §4, aplicada en `api/permisos.php`; §3.8 da las transiciones de estado):
>    - **Coordinación:** ve casi todo. Crea alumnos, decisiones, documentos, lotes y métricas. Modifica inscripciones, pendientes y cierres. Acepta, devuelve o reabre entregas, y puede hacer captura excepcional.
>    - **Docente:** ve sus grupos, asignaciones y decisiones. Crea y modifica solo sus entregas y calificaciones, y solo en borrador.
>    - **Dirección:** ve casi todo y no crea nada. Modifica solo las decisiones y cierres que requieren autorización.
>    - **Carga externa:** ve periodo, grupo, materia, cierres aprobados y lotes. Crea y modifica el registro de carga externa.
>    - **Auxiliar:** solo ve periodo, sus grupos, alumnos e inscripciones, para consultar e imprimir la lista.
> 3. **Prohibido para todos** (`especificacion.md` §4, párrafo bajo la matriz; `AGENTS.md` §3):
>    - Firmar documentos y escribir en la plataforma oficial.
>    - Borrar registros.
>    - Editar una entrega aceptada sin reabrirla, o un cierre aprobado.
>    - Ver datos fuera de su rol o asignación; esa petición responde 403.
> 4. **No se construye** (`AGENTS.md` §2, que viene de G2 §6.7):
>    - Admisión.
>    - Captura completa de asistencia.
>    - API o integración con la plataforma oficial.
>    - Firma digital.
>    - Portal de alumnos.
>    - Migración del histórico.
>    - Comunicaciones masivas.
>    - Automatizar decisiones académicas.
>    - Administrar cuentas, periodos, materias o asignaciones desde pantalla (van por semilla).
>    - Tokens, conectores o API pública.
>    - Datos reales.
> 
> Hallazgo: la matriz en código solo da el permiso base. Los límites "propios" y "aprobados" los comprueba cada endpoint con `alcance.php` (comentario inicial de `api/permisos.php`). No leí `alcance.php`, así que no verifiqué que lo haga.

## Lectura del equipo

El agente identificó los cinco roles con cuenta y al alumno sin cuenta, reprodujo la matriz de permisos de la sección 4, las prohibiciones comunes y las exclusiones de `AGENTS.md`, sección 2, sin ayuda, y además llegó por su cuenta a `api/permisos.php`. Su observación final es correcta: la matriz da el permiso base y los límites de "propias" y "aprobados" se comprueban en cada ruta con `api/lib/alcance.php`, que las pruebas CA-02 y CA-13 de `pruebas/aceptacion.mjs` ejercitan. La captura de esta sesión es `captura-verificacion-lectura.png`.
