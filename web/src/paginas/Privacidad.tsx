/** Aviso de privacidad (especificación, 12.11): página pública y BORRADOR para que lo revise la Escuela. */
import { Link } from 'react-router-dom'

const PENDIENTE = 'Sin información todavía'

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: 'Quién es responsable de tus datos',
    parrafos: [`Nombre o razón social del responsable: ${PENDIENTE}.`, `Domicilio del responsable: ${PENDIENTE}.`, `Correo o área de contacto para asuntos de privacidad: ${PENDIENTE}.`],
  },
  {
    titulo: 'Qué datos se guardan',
    parrafos: [
      'De los alumnos: nombre, matrícula, correo de la cuenta, grupo, calificaciones, decisiones de derecho a evaluación, pendientes académicos, tareas entregadas, intentos de examen, publicaciones en foros y mensajes.',
      'Del personal: nombre, correo de la cuenta, rol, y lo que hace dentro del sistema (por ejemplo, calificar o aceptar una entrega), que queda en una bitácora.',
      'Mientras no exista autorización escrita de la Escuela para usar datos reales, todo lo que muestra este sistema es ficticio.',
    ],
  },
  {
    titulo: 'Para qué se usan',
    parrafos: [
      'Para llevar la lista de cada grupo, capturar y revisar calificaciones, preparar los documentos y el lote de cierre, y operar el aula (contenido, tareas, exámenes, foros y mensajes).',
      'No se usan para publicidad ni se venden. No se toman decisiones académicas de forma automática: una persona decide.',
    ],
  },
  {
    titulo: 'Quién puede ver tus datos',
    parrafos: [
      'Cada alumno ve solo lo suyo. Cada docente ve lo de sus grupos y materias. Coordinación y Dirección ven los datos académicos para operar el control escolar. El área de carga externa solo ve los lotes aprobados.',
      'Una conversación de mensajes solo la ven sus dos participantes; Coordinación puede abrirla únicamente si una de las dos personas la reporta, y esa consulta queda registrada.',
    ],
  },
  {
    titulo: 'Cómo se protegen',
    parrafos: [
      'El acceso es con cuenta y contraseña, y cada petición se valida en el servidor según el rol. Los archivos subidos se guardan fuera de la carpeta pública y solo se descargan con permiso.',
      'Se hace una copia de seguridad diaria de la base y se conservan las de los últimos 14 días. Los cambios sensibles se registran en una bitácora que no se edita.',
    ],
  },
  {
    titulo: 'Cuánto tiempo se conservan',
    parrafos: ['En el sistema nada se borra: lo que sale de uso se archiva o se oculta, con su motivo.', `Plazos de conservación definidos por la Escuela: ${PENDIENTE}.`],
  },
  {
    titulo: 'Tus derechos y cómo ejercerlos',
    parrafos: [`Procedimiento para acceder, corregir u oponerte al uso de tus datos: ${PENDIENTE}.`],
  },
  {
    titulo: 'Cambios a este aviso',
    parrafos: [`Fecha de la versión vigente y forma de avisar cambios: ${PENDIENTE}.`],
  },
]

export function Privacidad() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 text-ink">
      <div role="note" className="rounded-lg border border-alerta bg-alerta-soft px-4 py-3 text-sm font-medium text-alerta">
        BORRADOR para revisión de la Escuela. Todavía no es un aviso vigente: faltan datos que solo la Escuela puede dar.
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold">Aviso de privacidad</h1>
        <p className="text-sm text-ink-3">Sistema de continuidad académica y aula de la Escuela Judicial del Supremo Tribunal de Justicia del Estado de Jalisco.</p>
      </header>
      {SECCIONES.map((s) => (
        <section key={s.titulo} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.titulo}</h2>
          {s.parrafos.map((p) => (
            <p key={p} className="text-sm leading-relaxed text-ink-2">{p}</p>
          ))}
        </section>
      ))}
      <p>
        <Link to="/entrar" className="text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          Volver a la pantalla de entrada
        </Link>
      </p>
    </main>
  )
}
