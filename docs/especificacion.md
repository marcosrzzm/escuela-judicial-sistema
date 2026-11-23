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
| Alumno | `alumno` | Persona inscrita, con cuenta creada solo por Coordinación | Ver sus propias calificaciones aceptadas, su boleta, su calendario y sus avisos (sección 11.8) |

Un usuario tiene un solo rol. Además de estos seis roles del sistema, Coordinación puede crear roles personalizados a partir de uno de ellos (sección 10.2). Coordinación da de alta las cuentas desde la pantalla Usuarios y roles; la semilla solo trae las cuentas de prueba.

## 3. Entidades y relaciones

Las 16 entidades de G2 más las de soporte que exige el login y la medición (marcadas con *). Tipos pensados para MySQL. Toda tabla tiene `id` entero autoincremental y `creado_en`.

### 3.1 Listas y grupo vigente (J03)

**periodo**: `nombre` (2026-B), `fecha_inicio`, `fecha_fin`, `estado` (abierto, cerrado).

**grupo**: `periodo_id`, `clave` (POS-01), `programa`, `turno`, `estado` (activo, cerrado), `fecha_cierre_prevista` (opcional, sección 11.4).

**alumno**: `identificador` (matrícula institucional, única), `nombre`, `estatus` (activo, baja, egresado), `correo` (opcional; solo se usa para invitar al alumno, sección 11.8).

**inscripcion_grupo**: `alumno_id`, `grupo_id`, `estado` (activa, baja), `fecha_alta`, `fecha_baja`, `observacion`. Índice único lógico: un alumno solo puede tener una inscripción `activa` por grupo (RN-01).

**usuario** (UsuarioRol en G2): `nombre`, `correo` (único), `contrasena_hash`, `rol` (clave de la tabla `rol`), `estado` (activo, inactivo), `debe_cambiar_clave` (sí o no), `preferencia_tema` (claro u oscuro, sección 11.6) y `alumno_id` (opcional y único: liga una cuenta con rol `alumno` a su alumno, sección 11.8).

**rol***: `clave` (única), `nombre`, `base` (coordinacion, docente, direccion, carga_externa, auxiliar, alumno), `permisos` (lista recurso:acción), `es_sistema` (sí o no), `estado` (activo, inactivo), `creado_por`. Detalle en la sección 10.2.

**asignacion_auxiliar***: `usuario_id`, `grupo_id`. Dice qué listas ve cada auxiliar.

### 3.2 Derecho a evaluación (J05)

**decision_evaluacion**: `alumno_id`, `asignacion_id`, `resultado` (con_derecho, sin_derecho, pendiente_revision, requiere_autorizacion), `motivo` (obligatorio), `referencia_evidencia` (texto libre: dónde está el justificante), `responsable_id`, `fecha`, `autorizado_por`, `fecha_autorizacion`, `resolucion_direccion` (autorizada, rechazada). Cada decisión nueva es un registro nuevo; la vigente es la más reciente del alumno en esa asignación.

### 3.3 Calificaciones (J06)

**materia**: `clave`, `nombre`.

**asignacion_docente**: `grupo_id`, `materia_id`, `docente_id`, `fecha_limite_entrega` (opcional, sección 11.4). Única por grupo y materia.

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

| Entidad | Coordinación | Docente | Dirección | Carga externa | Auxiliar | Alumno |
|---|---|---|---|---|---|---|
| periodo | V C M | V | V | V | V | V |
| grupo | V C M | V propios | V | V | V propios | V propios |
| alumno | V C M | V de sus grupos | V | · | V de sus grupos | V solo él |
| inscripcion_grupo | V C M (alta y baja) | V de sus grupos | V | · | V de sus grupos | · |
| usuario | V C M (solo rol del sistema) | · | V | · | · | · |
| rol* | V C M (solo rol del sistema) | · | V | · | · | · |
| materia | V C M | V propias | V | V | · | · |
| asignacion_docente | V C M | V propias | V | · | · | · |
| decision_evaluacion | V C | V propias | V M (solo las que requieren autorización) | · | · | V solo su resultado |
| entrega_calificaciones | V M (aceptar, devolver, reabrir) C (solo captura excepcional) | V C M propias en borrador | V | · | · | · |
| calificacion | V | V C M propias en borrador | V | · | · | V propias aceptadas |
| pendiente_academico | V C M | · | V | · | · | V propios |
| cierre | V C M | · | V M (solo en autorización) | V aprobados | · | · |
| documento_academico | V C | · | V | · | · | · |
| lote_entrega | V C | · | V | V | · | · |
| registro_carga_externa | V | · | V | V C M | · | · |
| bitacora_cambio | V | · | V | · | · | · |
| metrica_caso | V C | · | V | · | · | · |

