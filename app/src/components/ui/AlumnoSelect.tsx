import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, X } from 'react-feather'
import type { Alumno } from '../../types/db'

function etiqueta(a: Alumno) {
  return `${a.apellido}, ${a.nombre}`
}

function coincide(a: Alumno, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    a.dni.includes(q) ||
    a.apellido.toLowerCase().includes(q) ||
    a.nombre.toLowerCase().includes(q)
  )
}

const MAX_RESULTADOS = 30

// Combobox de búsqueda por nombre o DNI, para reemplazar los <select> nativos
// en formularios con listas de alumnos largas (imposibles de recorrer scrolleando).
export function AlumnoSelect({
  label,
  alumnos,
  value,
  onChange,
  required,
  error,
  placeholder = 'Buscar por nombre o DNI…',
}: {
  label: string
  alumnos: Alumno[]
  value: string
  onChange: (alumnoId: string) => void
  required?: boolean
  error?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const listboxId = useId()
  const errorId = error ? `${inputId}-error` : undefined

  const seleccionado = alumnos.find((a) => a.id === value) ?? null

  // Refleja el valor controlado (reset de form, preselección desde otra pantalla)
  // en el texto mostrado, salvo mientras el usuario está escribiendo/buscando.
  useEffect(() => {
    if (open) return
    setQuery(seleccionado ? `${etiqueta(seleccionado)} (${seleccionado.dni})` : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const resultados = open ? alumnos.filter((a) => coincide(a, query)).slice(0, MAX_RESULTADOS) : []

  function handleSeleccionar(alumno: Alumno) {
    onChange(alumno.id)
    setQuery(`${etiqueta(alumno)} (${alumno.dni})`)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, resultados.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const alumno = resultados[highlightedIndex]
      if (alumno) handleSeleccionar(alumno)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
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
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (value) onChange('')
          }}
          onKeyDown={handleKeyDown}
          className={`h-11 w-full rounded-[10px] border bg-bg-input pl-3 pr-16 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan focus-visible:ring-2 focus-visible:ring-accent-cyan xl:h-10 xl:text-[13px] ${
            error ? 'border-estado-error-text' : 'border-border-subtle'
          }`}
        />

        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar selección"
              className="flex h-6 w-6 items-center justify-center rounded text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-cyan"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} className="pointer-events-none text-text-muted" />
        </div>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            className="drawer-scroll absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[10px] border border-border-subtle bg-bg-card p-1 shadow-none"
          >
            {resultados.length === 0 && (
              <li className="px-3 py-2 font-inter text-[13px] text-text-secondary">Sin resultados.</li>
            )}
            {resultados.map((a, i) => (
              <li key={a.id} role="option" aria-selected={a.id === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSeleccionar(a)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left font-inter text-[13px] outline-none ${
                    i === highlightedIndex ? 'bg-bg-input text-text-primary' : 'text-text-primary hover:bg-bg-input'
                  }`}
                >
                  <span>{etiqueta(a)}</span>
                  <span className="shrink-0 text-text-secondary">{a.dni}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <span id={errorId} className="font-inter text-[11px] text-estado-error-text">
          {error}
        </span>
      )}
    </div>
  )
}
