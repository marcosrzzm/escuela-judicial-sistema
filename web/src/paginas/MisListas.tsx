import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { InsigniaEstado } from '@/componentes/Estados'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { SelectorGrupo, useSeleccionGrupo } from '@/componentes/SelectorGrupo'
import { TablaDatos, type ColumnaTabla } from '@/componentes/TablaDatos'
import type { AlumnoLista, ListaGrupo } from '@/lib/api'
import { useDatos } from '@/lib/datos'

export function MisListas() {
  const sel = useSeleccionGrupo()
  const lista = useDatos<ListaGrupo>(sel.grupo ? `/grupos/${sel.grupo.id}/lista` : null)
  const columnas: ColumnaTabla<AlumnoLista>[] = [
    { clave: 'identificador', encabezado: 'Matrícula', className: 'num' },
    { clave: 'nombre', encabezado: 'Alumno' },
    { clave: 'estado', encabezado: 'Estado', render: (a) => <InsigniaEstado estado={a.estado} /> },
  ]
  return (
    <Pagina
      titulo="Mis listas"
      descripcion="La lista vigente de los grupos que te corresponden, para consultar e imprimir."
      acciones={
        <Button type="button" onClick={() => window.print()} disabled={!lista.datos}>
          <Printer strokeWidth={2.4} aria-hidden="true" />
          Imprimir lista
        </Button>
      }
    >
      <div data-no-imprimir>
        <SelectorGrupo seleccion={sel} />
      </div>
      {sel.error ? <ErrorDatos error={sel.error} reintentar={sel.reintentar} /> : null}
      {lista.error ? <ErrorDatos error={lista.error} reintentar={lista.reintentar} /> : null}
      {sel.cargando || lista.cargando ? <Cargando /> : null}
      {!sel.cargando && !sel.grupo && !sel.error ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-paper-2 px-4 py-8 text-center text-sm text-ink-3">
          No tienes grupos asignados en este periodo. La Coordinación de Posgrados te asigna los
          grupos; si esperabas uno, avísale.
        </p>
      ) : null}
      {lista.datos ? (
        <>
          <h2 className="text-xl font-semibold text-ink">
            {lista.datos.grupo.clave} · {lista.datos.grupo.periodo}{' '}
            <span className="text-sm font-normal text-ink-3">
              {lista.datos.grupo.programa} · {lista.datos.grupo.turno}
            </span>
          </h2>
          <TablaDatos
            columnas={columnas}
            filas={lista.datos.alumnos}
            claveFila={(a) => a.inscripcion_id}
            descripcion={`Lista vigente de ${lista.datos.grupo.clave}`}
            vacio={{
              variante: 'vacio',
              titulo: 'Este grupo todavía no tiene alumnos',
              descripcion:
                'Coordinación da de alta a los alumnos; en cuanto lo haga, aparecen aquí sin que captures nada.',
            }}
          />
        </>
      ) : null}
    </Pagina>
  )
}