Las entidades del aula (módulos, archivos, actividades, entregas, intentos, mensajes y foros) están en la misma matriz de `api/permisos.php`; su detalle por rol es la tabla de 12.12.

Dirección ve todo lo que ve Coordinación en modo consulta (sección 10.7) y solo escribe para autorizar las decisiones y los cierres que se le envían.

El Alumno solo existe con una cuenta creada por Coordinación (11.8) y nunca ve datos de otra persona. Los roles personalizados no pueden tener base Alumno y tienen como máximo los permisos de su rol base en esta matriz, nunca la administración de usuarios ni de roles, ni la vista como otro usuario (sección 10.2).

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
| Alumno | Tablero · Historial (su boleta) · Calendario · Avisos · Cuenta |
| Rol personalizado | Las pantallas de su rol base para las que tiene el permiso que la pantalla necesita |
| Todos | Mi contraseña (desde el menú de la cuenta) |

Desde la sección 11 todos los roles entran al Tablero y la navegación se organiza como plataforma escolar; esta tabla lista las pantallas que existen. El antiguo Inicio de Coordinación mostraba: entregas por revisar, decisiones esperando a Dirección, grupos listos para cierre y lotes con discrepancias, cada uno con un clic a su pantalla.

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
| CA-10 | Coordinación devuelve una entrega con motivo | Coordinación y Dirección abren Bitácora | Las dos ven la acción con usuario, fecha, motivo y valores antes y después; Docente y Auxiliar no tienen acceso a la bitácora |
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
| CA-23 | Coordinación registra "sin derecho" con motivo y evidencia para un alumno de POS-01 | Docente A abre su asignación y pide la decisión por API | Ve al alumno como "sin derecho" pero la respuesta no trae motivo ni evidencia; Auxiliar y Carga externa no ven la decisión |
| CA-24 | Sin sesión se piden listas, alumnos, historial, lotes y bitácora; Docente A busca un alumno que no es de sus grupos; Dirección pide un historial e intenta dar de alta un alumno | Revisión de las respuestas | Sin sesión todo responde 401 sin datos; el buscador del docente no lo encuentra; Dirección lee el historial y su intento de escribir responde 403 |
| CA-25 | Cada rol abre su Tablero | Revisión de lo que trae | Cada rol recibe tarjetas y Por hacer de su alcance y nada fuera de él: Docente A solo su asignación, Auxiliar sin Por hacer, Carga externa sin tarjetas y solo con lotes, Dirección solo autorizaciones |
| CA-26 | Docente A y Docente B piden el calendario | Revisión de los eventos | Cada docente ve solo las fechas límite de sus asignaciones y los eventos de sus grupos; filtrar por un grupo ajeno responde 403 |
| CA-27 | Coordinación devuelve una entrega de Docente A con motivo | Docente A, Docente B y Coordinación abren Avisos | Solo Docente A recibe el aviso, sin el motivo ni datos sensibles; marcarlo como leído baja el contador; marcar el aviso de otra persona responde 403 |
| CA-28 | Coordinación y Dirección piden la sábana de calificaciones de un grupo, en pantalla y en CSV | Docente, Auxiliar y Carga externa la piden | Coordinación y Dirección la reciben; los otros tres reciben 403 |
| CA-29 | Una cuenta de Alumno abre su Tablero y su historial mientras hay entregas en borrador y enviadas | Revisión de lo que ve | Solo ve calificaciones de entregas aceptadas y solo las suyas; el resultado de su derecho a evaluación sin motivo ni evidencia |
| CA-30 | La cuenta de Alumno pide el historial de otro alumno, la lista de un grupo y la bitácora | Revisión de las respuestas | Las tres responden 403 |
| CA-31 | Coordinación acepta una entrega | La cuenta de Alumno abre Avisos | Recibe el aviso de calificaciones publicadas, sin valores; el alumno sin cuenta no genera nada |

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
10. **Inicio por rol.** Reemplazada por la sección 11: todos los roles entran al Tablero; los contadores de Coordinación pasan a su columna Por hacer.
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
- Entrada de demostración (decisión del 23 de noviembre de 2026, Marcos: "pon una entrada de prueba... ya después lo quitamos"): mientras `DATOS_FICTICIOS` y `ENTRADA_DEMO` estén encendidos, la pantalla de entrada muestra un botón por cada cuenta ficticia de `@prueba.local` (las siete de la semilla) y entra directo, sin contraseña, a lo que ve ese perfil. El servidor solo acepta esas siete cuentas; cualquier otro correo, o con alguna de las dos banderas apagada, responde 404. Cada entrada queda en bitácora como "entrada de demostración". Se quita antes de cargar datos reales.
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
- Mientras `DATOS_FICTICIOS` esté encendido, el correo solo sale de verdad a los destinatarios de `CORREO_PERMITIDOS` (dominios completos o direcciones exactas); a cualquier otro el sistema no le manda nada, la pantalla dice "Modo de prueba: el correo no se envió" y muestra el enlace o la contraseña temporal para que la demostración siga. En todos los modos hay un tope de 50 correos por día (`CORREO_TOPE_DIARIO`).

