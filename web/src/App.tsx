import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { BuscadorGlobal } from '@/componentes/BuscadorGlobal'
import { Shell } from '@/componentes/Shell'
import { useSesion } from '@/lib/sesion'
import { Asignacion, MisAsignaciones } from '@/paginas/MisAsignaciones'
import { CrearClave, RestablecerClave } from '@/paginas/AccesoPorEnlace'
import { Autorizaciones } from '@/paginas/Autorizaciones'
import { Bitacora } from '@/paginas/Bitacora'
import { Catalogos } from '@/paginas/Catalogos'
import { Boletas } from '@/paginas/Boletas'
import { CursoPagina } from '@/paginas/aula/Curso'
import { Mensajes } from '@/paginas/aula/Mensajes'
import { Entrar } from '@/paginas/Entrar'
import { Privacidad } from '@/paginas/Privacidad'
import { Avisos } from '@/paginas/Avisos'
import { Calendario } from '@/paginas/Calendario'
import { Cuenta } from '@/paginas/Cuenta'
import { GrupoPagina } from '@/paginas/GrupoPagina'
import { IrASeccionDeGrupo, ListaGrupos } from '@/paginas/ListaGrupos'
import { Tablero } from '@/paginas/Tablero'
import { Historial } from '@/paginas/Historial'
import { Lotes } from '@/paginas/Lotes'
import { Metricas } from '@/paginas/Metricas'
import { MiClave } from '@/paginas/MiClave'
import { NoEncontrado } from '@/paginas/NoEncontrado'
import { Revision } from '@/paginas/Revision'
import { Usuarios } from '@/paginas/Usuarios'

function ShellConBuscador() {
  return (
    <>
      <BuscadorGlobal />
      <Shell />
    </>
  )
}

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

export default function App() {
  const { sesion } = useSesion()
  // Al cambiar de cuenta no puede quedar nada leído por la anterior.
  useEffect(() => clienteConsultas.clear(), [sesion?.id])

  return (
    <QueryClientProvider client={clienteConsultas}>
      <Toaster position="bottom-right" duration={4000} closeButton />
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/crear-clave" element={<CrearClave />} />
        <Route path="/restablecer" element={<RestablecerClave />} />

        <Route element={<ShellConBuscador />}>
          <Route index element={<Tablero />} />
          <Route path="grupos" element={<ListaGrupos />} />
          <Route path="grupos/:id" element={<GrupoPagina />} />
          <Route path="grupos/:id/:seccion" element={<GrupoPagina />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="avisos" element={<Avisos />} />
          <Route path="cuenta" element={<Cuenta />} />
          <Route path="derecho" element={<IrASeccionDeGrupo seccion="derecho" />} />
          <Route path="revision" element={<Revision />} />
          <Route path="historial" element={<Historial />} />
          <Route path="cierre" element={<IrASeccionDeGrupo seccion="cierre" />} />
          <Route path="boletas/:cierreId" element={<Boletas />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="bitacora" element={<Bitacora />} />
          <Route path="asignaciones" element={<MisAsignaciones />} />
          <Route path="asignaciones/:id" element={<Asignacion />} />
          <Route path="asignaciones/:id/:tab" element={<Asignacion />} />
          <Route path="mensajes" element={<Mensajes />} />
          <Route path="cursos/:id" element={<CursoPagina />} />
          <Route path="cursos/:id/:tab" element={<CursoPagina />} />
          <Route path="autorizaciones" element={<Autorizaciones />} />
          <Route path="lotes" element={<Lotes />} />
          <Route path="listas" element={<ListaGrupos />} />
          <Route path="catalogos" element={<Catalogos />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="mi-clave" element={<MiClave />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </QueryClientProvider>
  )
}
