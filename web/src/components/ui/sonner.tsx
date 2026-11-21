import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Sin next-themes (no está en la lista de dependencias autorizadas): el tema
 * se toma de la clase `dark` en <html>, que es la misma que controla el resto
 * del sistema.
 */
function Toaster(props: ToasterProps) {
  const esOscuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark")

  return (
    <Sonner
      theme={esOscuro ? "dark" : "light"}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