### 10.7 Datos sensibles: quién ve qué

Decisión del 23 de noviembre de 2026 (Marcos): nada queda público; Coordinación y Dirección ven los datos sensibles de los alumnos (Dirección en modo consulta); el docente ve únicamente lo que necesita para calificar su materia. Referencia: el modelo de permisos por inscripción de Canvas LMS (documentación pública), donde el docente solo existe dentro de los cursos que imparte.

Tres niveles de dato:

| Nivel | Qué incluye | Quién lo ve |
|---|---|---|
| Identificación | Nombre y matrícula del alumno | Coordinación y Dirección; Docente y Auxiliar solo de sus grupos; Carga externa solo dentro de un lote aprobado |
| Académico | Calificaciones, historial, pendientes | Coordinación y Dirección; Docente solo las calificaciones de su asignación; Carga externa solo las del lote aprobado |
| Sensible | Motivo y evidencia del derecho a evaluación, motivos de captura excepcional, de reapertura y de excepción de cierre, valores antes y después en la bitácora | Coordinación y Dirección |

Reglas:

1. El docente ve el resultado del derecho a evaluación de sus alumnos (con derecho, sin derecho, pendiente) para saber a quién no calificar, pero nunca el motivo ni la evidencia. Sí ve el motivo cuando le devuelven su propia entrega.
2. El docente no ve historial, pendientes ni calificaciones de otras materias o grupos, y el buscador solo le encuentra alumnos de sus grupos.
3. El Auxiliar ve nombre y matrícula de los grupos que tiene asignados, nada más.
4. Dirección ve todo lo que ve Coordinación, en modo consulta, y autoriza los casos que se le envían. No crea ni modifica nada más, salvo mandar mensajes uno a uno (12.8), ni usa "ver como". De Usuarios y roles solo consulta.
5. Carga externa ve únicamente los lotes de cierres aprobados, con los campos del lote; no ve motivos ni historiales.
6. Los correos de las cuentas los ven Coordinación y Dirección (decisión del 23 de noviembre de 2026: "Dirección ve todo"). Ningún otro rol los ve.
7. Nada sin sesión: fuera de entrar (también la entrada de demostración de 10.5 mientras exista), la invitación, el restablecimiento y los ajustes públicos, toda ruta exige sesión. Ninguna respuesta sin sesión trae datos de alumnos.
8. Las respuestas de la API con datos llevan `Cache-Control: no-store`. Los respaldos de la base viven fuera de git y de la carpeta pública: en local, `seguridad/respaldos/`; en el hosting, `ej-respaldos/` un nivel arriba de ella (12.11).
9. Los roles personalizados heredan estos límites de su rol base; ninguno puede ver más que su base.
10. El Alumno ve solo sus propios datos: sus calificaciones de entregas aceptadas, el resultado (nunca el motivo ni la evidencia) de su derecho a evaluación, su boleta y sus pendientes. Nunca ve a otro alumno, listas, bitácora, correos, lotes ni los detalles internos de un cierre.

