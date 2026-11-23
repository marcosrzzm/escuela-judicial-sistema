import type { Guia } from './tipos'

const GUIAS: Record<string, Guia> = {
  '/catalogos': {
    titulo: 'Cómo se usan los Catálogos',
    queEs:
      'Lo que ordena el trabajo del periodo: periodos, materias, grupos y quién da cada materia.',
    pasos: [
      'Elige la pestaña: Periodos, Materias, Grupos o Asignaciones.',
      'Pulsa el botón "nuevo" de la pestaña y llena el formulario.',
      'En Asignaciones, elige grupo, materia y docente. Solo salen docentes con cuenta activa.',
      'Para cambiar al docente de una asignación, pulsa "Cambiar docente" y escribe el motivo.',
    ],
    despues:
      'Cada alta o cambio queda en la bitácora. El docente nuevo ve su asignación y la lista del grupo en cuanto la creas.',
    tropiezos: [
      'Una materia solo puede tener un docente por grupo.',
      'Cerrar un periodo no borra nada: solo deja de aceptar capturas.',
      'Los datos de un alumno se corrigen en Historial del alumno, con motivo.',
    ],
    siguiente: { etiqueta: 'Grupos y listas', ruta: '/grupos' },
  },
  '/usuarios': {
    titulo: 'Cómo se usa Usuarios y roles',
    queEs: 'Quién entra al sistema y qué puede hacer cada cuenta.',
    pasos: [
      'En la pestaña Usuarios, pulsa "Cuenta nueva" y escribe nombre, correo y rol.',
      'Deja marcada la invitación por correo: la persona crea su propia contraseña con el enlace. Si prefieres darle una temporal, desmarca la casilla y anótala, porque se muestra una sola vez.',
      'Para dar de baja a alguien, pulsa "Editar" y cambia el estado a Inactivo.',
      'Si alguien pidió restablecer su contraseña, su solicitud sale arriba de la lista. Pulsa "Autorizar y enviar enlace" o "Rechazar" con un motivo.',
      'Para mandar un enlace sin que lo hayan pedido, pulsa "Enviar enlace" en su fila. Si aún no creó su contraseña, el botón dice "Reenviar invitación".',
      'Si el correo no llega, "Contraseña" genera una temporal.',
      'Para ver lo que ve otra persona, pulsa "Ver como". Es solo lectura; sales con "Salir de la vista".',
      'En la pestaña Roles, crea un rol propio: elige un rol base y marca los permisos.',
    ],
    despues:
      'Cambiar el rol, inactivar o restablecer la contraseña cierra las sesiones abiertas de esa cuenta.',
    tropiezos: [
      'La última cuenta activa de Coordinación no se puede inactivar ni cambiar de rol.',
      'Un rol propio nunca puede administrar usuarios ni roles.',
      'Un rol con cuentas activas no se puede inactivar: primero cámbiales el rol.',
      'Cada enlace sirve una vez. La invitación dura 72 horas y el restablecimiento, 24.',
    ],
    siguiente: { etiqueta: 'Catálogos', ruta: '/catalogos' },
  },
  '/mi-clave': {
    titulo: 'Cómo se usa Mi contraseña',
    queEs: 'Cambia la contraseña de tu cuenta.',
    pasos: [
      'Escribe tu contraseña actual (o la temporal que te dieron).',
      'Escribe la nueva, de al menos 10 caracteres y distinta de tu correo.',
      'Repítela y pulsa "Cambiar contraseña".',
    ],
    despues: 'Entras directo a tu primera pantalla. Tus otras sesiones abiertas se cierran.',
    tropiezos: ['Mientras la contraseña sea temporal, el sistema no deja abrir otra pantalla.'],
  },
  '/': {
    titulo: 'Cómo se usa Inicio',
    queEs:
      'Lo que espera tu atención: entregas por revisar, decisiones en Dirección, grupos listos para cierre, lotes con discrepancias y solicitudes de contraseña.',
    pasos: [
      'Mira los contadores.',
      'Toca el que tenga un número mayor a cero: te lleva directo a su pantalla.',
    ],
    despues:
      'Desde Inicio no se captura nada; cada contador abre la pantalla donde sí se resuelve.',
    tropiezos: ['Los contadores no se actualizan solos: recarga si trabajaste en otra pestaña.'],
    siguiente: { etiqueta: 'Revisión de calificaciones', ruta: '/revision' },
  },
  '/grupos': {
    titulo: 'Cómo se usa Grupos y listas',
    queEs:
      'La lista vigente de cada grupo. Es la única lista: docentes y auxiliares ven esta misma, sin recapturar nombres.',
    pasos: [
      'Elige periodo y grupo.',
      'Para sumar a un alumno, pulsa "Agregar alumno" y elige uno existente o captura uno nuevo.',
      'Para quitarlo, pulsa "Dar de baja" en su fila y escribe la observación.',
      'Para cargar muchos de golpe, pulsa "Importar lista" y elige un archivo CSV con matrícula y nombre.',
      'Pulsa "Imprimir lista" si la necesitas en papel.',
    ],
    despues:
      'Cada alta o baja queda en la bitácora y se refleja de inmediato en las pantallas de docentes y auxiliares.',
    tropiezos: [
      'Un alumno no puede estar dos veces activo en el mismo grupo.',
      'La lista de un periodo cerrado solo se consulta.',
      'Al importar, las filas repetidas o con matrícula vacía se rechazan y el resumen dice por qué; las demás sí entran.',
    ],
    siguiente: { etiqueta: 'Derecho a evaluación', ruta: '/derecho' },
  },
  '/derecho': {
    titulo: 'Cómo se usa Derecho a evaluación',
    queEs:
      'Registra, por alumno y materia, si el alumno tiene derecho a ser evaluado. La decisión la toma una persona; el sistema la guarda con responsable, fecha y motivo.',
    pasos: [
      'Elige la asignación (grupo y materia).',
      'Pulsa "Registrar decisión" en la fila del alumno.',
      'Elige el resultado y escribe el motivo; si hay un justificante, anota dónde está.',
    ],
    despues:
      'Un alumno "sin derecho" aparece bloqueado en la captura del docente. Los casos "requiere autorización" llegan a Dirección.',
    tropiezos: [
      'Cada decisión nueva sustituye a la anterior como vigente, pero la anterior se conserva en el historial.',
    ],
    siguiente: { etiqueta: 'Revisión de calificaciones', ruta: '/revision' },
  },
  '/revision': {
    titulo: 'Cómo se usa Revisión de calificaciones',
    queEs: 'Cada fila es una asignación con la entrega vigente del docente.',
    pasos: [
      'Toca una fila para ver las calificaciones.',
      'Pulsa "Aceptar", o "Devolver" y escribe el motivo.',
      'Si el docente no puede usar el sistema, usa "Capturar por el docente".',
    ],
    despues:
      'Al aceptar, las calificaciones pasan al historial y se abren o resuelven los pendientes. Al devolver, el docente recibe una versión nueva con tu motivo.',
    tropiezos: [
      'Una entrega aceptada se corrige con "Reabrir" y un motivo, nunca editándola.',
      'No se reabre si el grupo ya tiene un cierre aprobado.',
      'La captura excepcional cuenta como recaptura en Métricas.',
    ],
    siguiente: { etiqueta: 'Cierre y lote', ruta: '/cierre' },
  },
  '/historial': {
    titulo: 'Cómo se usa Historial del alumno',
    queEs: 'Todo lo aceptado de un alumno, por periodo, y sus pendientes, en una sola pantalla.',
    pasos: [
      'Busca por nombre o matrícula.',
      'Toca al alumno.',
      'Revisa sus periodos y pendientes; resuelve o agrega un pendiente si hace falta.',
    ],
    despues: 'Solo cuenta la versión aceptada vigente de cada entrega.',
    tropiezos: ['Si un alumno no muestra una materia, su entrega todavía no está aceptada.'],
  },
  '/cierre': {
    titulo: 'Cómo se usa Cierre y lote',
    queEs: 'Del grupo con todas sus entregas aceptadas al lote que recibe Carga externa.',
    pasos: [
      'Elige el grupo.',
      'Pulsa "Preparar cierre"; marca si requiere a Dirección.',
      'Aprueba el cierre (o envíalo a Dirección).',
      'Pulsa "Generar boletas y lote" y descarga el CSV.',
    ],
    despues:
      'Carga externa ve el lote, lo recibe, lo carga en la plataforma oficial (fuera del sistema) y registra el resultado; tú ves el traspaso aquí.',
    tropiezos: [
      'Sin todas las entregas aceptadas solo puedes preparar el cierre con una excepción y su motivo.',
      'Un cierre aprobado no se edita: se prepara una versión nueva con motivo.',
      'Las boletas salen "pendientes de firma institucional": el sistema no firma.',
    ],
    siguiente: { etiqueta: 'Métricas', ruta: '/metricas' },
  },
  '/metricas': {
    titulo: 'Cómo se usan las Métricas',
    queEs:
      'Campos recapturados y minutos activos por caso, junto a los casos medidos fuera del sistema (línea base).',
    pasos: [
      'Trabaja normalmente en Grupos y listas y en Cierre y lote: el tiempo se mide solo.',
      'Registra casos de línea base con "Registrar línea base".',
      'Compara los promedios arriba.',
    ],
    despues: 'Con más casos, la comparación entre sistema y línea base se vuelve más confiable.',
    tropiezos: [
      'El tiempo sin actividad de más de 2 minutos no cuenta.',
      'Solo cuenta mientras la pestaña está visible.',
    ],
  },
  '/bitacora': {
    titulo: 'Cómo se usa la Bitácora',
    queEs: 'Quién hizo qué, cuándo y por qué, con los valores antes y después.',
    pasos: [
      'Busca por usuario o motivo, o filtra por entidad.',
      'Toca un movimiento para ver el antes y el después.',
    ],
    despues: 'La bitácora solo crece: nadie la edita ni la borra.',
    tropiezos: ['Los accesos denegados también aparecen, como "acceso denegado".'],
  },
  '/asignaciones': {
    titulo: 'Cómo se usan Mis asignaciones',
    queEs: 'Tus materias del periodo y el estado de tu entrega de calificaciones.',
    pasos: [
      'Abre una asignación.',
      'Captura las calificaciones (0 a 10, un decimal).',
      'Guarda el borrador, o envía.',
    ],
    despues:
      'Al enviar, tu entrega queda con versión, fecha y responsable y ya no se edita. Coordinación la acepta o te la devuelve con un motivo.',
    tropiezos: [
      'Los alumnos sin derecho a evaluación aparecen bloqueados.',
      'Si te devuelven la entrega, trabajas sobre una versión nueva.',
    ],
  },
  '/asignaciones/detalle': {
    titulo: 'Cómo se captura una entrega',
    queEs:
      'La lista del grupo con un campo de calificación por alumno. La lista es la misma que ve Coordinación.',
    pasos: [
      'Escribe cada calificación de 0 a 10 con un decimal.',
      'Pulsa "Guardar borrador" para seguir después.',
      'Pulsa "Enviar calificaciones" cuando estén todas.',
    ],
    despues:
      'Coordinación recibe la entrega. Si la devuelve, aquí verás su motivo y una versión nueva.',
    tropiezos: ['No se envía con calificaciones faltantes.', 'Una entrega enviada no se edita.'],
    siguiente: { etiqueta: 'Mis asignaciones', ruta: '/asignaciones' },
  },
  '/autorizaciones': {
    titulo: 'Cómo se usan las Autorizaciones',
    queEs: 'Decisiones y cierres que Coordinación marcó como que requieren tu resolución.',
    pasos: [
      'Revisa el caso y el motivo de Coordinación.',
      'Pulsa Autorizar o Rechazar (cierres: Aprobar o Devolver).',
      'Escribe tu motivo.',
    ],
    despues: 'Coordinación ve tu resolución; queda en la bitácora.',
    tropiezos: ['Al devolver un cierre el motivo es obligatorio.'],
  },
  '/lotes': {
    titulo: 'Cómo se usan los Lotes recibidos',
    queEs: 'Los lotes de cierres aprobados que debes cargar en la plataforma oficial.',
    pasos: [
      'Pulsa "Registrar recepción" cuando recibas un lote.',
      'Descarga el CSV y cárgalo en la plataforma, fuera de este sistema.',
      'Pulsa "Registrar carga"; si algo no coincide, marca la discrepancia y descríbela.',
    ],
    despues: 'Coordinación ve el traspaso y las discrepancias.',
    tropiezos: [
      'Aquí no se edita nada académico ni el cierre.',
      'La recepción y la carga se registran una sola vez.',
    ],
  },
  '/listas': {
    titulo: 'Cómo se usan Mis listas',
    queEs: 'La lista vigente de tus grupos.',
    pasos: ['Elige el periodo y el grupo.', 'Pulsa "Imprimir lista" si la necesitas en papel.'],
    despues: 'La lista se actualiza sola cuando Coordinación da altas o bajas.',
    tropiezos: ['Solo ves los grupos que te asignaron.'],
  },
}

/** Guía de una ruta; `null` si la pantalla no tiene guía propia. */
export function guiaDeRuta(pathname: string): Guia | null {
  if (/^\/asignaciones\/\d+$/.test(pathname)) return GUIAS['/asignaciones/detalle']
  return GUIAS[pathname] ?? null
}

export type { Guia }
