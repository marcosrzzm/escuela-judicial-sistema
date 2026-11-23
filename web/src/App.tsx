import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { BuscadorGlobal } from '@/componentes/BuscadorGlobal'
import { Shell } from '@/componentes/Shell'
import { useSesion } from '@/lib/sesion'
import { Asignacion, MisAsignaciones } from '@/paginas/MisAsignaciones'
import { Autorizaciones } from '@/paginas/Autorizaciones'
import { Bitacora } from '@/paginas/Bitacora'
import { Catalogos } from '@/paginas/Catalogos'
import { Boletas } from '@/paginas/Boletas'
import { CierreLote } from '@/paginas/Cierre'
import { Derecho } from '@/paginas/Derecho'
import { Entrar } from '@/paginas/Entrar'
import { Grupos } from '@/paginas/Grupos'
import { Historial } from '@/paginas/Historial'
import { Inicio } from '@/paginas/Inicio'
import { Lotes } from '@/paginas/Lotes'
import { Metricas } from '@/paginas/Metricas'
import { MiClave } from '@/paginas/MiClave'
import { MisListas } from '@/paginas/MisListas'
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

        <Route element={<ShellConBuscador />}>
          <Route index element={<Inicio />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="derecho" element={<Derecho />} />
          <Route path="revision" element={<Revision />} />
          <Route path="historial" element={<Historial />} />
          <Route path="cierre" element={<CierreLote />} />
          <Route path="boletas/:cierreId" element={<Boletas />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="bitacora" element={<Bitacora />} />
          <Route path="asignaciones" element={<MisAsignaciones />} />
          <Route path="asignaciones/:id" element={<Asignacion />} />
          <Route path="autorizaciones" element={<Autorizaciones />} />
          <Route path="lotes" element={<Lotes />} />
          <Route path="listas" element={<MisListas />} />
          <Route path="catalogos" element={<Catalogos />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="mi-clave" element={<MiClave />} />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </QueryClientProvider>
  )
}