## 11. Experiencia de uso tipo Canvas

Decisión del 23 de noviembre de 2026 (Marcos): el sistema debe sentirse como una plataforma escolar completa, del estilo de Canvas LMS que usa el ITESO, con todo integrado alrededor del grupo. Se toma de Canvas la forma de organizar y navegar; no se copia su marca, sus textos ni su diseño. Las exclusiones de G2 que siguen vigentes (admisión, asistencia completa, portal de alumnos, firma, plataforma oficial, comunicaciones masivas) no cambian.

### 11.1 Navegación global

- Barra lateral angosta y oscura con íconos y etiqueta corta: Cuenta, Tablero, Grupos, Calendario, Avisos (con número de no leídos), Administración (solo Coordinación) y Ayuda.
- Dentro de un grupo, un segundo menú con las secciones del grupo (11.3). Las migas dicen siempre periodo, grupo y sección.
- En celular, la barra global se vuelve un menú inferior de cinco íconos y el menú del grupo un selector arriba.

### 11.2 Tablero

- Tarjetas por grupo (Coordinación, Dirección, Auxiliar) o por asignación (Docente), con una franja de color propia, clave, programa, periodo y un indicador de estado (entregas recibidas de las esperadas, cierre).
- Columna "Por hacer" a la derecha, según el rol: entregas por revisar, entregas devueltas para corregir, autorizaciones pendientes, solicitudes de acceso, lotes por recibir y fechas límite de la semana. Cada elemento lleva a donde se resuelve.
- "Actividad reciente": los últimos cambios que afectan a la persona, tomados de la bitácora con las reglas de visibilidad de 10.7.
- Selector de periodo arriba; por omisión el periodo abierto más reciente.

### 11.3 Página del grupo

Pestañas, cada una con su permiso:

| Pestaña | Contenido | Quién la ve |
|---|---|---|
| Inicio | Resumen: alumnos inscritos, materias, entregas por estado, decisiones pendientes, estado del cierre y próximas fechas | Coordinación, Dirección |
| Personas | Lista vigente, docentes por materia y auxiliares; alta, baja e importación de la lista | Coordinación, Dirección (consulta), Auxiliar (solo lista) |
| Materias | Cada asignación con docente, fecha límite y estado de su entrega | Coordinación, Dirección |
| Calificaciones | Sábana de alumnos por materias con la calificación aceptada vigente, estatus y pendientes; exportable a CSV | Coordinación, Dirección |
| Derecho a evaluación | Decisiones por materia | Coordinación, Dirección |
| Cierre | Cierre, boletas y lote del grupo | Coordinación, Dirección (consulta y autorización) |

Para el Docente, la tarjeta abre su materia con tres pestañas: Lista, Calificaciones (captura y envío) y Derecho a evaluación (solo el resultado, regla 10.7).

### 11.4 Calendario

- Vista de mes y vista de lista, filtrable por grupo.
- Eventos que salen de los datos, sin captura doble: inicio y fin de periodo, fecha límite de entrega de cada asignación y fecha de cierre de cada grupo.
- Campo nuevo `fecha_limite_entrega` en `asignacion_docente` (lo pone Coordinación en Catálogos o en Materias del grupo) y `fecha_cierre_prevista` en `grupo`.
- Cada rol ve solo los eventos de sus grupos o asignaciones.

### 11.5 Avisos dentro del sistema

