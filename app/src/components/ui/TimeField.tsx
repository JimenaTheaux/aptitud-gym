// Selector de hora (HH + mm) en 24hs. Reemplaza <input type="time">: ese
// control nativo se renderiza en 12hs (AM/PM) o 24hs según el idioma del
// navegador del usuario, sin forma de forzarlo desde HTML/CSS/JS — mismo
// problema que <input type="month"> (ver PeriodoField), así que armamos el
// selector con dos <select> propios para garantizar 24hs siempre.

type TimeFieldProps = {
  label: string
  value: string // 'HH:mm' o '' (sin hora cargada)
  onChange: (value: string) => void
  required?: boolean
  error?: string
  id?: string
}

const selectClass =
  'h-11 w-16 rounded-[10px] border bg-bg-input px-2 text-center font-inter text-base text-text-primary outline-none transition-colors focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px]'

const HORAS = ['', ...Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))]
const MINUTOS = ['', ...Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))]

export function TimeField({ label, value, onChange, required, error, id }: TimeFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined

  const match = value.match(/^(\d{2}):(\d{2})/)
  const horaValue = match?.[1] ?? ''
  const minutoValue = match?.[2] ?? ''

  function actualizarHora(hora: string) {
    onChange(hora ? `${hora}:${minutoValue || '00'}` : '')
  }

  function actualizarMinuto(minuto: string) {
    onChange(minuto ? `${horaValue || '00'}:${minuto}` : '')
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

      <div className="flex items-center gap-1.5">
        <select
          id={fieldId}
          value={horaValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          aria-label={`${label} — hora`}
          onChange={(e) => actualizarHora(e.target.value)}
          className={`${selectClass} ${error ? 'border-estado-error-text' : 'border-border-subtle'}`}
        >
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {h || '--'}
            </option>
          ))}
        </select>
        <span className="font-inter text-base text-text-secondary">:</span>
        <select
          value={minutoValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          aria-label={`${label} — minutos`}
          onChange={(e) => actualizarMinuto(e.target.value)}
          className={`${selectClass} ${error ? 'border-estado-error-text' : 'border-border-subtle'}`}
        >
          {MINUTOS.map((m) => (
            <option key={m} value={m}>
              {m || '--'}
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
