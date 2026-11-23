/**
 * Buscador global con cmdk. Se abre con Ctrl+K / Cmd+K, con "/" para enfocar,
 * o con el evento `abrir-buscador` que dispara el botón del Shell: teclado y
 * botón entran por la misma puerta. "?" abre la hoja de atajos.
 */
import { FileText, Moon, Sun, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { HojaAtajos } from '@/componentes/HojaAtajos'
import { areasVisibles } from '@/lib/navegacion'
import { useSesion } from '@/lib/sesion'

/** Coincidencia sin acentos ni mayúsculas: "ana" encuentra "Ana Ruiz". */
function sinAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es')
}

function filtrar(valor: string, busqueda: string): number {
  return sinAcentos(valor).includes(sinAcentos(busqueda)) ? 1 : 0
}

export function BuscadorGlobal() {
  const navigate = useNavigate()
  const { sesion } = useSesion()

  const [abierto, setAbierto] = useState(false)
  const [atajosAbiertos, setAtajosAbiertos] = useState(false)

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      const enCampo = ['INPUT', 'TEXTAREA'].includes((evento.target as HTMLElement)?.tagName)

      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault()
        setAbierto((previo) => !previo)
        return
      }
      if (enCampo) return
      if (evento.key === '/') {
        evento.preventDefault()
        setAbierto(true)
        return
      }
      if (evento.key === '?') {
        evento.preventDefault()
        setAtajosAbiertos(true)
        return
      }
    }
    function alPedirBuscador() {
      setAbierto(true)
    }
    window.addEventListener('keydown', alTeclear)
    window.addEventListener('abrir-buscador', alPedirBuscador)
    return () => {
      window.removeEventListener('keydown', alTeclear)
      window.removeEventListener('abrir-buscador', alPedirBuscador)
    }
  }, [])

  function ir(ruta: string) {
    setAbierto(false)
    void navigate(ruta)
  }

  const pantallas = areasVisibles(sesion)

  return (
    <>
      <CommandDialog
        open={abierto}
        onOpenChange={setAbierto}
        title="Buscador global"
        description="Busca una pantalla o una acción y navega directo."
      >
        <Command filter={filtrar}>
          <CommandInput placeholder="Buscar pantalla o acción" />
          <CommandList>
            <CommandEmpty>Sin resultados para esa búsqueda.</CommandEmpty>

            <CommandGroup heading="Ir a">
              {pantallas.map((elemento) => {
                const Icono = elemento.icono
                return (
                  <CommandItem
                    key={elemento.ruta}
                    value={`pantalla ${elemento.etiqueta}`}
                    onSelect={() => ir(elemento.ruta)}
                  >
                    <Icono strokeWidth={2.4} aria-hidden="true" />
                    <span>{elemento.etiqueta}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandGroup heading="Acciones">
              <CommandItem
                value="alternar modo oscuro claro"
                onSelect={() => {
                  document.documentElement.classList.toggle('dark')
                  setAbierto(false)
                }}
              >
                {document.documentElement.classList.contains('dark') ? (
                  <Sun strokeWidth={2.4} aria-hidden="true" />
                ) : (
                  <Moon strokeWidth={2.4} aria-hidden="true" />
                )}
                Alternar modo oscuro
              </CommandItem>
              <CommandItem
                value="ver atajos de teclado ayuda"
                onSelect={() => {
                  setAbierto(false)
                  setAtajosAbiertos(true)
                }}
              >
                <FileText strokeWidth={2.4} aria-hidden="true" />
                Ver atajos de teclado
              </CommandItem>
              <AccionSalir onIr={ir} />
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <HojaAtajos abierto={atajosAbiertos} alCambiarApertura={setAtajosAbiertos} />
    </>
  )
}

function AccionSalir({ onIr }: { onIr: (ruta: string) => void }) {
  const { salir } = useSesion()
  return (
    <CommandItem
      value="cerrar sesion salir"
      onSelect={() => {
        void salir()
        onIr('/entrar')
      }}
    >
      <LogOut strokeWidth={2.4} aria-hidden="true" />
      Cerrar sesión
    </CommandItem>
  )
}