- Bandeja de avisos por usuario, no correos: se generan solos cuando a la persona le toca hacer algo (te devolvieron una entrega, hay una entrega por revisar, una autorización te espera, se autorizó o rechazó tu caso, hay un lote por recibir, se acerca una fecha límite).
- Marcar como leído uno o todos. Nada se borra; los avisos de más de 90 días se ocultan de la bandeja.
- El aviso nunca trae datos sensibles; solo dice qué pasó y lleva a la pantalla.
- Tabla nueva `aviso`: `usuario_id`, `tipo`, `texto`, `enlace`, `leido_en`, `creado_en`.

### 11.6 Cuenta

Nombre, correo (solo lectura), rol, Mi contraseña, preferencia de tema claro u oscuro y la lista de sesiones abiertas con la opción de cerrarlas.

### 11.7 Historial del alumno

Vista tipo boleta por periodo: materias, calificación aceptada vigente, estatus y pendientes abiertos y resueltos, con acceso desde Personas y desde el buscador. Reglas de 10.7.

### 11.1 bis Estructura de pantalla

Referencia: la estructura de Canvas (no su marca, colores ni textos).

- Barra global angosta y oscura a la izquierda, con la marca "EJ" arriba, después Cuenta, Tablero, Grupos, Calendario, Avisos (con número) e Historial; abajo Ayuda y una flecha para contraer.
- Dentro de un grupo: barra superior con botón para contraer el menú de secciones y migas "periodo > grupo > sección"; a la izquierda una lista de texto sin íconos (la sección activa lleva una regla fina a la izquierda y negritas, y los conteos van en insignias grises, por ejemplo entregas por revisar); al centro el contenido; a la derecha una columna de unos 260 px con enlaces rápidos, Por hacer, Próximas fechas y Actividad reciente.
- Inicio del grupo: tarjeta sólida con "Programa · periodo", la clave del grupo y una línea; debajo, botones de lo esencial y el resumen de estado.
- Tablero: vista de tarjetas (por omisión) y vista de agenda por fecha, con un interruptor.

### 11.8 Cuenta de Alumno

Decisión del 23 de noviembre de 2026 (Marcos): el alumno tiene cuenta. Esto reabre la exclusión de G2 "Portal para alumnos" solo en esta forma; las demás exclusiones siguen igual.

- Rol del sistema `alumno`. La cuenta se liga a un alumno con `usuario.alumno_id` (único). Solo Coordinación la crea: "Invitar al alumno" desde Personas o Historial, con el correo del alumno (`alumno.correo`) y el mismo flujo de invitación de 10.6. Dirección solo consulta; nadie se registra solo.
- Ve, y el servidor lo hace cumplir con su `alumno_id`: su Tablero (tarjetas de sus grupos y materias del periodo, con la calificación aceptada y el resultado de su derecho a evaluación); su boleta e historial por periodo con sus pendientes; su calendario (fechas del periodo y del cierre de sus grupos, no las de entrega de los docentes); sus avisos (por ejemplo "se publicaron tus calificaciones de una materia", sin el valor) y su Cuenta.
- Solo ve calificaciones de entregas aceptadas vigentes: un borrador o una entrega enviada no existe para él.
- Nunca ve a otro alumno ni una lista, ni motivos ni evidencias, ni bitácora, ni correos, ni lotes ni el detalle interno de un cierre; de un docente solo el nombre.
- "Ver como" funciona sobre una cuenta de Alumno.
- Ninguna ruta de escritura sirve a esta cuenta salvo cambiar su contraseña, su tema, cerrar sus sesiones y marcar sus avisos, y las del aula (sección 12): entregar tareas, responder exámenes, publicar en foros y mandar mensajes.

## 12. Aula: plataforma de clases

Decisión del 23 de noviembre de 2026 (Marcos: "Integra absolutamente todo lo que propones"): además del control escolar, el sistema funciona como plataforma de clases al estilo de Canvas, con tareas, contenido del curso, mensajes, foros, calificación por actividades, rúbricas y exámenes en línea. También se deja listo para el uso diario: correo de verdad, respaldos automáticos y aviso de privacidad. Siguen fuera, por la exclusión de G2: asistencia completa, comunicaciones masivas (correos o anuncios a grupos completos), firma, conexión con la plataforma oficial y cualquier decisión académica automática.

