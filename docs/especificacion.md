# Especificación del sistema

Equipo 4 · Escuela Judicial del STJ Jalisco · Coordinación de Posgrados
Base: compuerta G2 del 14 de octubre de 2026. Lo que cambia respecto a G2 está en `correspondencia-g2.md`.

## 1. Propósito

Que Coordinación reutilice información académica ya validada entre listas, derecho a evaluación, calificaciones, historial y cierre, para reducir la recaptura y el tiempo activo sin sustituir el criterio académico, la firma institucional ni la carga oficial externa.

Indicadores del piloto: campos recapturados por caso (CA-11) y minutos activos de Coordinación por lista o cierre (CA-12). No hay línea base todavía, así que el sistema también permite registrar los casos medidos fuera de él.

## 2. Actores y roles

| Rol | Clave en el código | Quién es | Usa el sistema para |
|---|---|---|---|
| Coordinación de Posgrados | `coordinacion` | Usuario principal | Preparar listas, registrar decisiones, revisar entregas, consultar historial, cerrar y generar lotes |
| Docente | `docente` | Profesor con una o más asignaciones | Capturar, enviar y corregir calificaciones de sus asignaciones |
| Dirección | `direccion` | Autoridad que autoriza | Resolver decisiones y cierres marcados como "requiere autorización" |
| Carga externa | `carga_externa` | Área que carga la plataforma oficial | Recibir lotes y registrar carga y discrepancias |
| Auxiliar | `auxiliar` | Apoyo de Coordinación | Consultar e imprimir la lista de sus grupos |
| Alumno | (sin cuenta) | Beneficiario | No entra al sistema en esta versión |

Un usuario tiene un solo rol. Además de estos cinco roles del sistema, Coordinación puede crear roles personalizados a partir de uno de ellos (sección 10.2). Coordinación da de alta las cuentas desde la pantalla Usuarios y roles; la semilla solo trae las cuentas de prueba.

## 3. Entidades y relaciones

Las 16 entidades de G2 más las de soporte que exige el login y la medición (marcadas con *). Tipos pensados para MySQL. Toda tabla tiene `id` entero autoincremental y `creado_en`.

### 3.1 Listas y grupo vigente (J03)

**periodo**: `nombre` (2026-B), `fecha_inicio`, `fecha_fin`, `estado` (abierto, cerrado).

**grupo**: `periodo_id`, `clave` (POS-01), `programa`, `turno`, `estado` (activo, cerrado).

**alumno**: `identificador` (matrícula institucional, única), `nombre`, `estatus` (activo, baja, egresado).

**inscripcion_grupo**: `alumno_id`, `grupo_id`, `estado` (activa, baja), `fecha_alta`, `fecha_baja`, `observacion`. Índice único lógico: un alumno solo puede tener una inscripción `activa` por grupo (RN-01).

**usuario** (UsuarioRol en G2): `nombre`, `correo` (único), `contrasena_hash`, `rol` (clave de la tabla `rol`), `estado` (activo, inactivo), `debe_cambiar_clave` (sí o no).

**rol***: `clave` (única), `nombre`, `base` (coordinacion, docente, direccion, carga_externa, auxiliar), `permisos` (lista recurso:acción), `es_sistema` (sí o no), `estado` (activo, inactivo), `creado_por`. Detalle en la sección 10.2.

**asignacion_auxiliar***: `usuario_id`, `grupo_id`. Dice qué listas ve cada auxiliar.

### 3.2 Derecho a evaluación (J05)

**decision_evaluacion**: `alumno_id`, `asignacion_id`, `resultado` (con_derecho, sin_derecho, pendiente_revision, requiere_autorizacion), `motivo` (obligatorio), `referencia_evidencia` (texto libre: dónde está el justificante), `responsable_id`, `fecha`, `autorizado_por`, `fecha_autorizacion`, `resolucion_direccion` (autorizada, rechazada). Cada decisión nueva es un registro nuevo; la vigente es la más reciente del alumno en esa asignación.

### 3.3 Calificaciones (J06)

**materia**: `clave`, `nombre`.

