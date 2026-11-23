/** Tareas (12.4) y rúbricas (12.5): el docente las crea y califica; el alumno entrega, con versiones, y ve sus puntos al publicarse. */
import { Archive, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { actualizar, enviar } from '@/lib/api'
import {
  deCampoLocal, puntosLegibles, subirArchivo,
  type Actividad, type CalificacionVista, type Categoria, type ContextoCurso, type Criterio, type EntregasDeTarea, type ListaActividades, type Rubrica, type VersionEntrega,
} from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { Area, Casilla, CampoArchivo, EnlaceArchivo, Etiqueta, Lista, Tarjeta, Texto, Titulo, Vacio } from './ui'
import { useTarea } from './useTarea'

// --- Rúbrica ----------------------------------------------------------------------------------------------

const NIVELES_BASE = ['Excelente', 'Suficiente', 'Insuficiente']
const criterioNuevo = (): { descripcion: string; niveles: { nombre: string; puntos: string }[] } => ({ descripcion: '', niveles: NIVELES_BASE.map((nombre) => ({ nombre, puntos: '' })) })

export function TablaRubrica({ r }: { r: Pick<Rubrica, 'criterios' | 'maximo'> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">Rúbrica: criterios y niveles con sus puntos</caption>
        <tbody>
          {r.criterios.map((c, i) => (
            <tr key={i} className="border-t border-line first:border-t-0">
              <th scope="row" className="w-1/4 bg-paper-2 px-3 py-2 text-left align-top font-medium text-ink">{c.descripcion}</th>
              {c.niveles.map((n, j) => (
                <td key={j} className="px-3 py-2 align-top text-ink-2">
                  <span className="block font-medium text-ink">{n.nombre}</span>
                  <span className="num text-xs text-ink-3">{puntosLegibles(n.puntos)} pts</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-paper-2 px-3 py-1.5 text-right text-xs text-ink-3">Total posible: <span className="num font-semibold text-ink">{puntosLegibles(r.maximo)}</span> puntos</p>
    </div>
  )
}

function FormRubrica({ cursoId, alCerrar }: { cursoId: number; alCerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [criterios, setCriterios] = useState([criterioNuevo()])
  const t = useTarea()
  const cambiar = (i: number, f: (c: ReturnType<typeof criterioNuevo>) => ReturnType<typeof criterioNuevo>) => setCriterios((p) => p.map((c, k) => (k === i ? f(c) : c)))
  async function guardar() {
    const cuerpo = { nombre, criterios: criterios.map((c) => ({ descripcion: c.descripcion, niveles: c.niveles.map((n) => ({ nombre: n.nombre, puntos: n.puntos })) })) }
    if (await t.correr(async () => { const r = await enviar(`/cursos/${cursoId}/rubricas`, cuerpo); return r.ok ? { ok: true } : r }, `Rúbrica "${nombre}" creada`)) alCerrar()
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-paper-2 p-3">
      <h4 className="text-sm font-semibold text-ink">Nueva rúbrica</h4>
      <Texto etiqueta="Nombre de la rúbrica" valor={nombre} alCambiar={setNombre} max={120} />
      {criterios.map((c, i) => (
        <fieldset key={i} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3">
          <legend className="px-1 text-xs font-semibold text-ink-3">Criterio {i + 1}</legend>
          <Texto etiqueta="Qué se evalúa" valor={c.descripcion} alCambiar={(v) => cambiar(i, (x) => ({ ...x, descripcion: v }))} max={300} />
          <div className="grid gap-2 sm:grid-cols-3">
            {c.niveles.map((n, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Texto etiqueta={`Nivel ${j + 1}`} valor={n.nombre} alCambiar={(v) => cambiar(i, (x) => ({ ...x, niveles: x.niveles.map((y, k) => (k === j ? { ...y, nombre: v } : y)) }))} max={80} />
                <Texto etiqueta="Puntos" tipo="number" valor={n.puntos} alCambiar={(v) => cambiar(i, (x) => ({ ...x, niveles: x.niveles.map((y, k) => (k === j ? { ...y, puntos: v } : y)) }))} />
              </div>
            ))}
          </div>
          {criterios.length > 1 ? (
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setCriterios((p) => p.filter((_, k) => k !== i))}>
              <Trash2 strokeWidth={2.4} aria-hidden="true" />Quitar este criterio
            </Button>
          ) : null}
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={criterios.length >= 10} onClick={() => setCriterios((p) => [...p, criterioNuevo()])}><Plus strokeWidth={2.4} aria-hidden="true" />Agregar criterio</Button>
        <Button type="button" size="sm" disabled={t.ocupado || nombre.trim() === ''} onClick={() => void guardar()}>{t.ocupado ? 'Guardando…' : 'Guardar rúbrica'}</Button>
        <Button type="button" variant="outline" size="sm" onClick={alCerrar}>Cancelar</Button>
      </div>
    </div>
  )
}

// --- Crear tarea ------------------------------------------------------------------------------------------

function FormTarea({ ctx, categorias, alCerrar }: { ctx: ContextoCurso; categorias: Categoria[]; alCerrar: () => void }) {
  const rubricas = useDatos<{ rubricas: Rubrica[] }>(`/cursos/${ctx.id}/rubricas`)
  const [titulo, setTitulo] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [categoria, setCategoria] = useState('')
  const [rubrica, setRubrica] = useState('')
  const [puntos, setPuntos] = useState('10')
  const [limite, setLimite] = useState('')
  const [tarde, setTarde] = useState(false)
  const [publicar, setPublicar] = useState(false)
  const [nuevaRubrica, setNuevaRubrica] = useState(false)
  const t = useTarea()
  const elegida = rubricas.datos?.rubricas.find((r) => String(r.id) === rubrica)
  async function guardar() {
    const cuerpo = {
      tipo: 'tarea', titulo, instrucciones, categoria_id: categoria === '' ? null : Number(categoria), rubrica_id: rubrica === '' ? null : Number(rubrica),
      ...(rubrica === '' ? { puntos } : {}), fecha_limite: deCampoLocal(limite), acepta_tarde: tarde, publicada: publicar,
    }
    if (await t.correr(async () => { const r = await enviar(`/cursos/${ctx.id}/actividades`, cuerpo); return r.ok ? { ok: true } : r }, `Tarea "${titulo}" creada${publicar ? ' y publicada' : ' (en borrador)'}`)) alCerrar()
  }
  return (
    <Tarjeta className="border-line-strong">
      <h3 className="font-serif text-lg font-semibold text-ink">Nueva tarea</h3>
      <Texto etiqueta="Título" valor={titulo} alCambiar={setTitulo} />
      <Area etiqueta="Instrucciones" valor={instrucciones} alCambiar={setInstrucciones} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Lista etiqueta="Categoría de calificación" valor={categoria} alCambiar={setCategoria} opciones={[{ valor: '', etiqueta: 'Sin categoría (no cuenta en la calculada)' }, ...categorias.map((c) => ({ valor: String(c.id), etiqueta: `${c.nombre} (${puntosLegibles(c.peso)} %)` }))]} />
        <Texto etiqueta="Fecha y hora de entrega" tipo="datetime-local" valor={limite} alCambiar={setLimite} />
        <Lista etiqueta="Rúbrica" valor={rubrica} alCambiar={setRubrica} opciones={[{ valor: '', etiqueta: 'Sin rúbrica: califico con puntos' }, ...(rubricas.datos?.rubricas ?? []).map((r) => ({ valor: String(r.id), etiqueta: `${r.nombre} (${puntosLegibles(r.maximo)} pts)` }))]} />
        {rubrica === '' ? <Texto etiqueta="Puntos de la tarea" tipo="number" valor={puntos} alCambiar={setPuntos} /> : <p className="self-end text-sm text-ink-3">Vale {puntosLegibles(elegida?.maximo ?? 0)} puntos, el máximo de la rúbrica.</p>}
      </div>
      {categorias.length === 0 ? <p className="text-xs text-ink-3">Aún no defines categorías. Hazlo en la pestaña Calificaciones para que la tarea cuente en la calificación calculada.</p> : null}
      <Casilla etiqueta="Acepta entregas después de la fecha (se marcan como tarde)" valor={tarde} alCambiar={setTarde} />
      <Casilla etiqueta="Publicar ahora (avisa a los alumnos; si no, queda en borrador)" valor={publicar} alCambiar={setPublicar} />
      {nuevaRubrica ? <FormRubrica cursoId={ctx.id} alCerrar={() => setNuevaRubrica(false)} /> : <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setNuevaRubrica(true)}><Plus strokeWidth={2.4} aria-hidden="true" />Crear una rúbrica</Button>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={t.ocupado || titulo.trim() === ''} onClick={() => void guardar()}>{t.ocupado ? 'Guardando…' : 'Crear tarea'}</Button>
        <Button type="button" variant="outline" onClick={alCerrar}>Cancelar</Button>
      </div>
    </Tarjeta>
  )
}

// --- Vista del docente ------------------------------------------------------------------------------------

function Versiones({ lista }: { lista: VersionEntrega[] }) {
  if (lista.length === 0) return <p className="text-sm text-ink-3">Sin entrega.</p>
  return (
    <ul className="flex flex-col gap-2">
      {[...lista].reverse().map((v) => (
        <li key={v.id} className="flex flex-col gap-1 rounded-md bg-paper-2 px-3 py-2 text-sm">
          <span className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <span className="font-semibold text-ink num">Versión {v.version}</span>
            {fechaHora(v.fecha)}
            {v.tarde ? <Etiqueta tono="alerta">Tarde</Etiqueta> : null}
          </span>
          {v.texto ? <span className="whitespace-pre-wrap text-ink-2">{v.texto}</span> : null}
          {v.archivo ? <EnlaceArchivo archivo={v.archivo} /> : null}
        </li>
      ))}
    </ul>
  )
}

function Calificar({ a, alumno }: { a: Actividad; alumno: NonNullable<EntregasDeTarea['alumnos']>[number] }) {
  const { puede } = useSesion()
  const actual = alumno.calificacion
  const permiso = puede('calificacion_actividad', actual ? 'modificar' : 'crear')
  const [puntos, setPuntos] = useState(actual ? String(actual.puntos) : '')
  const [niveles, setNiveles] = useState<string[]>(() => (a.rubrica?.criterios ?? []).map((c) => String(Math.max(0, c.niveles.findIndex((n) => actual?.detalle?.some((d) => d.criterio === c.descripcion && d.nivel === n.nombre))))))
  const [comentario, setComentario] = useState(actual?.comentario ?? '')
  const t = useTarea()
  if (!permiso) return actual ? <p className="text-sm text-ink-2">Calificación: <span className="font-semibold num">{puntosLegibles(actual.puntos)}</span> de {puntosLegibles(a.puntos)}</p> : null
  const guardar = () => t.correr(async () => {
    const r = await enviar(`/actividades/${a.id}/calificar`, { alumno_id: alumno.alumno_id, comentario, ...(a.rubrica ? { detalle: niveles.map((n) => ({ nivel: Number(n) })) } : { puntos }) })
    return r.ok ? { ok: true } : r
  }, `Calificación de ${alumno.nombre} guardada`)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line p-3">
      {a.rubrica ? (
        a.rubrica.criterios.map((c: Criterio, i) => (
          <Lista key={i} etiqueta={c.descripcion} valor={niveles[i] ?? '0'} alCambiar={(v) => setNiveles((p) => p.map((x, k) => (k === i ? v : x)))} opciones={c.niveles.map((n, j) => ({ valor: String(j), etiqueta: `${n.nombre} (${puntosLegibles(n.puntos)} pts)` }))} />
        ))
      ) : (
        <Texto etiqueta={`Puntos (de ${puntosLegibles(a.puntos)})`} tipo="number" valor={puntos} alCambiar={setPuntos} />
      )}
      <Area etiqueta="Comentario para el alumno" valor={comentario} alCambiar={setComentario} filas={2} max={5000} />
      <Button type="button" size="sm" className="w-fit" disabled={t.ocupado || (!a.rubrica && puntos.trim() === '')} onClick={() => void guardar()}>
        {t.ocupado ? 'Guardando…' : actual ? 'Cambiar la calificación' : 'Guardar la calificación'}
      </Button>
      {actual && !a.calificaciones_publicadas ? <p className="text-xs text-ink-3">El alumno no la ve hasta que publiques las calificaciones.</p> : null}
    </div>
  )
}

function Entregas({ a }: { a: Actividad }) {
  const d = useDatos<EntregasDeTarea>(`/actividades/${a.id}/entregas`)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const alumnos = d.datos.alumnos ?? []
  if (alumnos.length === 0) return <Vacio titulo="Este grupo no tiene alumnos en su lista vigente" />
  return (
    <ul className="flex flex-col divide-y divide-line">
      {alumnos.map((al) => (
        <li key={al.alumno_id} className="flex flex-col gap-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{al.nombre}</span>
            <span className="text-xs text-ink-3 num">{al.identificador}</span>
            {al.versiones.length === 0 ? <Etiqueta>Sin entrega</Etiqueta> : <Etiqueta tono="proceso">{al.versiones.length === 1 ? 'Entregada' : `Entregada, ${al.versiones.length} versiones`}</Etiqueta>}
            {al.calificacion ? <Etiqueta tono="exito">{puntosLegibles(al.calificacion.puntos)} pts</Etiqueta> : null}
          </div>
          <Versiones lista={al.versiones} />
          {al.versiones.length > 0 || al.calificacion ? <Calificar a={a} alumno={al} /> : null}
        </li>
      ))}
    </ul>
  )
}

export function PublicarCalificaciones({ a, escribe }: { a: Actividad; escribe: boolean }) {
  const t = useTarea()
  const { puede } = useSesion()
  if (a.calificaciones_publicadas) return <Etiqueta tono="exito">Calificaciones publicadas</Etiqueta>
  if (!escribe || !puede('calificacion_actividad', 'modificar')) return null
  return (
    <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => { if (window.confirm(`Vas a publicar las calificaciones de "${a.titulo}". Cada alumno verá solo la suya y recibirá un aviso. ¿Continuar?`)) void t.correr(async () => { const r = await actualizar(`/actividades/${a.id}/publicar-calificaciones`); return r.ok ? { ok: true } : r }, `Calificaciones de "${a.titulo}" publicadas`) }}>
      Publicar calificaciones
    </Button>
  )
}

function TareaDocente({ ctx, a, categorias }: { ctx: ContextoCurso; a: Actividad; categorias: Categoria[] }) {
  const [abierta, setAbierta] = useState(false)
  const t = useTarea()
  const cambiar = (cuerpo: Record<string, unknown>, exito: string) => t.correr(async () => { const r = await actualizar(`/actividades/${a.id}`, cuerpo); return r.ok ? { ok: true } : r }, exito)
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{a.titulo}</h3>
        <Etiqueta tono={a.publicada ? 'exito' : 'neutro'}>{a.publicada ? 'Publicada' : 'Borrador'}</Etiqueta>
      </div>
      <p className="text-sm text-ink-3">
        {puntosLegibles(a.puntos)} pts · {categorias.find((c) => c.id === a.categoria_id)?.nombre ?? 'Sin categoría'} · Entrega: {a.fecha_limite ? fechaHora(a.fecha_limite) : 'sin fecha'}
        {a.acepta_tarde ? ' (acepta tarde)' : ''} · {a.entregas ?? 0} {a.entregas === 1 ? 'alumno entregó' : 'alumnos entregaron'}
      </p>
      {a.instrucciones ? <p className="whitespace-pre-wrap text-sm text-ink-2">{a.instrucciones}</p> : null}
      {a.rubrica ? <TablaRubrica r={a.rubrica} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setAbierta(!abierta)}>{abierta ? 'Ocultar entregas' : 'Revisar entregas'}</Button>
        {ctx.escribe ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => void cambiar({ publicada: !a.publicada }, a.publicada ? `"${a.titulo}" pasó a borrador` : `"${a.titulo}" publicada`)}>{a.publicada ? 'Pasar a borrador' : 'Publicar'}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={t.ocupado} onClick={() => void cambiar({ archivada: true }, `"${a.titulo}" archivada`)}><Archive strokeWidth={2.4} aria-hidden="true" />Archivar</Button>
          </>
        ) : null}
        <PublicarCalificaciones a={a} escribe={ctx.escribe} />
      </div>
      {abierta ? <Entregas a={a} /> : null}
    </Tarjeta>
  )
}

// --- Vista del alumno -------------------------------------------------------------------------------------

export function CalificacionPublicada({ c, puntos }: { c: CalificacionVista; puntos: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-exito-soft/40 p-3 text-sm">
      <p className="text-ink">Tu calificación: <span className="text-lg font-semibold num">{puntosLegibles(c.puntos)}</span> de {puntosLegibles(puntos)}</p>
      {c.detalle ? (
        <ul className="flex flex-col gap-0.5 text-ink-2">
          {c.detalle.map((d, i) => <li key={i}>{d.criterio}: <span className="font-medium text-ink">{d.nivel}</span> <span className="num text-ink-3">({puntosLegibles(d.puntos)} pts)</span></li>)}
        </ul>
      ) : null}
      {c.comentario ? <p className="whitespace-pre-wrap text-ink-2">Comentario: {c.comentario}</p> : null}
    </div>
  )
}

function TareaAlumno({ ctx, a }: { ctx: ContextoCurso; a: Actividad }) {
  const d = useDatos<EntregasDeTarea>(`/actividades/${a.id}/entregas`)
  const [texto, setTexto] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const t = useTarea()
  const vencida = a.fecha_limite !== null && a.fecha_limite < (d.datos?.actividad.servidor_ahora ?? '9999')
  const cerrada = a.calificaciones_publicadas || (vencida && !a.acepta_tarde) || !ctx.periodoAbierto
  const mio = d.datos?.mio ?? a.mio
  const versiones = d.datos?.versiones ?? []
  async function entregar() {
    if (await t.correr(async () => {
      let archivo_id: number | undefined
      if (archivo) {
        const s = await subirArchivo(archivo, ctx.id)
        if (!s.ok) return s
        archivo_id = s.id
      }
      const r = await enviar(`/actividades/${a.id}/entregas`, { texto, ...(archivo_id ? { archivo_id } : {}) })
      return r.ok ? { ok: true } : r
    }, `Entrega de "${a.titulo}" enviada`)) { setTexto(''); setArchivo(null) }
  }
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{a.titulo}</h3>
        {mio?.estado === 'entregada' ? <Etiqueta tono="proceso">{mio.tarde ? 'Entregada tarde' : 'Entregada'}</Etiqueta> : <Etiqueta tono={vencida ? 'error' : 'alerta'}>{vencida ? 'Vencida sin entregar' : 'Por entregar'}</Etiqueta>}
      </div>
      <p className="text-sm text-ink-3">{puntosLegibles(a.puntos)} puntos · Entrega: {a.fecha_limite ? fechaHora(a.fecha_limite) : 'sin fecha'}{a.acepta_tarde ? ' (acepta entregas tarde)' : ''}</p>
      {a.instrucciones ? <p className="whitespace-pre-wrap text-sm text-ink-2">{a.instrucciones}</p> : null}
      {a.rubrica ? <details><summary className="cursor-pointer text-sm font-medium text-ink">Ver la rúbrica con la que se califica</summary><div className="mt-2"><TablaRubrica r={a.rubrica} /></div></details> : null}
      {mio?.calificacion ? <CalificacionPublicada c={mio.calificacion} puntos={a.puntos} /> : mio?.estado === 'entregada' ? <p className="text-sm text-ink-3">Entregada. Verás tus puntos y comentarios cuando el docente publique las calificaciones.</p> : null}
      {versiones.length > 0 ? <details><summary className="cursor-pointer text-sm font-medium text-ink">Mis entregas ({versiones.length})</summary><div className="mt-2"><Versiones lista={versiones} /></div></details> : null}
      {cerrada ? (
        <p className="text-sm text-ink-3">{a.calificaciones_publicadas ? 'Ya se publicaron las calificaciones: esta tarea no admite más entregas.' : !ctx.periodoAbierto ? 'El periodo está cerrado.' : 'La fecha de entrega ya venció y esta tarea no acepta entregas tarde.'}</p>
      ) : (
        <form className="flex flex-col gap-3 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); void entregar() }}>
          <Area etiqueta={versiones.length > 0 ? 'Tu nueva versión (reemplaza a la anterior; la anterior se conserva)' : 'Tu respuesta'} valor={texto} alCambiar={setTexto} filas={4} />
          <CampoArchivo archivo={archivo} alCambiar={setArchivo} />
          <Button type="submit" className="w-fit" disabled={t.ocupado || (texto.trim() === '' && !archivo)}>{t.ocupado ? 'Enviando…' : versiones.length > 0 ? 'Volver a entregar' : 'Entregar la tarea'}</Button>
        </form>
      )}
    </Tarjeta>
  )
}

export function Tareas({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<ListaActividades>(`/cursos/${ctx.id}/actividades?tipo=tarea`)
  const [creando, setCreando] = useState(false)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  return (
    <>
      <Titulo>Tareas</Titulo>
      {ctx.escribe && !creando ? <Button type="button" className="w-fit" onClick={() => setCreando(true)}><Plus strokeWidth={2.4} aria-hidden="true" />Nueva tarea</Button> : null}
      {creando ? <FormTarea ctx={ctx} categorias={d.datos.categorias} alCerrar={() => setCreando(false)} /> : null}
      {d.datos.actividades.length === 0 ? (
        <Vacio titulo={ctx.modo === 'alumno' ? 'No hay tareas publicadas' : 'Este curso no tiene tareas'} descripcion={ctx.modo === 'alumno' ? 'Cuando tu docente publique una tarea, la verás aquí y recibirás un aviso.' : 'Crea la primera tarea; nace en borrador hasta que la publiques.'} />
      ) : (
        <div className="flex flex-col gap-4">{d.datos.actividades.map((a) => (ctx.modo === 'alumno' ? <TareaAlumno key={a.id} ctx={ctx} a={a} /> : <TareaDocente key={a.id} ctx={ctx} a={a} categorias={d.datos?.categorias ?? []} />))}</div>
      )}
    </>
  )
}
