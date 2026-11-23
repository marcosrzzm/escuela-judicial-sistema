/** Cuenta (especificación, 11.6): datos, contraseña, tema y sesiones abiertas. */
import { KeyRound, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Cargando, ErrorDatos } from '@/componentes/EstadoCarga'
import { Pagina } from '@/componentes/Pagina'
import { cerrarSesionAbierta, type SesionAbierta } from '@/lib/api'
import { useAccion, useDatos } from '@/lib/datos'
import { fechaHora } from '@/lib/formulario'
import { usePreferencias } from '@/lib/preferencias'
import { useSesion } from '@/lib/sesion'

export function Cuenta() {
  const { sesion } = useSesion()
  const prefs = usePreferencias()
  const s = useDatos<{ filas: SesionAbierta[] }>('/cuenta/sesiones')
  const cerrar = useAccion((id: number) => cerrarSesionAbierta(id), {
    exito: () => 'Sesión cerrada',
  })
  if (!sesion) return null
  return (
    <Pagina
      titulo="Cuenta"
      descripcion="Tus datos, tu contraseña, el tema de la pantalla y los lugares donde tienes la sesión abierta."
    >
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <section
          className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5"
          aria-labelledby="datos"
        >
          <h2 id="datos" className="text-lg font-semibold text-ink">
            Tus datos
          </h2>
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-ink-3">Nombre</dt>
            <dd className="text-ink">{sesion.nombre}</dd>
            <dt className="text-ink-3">Correo</dt>
            <dd className="break-all text-ink">{sesion.correo}</dd>
            <dt className="text-ink-3">Rol</dt>
            <dd className="text-ink">{sesion.rol_nombre}</dd>
          </dl>
          <p className="text-xs text-ink-3">
            El correo y el rol los cambia la Coordinación de Posgrados.
          </p>
        </section>

        <section
          className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5"
          aria-labelledby="ajustes"
        >
          <h2 id="ajustes" className="text-lg font-semibold text-ink">
            Contraseña y pantalla
          </h2>
          <Button asChild variant="outline" className="w-fit">
            <Link to="/mi-clave">
              <KeyRound strokeWidth={2.4} aria-hidden="true" />
              Cambiar mi contraseña
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={prefs.alternarTema}
              aria-pressed={prefs.oscuro}
            >
              {prefs.oscuro ? (
                <Sun strokeWidth={2.4} aria-hidden="true" />
              ) : (
                <Moon strokeWidth={2.4} aria-hidden="true" />
              )}
              Tema {prefs.oscuro ? 'oscuro: pasar a claro' : 'claro: pasar a oscuro'}
            </Button>
          </div>
        </section>
      </div>

      <section className="flex max-w-4xl flex-col gap-3" aria-labelledby="sesiones">
        <h2 id="sesiones" className="text-lg font-semibold text-ink">
          Sesiones abiertas
        </h2>
        {s.error ? <ErrorDatos error={s.error} reintentar={s.reintentar} /> : null}
        {s.cargando ? <Cargando /> : null}
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-card">
          {(s.datos?.filas ?? []).map((x) => (
            <li
              key={x.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="flex flex-col">
                <span className="font-medium text-ink">
                  {x.actual ? 'Esta sesión' : 'Otra sesión'}
                </span>
                <span className="text-xs text-ink-3">
                  Iniciada {fechaHora(x.creado_en)} · último uso {fechaHora(x.ultimo_uso)}
                </span>
              </span>
              {x.actual ? null : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cerrar.ocupado || sesion.solo_lectura}
                  onClick={() => cerrar.ejecutar(x.id)}
                >
                  Cerrar sesión
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Pagina>
  )
}
