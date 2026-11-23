/**
 * Botón "Guía" + panel derecho con secciones fijas: qué es, pasos, qué pasa
 * después, tropiezos comunes y el siguiente paso como enlace. Se abre sola la
 * primera vez que se visita cada pantalla (se recuerda cerrada en
 * localStorage) y el botón no se pinta si la pantalla no tiene guía propia:
 * un botón que abre un panel vacío es peor que no tenerlo.
 */
import { CircleHelp, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { guiaDeRuta } from '@/guia'

export function GuiaPantalla() {
  const ubicacion = useLocation()
  const guia = guiaDeRuta(ubicacion.pathname)
  const [abierta, setAbierta] = useState(false)

  if (!guia) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Guía de esta pantalla"
        onClick={() => setAbierta(true)}
      >
        <CircleHelp strokeWidth={2.4} aria-hidden="true" />
        <span className="hidden sm:inline">Guía</span>
      </Button>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{guia.titulo}</SheetTitle>
            <SheetDescription>Guía de esta pantalla.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-4 pb-6 text-sm leading-relaxed text-ink-2">
            <section>
              <h3 className="mb-1.5 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Qué es
              </h3>
              <p>{guia.queEs}</p>
            </section>

            <section>
              <h3 className="mb-1.5 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Pasos
              </h3>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5">
                {guia.pasos.map((paso) => (
                  <li key={paso}>{paso}</li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="mb-1.5 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Qué pasa después
              </h3>
              <p>{guia.despues}</p>
            </section>

            <section>
              <h3 className="mb-1.5 text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Tropiezos comunes
              </h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {guia.tropiezos.map((tropiezo) => (
                  <li key={tropiezo}>{tropiezo}</li>
                ))}
              </ul>
            </section>

            {guia.siguiente ? (
              <Link
                to={guia.siguiente.ruta}
                onClick={() => setAbierta(false)}
                className="inline-flex w-fit items-center gap-1 rounded-sm font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Siguiente paso: {guia.siguiente.etiqueta}
                <ChevronRight className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
