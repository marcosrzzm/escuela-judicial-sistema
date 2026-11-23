/** Exámenes en línea (12.6): el tiempo lo controla el servidor; la respuesta correcta nunca llega al navegador del alumno. */
import { useQueryClient } from '@tanstack/react-query'
import { Archive, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { actualizar, enviar, leer } from '@/lib/api'
import { avisar } from '@/lib/avisos'
import {
  deCampoLocal, puntosLegibles,
  type Actividad, type Categoria, type ContextoCurso, type Intento, type IntentosDeExamen, type ListaActividades, type Pregunta,
} from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { Area, Casilla, Etiqueta, Lista, Tarjeta, Texto, Titulo, Vacio } from './ui'
import { PublicarCalificaciones, CalificacionPublicada } from './Tareas'
import { useTarea } from './useTarea'

// --- Crear examen -----------------------------------------------------------------------------------------

type PreguntaForm = { tipo: Pregunta['tipo']; enunciado: string; puntos: string; opciones: string; correcta: string }
const preguntaNueva = (): PreguntaForm => ({ tipo: 'opcion', enunciado: '', puntos: '1', opciones: '', correcta: '0' })

function FormExamen({ ctx, categorias, alCerrar }: { ctx: ContextoCurso; categorias: Categoria[]; alCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [categoria, setCategoria] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tiempo, setTiempo] = useState('')
  const [intentos, setIntentos] = useState('1')
  const [publicar, setPublicar] = useState(false)
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([preguntaNueva()])
  const t = useTarea()
  const cambiar = (i: number, p: Partial<PreguntaForm>) => setPreguntas((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const total = preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0)
  async function guardar() {
    const cuerpo = {
      tipo: 'examen', titulo, instrucciones, categoria_id: categoria === '' ? null : Number(categoria), disponible_desde: deCampoLocal(desde), disponible_hasta: deCampoLocal(hasta),
      tiempo_limite_min: tiempo === '' ? null : Number(tiempo), intentos_permitidos: Number(intentos), publicada: publicar,
      preguntas: preguntas.map((p) => ({
        tipo: p.tipo, enunciado: p.enunciado, puntos: p.puntos,
        ...(p.tipo === 'opcion' ? { opciones: p.opciones.split('\n').map((o) => o.trim()).filter(Boolean), correcta: Number(p.correcta) } : {}),
        ...(p.tipo === 'vf' ? { correcta: p.correcta === 'f' ? 'f' : 'v' } : {}),
      })),
    }
    if (await t.correr(async () => { const r = await enviar(`/cursos/${ctx.id}/actividades`, cuerpo); return r.ok ? { ok: true } : r }, `Examen "${titulo}" creado${publicar ? ' y publicado' : ' (en borrador)'}`)) alCerrar()
  }
  return (
    <Tarjeta className="border-line-strong">
      <h3 className="font-serif text-lg font-semibold text-ink">Nuevo examen</h3>
      <Texto etiqueta="Título" valor={titulo} alCambiar={setTitulo} />
      <Area etiqueta="Instrucciones" valor={instrucciones} alCambiar={setInstrucciones} filas={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Lista etiqueta="Categoría de calificación" valor={categoria} alCambiar={setCategoria} opciones={[{ valor: '', etiqueta: 'Sin categoría (no cuenta en la calculada)' }, ...categorias.map((c) => ({ valor: String(c.id), etiqueta: `${c.nombre} (${puntosLegibles(c.peso)} %)` }))]} />
        <Texto etiqueta="Tiempo límite (minutos)" tipo="number" valor={tiempo} alCambiar={setTiempo} ayuda="Vacío: sin límite de tiempo, solo la fecha de cierre." />
        <Texto etiqueta="Disponible desde" tipo="datetime-local" valor={desde} alCambiar={setDesde} />
        <Texto etiqueta="Disponible hasta" tipo="datetime-local" valor={hasta} alCambiar={setHasta} />
        <Texto etiqueta="Intentos permitidos" tipo="number" valor={intentos} alCambiar={setIntentos} />
      </div>
      <h4 className="text-sm font-semibold text-ink">Preguntas (el examen vale {puntosLegibles(total)} puntos)</h4>
      {preguntas.map((p, i) => (
        <fieldset key={i} className="flex flex-col gap-2 rounded-lg border border-line bg-paper-2 p-3">
          <legend className="px-1 text-xs font-semibold text-ink-3">Pregunta {i + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
            <Lista etiqueta="Tipo" valor={p.tipo} alCambiar={(v) => cambiar(i, { tipo: v as Pregunta['tipo'], correcta: v === 'vf' ? 'v' : '0' })} opciones={[{ valor: 'opcion', etiqueta: 'Opción múltiple' }, { valor: 'vf', etiqueta: 'Verdadero o falso' }, { valor: 'abierta', etiqueta: 'Respuesta abierta (la califico yo)' }]} />
            <Texto etiqueta="Puntos" tipo="number" valor={p.puntos} alCambiar={(v) => cambiar(i, { puntos: v })} />
          </div>
          <Area etiqueta="Enunciado" valor={p.enunciado} alCambiar={(v) => cambiar(i, { enunciado: v })} filas={2} max={2000} />
          {p.tipo === 'opcion' ? (
            <>
              <Area etiqueta="Opciones (una por línea, de 2 a 6)" valor={p.opciones} alCambiar={(v) => cambiar(i, { opciones: v })} filas={3} max={1000} />
              <Lista etiqueta="Opción correcta" valor={p.correcta} alCambiar={(v) => cambiar(i, { correcta: v })} opciones={p.opciones.split('\n').map((o) => o.trim()).filter(Boolean).map((o, j) => ({ valor: String(j), etiqueta: o }))} />
            </>
          ) : null}
          {p.tipo === 'vf' ? <Lista etiqueta="Respuesta correcta" valor={p.correcta} alCambiar={(v) => cambiar(i, { correcta: v })} opciones={[{ valor: 'v', etiqueta: 'Verdadero' }, { valor: 'f', etiqueta: 'Falso' }]} /> : null}
          {preguntas.length > 1 ? <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setPreguntas((l) => l.filter((_, k) => k !== i))}><Trash2 strokeWidth={2.4} aria-hidden="true" />Quitar esta pregunta</Button> : null}
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" disabled={preguntas.length >= 50} onClick={() => setPreguntas((l) => [...l, preguntaNueva()])}><Plus strokeWidth={2.4} aria-hidden="true" />Agregar pregunta</Button>
      <Casilla etiqueta="Publicar ahora (avisa a los alumnos; si no, queda en borrador)" valor={publicar} alCambiar={setPublicar} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={t.ocupado || titulo.trim() === '' || preguntas.some((p) => p.enunciado.trim() === '')} onClick={() => void guardar()}>{t.ocupado ? 'Guardando…' : 'Crear examen'}</Button>
        <Button type="button" variant="outline" onClick={alCerrar}>Cancelar</Button>
      </div>
    </Tarjeta>
  )
}

// --- Vista del docente ------------------------------------------------------------------------------------

function RevisarIntento({ id, a }: { id: number; a: Actividad }) {
  const d = useDatos<Intento>(`/intentos/${id}`)
  const [pts, setPts] = useState<Record<string, string>>({})
  const [comentario, setComentario] = useState('')
  const t = useTarea()
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const i = d.datos
  const puedeCalificar = i.estado !== 'en_curso'
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-3">
      {i.preguntas.map((p, n) => (
        <div key={p.id} className="flex flex-col gap-1 text-sm">
          <p className="font-medium text-ink">{n + 1}. {p.enunciado} <span className="text-xs font-normal text-ink-3 num">({puntosLegibles(p.puntos)} pts)</span></p>
          <p className="text-ink-2">Respondió: {p.tipo === 'opcion' ? (i.respuestas[p.id] !== undefined ? p.opciones?.[Number(i.respuestas[p.id])] : 'sin respuesta') : p.tipo === 'vf' ? (i.respuestas[p.id] === 'v' ? 'Verdadero' : i.respuestas[p.id] === 'f' ? 'Falso' : 'sin respuesta') : <span className="whitespace-pre-wrap">{i.respuestas[p.id] || 'sin respuesta'}</span>}</p>
          {p.tipo !== 'abierta' ? <p className="text-xs text-ink-3">Correcta: {p.tipo === 'opcion' ? p.opciones?.[Number(p.correcta)] : p.correcta === 'v' ? 'Verdadero' : 'Falso'}</p> : puedeCalificar ? <div className="w-32"><Texto etiqueta="Puntos" tipo="number" valor={pts[p.id] ?? String(i.puntos_abiertas?.[p.id] ?? '')} alCambiar={(v) => setPts((x) => ({ ...x, [p.id]: v }))} /></div> : null}
        </div>
      ))}
      <p className="text-sm text-ink-2">Puntos de las cerradas: <span className="font-semibold num">{puntosLegibles(i.puntos_auto ?? 0)}</span>{i.puntos_finales !== null && i.puntos_finales !== undefined ? <> · Total: <span className="font-semibold num">{puntosLegibles(i.puntos_finales)}</span> de {puntosLegibles(a.puntos)}</> : null}</p>
      {puedeCalificar && i.preguntas.some((p) => p.tipo === 'abierta') ? (
        <>
          <Area etiqueta="Comentario para el alumno (opcional)" valor={comentario} alCambiar={setComentario} filas={2} max={5000} />
          <Button type="button" size="sm" className="w-fit" disabled={t.ocupado} onClick={() => void t.correr(async () => {
            const abiertas = Object.fromEntries(i.preguntas.filter((p) => p.tipo === 'abierta').map((p) => [p.id, pts[p.id] ?? String(i.puntos_abiertas?.[p.id] ?? '')]))
            const r = await actualizar(`/intentos/${id}/calificar`, { puntos_abiertas: abiertas, comentario })
            return r.ok ? { ok: true } : r
          }, 'Calificación del examen guardada')}>{t.ocupado ? 'Guardando…' : 'Guardar la calificación'}</Button>
        </>
      ) : null}
    </div>
  )
}

function Intentos({ a }: { a: Actividad }) {
  const d = useDatos<IntentosDeExamen>(`/actividades/${a.id}/intentos`)
  const [abierto, setAbierto] = useState<number | null>(null)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  if (d.datos.intentos.length === 0) return <Vacio titulo="Nadie ha empezado este examen" />
  return (
    <ul className="flex flex-col divide-y divide-line">
      {d.datos.intentos.map((i) => (
        <li key={i.id} className="flex flex-col gap-2 py-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-ink">{i.nombre}</span>
            <span className="text-xs text-ink-3">intento {i.numero}</span>
            <Etiqueta tono={i.estado === 'calificado' ? 'exito' : i.estado === 'enviado' ? 'alerta' : 'proceso'}>{i.estado === 'calificado' ? 'Calificado' : i.estado === 'enviado' ? (i.por_calificar ? 'Por calificar' : 'Enviado') : 'Contestando'}</Etiqueta>
            {i.puntos_finales !== null ? <span className="num text-ink-2">{puntosLegibles(i.puntos_finales)} pts</span> : null}
            <Button type="button" size="sm" variant="outline" onClick={() => setAbierto(abierto === i.id ? null : i.id)}>{abierto === i.id ? 'Cerrar' : 'Abrir'}</Button>
          </div>
          {abierto === i.id ? <RevisarIntento id={i.id} a={a} /> : null}
        </li>
      ))}
    </ul>
  )
}

function ExamenDocente({ ctx, a, categorias }: { ctx: ContextoCurso; a: Actividad; categorias: Categoria[] }) {
  const [abierto, setAbierto] = useState(false)
  const t = useTarea()
  const cambiar = (cuerpo: Record<string, unknown>, exito: string) => t.correr(async () => { const r = await actualizar(`/actividades/${a.id}`, cuerpo); return r.ok ? { ok: true } : r }, exito)
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{a.titulo}</h3>
        <Etiqueta tono={a.publicada ? 'exito' : 'neutro'}>{a.publicada ? 'Publicado' : 'Borrador'}</Etiqueta>
      </div>
      <p className="text-sm text-ink-3">
        {puntosLegibles(a.puntos)} pts · {a.total_preguntas ?? 0} preguntas · {categorias.find((c) => c.id === a.categoria_id)?.nombre ?? 'Sin categoría'} · {a.tiempo_limite_min ? `${a.tiempo_limite_min} min` : 'sin límite de tiempo'} · {a.intentos_permitidos} {a.intentos_permitidos === 1 ? 'intento' : 'intentos'}
        {a.disponible_hasta ? ` · Cierra: ${fechaHora(a.disponible_hasta)}` : ''} · {a.intentos ?? 0} {a.intentos === 1 ? 'intento hecho' : 'intentos hechos'}
      </p>
      {a.instrucciones ? <p className="whitespace-pre-wrap text-sm text-ink-2">{a.instrucciones}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setAbierto(!abierto)}>{abierto ? 'Ocultar intentos' : 'Ver intentos'}</Button>
        {ctx.escribe ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => void cambiar({ publicada: !a.publicada }, a.publicada ? `"${a.titulo}" pasó a borrador` : `"${a.titulo}" publicado`)}>{a.publicada ? 'Pasar a borrador' : 'Publicar'}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={t.ocupado} onClick={() => void cambiar({ archivada: true }, `"${a.titulo}" archivado`)}><Archive strokeWidth={2.4} aria-hidden="true" />Archivar</Button>
          </>
        ) : null}
        <PublicarCalificaciones a={a} escribe={ctx.escribe} />
      </div>
      {abierto ? <Intentos a={a} /> : null}
    </Tarjeta>
  )
}

// --- Vista del alumno -------------------------------------------------------------------------------------

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Contestar un intento: el reloj es el del servidor (se corrige con su hora); al llegar a cero se envía lo guardado. */
function Contestar({ inicial, alTerminar }: { inicial: Intento; alTerminar: () => void }) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(inicial.respuestas)
  const [resto, setResto] = useState<number | null>(null)
  const [cerrado, setCerrado] = useState(false)
  const desfase = useMemo(() => Date.parse(`${inicial.servidor_ahora.replace(' ', 'T')}Z`) - Date.now(), [inicial.servidor_ahora])
  const limite = inicial.limite ? Date.parse(`${inicial.limite.replace(' ', 'T')}Z`) : null
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useTarea()

  async function terminar(conLoQueHay: boolean) {
    if (cerrado) return
    setCerrado(true)
    if (temporizador.current) clearTimeout(temporizador.current)
    const r = await enviar<Intento>(`/intentos/${inicial.id}/enviar`, conLoQueHay ? { respuestas } : {})
    if (!r.ok) avisar.error(r.error)
    else avisar.exito('Examen enviado')
    alTerminar()
  }
  useEffect(() => {
    if (limite === null) return
    const cada = setInterval(() => {
      const faltan = limite - (Date.now() + desfase)
      setResto(faltan)
      if (faltan <= 0) {
        clearInterval(cada)
        void terminar(false)
      }
    }, 1000)
    return () => clearInterval(cada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limite, desfase])

  function responder(id: number, valor: string) {
    const nuevas = { ...respuestas, [id]: valor }
    setRespuestas(nuevas)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => void actualizar(`/intentos/${inicial.id}/respuestas`, { respuestas: { [id]: valor } }).then((r) => { if (!r.ok) avisar.error(r.error) }), 500)
  }
  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-brand p-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 bg-card py-1">
        <p className="text-sm font-semibold text-ink">Intento {inicial.numero}. Tus respuestas se guardan solas.</p>
        {resto !== null ? <p className={`text-lg font-semibold num ${resto < 60000 ? 'text-error' : 'text-ink'}`} role="timer" aria-label="Tiempo restante">{mmss(resto)}</p> : null}
      </div>
      {inicial.preguntas.map((p, n) => (
        <fieldset key={p.id} className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">{n + 1}. {p.enunciado} <span className="text-xs font-normal text-ink-3 num">({puntosLegibles(p.puntos)} pts)</span></legend>
          {p.tipo === 'abierta' ? (
            <textarea aria-label={`Respuesta a la pregunta ${n + 1}`} rows={4} value={respuestas[p.id] ?? ''} maxLength={5000} onChange={(e) => responder(p.id, e.target.value)} className="w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm text-ink focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" />
          ) : (
            (p.tipo === 'vf' ? ['Verdadero', 'Falso'] : (p.opciones ?? [])).map((o, j) => {
              const valor = p.tipo === 'vf' ? (j === 0 ? 'v' : 'f') : String(j)
              return (
                <label key={j} className="flex min-h-9 items-center gap-2 text-sm text-ink">
                  <input type="radio" name={`p${p.id}`} checked={respuestas[p.id] === valor} onChange={() => responder(p.id, valor)} className="size-4 accent-[var(--color-brand)]" />
                  {o}
                </label>
              )
            })
          )}
        </fieldset>
      ))}
      <Button type="button" className="w-fit" disabled={cerrado || t.ocupado} onClick={() => { if (window.confirm('Vas a enviar el examen. Después ya no podrás cambiar tus respuestas. ¿Continuar?')) void terminar(true) }}>Enviar el examen</Button>
    </div>
  )
}