**asignacion_docente**: `grupo_id`, `materia_id`, `docente_id`. Única por grupo y materia.

**entrega_calificaciones**: `asignacion_id`, `version`, `estado` (borrador, enviada, aceptada, devuelta, reabierta), `responsable_id` (quién la capturó), `captura_excepcional` (sí o no, ruta D03), `fecha_envio`, `fecha_revision`, `revisado_por`, `motivo` (de devolución o reapertura). Una fila por versión.

**calificacion**: `entrega_id`, `alumno_id`, `valor` (0.0 a 10.0, un decimal), `estatus` (acreditada, no_acreditada, sin_derecho), `observacion`.

### 3.4 Historial (J07)

**pendiente_academico**: `alumno_id`, `materia_id`, `periodo_origen_id`, `tipo` (reprobada, sin_derecho, manual), `estado` (abierto, resuelto), `resolucion` (texto), `resuelto_en`.

El historial del alumno no es una tabla: se arma con las calificaciones de las entregas aceptadas vigentes y sus pendientes.

### 3.5 Cierre y entrega (J08)

**cierre**: `grupo_id`, `version`, `estado` (preparado, en_autorizacion, aprobado, devuelto, reemplazado), `requiere_autorizacion`, `preparado_por`, `aprobado_por`, `fecha_aprobacion`, `motivo`.

**documento_academico**: `alumno_id`, `cierre_id`, `tipo` (boleta), `version` (la del cierre), `estado` (preparado_pendiente_firma).

**lote_entrega**: `cierre_id`, `version`, `estado` (generado, recibido, cargado, con_discrepancias), `generado_por`, `fecha_generacion`.

**registro_carga_externa**: `lote_id`, `fecha_recepcion`, `fecha_carga`, `estado` (recibido, cargado, con_discrepancias), `discrepancias` (texto), `registrado_por`.

**bitacora_cambio**: `entidad`, `registro_id`, `accion`, `usuario_id`, `fecha`, `motivo`, `antes` (JSON), `despues` (JSON). Solo se inserta, nunca se edita ni se borra.

### 3.6 Soporte*

**sesion***: `usuario_id`, `token_hash`, `expira_en`, `ultimo_uso`, `viendo_como_id` (usuario cuya vista se consulta en modo solo lectura, sección 10.3). Cookie httpOnly, Secure, SameSite=Strict.

**metrica_caso***: `tipo` (lista, cierre), `grupo_id`, `origen` (sistema, linea_base), `campos_recapturados`, `segundos_activos`, `nota`, `registrado_por`, `fecha`.

### 3.7 Relaciones

- Un periodo tiene varios grupos.
- Alumno y grupo se relacionan por inscripcion_grupo.
- Grupo + materia + docente forman una asignacion_docente.
- Una asignación tiene varias entregas (una por versión); cada entrega tiene una calificación por alumno.
- El historial del alumno sale de las calificaciones aceptadas vigentes y de pendiente_academico.
- Un cierre pertenece a un grupo; de él salen documentos y lotes.
- registro_carga_externa depende de un lote y nunca modifica el cierre.
- Todo cambio sensible genera una fila en bitacora_cambio.

### 3.8 Estados y transiciones

| Entidad | Transición | Quién | Requisito |
|---|---|---|---|
| Entrega | borrador → enviada | Docente dueño | Todas las calificaciones capturadas entre 0 y 10 |
| Entrega | enviada → aceptada | Coordinación | |
| Entrega | enviada → devuelta | Coordinación | Motivo obligatorio. Se crea la versión siguiente en borrador con las mismas calificaciones |
| Entrega | aceptada → reabierta | Coordinación | Motivo obligatorio y que el grupo no tenga cierre aprobado vigente. Se crea la versión siguiente en borrador |
| Decisión | (nueva) | Coordinación | Motivo obligatorio |
| Decisión | requiere_autorizacion → autorizada o rechazada | Dirección | Motivo obligatorio |
| Cierre | (nuevo) preparado | Coordinación | Todas las asignaciones del grupo con entrega aceptada vigente, o excepción con motivo |
| Cierre | preparado → aprobado | Coordinación | Solo si `requiere_autorizacion` es no |
| Cierre | preparado → en_autorizacion | Coordinación | Si `requiere_autorizacion` es sí |
| Cierre | en_autorizacion → aprobado o devuelto | Dirección | Motivo obligatorio si devuelve |
| Cierre | aprobado → reemplazado | Coordinación | Al preparar una versión nueva con motivo |
| Lote | (nuevo) generado | Coordinación | Cierre aprobado; uno por versión de cierre |
| Lote | generado → recibido → cargado o con_discrepancias | Carga externa | Discrepancias con texto obligatorio |

