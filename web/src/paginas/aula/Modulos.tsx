/** Módulos y contenido del curso (especificación, 12.2): borrador o publicado, archivar en vez de borrar. */
import { Archive, BookOpen, ExternalLink, FileText, Link2, MessageSquare, Paperclip, Plus, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { actualizar, enviar } from '@/lib/api'
import { subirArchivo, type ContextoCurso, type Elemento, type ListaActividades, type Modulo, type ResumenCurso } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { Area, Casilla, CampoArchivo, EnlaceArchivo, Etiqueta, Lista, Tarjeta, Texto, Titulo, Vacio } from './ui'
import { useTarea } from './useTarea'

const ICONOS = { pagina: FileText, archivo: Paperclip, enlace: Link2, tarea: ClipboardList, examen: BookOpen, foro: MessageSquare } as const
const NOMBRES = { pagina: 'Página de texto', archivo: 'Archivo', enlace: 'Enlace externo', tarea: 'Tarea', examen: 'Examen', foro: 'Foro' } as const
const PESTANA = { tarea: 'tareas', examen: 'examenes', foro: 'foros' } as const

function FormElemento({ ctx, moduloId, alCerrar }: { ctx: ContextoCurso; moduloId: number; alCerrar: () => void }) {
  const [tipo, setTipo] = useState<Elemento['tipo']>('pagina')
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [url, setUrl] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [actividad, setActividad] = useState('')
  const [publicado, setPublicado] = useState(false)
  const esActividad = tipo === 'tarea' || tipo === 'examen' || tipo === 'foro'
  const acts = useDatos<ListaActividades>(esActividad ? `/cursos/${ctx.id}/actividades?tipo=${tipo}` : null)
  const t = useTarea()
  const [error, setError] = useState('')

  async function guardar() {
    setError('')
    const ok = await t.correr(async () => {
      let archivo_id: number | undefined
      if (tipo === 'archivo') {
        if (!archivo) return { ok: false, error: 'Elige el archivo que quieres subir.' }
        const s = await subirArchivo(archivo, ctx.id)
        if (!s.ok) return s
        archivo_id = s.id
      }
      const r = await enviar(`/modulos/${moduloId}/elementos`, {
        tipo, titulo, publicado,
        ...(tipo === 'pagina' ? { texto } : {}),
        ...(tipo === 'enlace' ? { url, texto } : {}),
        ...(tipo === 'archivo' ? { archivo_id, texto } : {}),
        ...(esActividad ? { actividad_id: Number(actividad) } : {}),
      })
      return r.ok ? { ok: true } : r
    }, `${NOMBRES[tipo]} "${titulo}" agregado al módulo`)
    if (ok) alCerrar()
    else setError('No se pudo guardar. Revisa los datos marcados arriba.')
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-paper-2 p-3">
      <Lista etiqueta="Qué vas a agregar" valor={tipo} alCambiar={(v) => { setTipo(v as Elemento['tipo']); setActividad('') }} opciones={Object.entries(NOMBRES).map(([valor, etiqueta]) => ({ valor, etiqueta }))} />
      {esActividad ? (
        acts.cargando ? (
          <p className="text-sm text-ink-3">Cargando actividades…</p>
        ) : (
          <Lista
            etiqueta={`Cuál ${NOMBRES[tipo].toLowerCase()}`}
            valor={actividad}
            alCambiar={(v) => { setActividad(v); setTitulo(acts.datos?.actividades.find((a) => String(a.id) === v)?.titulo ?? '') }}
            opciones={[{ valor: '', etiqueta: acts.datos?.actividades.length ? 'Elige una' : `Primero crea una en la pestaña ${tipo === 'tarea' ? 'Tareas' : tipo === 'examen' ? 'Exámenes' : 'Foros'}` }, ...(acts.datos?.actividades ?? []).map((a) => ({ valor: String(a.id), etiqueta: a.titulo }))]}
          />
        )
      ) : (
        <Texto etiqueta="Título" valor={titulo} alCambiar={setTitulo} />
      )}
      {tipo === 'pagina' ? <Area etiqueta="Texto de la página" valor={texto} alCambiar={setTexto} filas={6} /> : null}
      {tipo === 'enlace' ? <Texto etiqueta="Dirección" tipo="url" valor={url} alCambiar={setUrl} max={300} ayuda="Empieza con https://" /> : null}
      {tipo === 'archivo' ? <CampoArchivo etiqueta="Archivo" archivo={archivo} alCambiar={setArchivo} /> : null}
      <Casilla etiqueta="Publicar ahora (si no, queda en borrador y el alumno no lo ve)" valor={publicado} alCambiar={setPublicado} />
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={t.ocupado || titulo.trim() === '' || (esActividad && actividad === '')} onClick={() => void guardar()}>
          {t.ocupado ? 'Guardando…' : 'Agregar al módulo'}
        </Button>
        <Button type="button" variant="outline" onClick={alCerrar}>Cancelar</Button>
      </div>
    </div>
  )
}

function FilaElemento({ ctx, e }: { ctx: ContextoCurso; e: Elemento }) {
  const Icono = ICONOS[e.tipo]
  const t = useTarea()
  const cambiar = (cuerpo: Record<string, unknown>, exito: string) => t.correr(async () => { const r = await actualizar(`/elementos/${e.id}`, cuerpo); return r.ok ? { ok: true } : r }, exito)
  const alumno = ctx.modo === 'alumno'
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Icono strokeWidth={2} className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">
          {e.tipo === 'tarea' || e.tipo === 'examen' || e.tipo === 'foro' ? (
            <Link to={`${ctx.modo === 'docente' ? `/asignaciones/${ctx.id}` : `/cursos/${ctx.id}`}/${PESTANA[e.tipo]}`} className="hover:underline">{e.titulo}</Link>
          ) : e.titulo}
        </span>
        <span className="text-xs text-ink-3">{NOMBRES[e.tipo]}</span>
        {!alumno ? <Etiqueta tono={e.publicado ? 'exito' : 'neutro'}>{e.publicado ? 'Publicado' : 'Borrador'}</Etiqueta> : null}
        {!alumno && e.actividad_publicada === false ? <Etiqueta tono="alerta">Actividad sin publicar</Etiqueta> : null}
      </div>
      {e.tipo === 'pagina' && e.texto ? (
        <details className="rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-2">
          <summary className="cursor-pointer font-medium text-ink">Leer la página</summary>
          <p className="mt-2 whitespace-pre-wrap">{e.texto}</p>
        </details>
      ) : null}
      {e.tipo === 'archivo' && e.archivo ? <EnlaceArchivo archivo={e.archivo} /> : null}
      {e.tipo === 'enlace' && e.url ? (
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ExternalLink strokeWidth={2.4} className="size-4" aria-hidden="true" />
          Abrir el enlace
        </a>
      ) : null}
      {(e.tipo === 'archivo' || e.tipo === 'enlace') && e.texto ? <p className="text-sm text-ink-3">{e.texto}</p> : null}
      {ctx.escribe ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => void cambiar({ publicado: !e.publicado }, e.publicado ? `"${e.titulo}" pasó a borrador` : `"${e.titulo}" publicado`)}>
            {e.publicado ? 'Pasar a borrador' : 'Publicar'}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={t.ocupado} onClick={() => void cambiar({ archivado: true }, `"${e.titulo}" archivado`)}>
            <Archive strokeWidth={2.4} aria-hidden="true" />
            Archivar
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function TarjetaModulo({ ctx, m }: { ctx: ContextoCurso; m: Modulo }) {
  const [agregando, setAgregando] = useState(false)
  const t = useTarea()
  const cambiar = (cuerpo: Record<string, unknown>, exito: string) => t.correr(async () => { const r = await actualizar(`/modulos/${m.id}`, cuerpo); return r.ok ? { ok: true } : r }, exito)
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{m.titulo}</h3>
        {ctx.modo !== 'alumno' ? <Etiqueta tono={m.publicado ? 'exito' : 'neutro'}>{m.publicado ? 'Publicado' : 'Borrador'}</Etiqueta> : null}
      </div>
      {m.elementos.length === 0 ? (
        <p className="text-sm text-ink-3">{ctx.modo === 'alumno' ? 'Este módulo todavía no tiene contenido publicado.' : 'Este módulo está vacío. Agrega una página, un archivo, un enlace, una tarea, un examen o un foro.'}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">{m.elementos.map((e) => <FilaElemento key={e.id} ctx={ctx} e={e} />)}</ul>
      )}
      {ctx.escribe ? (
        <>
          {agregando ? <FormElemento ctx={ctx} moduloId={m.id} alCerrar={() => setAgregando(false)} /> : null}
          <div className="flex flex-wrap gap-2">
            {!agregando ? (
              <Button type="button" size="sm" onClick={() => setAgregando(true)}>
                <Plus strokeWidth={2.4} aria-hidden="true" />
                Agregar contenido
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" disabled={t.ocupado} onClick={() => void cambiar({ publicado: !m.publicado }, m.publicado ? `Módulo "${m.titulo}" pasó a borrador` : `Módulo "${m.titulo}" publicado`)}>
              {m.publicado ? 'Pasar a borrador' : 'Publicar módulo'}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={t.ocupado} onClick={() => void cambiar({ archivado: true }, `Módulo "${m.titulo}" archivado`)}>
              <Archive strokeWidth={2.4} aria-hidden="true" />
              Archivar módulo
            </Button>
          </div>
        </>
      ) : null}
    </Tarjeta>
  )
}

export function Modulos({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<{ curso: ResumenCurso; modulos: Modulo[] }>(`/cursos/${ctx.id}/modulos`)
  const [titulo, setTitulo] = useState('')
  const t = useTarea()
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const crear = async () => {
    if (await t.correr(async () => { const r = await enviar(`/cursos/${ctx.id}/modulos`, { titulo }); return r.ok ? { ok: true } : r }, `Módulo "${titulo}" creado (en borrador)`)) setTitulo('')
  }
  return (
    <>
      <Titulo>Módulos</Titulo>
      {ctx.escribe ? (
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); void crear() }}>
          <div className="flex-1"><Texto etiqueta="Nuevo módulo" valor={titulo} alCambiar={setTitulo} ayuda="Por ejemplo: Unidad 1. Nace en borrador; lo publicas cuando esté listo." /></div>
          <Button type="submit" disabled={t.ocupado || titulo.trim() === ''}><Plus strokeWidth={2.4} aria-hidden="true" />Crear módulo</Button>
        </form>
      ) : null}
      {d.datos.modulos.length === 0 ? (
        <Vacio titulo={ctx.modo === 'alumno' ? 'Todavía no hay contenido publicado' : 'Este curso no tiene módulos'} descripcion={ctx.modo === 'alumno' ? 'Cuando tu docente publique un módulo, aparece aquí.' : 'Crea el primer módulo y agrégale contenido.'} />
      ) : (
        <div className="flex flex-col gap-4">{d.datos.modulos.map((m) => <TarjetaModulo key={m.id} ctx={ctx} m={m} />)}</div>
      )}
    </>
  )
}