function ExamenAlumno({ ctx, a }: { ctx: ContextoCurso; a: Actividad }) {
  const [intento, setIntento] = useState<Intento | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const usados = a.mio?.intentos_usados ?? 0
  const quedan = a.intentos_permitidos - usados
  const ahora = Date.now()
  const antes = a.disponible_desde !== null && Date.parse(`${a.disponible_desde.replace(' ', 'T')}Z`) > ahora
  const despues = a.disponible_hasta !== null && Date.parse(`${a.disponible_hasta.replace(' ', 'T')}Z`) < ahora
  async function comenzar() {
    setIniciando(true)
    const r = await enviar<Intento>(`/actividades/${a.id}/intentos`)
    setIniciando(false)
    if (r.ok) setIntento(r.datos)
    else avisar.error(r.error)
  }
  async function continuar(id: number) {
    const r = await leer<Intento>(`/intentos/${id}`)
    if (r.ok && r.datos.estado === 'en_curso') setIntento(r.datos)
    else if (!r.ok) avisar.error(r.error)
  }
  const cliente = useQueryClient()
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{a.titulo}</h3>
        {a.mio?.estado === 'en_curso' ? <Etiqueta tono="proceso">Contestando</Etiqueta> : usados > 0 ? <Etiqueta tono="exito">Enviado</Etiqueta> : <Etiqueta tono="alerta">Por contestar</Etiqueta>}
      </div>
      <p className="text-sm text-ink-3">
        {puntosLegibles(a.puntos)} puntos · {a.total_preguntas ?? 0} preguntas · {a.tiempo_limite_min ? `${a.tiempo_limite_min} minutos para contestar` : 'sin límite de tiempo'} · {a.intentos_permitidos} {a.intentos_permitidos === 1 ? 'intento' : 'intentos'}
        {a.disponible_desde ? ` · Abre: ${fechaHora(a.disponible_desde)}` : ''}{a.disponible_hasta ? ` · Cierra: ${fechaHora(a.disponible_hasta)}` : ''}
      </p>
      {a.instrucciones ? <p className="whitespace-pre-wrap text-sm text-ink-2">{a.instrucciones}</p> : null}
      {intento ? (
        <Contestar key={intento.id} inicial={intento} alTerminar={() => { setIntento(null); void cliente.invalidateQueries({ queryKey: ['api'] }) }} />
      ) : a.mio?.intento_en_curso ? (
        <Button type="button" className="w-fit" onClick={() => void continuar(a.mio?.intento_en_curso as number)}>Continuar el examen</Button>
      ) : usados > 0 && (quedan <= 0 || despues) ? (
        <p className="text-sm text-ink-3">{a.mio?.calificacion ? 'Examen contestado.' : 'Examen enviado. Verás tus puntos cuando el docente publique las calificaciones.'}</p>
      ) : (
        <>
          {antes ? <p className="text-sm text-ink-3">Este examen todavía no abre.</p> : despues ? <p className="text-sm text-ink-3">Este examen ya cerró.</p> : !ctx.periodoAbierto ? <p className="text-sm text-ink-3">El periodo está cerrado.</p> : null}
          {!antes && !despues && ctx.periodoAbierto && quedan > 0 ? (
            <div className="flex flex-col gap-1">
              <Button type="button" className="w-fit" disabled={iniciando} onClick={() => { if (window.confirm(a.tiempo_limite_min ? `Al empezar corren ${a.tiempo_limite_min} minutos y no se detienen aunque salgas. ¿Empezar ahora?` : '¿Empezar el examen ahora?')) void comenzar() }}>{iniciando ? 'Preparando…' : usados > 0 ? 'Comenzar otro intento' : 'Comenzar el examen'}</Button>
              <p className="text-xs text-ink-3">Te {quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.</p>
            </div>
          ) : null}
        </>
      )}
      {!intento && a.mio?.calificacion ? <CalificacionPublicada c={a.mio.calificacion} puntos={a.puntos} /> : null}
    </Tarjeta>
  )
}