### 12.1 El curso

- Un curso es una asignación (grupo, materia y docente). No se crea otra entidad: el aula cuelga de `asignacion_docente`.
- Quién entra: el docente de la asignación (todo lo de su curso), los alumnos con inscripción activa en el grupo (lo publicado), Coordinación (todo, de todos los cursos) y Dirección (todo, solo consulta). Auxiliar y Carga externa no entran al aula.
- Pestañas del curso: Inicio, Módulos, Tareas, Exámenes, Foros, Calificaciones y, para el docente, Lista y Derecho a evaluación (las que ya existen). El alumno ve Inicio, Módulos, Tareas, Exámenes, Foros y Calificaciones.
- La tarjeta del Tablero lleva al curso: al docente su asignación, al alumno cada una de sus materias.

### 12.2 Módulos y contenido

- El docente organiza el curso en módulos ordenados (por ejemplo "Unidad 1"). Cada módulo tiene elementos ordenados: página de texto, archivo, enlace externo, tarea, examen o foro.
- Cada módulo y elemento tiene "publicado" o "borrador". El alumno solo ve lo publicado.
- Nada se borra: un módulo o elemento se oculta o se archiva, y el cambio queda en bitácora.
- Tablas: `modulo` (asignacion_id, titulo, orden, publicado) y `elemento_modulo` (modulo_id, tipo, titulo, texto, archivo_id, url, actividad_id, orden, publicado).

### 12.3 Archivos

- Tabla `archivo` (nombre original, nombre interno al azar, tipo, tamaño, huella sha256, subido_por, fecha).
- Se guardan fuera de la carpeta pública (`ej-archivos/` un nivel arriba en el hosting; `seguridad/archivos/` en local). Nunca hay un enlace directo: se descargan por la API, que revisa el permiso en cada descarga, con `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff`.
- Máximo 10 MB por archivo. Tipos permitidos: PDF, Word, Excel, PowerPoint, texto, JPG y PNG. El servidor revisa extensión y contenido.
- Quién puede ver un archivo: el mismo que puede ver el elemento, la entrega o el mensaje que lo trae.

### 12.4 Tareas

- Una tarea es una `actividad` de tipo tarea: título, instrucciones, categoría, puntos, fecha de entrega, si acepta entregas tarde, rúbrica opcional y estado publicado.
- El alumno entrega texto, un archivo o los dos. Puede volver a entregar mientras no venza la fecha (o después, si la tarea acepta tarde, marcada "tarde"); cada envío es una versión nueva y la anterior se conserva (`entrega_tarea`).
- El docente califica con puntos y comentario, o con la rúbrica. Cada cambio de calificación es una fila nueva en `calificacion_actividad`; la vigente es la última.
- El alumno ve sus puntos y el comentario solo cuando el docente publica las calificaciones de esa actividad. Antes, para él la tarea dice "entregada".
- El alumno nunca ve las entregas de otro alumno.

### 12.5 Rúbricas

- El docente crea rúbricas en su curso: criterios con descripción y niveles (nombre y puntos).
- Al calificar con rúbrica el docente elige un nivel por criterio; los puntos se suman solos y se guarda el detalle por criterio.
- El alumno ve la rúbrica desde que la tarea se publica, y su detalle cuando se publican las calificaciones.

### 12.6 Exámenes en línea

- Un examen es una `actividad` de tipo examen con preguntas (`pregunta`): opción múltiple, verdadero o falso, o respuesta abierta, cada una con sus puntos.
- Se configura: disponible desde y hasta, tiempo límite en minutos e intentos permitidos (uno por omisión).
- El servidor controla el tiempo: el intento guarda la hora de inicio y no acepta respuestas después del límite; al vencer se envía con lo que haya.
- Las preguntas cerradas se califican solas; las abiertas las califica el docente. La respuesta correcta nunca viaja al navegador del alumno.
- Intentos en `intento_examen` (actividad, alumno, número, inicio, envío, respuestas, puntos automáticos, puntos finales). El puntaje pasa a `calificacion_actividad` y se publica igual que una tarea.

### 12.7 Calificación por actividades

