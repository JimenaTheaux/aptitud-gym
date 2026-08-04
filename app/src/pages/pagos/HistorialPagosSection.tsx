import { useEffect, useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { FormField } from '../../components/ui/FormField'
import { PinButton } from '../../components/ui/PinButton'
import { useSucursal } from '../../contexts/SucursalContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { listPagosConDetalle, type PagoAdminDetalle } from '../../lib/pagos'
import { formatearFecha, formatearMonto, formatearPeriodo } from '../../lib/formato'

const FORMATO_MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const checkboxClass =
  'h-4 w-4 rounded accent-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan'

export function HistorialPagosSection({ reloadToken }: { reloadToken: number }) {
  const { sucursalId } = useSucursal()
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('historial_pagos')
  const [pagos, setPagos] = useState<PagoAdminDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    setLoading(true)
    listPagosConDetalle(sucursalId).then((data) => {
      if (!active) return
      setPagos(data)
      setSeleccionados(new Set())
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [sucursalId, reloadToken])

  // Filtro por sucursal o cambio de búsqueda: limpiar selección en vez de
  // intentar reconciliarla (Fase 1 — evita bugs de estado, ver doc 07).
  useEffect(() => {
    setSeleccionados(new Set())
  }, [busqueda])

  const pagosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return pagos
    return pagos.filter((p) => {
      const nombre = `${p.alumno?.apellido ?? ''} ${p.alumno?.nombre ?? ''}`.toLowerCase()
      const dni = p.alumno?.dni ?? ''
      return nombre.includes(query) || dni.includes(query)
    })
  }, [pagos, busqueda])

  const totalSeleccionado = useMemo(
    () =>
      pagosFiltrados
        .filter((p) => seleccionados.has(p.id))
        .reduce((acc, p) => acc + Number(p.monto), 0),
    [pagosFiltrados, seleccionados],
  )

  const todosSeleccionados =
    pagosFiltrados.length > 0 && pagosFiltrados.every((p) => seleccionados.has(p.id))

  function toggleTodos() {
    setSeleccionados(todosSeleccionados ? new Set() : new Set(pagosFiltrados.map((p) => p.id)))
  }

  function toggleUno(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns: DataTableColumn<PagoAdminDetalle>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={todosSeleccionados}
          onChange={toggleTodos}
          aria-label="Seleccionar todos los pagos"
          className={checkboxClass}
        />
      ),
      accessor: (p) => (
        <input
          type="checkbox"
          checked={seleccionados.has(p.id)}
          onChange={() => toggleUno(p.id)}
          aria-label={`Seleccionar pago de ${p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : 'alumno'}`}
          className={checkboxClass}
        />
      ),
      className: 'w-10',
    },
    {
      header: 'Alumno',
      accessor: (p) => (p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : '—'),
    },
    { header: 'Período', accessor: (p) => formatearPeriodo(p.periodo) },
    { header: 'Sucursal', accessor: (p) => p.sucursal?.nombre ?? '—' },
    { header: 'Profesor', accessor: (p) => p.profesor?.nombre ?? '—' },
    { header: 'Monto', accessor: (p) => formatearMonto(p.monto) },
    { header: 'Fecha de pago', accessor: (p) => formatearFecha(p.fecha_pago) },
    ...(pinHabilitado
      ? [
          {
            header: '',
            accessor: (p: PagoAdminDetalle) => (
              <PinButton
                fijado={estaFijado(p.id)}
                disabled={!estaFijado(p.id) && limiteAlcanzado}
                onClick={() => togglePin(p.id)}
                label={`Fijar pago de ${p.alumno ? `${p.alumno.apellido}, ${p.alumno.nombre}` : 'alumno'}`}
              />
            ),
            className: 'text-right',
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-3">
      <FormField
        label="Buscar alumno"
        placeholder="Nombre o DNI…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="sticky top-24 z-20 flex items-center justify-between rounded-[10px] border border-border-subtle bg-bg-input px-4 py-2.5">
        <span className="font-inter text-[13px] text-text-secondary">
          {seleccionados.size > 0
            ? `${seleccionados.size} pago${seleccionados.size === 1 ? '' : 's'} seleccionado${seleccionados.size === 1 ? '' : 's'}`
            : 'Ningún pago seleccionado'}
        </span>
        <p className="font-montserrat text-[15px] font-extrabold text-text-primary">
          Total: {FORMATO_MONEDA.format(totalSeleccionado)}
        </p>
      </div>

      <DataTable<PagoAdminDetalle>
        columns={columns}
        data={pagosFiltrados}
        keyExtractor={(p) => p.id}
        loading={loading}
        tablaId="historial_pagos"
        tagColumnIndex={1}
        emptyMessage={busqueda ? 'Ningún pago coincide con la búsqueda.' : 'Sin pagos registrados.'}
      />

      {limiteAlcanzado && (
        <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
      )}
    </div>
  )
}
