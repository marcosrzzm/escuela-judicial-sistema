/** Calificación por actividades (12.7): categorías con peso y calculada de 0 a 10. La oficial es la que acepta Coordinación. */
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { actualizar } from '@/lib/api'
import { puntosLegibles, type CalificacionesCurso, type Categoria, type ContextoCurso } from '@/lib/aula'
import { useDatos } from '@/lib/datos'
import { Etiqueta, Tarjeta, Texto, Titulo, Vacio } from './ui'
import { useTarea } from './useTarea'
import { CalificacionPublicada } from './Tareas'

function Categorias({ ctx, categorias }: { ctx: ContextoCurso; categorias: Categoria[] }) {
  const [filas, setFilas] = useState(() => categorias.map((c) => ({ id: c.id as number | null, nombre: c.nombre, peso: String(c.peso) })))
  const t = useTarea()
  const suma = filas.reduce((s, f) => s + (Number(f.peso) || 0), 0)
  const bien = Math.abs(suma - 100) < 0.005
  const cambiar = (i: number, campo: 'nombre' | 'peso', v: string) => setFilas((p) => p.map((f, k) => (k === i ? { ...f, [campo]: v } : f)))
  return (
    <Tarjeta>
      <h3 className="font-serif text-lg font-semibold text-ink">Categorías y pesos</h3>
      <p className="text-sm text-ink-3">Cada tarea o examen se asigna a una categoría. Los pesos deben sumar 100.</p>
      {filas.map((f, i) => (
        <div key={f.id ?? `n${i}`} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
          <Texto etiqueta="Categoría" valor={f.nombre} alCambiar={(v) => cambiar(i, 'nombre', v)} max={80} deshabilitado={!ctx.escribe} />
          <Texto etiqueta="Peso %" tipo="number" valor={f.peso} alCambiar={(v) => cambiar(i, 'peso', v)} deshabilitado={!ctx.escribe} />
          {ctx.escribe ? <Button type="button" variant="ghost" size="icon" aria-label={`Quitar la categoría ${f.nombre}`} onClick={() => setFilas((p) => p.filter((_, k) => k !== i))}><Trash2 strokeWidth={2.4} aria-hidden="true" /></Button> : <span />}
        </div>
      ))}
      <p className={bien ? 'text-sm text-exito' : 'text-sm text-error'} role="status">Suman {puntosLegibles(suma)} {bien ? '(correcto)' : '(deben sumar 100)'}</p>
      {ctx.escribe ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={filas.length >= 12} onClick={() => setFilas((p) => [...p, { id: null, nombre: '', peso: '' }])}><Plus strokeWidth={2.4} aria-hidden="true" />Agregar categoría</Button>
          <Button type="button" size="sm" disabled={t.ocupado || !bien || filas.some((f) => f.nombre.trim() === '')} onClick={() => void t.correr(async () => { const r = await actualizar(`/cursos/${ctx.id}/categorias`, { categorias: filas.map((f) => ({ id: f.id, nombre: f.nombre, peso: f.peso })) }); return r.ok ? { ok: true } : r }, 'Categorías y pesos guardados')}>
            {t.ocupado ? 'Guardando…' : 'Guardar categorías'}
          </Button>
        </div>
      ) : null}
    </Tarjeta>
  )
}

const valor = (n: number | null | undefined) => (n === null || n === undefined ? 'Sin valor' : n.toFixed(1))

export function CalificacionesAula({ ctx }: { ctx: ContextoCurso }) {
  const d = useDatos<CalificacionesCurso>(`/cursos/${ctx.id}/calificaciones`)
  if (d.error) return <ErrorDatos error={d.error} reintentar={d.reintentar} />
  if (!d.datos) return <Cargando />
  const { categorias, actividades, calculada, alumnos, leyenda } = d.datos
  if (ctx.modo === 'alumno') {
    return (
      <>
        <Titulo>Calificaciones</Titulo>
        <Tarjeta>
          <p className="text-sm text-ink-3">Calificación calculada hasta hoy</p>
          <p className="text-4xl font-semibold text-ink num">{valor(calculada?.valor)}</p>
          <p className="text-xs text-ink-3">{leyenda}</p>
          {calculada && calculada.categorias.length > 0 ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
              {calculada.categorias.map((c) => <li key={c.id}>{c.nombre} ({puntosLegibles(c.peso)} %): <span className="font-medium text-ink num">{c.porcentaje === null ? 'sin calificar' : `${c.porcentaje} %`}</span></li>)}
            </ul>
          ) : null}
        </Tarjeta>
        {actividades.length === 0 ? <Vacio titulo="Todavía no hay actividades" /> : (
          <ul className="flex flex-col gap-3">
            {actividades.map((a) => (
              <li key={a.id}>
                <Tarjeta>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-ink">{a.titulo}</span><Etiqueta tono={a.calificacion ? 'exito' : 'neutro'}>{a.calificacion ? 'Calificada' : a.estado === 'entregada' ? 'Entregada' : 'Pendiente'}</Etiqueta></div>
                  {a.calificacion ? <CalificacionPublicada c={a.calificacion} puntos={a.puntos_posibles ?? 0} /> : <p className="text-sm text-ink-3">{a.estado === 'entregada' ? 'Tus puntos aparecen cuando el docente publique las calificaciones.' : 'Sin entrega todavía.'}</p>}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }
  return (
    <>
      <Titulo>Calificaciones del curso</Titulo>
      <Categorias key={categorias.map((c) => `${c.id}:${c.peso}:${c.nombre}`).join('|')} ctx={ctx} categorias={categorias} />
      {actividades.length === 0 ? (
        <Vacio titulo="Todavía no hay actividades publicadas que se califiquen" descripcion="Publica tareas o exámenes para ver aquí los puntos de cada alumno." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Puntos por alumno y actividad, con la calificación calculada</caption>
            <thead className="bg-paper-2 text-left text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              <tr>
                <th scope="col" className="px-3 py-2">Alumno</th>
                {actividades.map((a) => <th key={a.id} scope="col" className="px-3 py-2 text-right">{a.titulo} <span className="font-normal normal-case num">({puntosLegibles(a.puntos ?? 0)})</span>{a.publicadas ? '' : <span className="block font-normal normal-case text-alerta">sin publicar</span>}</th>)}
                <th scope="col" className="px-3 py-2 text-right">Calculada</th>
              </tr>
            </thead>
            <tbody>
              {(alumnos ?? []).map((al) => (
                <tr key={al.alumno_id} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">{al.nombre}</th>
                  {actividades.map((a) => <td key={a.id} className="px-3 py-2 text-right num">{al.celdas[String(a.id)] ?? <span className="text-ink-4">-</span>}</td>)}
                  <td className="px-3 py-2 text-right font-semibold num">{al.calculada === null ? <span className="text-ink-4">-</span> : al.calculada.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="max-w-2xl text-xs text-ink-3">{leyenda}</p>
    </>
  )
}