Pendientes automáticos: al aceptar una entrega, cada calificación menor a 8.0 (mínimo aprobatorio supuesto, ver sección 8) o con decisión `sin_derecho` abre un pendiente. Si después una entrega aceptada de la misma materia da 8.0 o más, el pendiente se resuelve solo con la referencia de esa entrega.

## 4. Matriz de permisos

V = ver, C = crear, M = modificar o cambiar estado, · = sin acceso. "Propias" quiere decir de sus asignaciones o grupos. La matriz vive en código en `api/permisos.php` y se valida en el servidor.

| Entidad | Coordinación | Docente | Dirección | Carga externa | Auxiliar |
|---|---|---|---|---|---|
| periodo | V C M | V | V | V | V |
| grupo | V C M | V propios | V | V | V propios |
| alumno | V C M | V de sus grupos | V | · | V de sus grupos |
| inscripcion_grupo | V C M (alta y baja) | V de sus grupos | V | · | V de sus grupos |
| usuario | V C M (solo rol del sistema) | · | · | · | · |
| rol* | V C M (solo rol del sistema) | · | · | · | · |
| materia | V C M | V propias | V | V | · |
| asignacion_docente | V C M | V propias | V | · | · |
| decision_evaluacion | V C | V propias | V M (solo las que requieren autorización) | · | · |
| entrega_calificaciones | V M (aceptar, devolver, reabrir) C (solo captura excepcional) | V C M propias en borrador | V | · | · |
| calificacion | V | V C M propias en borrador | V | · | · |
| pendiente_academico | V C M | · | V | · | · |
| cierre | V C M | · | V M (solo en autorización) | V aprobados | · |
| documento_academico | V C | · | V | · | · |
| lote_entrega | V C | · | V | V | · |
| registro_carga_externa | V | · | V | V C M | · |
| bitacora_cambio | V | · | V | · | · |
| metrica_caso | V C | · | V | · | · |

Los roles personalizados tienen como máximo los permisos de su rol base en esta matriz, nunca la administración de usuarios ni de roles, ni la vista como otro usuario (sección 10.2).

Nadie puede: firmar documentos, escribir en la plataforma oficial, borrar registros, editar una entrega aceptada sin reabrir, editar un cierre aprobado, ni ver datos fuera de su rol o asignación. Una petición fuera de la matriz responde 403 y no revela si el registro existe.

## 5. Flujo core paso a paso

**F01. Seleccionar periodo y grupo.** Coordinación entra a Grupos y listas, elige 2026-B y POS-01. Ve la lista vigente (inscripciones activas). Puede dar de alta o baja una inscripción con observación. Cada cambio va a la bitácora.

**F02. Reutilizar la lista.** Sin capturar nada, la misma lista aparece al docente en su asignación y al auxiliar en Mis listas. Ambos pueden imprimirla. Ningún nombre ni identificador se vuelve a escribir.

**F03. Derecho a evaluación.** En Derecho a evaluación, Coordinación elige la asignación y para cada alumno registra resultado y motivo (y referencia de evidencia si la hay). Si elige "requiere autorización", el caso aparece a Dirección en Autorizaciones, donde lo autoriza o rechaza con motivo.

**F04. Entrega del docente.** El docente entra a Mis asignaciones, abre la suya y captura calificaciones. Puede guardar borrador o enviar. Al enviar, la entrega queda con versión, fecha y responsable, y ya no la puede editar. Los alumnos marcados sin derecho aparecen bloqueados con estatus "sin derecho". Ruta excepcional: si un docente no puede usar el sistema, Coordinación captura por él marcando "captura excepcional" con motivo; eso cuenta como recaptura.

