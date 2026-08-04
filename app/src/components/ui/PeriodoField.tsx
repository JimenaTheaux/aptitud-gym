import { MESES } from '../../lib/formato'

// Selector de período (mes + año) en español. Reemplaza <input type="month">:
// ese control nativo se renderiza en el idioma del navegador/SO del usuario
// (ver comentario en formato.ts), así que para garantizar español siempre
// armamos el selector con dos <select> propios.

type PeriodoFieldProps = {
  label: string
  value: string // 'yyyy-MM'
  onChange: (value: string) => void
  required?: boolean
  error?: string
  id?: string
  anioDesde?: number
  anioHasta?: number
}

const selectClass =
  'h-11 w-full rounded-[10px] border bg-bg-input px-3 font-inter text-base text-text-primary outline-none transition-colors focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px]'

export function PeriodoField({
  label,
  value,
  onChange,
  required,
  error,
  id,
  anioDesde,
  anioHasta,
}: PeriodoFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined

  const match = value.match(/^(\d{4})-(\d{2})$/)
  const anioValue = match?.[1] ?? ''
  const mesValue = match?.[2] ?? ''

  const anioActual = new Date().getFullYear()
  const anioSeleccionado = anioValue ? Number(anioValue) : anioActual
  const anioMin = Math.min(anioDesde ?? anioActual - 3, anioSeleccionado)
  const anioMax = Math.max(anioHasta ?? anioActual + 1, anioSeleccionado)
  const anios = Array.from({ length: anioMax - anioMin + 1 }, (_, i) => anioMin + i)

  function actualizar(mes: string, anio: string) {
    if (mes && anio) onChange(`${anio}-${mes}`)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-estado-error-text">
            *
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-2">
        <select
          id={fieldId}
          value={mesValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => actualizar(e.target.value, anioValue || String(anioActual))}
          className={`${selectClass} ${error ? 'border-estado-error-text' : 'border-border-subtle'}`}
        >
          {MESES.map((nombre, i) => (
            <option key={nombre} value={String(i + 1).padStart(2, '0')}>
              {nombre}
            </option>
          ))}
        </select>

        <select
          value={anioValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => actualizar(mesValue || '01', e.target.value)}
          className={`${selectClass} ${error ? 'border-estado-error-text' : 'border-border-subtle'}`}
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <span id={errorId} className="font-inter text-[11px] text-estado-error-text">
          {error}
        </span>
      )}
    </div>
  )
}
