import {
  ClipboardCheck,
  FileWarning,
  PackageCheck,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import type { InicioCoordinacion } from '@/lib/api'
import { useDatos } from '@/lib/datos'
import { areasVisibles, rutaInicial } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'

function Contador({
  icono: Icono,
  cifra,
  etiqueta,
  detalle,
  ruta,
}: {
  icono: LucideIcon
  cifra: number
  etiqueta: string
  detalle: string
  ruta: string
}) {
  return (
    <Link
      to={ruta}
      className="group flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm transition-colors hover:border-line-strong hover:bg-paper-2"
    >
      <div className="flex items-center justify-between">
        <span
          className="grid size-10 place-items-center rounded-md bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <Icono strokeWidth={2.4} />
        </span>
        <p className="text-4xl font-semibold text-ink num">{cifra}</p>
      </div>
      <div>
        <p className="text-base font-semibold text-ink group-hover:underline">{etiqueta}</p>
        <p className="text-sm text-ink-3">{detalle}</p>
      </div>
    </Link>
  )
}

export function Inicio() {
  const { sesion } = useSesion()
  const tieneInicio = areasVisibles(sesion).some((a) => a.clave === 'inicio')
  const { datos, cargando, error, reintentar } = useDatos<InicioCoordinacion>(
    tieneInicio ? '/inicio' : null,
  )

  // Solo Coordinación tiene Inicio con contadores; los demás roles entran a su primera pantalla.
  if (sesion && !tieneInicio) return <Navigate to={rutaInicial(sesion)} replace />

  return (
    <Pagina
      titulo="Inicio"
      descripcion={`Hola, ${sesion?.nombre.split(' ').slice(-2).join(' ')}. Esto es lo que espera tu atención.`}
    >
      {cargando ? <Cargando /> : null}
      {error ? <ErrorDatos error={error} reintentar={reintentar} /> : null}
      {datos ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Contador
            icono={ClipboardCheck}
            cifra={datos.entregas_por_revisar}
            etiqueta="Entregas por revisar"
            detalle="Calificaciones enviadas por los docentes."
            ruta="/revision?estado=enviada"
          />
          <Contador
            icono={ShieldCheck}
            cifra={datos.decisiones_en_direccion}
            etiqueta="Esperando a Dirección"
            detalle={`Decisiones de evaluación. Cierres en autorización: ${datos.cierres_en_direccion}.`}
            ruta="/derecho"
          />
          <Contador
            icono={PackageCheck}
            cifra={datos.grupos_listos_para_cierre}
            etiqueta="Grupos listos para cierre"
            detalle="Todas sus entregas están aceptadas."
            ruta="/cierre"
          />
          <Contador
            icono={FileWarning}
            cifra={datos.lotes_con_discrepancias}
            etiqueta="Lotes con discrepancias"
            detalle="Traspasos que Carga externa reportó con diferencias."
            ruta="/cierre"
          />
        </div>
      ) : null}
    </Pagina>
  )
}