**F05. Revisión.** En Revisión de calificaciones, Coordinación ve las entregas enviadas por docente y materia. Acepta, o devuelve con motivo. Al devolver se crea la versión siguiente en borrador y el docente ve el motivo.

**F06. Historial y pendientes.** Al aceptar, las calificaciones pasan al historial del alumno y se abren o resuelven pendientes (sección 3.8). En Historial del alumno, Coordinación busca por nombre o matrícula y ve todas sus materias por periodo y sus pendientes, sin abrir archivos.

**F07. Cierre.** En Cierre y lote, Coordinación prepara el cierre del grupo. El sistema verifica que todas las asignaciones tengan entrega aceptada; si falta una, solo se puede continuar registrando la excepción con motivo. Coordinación lo aprueba, o lo envía a Dirección si marcó que requiere autorización.

**F08. Documentos y lote.** Con el cierre aprobado se generan las boletas (vista imprimible, "pendiente de firma institucional") y el lote con periodo, grupo, versión de cierre, responsable y fecha, descargable en CSV.

**F09. Traspaso externo.** Carga externa entra a Lotes recibidos, confirma recepción, registra la carga y, si hay, las discrepancias. No puede editar el cierre ni las calificaciones.

## 6. Pantallas por rol

| Rol | Pantallas (menú lateral) |
|---|---|
| Coordinación | Inicio · Grupos y listas · Derecho a evaluación · Revisión de calificaciones · Historial del alumno · Cierre y lote · Métricas · Bitácora · Catálogos · Usuarios y roles |
| Docente | Mis asignaciones (entrega de calificaciones dentro) |
| Dirección | Autorizaciones · Bitácora |
| Carga externa | Lotes recibidos |
| Auxiliar | Mis listas |
| Rol personalizado | Las pantallas de su rol base para las que tiene el permiso que la pantalla necesita |
| Todos | Mi contraseña (desde el menú de la cuenta) |

Inicio de Coordinación muestra: entregas por revisar, decisiones esperando a Dirección, grupos listos para cierre y lotes con discrepancias, cada uno con un clic a su pantalla.

Tareas frecuentes y clics máximos (regla de tres clics): revisar una entrega (2), devolver con motivo (3), consultar el historial de un alumno (2), enviar calificaciones como docente (3), registrar recepción de un lote (2).

## 7. Criterios de aceptación con dos cuentas

Cada criterio se comprueba con dos cuentas de la semilla: la cuenta A hace la acción y la cuenta B (o la misma A después) comprueba el resultado. Todos están automatizados en `pruebas/aceptacion.mjs` contra la API y se pueden repetir a mano en la interfaz.

