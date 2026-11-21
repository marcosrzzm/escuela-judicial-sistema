/**
 * Helpers de formulario. Todos controlados, con label 11px uppercase, ids
 * útiles (useId) y error con role="alert" conectado por aria-describedby.
 */
import { useId, type ChangeEvent, type ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function Campo({
  etiqueta,
  obligatorio,
  error,
  id,
  children,
}: {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  id?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
      >
        {etiqueta}
        {obligatorio ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" id={id ? `${id}-error` : undefined} className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface BaseCampo {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  disabled?: boolean
}

type EntradaCampoTexto =
  | { valor: string; alCambiar: (valor: string) => void; registro?: undefined }
  | { registro: UseFormRegisterReturn; valor?: undefined; alCambiar?: undefined }

/**
 * `valor`/`alCambiar` para formularios controlados a mano; `registro`
 * (el resultado de `register()` de react-hook-form) para los que usan zod.
 */
export function CampoTexto({
  etiqueta,
  obligatorio,
  error,
  disabled,
  placeholder,
  tipo = 'text',
  ...entrada
}: BaseCampo &
  EntradaCampoTexto & { placeholder?: string; tipo?: 'text' | 'email' | 'tel' | 'url' }) {
  const idGenerado = useId()
  const id = entrada.registro ? entrada.registro.name : idGenerado
  const propsEntrada = entrada.registro ?? {
    value: entrada.valor,
    onChange: (evento: ChangeEvent<HTMLInputElement>) => entrada.alCambiar(evento.target.value),
  }
  return (
    <Campo etiqueta={etiqueta} obligatorio={obligatorio} error={error} id={id}>
      <Input
        id={id}
        type={tipo}
        placeholder={placeholder}
        disabled={disabled}
        required={obligatorio}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...propsEntrada}
      />
    </Campo>
  )
}

export function CampoNumero({
  etiqueta,
  obligatorio,
  error,
  disabled,
  valor,
  alCambiar,
  placeholder,
  min,
  max,
  paso,
}: BaseCampo & {
  valor: string
  alCambiar: (valor: string) => void
  placeholder?: string
  min?: number
  max?: number
  paso?: number
}) {
  const id = useId()
  return (
    <Campo etiqueta={etiqueta} obligatorio={obligatorio} error={error} id={id}>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        className="text-right num"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={paso}
        disabled={disabled}
        required={obligatorio}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Campo>
  )
}

export function CampoFecha({
  etiqueta,
  obligatorio,
  error,
  disabled,
  valor,
  alCambiar,
}: BaseCampo & { valor: string; alCambiar: (valor: string) => void }) {
  const id = useId()
  return (
    <Campo etiqueta={etiqueta} obligatorio={obligatorio} error={error} id={id}>
      <Input
        id={id}
        type="date"
        className="num"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        disabled={disabled}
        required={obligatorio}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Campo>
  )
}

export interface OpcionCampo {
  valor: string
  etiqueta: string
}

export function CampoSelect({
  etiqueta,
  obligatorio,
  error,
  disabled,
  valor,
  alCambiar,
  opciones,
  placeholder = 'Selecciona una opción',
}: BaseCampo & {
  valor: string
  alCambiar: (valor: string) => void
  opciones: OpcionCampo[]
  placeholder?: string
}) {
  const id = useId()
  return (
    <Campo etiqueta={etiqueta} obligatorio={obligatorio} error={error} id={id}>
      <Select value={valor} onValueChange={alCambiar} disabled={disabled} required={obligatorio}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
  )
}

/** Área de texto para motivos y observaciones; se conecta con `register` de react-hook-form. */
export function CampoAreaTexto({
  etiqueta,
  obligatorio,
  error,
  disabled,
  placeholder,
  registro,
}: BaseCampo & { registro: UseFormRegisterReturn; placeholder?: string }) {
  const id = registro.name
  return (
    <Campo etiqueta={etiqueta} obligatorio={obligatorio} error={error} id={id}>
      <textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-20 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
        {...registro}
      />
    </Campo>
  )
}
