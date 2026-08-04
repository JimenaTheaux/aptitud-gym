import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Delete, Search, User } from 'react-feather'
import { searchAlumnosByDni, searchAlumnosByNombre } from '../../lib/alumnos'
import type { Alumno } from '../../types/db'

const DNI_MIN_LEN = 2
const DNI_MAX_LEN = 10
const DNI_VALIDO_REGEX = /^\d{6,10}$/
const NOMBRE_MIN_LEN = 2
const DEBOUNCE_MS = 200

// Fila del teclado numérico en pantalla (kiosco táctil). El hueco antes del "0"
// se reemplaza por un botón "OK" que hace lo mismo que Enter en el teclado físico.
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ok', '0', 'borrar']

export function BuscarAlumnoPanel({
  onEncontrado,
  onNoEncontrado,
  onLimpiar,
}: {
  onEncontrado: (alumno: Alumno) => void
  onNoEncontrado: (dni: string) => void
  onLimpiar: () => void
}) {
  const [modo, setModo] = useState<'dni' | 'nombre'>('dni')
  const [dni, setDni] = useState('')
  const [nombreQuery, setNombreQuery] = useState('')
  const [resultados, setResultados] = useState<Alumno[]>([])
  const [buscando, setBuscando] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const dniInputRef = useRef<HTMLInputElement>(null)
  const nombreInputRef = useRef<HTMLInputElement>(null)

  const query = modo === 'dni' ? dni.trim() : nombreQuery.trim()

  // Búsqueda en vivo: resultados mientras se escribe, sin botón "buscar".
  useEffect(() => {
    const minLen = modo === 'dni' ? DNI_MIN_LEN : NOMBRE_MIN_LEN
    if (query.length < minLen) {
      setResultados([])
      setBuscando(false)
      return
    }

    let active = true
    setBuscando(true)
    const timeout = setTimeout(() => {
      const buscar = modo === 'dni' ? searchAlumnosByDni(query) : searchAlumnosByNombre(query)
      buscar.then((data) => {
        if (!active) return
        setResultados(data)
        setHighlightedIndex(0)
        setBuscando(false)
      })
    }, DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [modo, query])

  // Foco automático del input activo: compatible con teclado físico apenas se
  // cambia de modo, sin necesidad de tocar la pantalla primero.
  useEffect(() => {
    if (modo === 'dni') dniInputRef.current?.focus()
    else nombreInputRef.current?.focus()
  }, [modo])

  function handleCambiarModo(nuevoModo: 'dni' | 'nombre') {
    setModo(nuevoModo)
    setResultados([])
  }

  // "Reload" total de la vista: limpia tanto la búsqueda de este panel como
  // el resultado que haya quedado mostrándose en el panel de al lado.
  function handleLimpiarBusqueda() {
    setDni('')
    setNombreQuery('')
    setResultados([])
    onLimpiar()
    if (modo === 'dni') dniInputRef.current?.focus()
    else nombreInputRef.current?.focus()
  }

  function handleDniChange(valor: string) {
    setDni(valor.replace(/\D/g, '').slice(0, DNI_MAX_LEN))
  }

  function handleTecla(tecla: string) {
    if (tecla === 'borrar') {
      setDni((d) => d.slice(0, -1))
    } else if (tecla === 'ok') {
      handleConfirmar()
    } else {
      handleDniChange(dni + tecla)
    }
  }

  function handleSeleccionar(alumno: Alumno) {
    setDni('')
    setNombreQuery('')
    setResultados([])
    onEncontrado(alumno)
  }

  function handleConfirmar() {
    if (resultados.length > 0) {
      handleSeleccionar(resultados[highlightedIndex] ?? resultados[0])
    } else if (modo === 'dni' && DNI_VALIDO_REGEX.test(dni.trim())) {
      onNoEncontrado(dni.trim())
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, resultados.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      handleConfirmar()
    }
  }

  const sinCoincidenciasDni =
    modo === 'dni' && !buscando && DNI_VALIDO_REGEX.test(dni.trim()) && resultados.length === 0

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-card p-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleCambiarModo('dni')}
          className={`flex-1 rounded-[10px] border px-3 py-2 font-montserrat text-[13px] font-bold ${
            modo === 'dni'
              ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
              : 'border-border-subtle text-text-secondary'
          }`}
        >
          Por DNI
        </button>
        <button
          type="button"
          onClick={() => handleCambiarModo('nombre')}
          className={`flex-1 rounded-[10px] border px-3 py-2 font-montserrat text-[13px] font-bold ${
            modo === 'nombre'
              ? 'border-accent-cyan bg-bg-input text-[#8FDBFF]'
              : 'border-border-subtle text-text-secondary'
          }`}
        >
          Por nombre
        </button>
      </div>

      {modo === 'dni' ? (
        <>
          <input
            ref={dniInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={dni}
            onChange={(e) => handleDniChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="DNI"
            aria-label="DNI"
            className="h-14 w-full rounded-[10px] border border-border-subtle bg-bg-input text-center font-montserrat text-2xl font-extrabold tracking-[0.1em] text-text-primary outline-none placeholder:text-text-muted focus:border-accent-cyan"
          />

          <div className="grid grid-cols-3 gap-2">
            {TECLAS.map((tecla, i) => {
              if (tecla === 'ok') {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTecla(tecla)}
                    aria-label="Confirmar"
                    className="flex h-14 items-center justify-center rounded-[10px] border border-border-subtle bg-bg-input text-accent-cyan hover:border-accent-cyan"
                  >
                    <Check size={18} />
                  </button>
                )
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTecla(tecla)}
                  className="flex h-14 items-center justify-center rounded-[10px] border border-border-subtle bg-bg-input font-montserrat text-lg font-bold text-text-primary hover:border-accent-cyan"
                >
                  {tecla === 'borrar' ? (
                    <Delete size={18} className="text-estado-error-text" />
                  ) : (
                    tecla
                  )}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={nombreInputRef}
            type="text"
            value={nombreQuery}
            onChange={(e) => setNombreQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apellido o nombre…"
            aria-label="Buscar por nombre"
            className="h-11 w-full rounded-[10px] border border-border-subtle bg-bg-input pl-9 pr-3 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleLimpiarBusqueda}
        className="self-center rounded font-inter text-[12px] text-text-secondary underline decoration-1 underline-offset-2 outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-cyan"
      >
        Limpiar búsqueda
      </button>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto" role="listbox">
        {buscando && <p className="font-inter text-[12px] text-text-secondary">Buscando…</p>}

        {!buscando && modo === 'nombre' && query.length >= NOMBRE_MIN_LEN && resultados.length === 0 && (
          <p className="font-inter text-[12px] text-text-secondary">Sin resultados.</p>
        )}

        {sinCoincidenciasDni && (
          <button
            type="button"
            onClick={() => onNoEncontrado(dni.trim())}
            className="rounded-[10px] border border-border-subtle bg-bg-input px-3 py-3 text-left font-inter text-[12px] text-text-secondary hover:border-accent-cyan"
          >
            No encontramos a nadie con DNI {dni}. <span className="text-accent-cyan">¿Primera vez?</span>
          </button>
        )}

        {resultados.map((a, i) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={i === highlightedIndex}
            onClick={() => handleSeleccionar(a)}
            onMouseEnter={() => setHighlightedIndex(i)}
            className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-left ${
              i === highlightedIndex
                ? 'border-accent-cyan bg-bg-input'
                : 'border-border-subtle bg-bg-input hover:border-accent-cyan'
            }`}
          >
            <User size={14} className="shrink-0 text-text-secondary" />
            <span className="font-inter text-[13px] text-text-primary">
              {a.apellido}, {a.nombre} <span className="text-text-secondary">({a.dni})</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