| CA | Cuenta A hace | Cuenta B comprueba | Resultado esperado |
|---|---|---|---|
| CA-01 | Coordinación consulta la lista vigente de POS-01 | Docente A abre su asignación y Auxiliar abre Mis listas | Los dos ven los mismos alumnos con el mismo identificador, sin haber capturado nada. La métrica de recaptura de la lista queda en 0 |
| CA-02 | Docente A pide la asignación de POS-02 por URL o API | Docente B consulta su entrega | A recibe 403 y no puede guardar nada; la entrega de B no cambió |
| CA-03 | Docente A envía su entrega | Coordinación abre Revisión | La entrega muestra versión 1, fecha de envío, responsable Docente A y estado enviada |
| CA-04 | Coordinación intenta devolver sin motivo | Docente A abre su asignación | El servidor responde 422; la entrega sigue enviada y el docente no ve cambios |
| CA-05 | Coordinación acepta la v1 y luego la reabre con motivo | Docente A abre su asignación | La v1 sigue guardada como reabierta; el docente edita una v2 en borrador. Un intento de editar la v1 responde 409 |
| CA-06 | Coordinación acepta entregas de 2026-A y 2026-B del mismo alumno | Coordinación abre Historial del alumno | Ve las materias de los dos periodos y sus pendientes en una sola pantalla |
| CA-07 | Coordinación intenta preparar el cierre de POS-02 sin entrega aceptada | Coordinación lo intenta de nuevo con excepción y motivo | Sin excepción responde 422; con excepción el cierre se crea y la excepción queda en bitácora |
| CA-08 | Coordinación genera el lote de un cierre aprobado | Carga externa abre Lotes recibidos | Ve periodo, grupo, versión de cierre, responsable y fecha del lote |
| CA-09 | Carga externa registra recepción, carga y una discrepancia | Coordinación abre Cierre y lote; Carga externa intenta modificar el cierre por API | Coordinación ve el traspaso y la discrepancia; el intento de Carga externa responde 403 y el cierre no cambia |
| CA-10 | Coordinación devuelve una entrega con motivo | Dirección abre Bitácora | Aparece la acción con usuario, fecha, motivo y valores antes y después |
| CA-11 | Coordinación hace una captura excepcional por Docente B | Coordinación abre Métricas | El caso del grupo suma los campos recapturados; un caso de línea base registrado a mano aparece junto para comparar |
| CA-12 | Coordinación trabaja en la lista y en el cierre de POS-01 | Coordinación abre Métricas | Se ven los minutos activos de ese caso; el tiempo sin actividad de más de 2 minutos no cuenta |
| CA-13 | Auxiliar pide la lista de POS-02; Docente B pide el historial de un alumno | Coordinación revisa la bitácora | Las dos peticiones responden 403 |
| CA-14 | Cualquier rol busca una acción para firmar o enviar a la plataforma oficial | Revisión de la API (`api/rutas.php`) | No existe ninguna ruta ni botón que firme o escriba fuera del sistema; los documentos dicen "pendiente de firma institucional" |
| CA-15 | Coordinación crea la cuenta de un docente nuevo | El docente nuevo entra con su contraseña temporal | Antes de cambiarla, cualquier ruta que no sea cambiar contraseña o salir responde 403; después de cambiarla entra a Mis asignaciones. La alta queda en bitácora sin la contraseña |
| CA-16 | Coordinación crea un rol "Consulta de Dirección" con base Dirección y solo permisos de ver, y se lo asigna a una cuenta | Esa cuenta intenta resolver una autorización | Ve Autorizaciones y Bitácora pero resolver responde 403. Crear un rol con un permiso fuera de su base, o con administración de usuarios, responde 422 |
| CA-17 | Coordinación entra a "Ver como" Docente A | Coordinación intenta enviar la entrega de Docente A y después sale; Dirección abre Bitácora | Ve la asignación de Docente A tal como él la ve; enviar responde 403 y la entrega no cambia; los latidos de tiempo activo no se guardan; la bitácora muestra inicio y fin de la vista con Coordinación como responsable |
| CA-18 | Docente A pide crear un usuario, crear un rol y ver como otro usuario por API | Coordinación revisa la bitácora | Las tres peticiones responden 403 y quedan como acceso denegado |
| CA-19 | Coordinación desactiva una cuenta con sesión abierta e intenta desactivar a la última Coordinación activa | La cuenta desactivada hace una petición | La cuenta recibe 401 y ya no puede entrar; desactivar a la última Coordinación responde 409 |
| CA-20 | Coordinación crea periodo, materia y grupo, asigna la materia al docente nuevo e importa la lista de alumnos desde un archivo CSV | El docente nuevo abre Mis asignaciones | Ve la asignación con la lista importada sin capturar nada; las filas repetidas en el mismo grupo se rechazan por RN-01 y el resumen de importación las muestra |
| CA-21 | Coordinación invita por correo a una cuenta nueva | La persona abre el enlace y crea su contraseña; después usa el mismo enlace otra vez | Entra con su contraseña nueva sin haber visto una temporal; el segundo uso responde 410 y la invitación queda en bitácora sin el token |
| CA-22 | Una persona pide restablecer su contraseña desde la pantalla de entrada | Coordinación autoriza la solicitud; antes de eso nadie recibió enlace | Sin autorización no existe enlace; al autorizar sale uno solo, sirve una vez y cierra sus sesiones; un correo inexistente recibe la misma respuesta y no crea solicitud visible |

