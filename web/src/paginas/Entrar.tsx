import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CampoTexto } from '@/componentes/CampoFormulario'
import { toast } from 'sonner'
import { avisar } from '@/lib/avisos'
import { rutaInicial, rutaPermitida } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'

const CUENTAS = [
  ['coordinacion@prueba.local', 'Coordinación'],
  ['docente.a@prueba.local', 'Docente A'],
  ['docente.b@prueba.local', 'Docente B'],
  ['direccion@prueba.local', 'Dirección'],
  ['carga@prueba.local', 'Carga externa'],
  ['auxiliar@prueba.local', 'Auxiliar'],
] as const

export function Entrar() {
  const { sesion, entrar, cargando } = useSesion()
  const ubicacion = useLocation()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [entrando, setEntrando] = useState(false)

  // Mientras se resuelve si ya hay sesión no se decide nada: sin este freno el formulario
  // parpadea y luego desaparece al recargar.
  if (cargando) return null
  const desde = (ubicacion.state as { desde?: Location } | null)?.desde
  // Un destino guardado de otra cuenta no se respeta si este rol no tiene esa pantalla.
  const destino = desde && sesion && rutaPermitida(desde.pathname, sesion.rol) ? desde : undefined
  if (sesion)
    return (
      <Navigate
        to={destino ? `${destino.pathname}${destino.search}` : rutaInicial(sesion.rol)}
        replace
      />
    )

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    const r = await entrar(correo.trim(), clave)
    setEntrando(false)
    if (r.ok) toast.dismiss()
    else avisar.error(r.error)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-2 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold tracking-[0.08em] text-brand uppercase">
            Prototipo · datos ficticios
          </p>
          <CardTitle className="text-2xl">Escuela Judicial</CardTitle>
          <CardDescription>
            Continuidad académica de la Coordinación de Posgrados. Entra con tu correo y tu
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form id="form-entrar" className="flex flex-col gap-4" onSubmit={alEnviar}>
            <CampoTexto
              etiqueta="Correo"
              tipo="email"
              obligatorio
              valor={correo}
              alCambiar={setCorreo}
              placeholder="nombre@prueba.local"
            />
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="clave"
                className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
              >
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="clave"
                  type={ver ? 'text' : 'password'}
                  required
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-3 hover:text-ink"
                >
                  {ver ? (
                    <EyeOff className="size-4" strokeWidth={2.4} />
                  ) : (
                    <Eye className="size-4" strokeWidth={2.4} />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={entrando || !correo || !clave}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {/* Solo en desarrollo: el build que se sube no trae cuentas ni contraseñas. */}
          {import.meta.env.DEV ? (
            <section className="flex flex-col gap-2 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-ink">Cuentas de prueba</h2>
              <p className="text-xs text-ink-3">
                Contraseña común: Prueba2026. Elige una para llenar el correo.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CUENTAS.map(([c, rol]) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCorreo(c)
                      setClave('Prueba2026')
                    }}
                  >
                    {rol}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
