import { Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import type { Boletas as TipoBoletas } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { etiquetaEstado } from '@/lib/estados'
import { fechaHora } from '@/lib/formulario'

export function Boletas() {
  const { cierreId } = useParams()
  const d = useDatos<TipoBoletas>(`/cierres/${Number(cierreId)}/boletas`)
  const datos = d.datos
  return (
    <Pagina
      titulo="Boletas del cierre"
      descripcion={
        datos
          ? `Grupo ${datos.cierre.grupo}, periodo ${datos.cierre.periodo}, cierre versión ${datos.cierre.version}. ${datos.boletas.length} boletas, una por página al imprimir.`
          : undefined
      }
      acciones={
        <>
          <Button asChild variant="outline" data-no-imprimir>
            <Link to="/cierre">Volver a Cierre y lote</Link>
          </Button>
          <Button type="button" onClick={() => window.print()} disabled={!d.datos} data-no-imprimir>
            <Printer strokeWidth={2.4} aria-hidden="true" />
            Imprimir boletas
          </Button>
        </>
      }
    >
      {d.error ? <ErrorDatos error={d.error} reintentar={d.reintentar} /> : null}
      {d.cargando ? <Cargando /> : null}
      {datos
        ? datos.boletas.map((b) => (
            <article
              key={b.identificador}
              className="rounded-lg border border-line bg-card p-6 print:break-after-page print:rounded-none print:border-0"
            >
              <header className="flex flex-col gap-1 border-b border-line pb-3">
                <p className="text-xs font-semibold tracking-[0.08em] text-brand uppercase">
                  Escuela Judicial del Supremo Tribunal de Justicia del Estado de Jalisco ·
                  Prototipo, datos ficticios
                </p>
                <h2 className="text-2xl font-semibold text-ink">Boleta de calificaciones</h2>
                <p className="text-sm text-ink-2">
                  {b.nombre} · <span className="num">{b.identificador}</span>
                </p>
                <p className="text-sm text-ink-3">
                  Periodo {datos.cierre.periodo} · grupo {datos.cierre.grupo} · cierre versión{' '}
                  {datos.cierre.version}
                  {datos.lote ? ` · lote generado ${fechaHora(datos.lote.fecha_generacion)}` : ''}
                </p>
              </header>
              <table className="my-4 w-full text-sm">
                <caption className="sr-only">Calificaciones de {b.nombre}</caption>
                <thead className="text-left text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <tr>
                    <th scope="col" className="py-1">
                      Materia
                    </th>
                    <th scope="col" className="py-1">
                      Docente
                    </th>
                    <th scope="col" className="py-1 text-right">
                      Calificación
                    </th>
                    <th scope="col" className="py-1 pl-3">
                      Estatus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {b.materias.map((m) => (
                    <tr key={m.materia} className="border-t border-line">
                      <td className="py-1.5">{m.materia}</td>
                      <td className="py-1.5 text-ink-3">{m.docente}</td>
                      <td className="py-1.5 text-right num">
                        {m.valor === null ? 'Sin valor' : m.valor.toFixed(1)}
                      </td>
                      <td className="py-1.5 pl-3">{etiquetaEstado(m.estatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t-2 border-dashed border-line-strong pt-3 text-center text-sm font-semibold tracking-[0.06em] text-ink-2 uppercase">
                {datos.leyenda}
              </p>
            </article>
          ))
        : null}
    </Pagina>
  )
}