- El docente define categorías con peso en su curso (por ejemplo Tareas 40 %, Examen 60 %). Los pesos deben sumar 100.
- Calificación calculada de 0 a 10: por categoría, el porcentaje de puntos obtenidos de las actividades calificadas; luego el promedio ponderado entre las categorías que ya tienen algo calificado (una categoría sin nada calificado no pesa todavía). Una actividad vencida sin entrega cuenta como cero; una entregada sin calificar no cuenta.
- La calculada es una ayuda, no una decisión: en su entrega de calificaciones en borrador el docente tiene "Usar calificación calculada", que llena los valores; él los revisa, puede cambiarlos y envía como siempre. El flujo de entrega, aceptación y cierre no cambia (RN-04 a RN-06).
- El alumno ve su calculada al momento, con la leyenda "calculada con lo publicado, no es la calificación oficial". La oficial es la aceptada por Coordinación.

### 12.8 Mensajes

- Conversaciones de una persona a otra dentro del sistema, con texto y un archivo opcional. No sale ningún correo; el destinatario recibe un aviso "Tienes un mensaje nuevo" sin el texto.
- Quién escribe a quién: docente con los alumnos de sus cursos y con Coordinación; alumno con los docentes de sus cursos y con Coordinación; Coordinación y Dirección con cualquier cuenta activa. Alumno con alumno no.
- Un mensaje va a una sola persona. No hay envío a grupos completos (exclusión de comunicaciones masivas).
- Nada se borra. Coordinación puede consultar una conversación solo si alguien la reporta; el reporte y la consulta quedan en bitácora.
- Solo se escribe a cuentas que pueden leer mensajes (Auxiliar y Carga externa no). Dentro de una conversación ya abierta se puede responder aunque la regla de arriba no permita iniciarla en ese sentido (por ejemplo, un docente que responde a Dirección). Dirección no adjunta archivos. En "Ver como" los mensajes no se abren: son privados de cada persona.

### 12.9 Foros

- Un foro es una `actividad` de tipo foro dentro del curso, calificable o no. Participan el docente, los alumnos inscritos y Coordinación.
- Publicaciones con respuesta en hilo (`publicacion_foro`: actividad, autor, texto, responde_a, fecha). No se editan ni se borran.
- El docente del curso o Coordinación pueden ocultar una publicación con motivo; queda en bitácora y el autor ve "oculta por moderación".
- Una respuesta a tu publicación genera un aviso.

### 12.10 Avisos, calendario y Por hacer

- Un aviso dentro del sistema que dispara una acción del curso (por ejemplo publicar una tarea) no es una comunicación masiva: no sale por correo ni es un anuncio libre. Siguen excluidos los correos y los anuncios a grupos completos.
- Avisos nuevos: tarea o examen publicado (alumnos del curso), entrega recibida (docente), calificaciones publicadas (alumno, sin el valor), mensaje nuevo, respuesta en foro.
- El calendario agrega las fechas de entrega de tareas y la ventana de cada examen, para el docente y los alumnos del curso.
- Por hacer: el alumno ve tareas por entregar y exámenes abiertos; el docente, entregas por calificar.

### 12.11 Uso diario

- Correo: el envío por Resend ya existe (10.6). Para que salga de verdad falta la llave de Resend y un remitente verificado; mientras no estén, la pantalla sigue mostrando el enlace.
- Respaldos automáticos: una tarea diaria del hosting corre `scripts/respaldo-diario.php`, que guarda la base comprimida fuera de la carpeta pública (`ej-respaldos/`) y conserva los últimos 14 días. Corre solo por línea de comandos y vive en `api/` con el acceso por web negado. Coordinación ve en Administración la fecha y el tamaño del último respaldo, sin descargarlo.
- Aviso de privacidad: página pública `/privacidad` y enlace en la pantalla de entrada. Es un borrador para que lo revise la Escuela: los datos del responsable dicen "Sin información todavía" hasta que la Escuela los dé.
- Dominio propio: lo decide la Escuela; el sistema funciona igual en cualquier dominio.

### 12.12 Permisos del aula