export function Examenes({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<ListaActividades>(`/cursos/${ctx.id}/actividades?tipo=examen`)
  const [creando, setCreando] = useState(false)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  return (
    <>
      <Titulo>Exámenes</Titulo>
      {ctx.escribe && !creando ? <Button type="button" className="w-fit" onClick={() => setCreando(true)}><Plus strokeWidth={2.4} aria-hidden="true" />Nuevo examen</Button> : null}
      {creando ? <FormExamen ctx={ctx} categorias={d.datos.categorias} alCerrar={() => setCreando(false)} /> : null}
      {d.datos.actividades.length === 0 ? (
        <Vacio titulo={ctx.modo === 'alumno' ? 'No hay exámenes publicados' : 'Este curso no tiene exámenes'} descripcion={ctx.modo === 'alumno' ? 'Cuando tu docente publique un examen, lo verás aquí y recibirás un aviso.' : 'Crea el primer examen; nace en borrador hasta que lo publiques.'} />
      ) : (
        <div className="flex flex-col gap-4">{d.datos.actividades.map((a) => (ctx.modo === 'alumno' ? <ExamenAlumno key={a.id} ctx={ctx} a={a} /> : <ExamenDocente key={a.id} ctx={ctx} a={a} categorias={d.datos?.categorias ?? []} />))}</div>
      )}
    </>
  )
}
