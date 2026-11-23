/** Foros (12.9): publicaciones en hilo, sin editar ni borrar; moderar es ocultar con motivo, y queda en la bitácora. */
import { Archive, EyeOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { actualizar, enviar } from '@/lib/api'
import { puntosLegibles, type Actividad, type CalificacionesCurso, type ContextoCurso, type Foro, type ListaActividades, type Publicacion } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { Area, Casilla, Etiqueta, Tarjeta, Texto, Titulo, Vacio } from './ui'
import { PublicarCalificaciones } from './Tareas'
import { useTarea } from './useTarea'

function FormForo({ ctx, alCerrar }: { ctx: ContextoCurso; alCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [califica, setCalifica] = useState(false)
  const [puntos, setPuntos] = useState('10')
  const [publicar, setPublicar] = useState(true)
  const t = useTarea()
  async function guardar() {
    const cuerpo = { tipo: 'foro', titulo, instrucciones, calificable: califica, ...(califica ? { puntos } : {}), publicada: publicar }
    if (await t.correr(async () => { const r = await enviar(`/cursos/${ctx.id}/actividades`, cuerpo); return r.ok ? { ok: true } : r }, `Foro "${titulo}" creado`)) alCerrar()
  }
  return (
    <Tarjeta className="border-line-strong">
      <h3 className="font-serif text-lg font-semibold text-ink">Nuevo foro</h3>
      <Texto etiqueta="Título" valor={titulo} alCambiar={setTitulo} />
      <Area etiqueta="De qué trata" valor={instrucciones} alCambiar={setInstrucciones} filas={3} />
      <Casilla etiqueta="Calificable (se califica la participación de cada alumno)" valor={califica} alCambiar={setCalifica} />
      {califica ? <Texto etiqueta="Puntos" tipo="number" valor={puntos} alCambiar={setPuntos} /> : null}
      <Casilla etiqueta="Publicar ahora" valor={publicar} alCambiar={setPublicar} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={t.ocupado || titulo.trim() === ''} onClick={() => void guardar()}>{t.ocupado ? 'Guardando…' : 'Crear foro'}</Button>
        <Button type="button" variant="outline" onClick={alCerrar}>Cancelar</Button>
      </div>
    </Tarjeta>
  )
}

function Escribir({ foroId, respondeA, alTerminar, etiqueta }: { foroId: number; respondeA: number | null; alTerminar?: () => void; etiqueta: string }) {
  const [texto, setTexto] = useState('')
  const t = useTarea()
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void t.correr(async () => { const r = await enviar(`/actividades/${foroId}/publicaciones`, { texto, responde_a: respondeA }); return r.ok ? { ok: true } : r }, 'Publicación enviada').then((ok) => { if (ok) { setTexto(''); alTerminar?.() } }) }}>
      <Area etiqueta={etiqueta} valor={texto} alCambiar={setTexto} filas={3} max={5000} ayuda="Lo que publiques no se puede editar ni borrar." />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={t.ocupado || texto.trim() === ''}>{t.ocupado ? 'Publicando…' : 'Publicar'}</Button>
        {alTerminar ? <Button type="button" size="sm" variant="outline" onClick={alTerminar}>Cancelar</Button> : null}
      </div>
    </form>
  )
}