## 8. Supuestos que hay que confirmar con la Escuela

Vienen de los pendientes P04, P10, P11, P12 y P15 del expediente. Mientras no se confirmen, el sistema usa estos valores y los muestra como configurables:

1. Calificación mínima aprobatoria de 8.0 en posgrado (`api/ajustes.php`, `CALIFICACION_MINIMA`).
2. Qué registro es el oficial cuando dos fuentes difieren (P04). En el sistema, la entrega aceptada vigente.
3. Cuándo un cierre requiere autorización de Dirección. Por ahora lo marca Coordinación caso por caso.
4. Formato de la boleta y del lote que pide el área de carga externa. Por ahora una vista imprimible y un CSV con matrícula, nombre, materia, calificación y estatus.
5. Uso de datos reales. Prohibido hasta tener autorización escrita; el piloto usa la semilla ficticia.

## 9. Decisiones de construcción del MVP

Cosas que la construcción necesitó y que la especificación no decía. Cada una está también en `correspondencia-g2.md` con su razón.

1. **Columnas de apoyo.** `entrega_calificaciones.motivo_captura` (motivo de la captura excepcional); `decision_evaluacion.motivo_direccion` (motivo de Dirección al autorizar o rechazar); `cierre.excepcion` y `cierre.motivo_excepcion` (excepción al preparar sin todas las entregas aceptadas); en `cierre`, `motivo` guarda el motivo de devolución de Dirección o de reemplazo por una versión nueva.
2. **Efecto de una decisión.** Solo `sin_derecho`, o `requiere_autorizacion` ya rechazada por Dirección, bloquea al alumno en la captura (queda con estatus `sin_derecho` y sin valor). Los otros resultados no bloquean: el sistema guarda la decisión, no decide por nadie.
3. **Acciones de permiso.** `ver`, `crear` y `modificar`, más `aceptar`, `devolver` y `reabrir` en `entrega_calificaciones`, que son el paréntesis de la celda de Coordinación. Los alcances "propios" y "solo captura excepcional" se comprueban en cada endpoint.
4. **Accesos denegados.** Cada respuesta 403 queda en `bitacora_cambio` con `accion = acceso_denegado`, la ruta y el usuario. La bitácora es inmutable también en la base (disparadores que rechazan UPDATE y DELETE).
5. **Intentos de inicio de sesión.** Tabla de soporte `intento_login`: a los 5 intentos fallidos de un correo en 15 minutos, el inicio de sesión responde 429.
6. **Métricas.** Hay un solo caso del sistema por tipo (lista o cierre) y grupo. El navegador mide el tiempo activo (pestaña visible y actividad en los últimos 2 minutos) y manda un latido cada 30 s; el servidor acepta máximo 30 s por latido. Los campos recapturados del caso `cierre` son los valores que Coordinación capturó por un docente (captura excepcional); alta de alumnos y bajas no cuentan como recaptura. Un caso de línea base lleva grupo opcional, campos recapturados y minutos activos.
7. **Pendientes manuales.** Coordinación puede agregar un pendiente de tipo `manual` (con motivo) y resolver cualquier pendiente abierto con un texto; las dos cosas van a la bitácora.
8. **Cierre.** Solo hay un cierre en curso (preparado o en autorización) por grupo. Preparar una versión nueva con un cierre aprobado exige motivo y deja el anterior como reemplazado. Al aprobar se vuelve a comprobar que las entregas sigan aceptadas (salvo excepción registrada). Documentos y lote se generan en una sola acción de Coordinación, porque Dirección aprueba pero no genera documentos.
9. **Traspaso.** Un registro de carga externa por lote: la recepción lo crea (`recibido`) y la carga lo cierra como `cargado` o `con_discrepancias` (texto obligatorio). Después de cerrado no se vuelve a editar.
10. **Inicio por rol.** Solo Coordinación tiene Inicio con contadores. Los demás roles entran directo a su primera pantalla del menú (sección 6).
11. **Reinicio de la semilla.** Solo en local, con `scripts/reiniciar-semilla.sh`; no existe endpoint de reinicio.
12. **Administración, detalles de construcción.** La clave de un rol personalizado es `rol_` más 8 caracteres al azar y su base no se cambia después de crearlo. Autorizaciones pide `decision_evaluacion:ver` y base Dirección (para que un rol de solo ver la vea; resolver sigue pidiendo `modificar`). Rutas de apoyo: `GET /docentes`, `GET /materias` y `GET /ajustes-publicos` (la entrada decide si muestra la franja de datos ficticios). El grupo solo cambia de periodo si no tiene lista ni asignaciones.


