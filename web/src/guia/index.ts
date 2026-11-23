import type { Guia } from './tipos'

const GUIAS: Record<string, Guia> = {
  '/catalogos': {
    titulo: 'Cómo se usan los Catálogos',
    queEs:
      'Lo que ordena el trabajo del periodo: periodos, materias, grupos y quién da cada materia.',
    pasos: [
      'Elige la pestaña: Periodos, Materias, Grupos o Asignaciones.',
      'Pulsa el botón "nuevo" de la pestaña y llena el formulario. Los grupos llevan una fecha de cierre prevista, que sale en el calendario.',
      'En Asignaciones, elige grupo, materia y docente, y si quieres la fecha límite de entrega. Solo salen docentes con cuenta activa.',
      'Para cambiar al docente de una asignación, pulsa "Cambiar docente" y escribe el motivo.',
    ],
    despues:
      'Cada alta o cambio queda en la bitácora. El docente nuevo ve su asignación y la lista del grupo en cuanto la creas.',
    tropiezos: [
      'Una materia solo puede tener un docente por grupo.',
      'Cerrar un periodo no borra nada: solo deja de aceptar capturas.',
      'Los datos de un alumno se corrigen en su historial, con motivo.',
    ],
    siguiente: { etiqueta: 'Grupos', ruta: '/grupos' },
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
    titulo: 'Cómo se usa el Tablero',
    queEs:
      'Tu página de entrada. Muestra una tarjeta por cada grupo o materia que te toca, lo que tienes por hacer y lo último que pasó.',
    pasos: [
      'Elige el periodo arriba si quieres ver otro.',
      'Toca una tarjeta para entrar al grupo o a la materia.',
      'Mira la columna Por hacer: cada línea te lleva a donde se resuelve.',
      'Cambia a Agenda para ver tus fechas por día.',
    ],
    despues:
      'Cuando algo cambia, el aviso llega a la campana de la barra izquierda y Por hacer se actualiza.',
    tropiezos: [
      'Solo ves lo que te corresponde por tu rol.',
      'Si Por hacer está vacío, no tienes nada pendiente.',
    ],
    siguiente: { etiqueta: 'Calendario', ruta: '/calendario' },
  },
  '/grupos': {
    titulo: 'Cómo se usan los Grupos',
    queEs:
      'Cada grupo tiene su propia página con lista, materias, calificaciones, derecho a evaluación y cierre.',
    pasos: [
      'Elige el periodo.',
      'Toca el grupo para abrirlo.',
      'Dentro, usa el menú de la izquierda para pasar de una sección a otra.',
    ],
    despues: 'Docentes y auxiliares ven en su sección la misma lista que tú, sin recapturar nada.',
    tropiezos: [
      'La lista de un periodo cerrado solo se consulta.',
      'Si no ves un grupo, la Coordinación todavía no te lo asignó.',
    ],
    siguiente: { etiqueta: 'Calendario', ruta: '/calendario' },
  },
  '/grupos/inicio': {
    titulo: 'Cómo se lee el Inicio del grupo',
    queEs:
      'El resumen del grupo: cuántos alumnos hay, cómo van las entregas, qué decisiones esperan a Dirección y cómo va el cierre.',
    pasos: [
      'Usa los botones de Lo esencial para ir a cada sección.',
      'A la derecha están los pendientes, las próximas fechas y lo último que pasó.',
    ],
    despues:
      'Los números se actualizan solos cuando alguien acepta una entrega o cambia una decisión.',
    tropiezos: [
      'Una materia sin entrega cuenta como Sin entrega hasta que el docente abre su captura.',
    ],
  },
  '/grupos/personas': {
    titulo: 'Cómo se usa Personas',
    queEs:
      'La lista vigente del grupo, sus docentes y sus auxiliares. Es la única lista: nadie la vuelve a capturar.',
    pasos: [
      'Pulsa "Agregar alumno" y elige uno que ya existe o captura uno nuevo.',
      'Para quitarlo, pulsa "Dar de baja" en su fila y escribe la observación.',
      'Para cargar muchos de golpe, pulsa "Importar lista" y elige un archivo CSV con matrícula y nombre.',
      'Para que un alumno consulte su boleta, pulsa "Invitar al alumno" y escribe su correo.',
      'Pulsa "Imprimir lista" si la necesitas en papel.',
    ],
    despues:
      'Cada alta o baja queda en la bitácora y aparece enseguida en la pantalla de docentes y auxiliares.',
    tropiezos: [
      'Un alumno no puede estar dos veces activo en el mismo grupo.',
      'Al importar, las filas repetidas o con matrícula vacía se rechazan y el resumen dice por qué.',
      'Solo Coordinación invita alumnos.',
    ],
    siguiente: { etiqueta: 'Materias del grupo', ruta: '/grupos' },
  },
  '/grupos/materias': {
    titulo: 'Cómo se usan las Materias del grupo',
    queEs:
      'Cada materia con su docente, su fecha límite de entrega y el estado de su entrega de calificaciones.',
    pasos: [
      'Escribe la fecha límite de cada materia y pulsa Guardar.',
      'Abajo puedes poner la fecha de cierre prevista del grupo.',
    ],
    despues:
      'Las fechas salen en el calendario y el docente recibe un aviso cuando faltan tres días.',
    tropiezos: ['Si el periodo o el grupo están cerrados, las fechas solo se consultan.'],
  },
  '/grupos/calificaciones': {
    titulo: 'Cómo se lee la sábana de calificaciones',
    queEs:
      'Una fila por alumno y una columna por materia, con la calificación de la entrega aceptada vigente y los pendientes abiertos.',
    pasos: [
      'Busca al alumno en la fila.',
      'Pulsa "Descargar CSV" si quieres la tabla en una hoja de cálculo.',
    ],
    despues: 'Cuando se acepta una entrega, sus calificaciones aparecen aquí.',
    tropiezos: ['Una materia con "Sin entrega" todavía no tiene una entrega aceptada.'],
    siguiente: { etiqueta: 'Revisión de calificaciones', ruta: '/revision' },
  },
  '/grupos/derecho': {
    titulo: 'Cómo se usa Derecho a evaluación',
    queEs:
      'Aquí se registra, por alumno y materia, si el alumno tiene derecho a ser evaluado. La decisión la toma una persona; el sistema la guarda con responsable, fecha y motivo.',
    pasos: [
      'Elige la materia.',
      'Pulsa "Registrar decisión" en la fila del alumno.',
      'Elige el resultado y escribe el motivo. Si hay un justificante, anota dónde está.',
    ],
    despues:
      'Un alumno sin derecho aparece bloqueado en la captura del docente. Los casos que requieren autorización llegan a Dirección.',
    tropiezos: [
      'La decisión nueva sustituye a la anterior como vigente, pero la anterior se conserva.',
      'Dirección solo consulta aquí; resuelve en Autorizaciones.',
    ],
  },
  '/grupos/cierre': {
    titulo: 'Cómo se usa el Cierre y lote',
    queEs: 'Del grupo con todas sus entregas aceptadas al lote que recibe Carga externa.',
    pasos: [
      'Pulsa "Preparar cierre" y marca si requiere a Dirección.',
      'Aprueba el cierre o envíalo a Dirección.',
      'Pulsa "Generar boletas y lote" y descarga el CSV.',
    ],
    despues:
      'Carga externa recibe el lote, lo carga en la plataforma oficial (fuera del sistema) y registra el resultado. Tú ves el traspaso aquí.',
    tropiezos: [
      'Sin todas las entregas aceptadas solo puedes preparar el cierre con una excepción y su motivo.',
      'Un cierre aprobado no se edita: se prepara una versión nueva con motivo.',
      'Las boletas salen pendientes de firma institucional. El sistema no firma.',
    ],
    siguiente: { etiqueta: 'Métricas', ruta: '/metricas' },
  },
  '/calendario': {
    titulo: 'Cómo se usa el Calendario',
    queEs:
      'Las fechas del periodo, las fechas límite de entrega y los cierres de tus grupos. No hay nada que capturar aquí: todo sale de los datos.',
    pasos: [
      'Elige Mes o Lista arriba.',
      'Filtra por grupo si solo quieres uno.',
      'Toca un evento para ir a donde se resuelve.',
    ],
    despues: 'Si cambias una fecha en Materias o en Catálogos, el calendario la refleja enseguida.',
    tropiezos: ['Solo ves los eventos de tus grupos o materias.'],
  },
  '/avisos': {
    titulo: 'Cómo se usan los Avisos',
    queEs:
      'Lo que pasó y te toca atender: una entrega devuelta, algo por revisar, una autorización, un lote, una fecha que se acerca.',
    pasos: [
      'Toca un aviso para ir a su pantalla; se marca como leído.',
      'Pulsa "Marcar todos como leídos" para limpiar la lista.',
    ],
    despues: 'Los avisos no se borran. Los de más de 90 días dejan de mostrarse.',
    tropiezos: [
      'Un aviso nunca trae calificaciones ni motivos: solo te dice qué pasó y a dónde ir.',
    ],
  },
  '/cuenta': {
    titulo: 'Cómo se usa tu Cuenta',
    queEs: 'Tus datos, tu contraseña, el tema claro u oscuro y las sesiones que tienes abiertas.',
    pasos: [
      'Cambia tu contraseña con el botón de la sección Contraseña y pantalla.',
      'Elige el tema que prefieras.',
      'Cierra las sesiones que no reconozcas.',
    ],
    despues: 'El tema se recuerda en tu cuenta.',
    tropiezos: ['El correo y el rol los cambia la Coordinación de Posgrados.'],
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
    siguiente: { etiqueta: 'Grupos', ruta: '/grupos' },
  },
  '/historial': {
    titulo: 'Cómo se usa el Historial del alumno',
    queEs: 'La boleta de un alumno por periodo, con sus pendientes abiertos y resueltos.',
    pasos: [
      'Busca por nombre o matrícula.',
      'Toca al alumno.',
      'Revisa sus periodos y pendientes. Resuelve o agrega un pendiente si hace falta.',
    ],
    despues: 'Solo cuenta la versión aceptada vigente de cada entrega.',
    tropiezos: ['Si falta una materia, su entrega todavía no está aceptada.'],
  },
  '/historial/alumno': {
    titulo: 'Cómo se lee tu boleta',
    queEs: 'Tus calificaciones por periodo y tus pendientes.',
    pasos: [
      'Mira cada periodo: materia, calificación y estatus.',
      'Revisa abajo si tienes pendientes.',
    ],
    despues:
      'Cuando se acepta la entrega de una materia, te llega un aviso y la calificación aparece aquí.',
    tropiezos: ['Las calificaciones que todavía no se aceptan no se muestran.'],
  },
  '/metricas': {
    titulo: 'Cómo se usan las Métricas',
    queEs:
      'Campos recapturados y minutos activos por caso, junto a los casos medidos fuera del sistema (línea base).',
    pasos: [
      'Trabaja normal en la lista y el cierre de un grupo: el tiempo se mide solo.',
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
    titulo: 'Cómo se usan Mis grupos y materias',
    queEs: 'Tus materias del periodo y el estado de tu entrega de calificaciones.',
    pasos: [
      'Abre una materia.',
      'Captura las calificaciones, de 0 a 10 con un decimal.',
      'Guarda el borrador o envía.',
    ],
    despues:
      'Al enviar, tu entrega queda con versión, fecha y responsable y ya no se edita. Coordinación la acepta o te la devuelve con un motivo.',
    tropiezos: [
      'Los alumnos sin derecho a evaluación aparecen bloqueados. Ves el resultado, no el motivo.',
      'Si te devuelven la entrega, trabajas sobre una versión nueva.',
    ],
  },
  '/asignaciones/lista': {
    titulo: 'Cómo se usa la Lista de tu materia',
    queEs: 'Los alumnos del grupo. Es la misma lista que ve Coordinación.',
    pasos: ['Revisa que estén todos.', 'Pulsa "Imprimir lista" si la necesitas en papel.'],
    despues: 'Si hay altas o bajas, la lista se actualiza sola.',
    tropiezos: ['Si falta alguien, avisa a Coordinación: tú no das altas.'],
  },
  '/asignaciones/calificaciones': {
    titulo: 'Cómo se captura una entrega',
    queEs: 'Un campo de calificación por alumno.',
    pasos: [
      'Escribe cada calificación de 0 a 10 con un decimal.',
      'Pulsa "Guardar borrador" para seguir después.',
      'Pulsa "Enviar calificaciones" cuando estén todas.',
    ],
    despues:
      'Coordinación recibe la entrega. Si la devuelve, aquí ves su motivo y una versión nueva.',
    tropiezos: ['No se envía con calificaciones faltantes.', 'Una entrega enviada no se edita.'],
  },
  '/asignaciones/derecho': {
    titulo: 'Cómo se lee el Derecho a evaluación',
    queEs: 'El resultado de cada alumno en tu materia, para que sepas a quién no calificar.',
    pasos: ['Revisa el resultado de cada alumno.'],
    despues: 'Un alumno sin derecho aparece bloqueado en la captura.',
    tropiezos: ['El motivo de cada decisión es de Coordinación y Dirección: tú no lo ves.'],
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
}

/** Guía de una ruta; `null` si la pantalla no tiene guía propia. */
export function guiaDeRuta(pathname: string, base?: string): Guia | null {
  const grupo = /^\/grupos\/\d+(?:\/([a-z]+))?$/.exec(pathname)
  if (grupo) return GUIAS[`/grupos/${grupo[1] ?? 'inicio'}`] ?? GUIAS['/grupos'] ?? null
  const materia = /^\/asignaciones\/\d+(?:\/([a-z]+))?$/.exec(pathname)
  if (materia) return GUIAS[`/asignaciones/${materia[1] ?? 'calificaciones'}`] ?? null
  if (pathname === '/historial' && base === 'alumno') return GUIAS['/historial/alumno'] ?? null
  return GUIAS[pathname] ?? null
}

export type { Guia }