function Mensaje({ p, hijos, foro, ctx, nivel }: { p: Publicacion; hijos: Map<number | null, Publicacion[]>; foro: Foro; ctx: ContextoCurso; nivel: number }) {
  const [respondiendo, setRespondiendo] = useState(false)
  const [ocultando, setOcultando] = useState(false)
  const t = useTarea()
  const puedeEscribir = ctx.modo !== 'direccion' && ctx.periodoAbierto
  return (
    <li className={nivel > 0 ? 'ml-4 border-l-2 border-line pl-3 sm:ml-6' : ''}>
      <div className="flex flex-col gap-1.5 py-2">
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span className="font-semibold text-ink">{p.autor}</span>
          {fechaHora(p.fecha)}
        </p>
        {p.oculta && p.texto === null ? (
          <p className="flex items-center gap-1.5 text-sm italic text-ink-3"><EyeOff strokeWidth={2} className="size-4" aria-hidden="true" />Publicación oculta por moderación{p.mio ? ' (era tuya)' : ''}.</p>
        ) : (
          <>
            {p.oculta ? <p className="text-xs text-alerta">Oculta para los alumnos por {p.oculta_por}. Motivo: {p.motivo_oculto}</p> : null}
            <p className="whitespace-pre-wrap text-sm text-ink">{p.texto}</p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {puedeEscribir && !p.oculta ? <Button type="button" size="sm" variant="ghost" onClick={() => setRespondiendo(!respondiendo)}>Responder</Button> : null}
          {foro.puede_moderar && ctx.escribe && !p.oculta ? <Button type="button" size="sm" variant="ghost" onClick={() => setOcultando(true)}><EyeOff strokeWidth={2.4} aria-hidden="true" />Ocultar con motivo</Button> : null}
        </div>
        {respondiendo ? <Escribir foroId={foro.actividad.id} respondeA={p.id} etiqueta="Tu respuesta" alTerminar={() => setRespondiendo(false)} /> : null}
      </div>
      {(hijos.get(p.id) ?? []).length > 0 ? (
        <ul>{(hijos.get(p.id) ?? []).map((h) => <Mensaje key={h.id} p={h} hijos={hijos} foro={foro} ctx={ctx} nivel={nivel + 1} />)}</ul>
      ) : null}
      <DialogoMotivo
        abierto={ocultando}
        alCambiarApertura={setOcultando}
        titulo="Ocultar publicación"
        descripcion={`La publicación de ${p.autor} dejará de verse para los alumnos, que verán "oculta por moderación". El motivo queda en la bitácora.`}
        etiquetaAccion="Ocultar"
        ocupado={t.ocupado}
        alConfirmar={(motivo) => void t.correr(async () => { const r = await actualizar(`/publicaciones/${p.id}/ocultar`, { motivo }); return r.ok ? { ok: true } : r }, 'Publicación ocultada').then((ok) => { if (ok) setOcultando(false) })}
      />
    </li>
  )
}

function CalificarForo({ a }: { a: Actividad }) {
  const d = useDatos<CalificacionesCurso>(`/cursos/${a.asignacion_id}/calificaciones`)
  const [valores, setValores] = useState<Record<number, string>>({})
  const t = useTarea()
  if (!d.datos?.alumnos) return null
  return (
    <Tarjeta>
      <h3 className="font-serif text-lg font-semibold text-ink">Calificar la participación (de {puntosLegibles(a.puntos)} puntos)</h3>
      <ul className="flex flex-col divide-y divide-line">
        {d.datos.alumnos.map((al) => (
          <li key={al.alumno_id} className="flex flex-wrap items-end gap-2 py-2">
            <span className="min-w-0 flex-1 text-sm text-ink">{al.nombre}</span>
            <div className="w-28"><Texto etiqueta="Puntos" tipo="number" valor={valores[al.alumno_id] ?? String(al.celdas[String(a.id)] ?? '')} alCambiar={(v) => setValores((p) => ({ ...p, [al.alumno_id]: v }))} /></div>
            <Button type="button" size="sm" variant="outline" disabled={t.ocupado || (valores[al.alumno_id] ?? '') === ''} onClick={() => void t.correr(async () => { const r = await enviar(`/actividades/${a.id}/calificar`, { alumno_id: al.alumno_id, puntos: valores[al.alumno_id] }); return r.ok ? { ok: true } : r }, `Participación de ${al.nombre} calificada`)}>Guardar</Button>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function Hilo({ ctx, id }: { ctx: ContextoCurso; id: number }) {
  const d = useDatos<Foro>(`/actividades/${id}/publicaciones`)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const hijos = new Map<number | null, Publicacion[]>()
  for (const p of d.datos.publicaciones) hijos.set(p.responde_a, [...(hijos.get(p.responde_a) ?? []), p])
  const raices = hijos.get(null) ?? []
  return (
    <div className="flex flex-col gap-4">
      {d.datos.actividad.instrucciones ? <p className="whitespace-pre-wrap text-sm text-ink-2">{d.datos.actividad.instrucciones}</p> : null}
      {ctx.modo !== 'direccion' && ctx.periodoAbierto ? <Escribir foroId={id} respondeA={null} etiqueta="Nueva publicación" /> : null}
      {raices.length === 0 ? <Vacio titulo="Todavía nadie ha publicado" descripcion="Sé la primera persona en escribir." /> : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card px-3">{raices.map((p) => <Mensaje key={p.id} p={p} hijos={hijos} foro={d.datos as Foro} ctx={ctx} nivel={0} />)}</ul>
      )}
      {d.datos.actividad.calificable && ctx.modo !== 'alumno' ? <CalificarForo a={d.datos.actividad} /> : null}
    </div>
  )
}

export function Foros({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<ListaActividades>(`/cursos/${ctx.id}/actividades?tipo=foro`)
  const [params, setParams] = useSearchParams()
  const [creando, setCreando] = useState(false)
  const t = useTarea()
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const foros = d.datos.actividades
  const elegido = foros.find((f) => String(f.id) === params.get('foro')) ?? foros[0]
  return (
    <>
      <Titulo>Foros</Titulo>
      {ctx.escribe && !creando ? <Button type="button" className="w-fit" onClick={() => setCreando(true)}><Plus strokeWidth={2.4} aria-hidden="true" />Nuevo foro</Button> : null}
      {creando ? <FormForo ctx={ctx} alCerrar={() => setCreando(false)} /> : null}
      {foros.length === 0 ? (
        <Vacio titulo={ctx.modo === 'alumno' ? 'No hay foros publicados' : 'Este curso no tiene foros'} descripcion={ctx.modo === 'alumno' ? 'Cuando tu docente abra un foro, lo verás aquí.' : 'Crea un foro para que el grupo converse.'} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Foros del curso">
            {foros.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={f.id === elegido?.id} onClick={() => setParams({ foro: String(f.id) }, { replace: true })} className={`min-h-9 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand ${f.id === elegido?.id ? 'border-ink bg-ink font-semibold text-white' : 'border-line bg-card text-ink-2 hover:bg-paper-2'}`}>
                {f.titulo}
              </button>
            ))}
          </div>
          {elegido ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-ink">{elegido.titulo}</h3>
                {ctx.modo !== 'alumno' ? <Etiqueta tono={elegido.publicada ? 'exito' : 'neutro'}>{elegido.publicada ? 'Publicado' : 'Borrador'}</Etiqueta> : null}
                {ctx.escribe ? (
                  <>
                    <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => void t.correr(async () => { const r = await actualizar(`/actividades/${elegido.id}`, { publicada: !elegido.publicada }); return r.ok ? { ok: true } : r }, elegido.publicada ? 'Foro pasado a borrador' : 'Foro publicado')}>{elegido.publicada ? 'Pasar a borrador' : 'Publicar'}</Button>
                    <Button type="button" size="sm" variant="ghost" disabled={t.ocupado} onClick={() => void t.correr(async () => { const r = await actualizar(`/actividades/${elegido.id}`, { archivada: true }); return r.ok ? { ok: true } : r }, `Foro "${elegido.titulo}" archivado`)}><Archive strokeWidth={2.4} aria-hidden="true" />Archivar</Button>
                    {elegido.calificable ? <PublicarCalificaciones a={elegido} escribe={ctx.escribe} /> : null}
                  </>
                ) : null}
              </div>
              <Hilo key={elegido.id} ctx={ctx} id={elegido.id} />
            </>
          ) : null}
        </>
      )}
    </>
  )
}