## 10. Administración y uso real

Decisión del 22 de noviembre de 2026 (Marcos, por el equipo): el sistema debe quedar listo para que la Escuela lo use sin depender de la semilla. Se abre la administración desde pantalla que G2 dejó fuera (exclusión de la sección 6.7) y se registra en `correspondencia-g2.md`, filas 22 a 27. Las demás exclusiones de G2 siguen igual.

### 10.1 Usuarios

Pantalla Usuarios y roles, pestaña Usuarios. Solo para el rol del sistema `coordinacion`.

- Lista con buscador y filtros por rol y estado.
- Alta: nombre, correo y rol. El sistema genera una contraseña temporal y la muestra una sola vez en pantalla para que Coordinación se la entregue a la persona; no se guarda en claro en ningún lado. La cuenta queda con `debe_cambiar_clave`.
- Edición: nombre, correo, rol y estado (activo o inactivo). Nada se borra: una baja es inactivar.
- Restablecer contraseña: genera otra temporal, mostrada una vez, y vuelve a exigir el cambio.
- Para una cuenta con base Auxiliar, se eligen los grupos cuya lista ve (`asignacion_auxiliar`).
- Cambiar el rol, inactivar o restablecer la contraseña cierra todas las sesiones de esa cuenta.
- No se puede inactivar ni quitarle el rol a la última cuenta activa con el rol del sistema `coordinacion` (409).
- Todo va a la bitácora con valores antes y después, sin contraseñas ni hashes.

Mi contraseña (todos los roles): contraseña actual, nueva y confirmación. Mínimo 10 caracteres y distinta del correo. Mientras una cuenta tenga `debe_cambiar_clave`, el servidor solo le permite ver su sesión, cambiar la contraseña y salir; cualquier otra ruta responde 403.

### 10.2 Roles

Pestaña Roles. Solo para el rol del sistema `coordinacion`.

- Los cinco roles del sistema aparecen como de solo lectura, con sus permisos. Su definición sigue en `api/permisos.php`.
- Rol nuevo: nombre, rol base y permisos marcados de una lista. La lista solo ofrece los permisos que tiene el rol base en `api/permisos.php`; el servidor rechaza con 422 cualquier otro.
- Ningún rol personalizado puede tener permisos de `usuario` o `rol` distintos de ver, ni la vista como otro usuario. Eso queda solo en el rol del sistema `coordinacion`.
- El alcance ("propios", "de sus grupos") lo da el rol base: un rol con base Docente solo toca sus asignaciones y uno con base Auxiliar solo sus grupos. Por eso un rol personalizado nunca rompe RN-03.
- Un rol se puede editar o inactivar; no se puede inactivar si tiene cuentas activas (409). Cambiar los permisos de un rol cierra las sesiones de sus cuentas.
- El menú de un rol personalizado muestra las pantallas de su base para las que tiene el permiso que cada pantalla necesita.

### 10.3 Ver como

Coordinación (rol del sistema) elige una cuenta activa en Usuarios y pulsa "Ver como". Desde ese momento ve el sistema exactamente como esa cuenta: menú, pantallas, alcance y datos.

