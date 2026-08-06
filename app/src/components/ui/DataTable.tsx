import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { PinIcon } from '../icons/PinIcon'

export type DataTableColumn<T> = {
  header: ReactNode
  accessor: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Sin resultados.',
  loading = false,
  tablaId,
  getRowId,
  tagColumnIndex = 0,
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
  // Habilita "fijar fila" (doc 08) para este listado — identificador de tabla
  // en `filas_fijadas` ('alumnos', 'deudores', etc.). Solo admin (gateado
  // dentro de usePinnedRows). `getRowId` por si el id de fila a fijar difiere
  // del key de React (`keyExtractor`) — por default son el mismo.
  tablaId?: string
  getRowId?: (row: T) => string
  // Columna donde se apila el tag "Fijado" (default: la primera). Se puede
  // mover cuando la columna 0 no es contenido significativo — ej. una columna
  // angosta de checkbox de selección (ver HistorialPagosSection).
  tagColumnIndex?: number
}) {
  const { rol } = useAuth()
  const { estaFijado } = usePinnedRows(tablaId)
  const pinHabilitado = Boolean(tablaId) && rol === 'admin'
  const resolveRowId = getRowId ?? keyExtractor

  const scrollRef = useRef<HTMLDivElement>(null)
  // Con muchas columnas (ej. historial de pagos en tablet), la tabla no entra
  // en el ancho disponible: en vez de comprimir columnas hasta volverlas
  // ilegibles, scrollea horizontal y estos bordes con gradiente avisan que
  // hay más contenido a los costados.
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [columns.length, data.length])

  // Fijadas siempre arriba, por encima de cualquier orden/filtro ya aplicado
  // por la pantalla — partición estable (Array.sort es estable desde ES2019),
  // así el orden relativo dentro de cada grupo no cambia.
  const dataOrdenada = pinHabilitado
    ? [...data].sort(
        (a, b) => Number(estaFijado(resolveRowId(b))) - Number(estaFijado(resolveRowId(a))),
      )
    : data

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-card">
      <div ref={scrollRef} onScroll={updateScrollState} className="drawer-scroll overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`whitespace-nowrap px-3 py-2.5 font-inter text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center font-inter text-[13px] text-text-secondary"
                >
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center font-inter text-[13px] text-text-secondary"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              dataOrdenada.map((row) => {
                const fijada = pinHabilitado && estaFijado(resolveRowId(row))
                return (
                  <tr
                    key={keyExtractor(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-border-subtle last:border-b-0 ${
                      onRowClick ? 'cursor-pointer hover:bg-bg-input' : ''
                    } ${fijada ? 'border-l-[3px] border-l-accent-cyan bg-pin-row-bg' : ''}`}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={`whitespace-nowrap px-3 py-3 font-inter text-[13px] text-text-primary ${col.className ?? ''}`}
                      >
                        {fijada && i === tagColumnIndex ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-cyan px-2 py-0.5 font-inter text-[10px] font-semibold text-text-on-accent">
                              <PinIcon size={9} filled />
                              Fijado
                            </span>
                            {col.accessor(row)}
                          </div>
                        ) : (
                          col.accessor(row)
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg-card to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg-card to-transparent" />
      )}
    </div>
  )
}
