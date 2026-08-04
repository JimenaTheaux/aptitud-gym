import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'react-feather'
import { MESES } from '../../lib/formato'

// Selector de fecha (día + mes + año) en dd-mm-aaaa, con calendario propio.
// Reemplaza <input type="date">: ese control nativo se muestra en el
// idioma/formato del navegador o SO del usuario sin forma de forzarlo desde
// HTML/CSS/JS — mismo problema que type="time"/type="month" (ver TimeField y
// PeriodoField), y en la práctica termina mostrándose en inglés (mm/dd/aaaa).
// Este campo deja escribir la fecha a mano o elegirla del calendario,
// siempre en dd-mm-aaaa.

type DateFieldProps = {
  label: string
  value: string // 'yyyy-mm-dd' o '' (sin fecha cargada)
  onChange: (value: string) => void
  required?: boolean
  error?: string
  id?: string
  min?: string // 'yyyy-mm-dd'
  max?: string // 'yyyy-mm-dd'
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function isoATexto(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

function textoAIso(texto: string): string {
  const match = texto.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return ''
  const [, dia, mes, anio] = match
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia))
  const valido =
    fecha.getFullYear() === Number(anio) &&
    fecha.getMonth() === Number(mes) - 1 &&
    fecha.getDate() === Number(dia)
  return valido ? `${anio}-${mes}-${dia}` : ''
}

// Inserta los guiones a medida que se escriben los números, sin permitir
// letras ni más de 8 dígitos (ddmmaaaa).
function formatearEntrada(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '').slice(0, 8)
  const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean)
  return partes.join('-')
}

export function DateField({ label, value, onChange, required, error, id, min, max }: DateFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined

  const [texto, setTexto] = useState(() => isoATexto(value))
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTexto(isoATexto(value))
  }, [value])

  useEffect(() => {
    if (!abierto) return
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [abierto])

  function handleTextoChange(entrada: string) {
    const formateado = formatearEntrada(entrada)
    setTexto(formateado)
    if (formateado === '') {
      onChange('')
    } else {
      const iso = textoAIso(formateado)
      if (iso) onChange(iso)
    }
  }

  // Si se aleja del campo con una fecha incompleta o inválida, no queda un
  // texto en pantalla que no coincide con lo que realmente se va a guardar.
  function handleBlur() {
    const iso = textoAIso(texto)
    if (!iso && texto !== '') {
      setTexto(isoATexto(value))
    }
  }

  function handleSeleccionar(iso: string) {
    onChange(iso)
    setTexto(isoATexto(iso))
    setAbierto(false)
  }

  return (
    <div className="flex flex-col gap-1.5" ref={contenedorRef}>
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

      <div className="relative">
        <input
          id={fieldId}
          value={texto}
          onChange={(e) => handleTextoChange(e.target.value)}
          onFocus={() => setAbierto(true)}
          onBlur={handleBlur}
          required={required}
          inputMode="numeric"
          placeholder="dd-mm-aaaa"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`h-11 w-full rounded-[10px] border bg-bg-input px-3 pr-10 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px] ${
            error ? 'border-estado-error-text' : 'border-border-subtle'
          }`}
        />
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Elegir del calendario"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary"
        >
          <CalendarIcon size={16} />
        </button>

        {abierto && <CalendarioPopover value={value} min={min} max={max} onSelect={handleSeleccionar} />}
      </div>

      {error && (
        <span id={errorId} className="font-inter text-[11px] text-estado-error-text">
          {error}
        </span>
      )}
    </div>
  )
}

function CalendarioPopover({
  value,
  min,
  max,
  onSelect,
}: {
  value: string
  min?: string
  max?: string
  onSelect: (iso: string) => void
}) {
  const seleccionada = value.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(`${value}T00:00:00`) : null
  const [cursor, setCursor] = useState(() => seleccionada ?? new Date())

  const anio = cursor.getFullYear()
  const mes = cursor.getMonth()
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7 // lunes = 0
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const celdas: (number | null)[] = [
    ...Array.from({ length: primerDiaSemana }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  function iso(dia: number) {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function fueraDeRango(dia: number) {
    const f = iso(dia)
    if (min && f < min) return true
    if (max && f > max) return true
    return false
  }

  return (
    <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-64 rounded-[10px] border border-border-subtle bg-bg-card p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(anio, mes - 1, 1))}
          aria-label="Mes anterior"
          className="rounded p-1 text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-montserrat text-[12px] font-bold text-text-primary">
          {MESES[mes]} {anio}
        </span>
        <button
          type="button"
          onClick={() => setCursor(new Date(anio, mes + 1, 1))}
          aria-label="Mes siguiente"
          className="rounded p-1 text-text-secondary hover:text-text-primary"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {DIAS_SEMANA.map((d, i) => (
          <span key={`h-${i}`} className="font-inter text-[10px] font-semibold text-text-muted">
            {d}
          </span>
        ))}
        {celdas.map((dia, i) =>
          dia === null ? (
            <span key={`v-${i}`} />
          ) : (
            <button
              key={`d-${i}`}
              type="button"
              disabled={fueraDeRango(dia)}
              onClick={() => onSelect(iso(dia))}
              className={`rounded-md py-1 font-inter text-[12px] text-text-primary hover:bg-bg-input disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent ${
                value === iso(dia) ? 'bg-accent-cyan font-bold text-text-on-accent hover:bg-accent-cyan' : ''
              }`}
            >
              {dia}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