- Es solo lectura y lo hace cumplir el servidor: toda petición que no sea GET responde 403, salvo salir de la vista y cerrar sesión.
- Los latidos de tiempo activo se descartan mientras dura la vista, para no ensuciar CA-12.
- Una franja fija arriba dice a quién se está viendo, que es solo lectura y tiene el botón Salir de la vista.
- El inicio y el fin de la vista van a la bitácora con Coordinación como responsable y la cuenta vista como registro.
- No se puede ver como uno mismo ni como una cuenta inactiva.

### 10.4 Catálogos

Pantalla Catálogos, para Coordinación (y roles personalizados con base Coordinación que tengan el permiso). Cada alta o cambio va a la bitácora.

- Periodos: alta (nombre, inicio, fin) y cambio de estado abierto o cerrado.
- Materias: alta y edición de clave y nombre. Clave única.
- Grupos: alta y edición (periodo, clave, programa, turno) y cambio de estado.
- Asignaciones: grupo + materia + docente (cuenta activa con base Docente). Una por grupo y materia. Cambiar el docente exige motivo; las entregas ya hechas conservan su responsable.
- Alumnos: edición de nombre, matrícula y estatus con motivo (el alta ya existía).
- Importar lista: en Grupos y listas, Coordinación sube un CSV con matrícula y nombre. Crea los alumnos que no existen, inscribe a todos en el grupo y devuelve un resumen de filas creadas, inscritas y rechazadas con su razón (repetidas por RN-01, matrícula vacía o con formato inválido). Nada se escribe si el archivo no se puede leer. Máximo 500 filas.

### 10.5 Primer uso con datos reales

- La franja "Prototipo · datos ficticios" se controla con `DATOS_FICTICIOS` en `api/ajustes.php` y sigue encendida mientras no exista autorización escrita de la Escuela para usar datos reales (sección 8, punto 5).
- Para arrancar una base sin la semilla: se aplican las migraciones sin `90_semilla.sql` y se crea la primera cuenta de Coordinación con `scripts/crear-coordinacion.php`, que imprime la contraseña temporal solo en la terminal de quien lo corre.

### 10.6 Invitaciones y restablecimiento por correo

Decisión del 23 de noviembre de 2026 (Marcos): Coordinación invita por correo y cada persona crea su propia contraseña; nadie restablece su contraseña sin autorización de Coordinación.

- Invitar: al dar de alta una cuenta, Coordinación elige "Enviar invitación por correo" (opción por omisión). El sistema manda un correo con un enlace de un solo uso, vigente 72 horas. La persona abre el enlace, ve su correo de la Escuela ya escrito, crea su contraseña (mínimo 10 caracteres, distinta del correo) y entra. Coordinación puede reenviar la invitación; la anterior deja de servir.
- La contraseña temporal mostrada en pantalla queda como respaldo cuando el correo no llega.
- Olvidé mi contraseña: en la pantalla de entrada la persona escribe su correo. El sistema responde siempre lo mismo, exista o no la cuenta, y no manda nada todavía: crea una solicitud. Máximo 3 solicitudes por correo cada 24 horas.
- Coordinación ve las solicitudes en Usuarios y roles y en Inicio. Al autorizar, el sistema manda un enlace de un solo uso, vigente 24 horas, y cierra las sesiones de esa cuenta. Al rechazar, la solicitud se cierra con motivo y no se manda nada.
- Coordinación también puede mandar el enlace de restablecimiento por iniciativa propia desde la ficha de la cuenta.
- Los enlaces guardan solo el hash del token. Usarlo, que venza o que se emita otro lo invalida.
- Los correos salen por Resend con HTML y texto, un solo enlace, sin imágenes salvo el nombre del sistema en texto, y con respuesta dirigida al correo de quien invitó o autorizó. Si el envío falla, la acción queda registrada, la pantalla lo dice y ofrece la contraseña temporal. En local, sin llave de Resend, el correo se guarda en un archivo dentro de `seguridad/` en lugar de enviarse.
- Todo va a la bitácora: invitación enviada, reenviada y usada; solicitud creada, autorizada o rechazada; restablecimiento usado. Nunca el token ni la contraseña.
- No son comunicaciones masivas: cada correo va a una sola persona y lo dispara una acción de Coordinación. La exclusión de G2 sobre comunicaciones masivas sigue igual.