| Entidad | Coordinación | Docente | Dirección | Carga externa | Auxiliar | Alumno |
|---|---|---|---|---|---|---|
| modulo y elemento_modulo | V C M | V C M propios | V | · | · | V publicados de sus cursos |
| archivo | V C | V C de sus cursos | V | · | · | V de lo que puede ver; C en sus entregas y mensajes |
| actividad (tarea, examen, foro), categoria, rubrica | V C M | V C M propias | V | · | · | V publicadas de sus cursos |
| entrega_tarea | V | V de sus cursos | V | · | · | V C propias |
| calificacion_actividad | V M | V C M de sus cursos | V | · | · | V propias publicadas |
| intento_examen | V | V M (abiertas) de sus cursos | V | · | · | V C propios |
| mensaje | V C (y reportados) | V C propios | V C propios | · | · | V C propios |
| publicacion_foro | V C M (ocultar) | V C M (ocultar) de sus cursos | V | · | · | V C en sus cursos |

"Ver como" sigue siendo solo lectura también en el aula: ninguna escritura del aula funciona en esa vista. Un rol personalizado no obtiene en el aula más que su rol base.

Esto cambia la última regla de 11.8: el alumno ahora también escribe para entregar tareas, responder exámenes, publicar en foros y mandar mensajes, siempre solo a su nombre.

### 12.13 Criterios de aceptación del aula

| CA | Cuenta A hace | Cuenta B comprueba | Resultado esperado |
|---|---|---|---|
| CA-32 | Docente A crea un módulo con una página en borrador y otra publicada | Alumno abre Módulos | Solo ve la publicada; pedir la de borrador por API responde 404 |
| CA-33 | Docente A sube un PDF a un módulo publicado | Alumno lo descarga; Docente B y Auxiliar lo piden por API | El alumno lo recibe como descarga; los otros dos reciben 403; un archivo .php o de más de 10 MB responde 422 |
| CA-34 | Alumno entrega una tarea con archivo y vuelve a entregar | Docente A abre la tarea | Ve las dos versiones y califica la última; el alumno ve "entregada" sin puntos hasta que se publica |
| CA-35 | Otro alumno pide la entrega del primero por API | Revisión | 403 |
| CA-36 | Docente A califica con rúbrica y publica | Alumno abre Calificaciones | Ve puntos, nivel por criterio y comentario; Bitácora guarda quién calificó |
| CA-37 | Alumno inicia un examen de 1 minuto y responde después del límite | Revisión del intento | Las respuestas tardías se rechazan; el intento se cierra con lo guardado; la respuesta correcta nunca aparece en lo que recibe el alumno |
| CA-38 | Docente A define categorías que no suman 100 | Revisión | 422; con 100 se guarda y la calculada aparece |
| CA-39 | Docente A usa "Usar calificación calculada" en su entrega en borrador y envía | Coordinación abre Revisión | La entrega lleva los valores calculados como versión normal; el historial no cambia hasta que Coordinación acepta |
| CA-40 | Alumno manda un mensaje a Docente A y otro a un alumno | Docente A abre Mensajes y Avisos | Recibe el mensaje y un aviso sin el texto; el mensaje a otro alumno responde 403 |
| CA-41 | Docente A intenta mandar un mensaje a un alumno de POS-02 | Revisión | 403 |
| CA-42 | Alumno publica en el foro; Docente A oculta la publicación con motivo | Otro alumno abre el foro; Coordinación abre Bitácora | Ve "oculta por moderación"; la bitácora muestra quién ocultó y por qué |
| CA-43 | Auxiliar y Carga externa piden módulos, tareas o foros por API | Revisión | 403 |
| CA-44 | Dirección intenta crear un módulo o calificar | Revisión | 403; puede consultar todo y mandar un mensaje |
| CA-46 | Coordinación en "Ver como" Alumno intenta entregar una tarea y publicar en el foro; la cuenta de Alumno intenta crear un módulo o calificar | Revisión | Las cuatro peticiones responden 403 y nada cambia |
| CA-45 | Sin sesión se piden un archivo, un mensaje y un foro | Revisión | 401 sin datos |
