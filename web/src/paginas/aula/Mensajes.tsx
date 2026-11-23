/** Mensajes uno a uno (12.8): sin envío a grupos y sin correo; Coordinación solo abre una conversación si alguien la reporta. */
import { ArrowLeft, Flag, Plus, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { DialogoMotivo } from '@/componentes/DialogoMotivo'
import { Pagina } from '@/componentes/Pagina'
import { actualizar, enviar } from '@/lib/api'
import { subirArchivo, type Contacto, type Conversacion, type Hilo } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { useSesion } from '@/lib/sesion'
import { Area, CampoArchivo, EnlaceArchivo, Etiqueta, Lista, Vacio } from './ui'
import { useTarea } from './useTarea'

/** Cuántos mensajes sin leer tiene la persona: lo usa la barra global. No consulta en "ver como". */
export function useSinLeerMensajes(): number {
  const { sesion } = useSesion()
  const activo = !!sesion && sesion.permisos.includes('mensaje:ver') && !sesion.solo_lectura && !sesion.debe_cambiar_clave
  const d = useDatos<{ sin_leer: number }>(activo ? '/conversaciones' : null, { cadaMs: 60_000 })
  return d.datos?.sin_leer ?? 0
}

function Redactar({ destinatario, alEnviado }: { destinatario: number; alEnviado: (conversacion: number) => void }) {
  const { puede } = useSesion()
  const [texto, setTexto] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const t = useTarea()
  async function mandar() {
    let conv = 0
    const ok = await t.correr(async () => {
      let archivo_id: number | undefined
      if (archivo) {
        const s = await subirArchivo(archivo, null)
        if (!s.ok) return s
        archivo_id = s.id
      }
      const r = await enviar<{ conversacion_id: number }>('/mensajes', { destinatario_id: destinatario, texto, ...(archivo_id ? { archivo_id } : {}) })
      if (r.ok) conv = r.datos.conversacion_id
      return r.ok ? { ok: true } : r
    }, 'Mensaje enviado')
    if (ok) { setTexto(''); setArchivo(null); alEnviado(conv) }
  }
  return (
    <form className="flex flex-col gap-2 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); void mandar() }}>
      <Area etiqueta="Tu mensaje" valor={texto} alCambiar={setTexto} filas={3} max={5000} ayuda="Va a una sola persona. No sale ningún correo: le llega un aviso dentro del sistema." />
      {puede('archivo', 'crear') ? <CampoArchivo archivo={archivo} alCambiar={setArchivo} /> : null}
      <Button type="submit" className="w-fit" disabled={t.ocupado || texto.trim() === ''}><Send strokeWidth={2.4} aria-hidden="true" />{t.ocupado ? 'Enviando…' : 'Enviar'}</Button>
    </form>
  )
}

function Conversacion({ id, con, alVolver }: { id: number; con: string; alVolver: () => void }) {
  const d = useDatos<Hilo>(`/conversaciones/${id}`)
  const t = useTarea()
  const [reportando, setReportando] = useState(false)
  const [, setParams] = useSearchParams()
  const otro = d.datos?.participantes.find((p) => p.nombre === con)
  // Al abrir una conversación propia se marca como leída.
  useEffect(() => {
    if (d.datos?.acceso === 'participante') void actualizar(`/conversaciones/${id}/leer`)
  }, [d.datos?.acceso, d.datos?.mensajes.length, id])
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const h = d.datos
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={alVolver}><ArrowLeft strokeWidth={2.4} aria-hidden="true" />Volver</Button>
        <h2 className="min-w-0 flex-1 font-serif text-lg font-semibold text-ink">{h.participantes.map((p) => p.nombre).join(' y ')}</h2>
        {h.acceso === 'participante' ? <Button type="button" variant="outline" size="sm" onClick={() => setReportando(true)}><Flag strokeWidth={2.4} aria-hidden="true" />Reportar</Button> : null}
      </div>
      {h.acceso === 'reportada' ? (
        <Alert role="status"><AlertTitle>Conversación reportada</AlertTitle><AlertDescription>Estás consultando una conversación que una de las personas reportó. Esta consulta queda en la bitácora.</AlertDescription></Alert>
      ) : null}
      <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-lg border border-line bg-paper-2 p-3" aria-label="Mensajes de la conversación">
        {h.mensajes.map((m) => (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2 text-sm ${m.mio ? 'self-end bg-brand-soft' : 'self-start bg-card'}`}>
            <span className="text-xs font-semibold text-ink-3">{m.mio ? 'Tú' : m.autor} · {fechaHora(m.fecha)}</span>
            <span className="whitespace-pre-wrap text-ink">{m.texto}</span>
            {m.archivo ? <EnlaceArchivo archivo={m.archivo} /> : null}
          </li>
        ))}
      </ul>
      {h.acceso === 'participante' && otro ? <Redactar destinatario={otro.id} alEnviado={() => undefined} /> : null}
      <DialogoMotivo
        abierto={reportando}
        alCambiarApertura={setReportando}
        titulo="Reportar la conversación"
        descripcion="Coordinación podrá abrir esta conversación para revisarla. El reporte y la consulta quedan en la bitácora."
        etiqueta="Qué pasó"
        etiquetaAccion="Enviar el reporte"
        ocupado={t.ocupado}
        alConfirmar={(motivo) => void t.correr(async () => { const r = await enviar(`/conversaciones/${id}/reportar`, { motivo }); return r.ok ? { ok: true } : r }, 'Reporte enviado a Coordinación').then((ok) => { if (ok) { setReportando(false); setParams({}) } })}
      />
    </div>
  )
}

function Nuevo({ alAbrir }: { alAbrir: (id: number) => void }) {
  const d = useDatos<{ contactos: Contacto[] }>('/mensajes/contactos')
  const [para, setPara] = useState('')
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  if (d.datos.contactos.length === 0) return <Vacio titulo="No hay a quién escribirle" descripcion="Puedes escribir a tus docentes o alumnos de cursos del periodo abierto y a Coordinación." />
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-semibold text-ink">Mensaje nuevo</h2>
      <Lista etiqueta="Para" valor={para} alCambiar={setPara} opciones={[{ valor: '', etiqueta: 'Elige a una persona' }, ...d.datos.contactos.map((c) => ({ valor: String(c.id), etiqueta: `${c.nombre} (${c.rol})` }))]} />
      {para !== '' ? <Redactar destinatario={Number(para)} alEnviado={alAbrir} /> : null}
    </div>
  )
}

function Reportadas({ alAbrir }: { alAbrir: (id: number) => void }) {
  const d = useDatos<{ reportes: { id: number; conversacion_id: number; motivo: string; creado_en: string; reportado_por: string; participantes: string[] }[] }>('/conversaciones/reportadas')
  if (!d.datos || d.datos.reportes.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Conversaciones reportadas</h2>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
        {d.datos.reportes.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
            <span className="text-ink">{r.participantes.join(' y ')}</span>
            <span className="text-xs text-ink-3">Reportó {r.reportado_por} · {fechaHora(r.creado_en)}: {r.motivo}</span>
            <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => alAbrir(r.conversacion_id)}>Abrir la conversación</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Mensajes() {
  const { sesion } = useSesion()
  const [params, setParams] = useSearchParams()
  const lista = useDatos<{ conversaciones: Conversacion[] }>(sesion?.solo_lectura ? null : '/conversaciones')
  const elegida = Number(params.get('c')) || null
  const nuevo = params.get('nuevo') === '1'
  if (sesion?.solo_lectura)
    return (
      <Pagina titulo="Mensajes">
        <Alert role="status"><AlertTitle>Los mensajes no se abren desde "Ver como"</AlertTitle><AlertDescription>Son privados de cada persona. Sal de la vista para abrir los tuyos.</AlertDescription></Alert>
      </Pagina>
    )
  const abrir = (id: number) => setParams({ c: String(id) })
  const hayPanel = elegida !== null || nuevo
  const conv = lista.datos?.conversaciones.find((c) => c.id === elegida)
  return (
    <Pagina titulo="Mensajes" descripcion="Conversaciones de una persona a otra dentro del sistema. No salen por correo." acciones={<Button type="button" onClick={() => setParams({ nuevo: '1' })}><Plus strokeWidth={2.4} aria-hidden="true" />Mensaje nuevo</Button>}>
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos ? (
        <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={`flex flex-col gap-4 ${hayPanel ? 'hidden md:flex' : ''}`}>
            {lista.datos.conversaciones.length === 0 ? (
              <Vacio titulo="Todavía no tienes mensajes" descripcion="Cuando alguien te escriba, o tú escribas, la conversación aparece aquí." />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card" aria-label="Conversaciones">
                {lista.datos.conversaciones.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => abrir(c.id)} aria-current={c.id === elegida ? 'true' : undefined} className={`flex min-h-14 w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${c.id === elegida ? 'bg-paper-2' : ''}`}>
                      <span className="flex w-full items-center gap-2 text-sm font-medium text-ink"><span className="min-w-0 flex-1 truncate">{c.con?.nombre}</span>{c.sin_leer > 0 ? <Etiqueta tono="proceso">{c.sin_leer} nuevo{c.sin_leer === 1 ? '' : 's'}</Etiqueta> : null}</span>
                      <span className="w-full truncate text-xs text-ink-3">{c.ultimo ? `${c.ultimo.mio ? 'Tú: ' : ''}${c.ultimo.texto}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {sesion?.base === 'coordinacion' ? <Reportadas alAbrir={abrir} /> : null}
          </div>
          <div className={hayPanel ? '' : 'hidden md:block'}>
            {nuevo ? (
              <div className="flex flex-col gap-3">
                <Button type="button" variant="ghost" size="sm" className="w-fit md:hidden" onClick={() => setParams({})}><ArrowLeft strokeWidth={2.4} aria-hidden="true" />Volver</Button>
                <Nuevo alAbrir={abrir} />
              </div>
            ) : elegida !== null ? (
              <Conversacion key={elegida} id={elegida} con={conv?.con?.nombre ?? ''} alVolver={() => setParams({})} />
            ) : (
              <Vacio titulo="Elige una conversación" descripcion="O escribe un mensaje nuevo con el botón de arriba." />
            )}
          </div>
        </div>
      ) : null}
    </Pagina>
  )
}
