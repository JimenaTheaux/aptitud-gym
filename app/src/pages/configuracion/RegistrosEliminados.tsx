import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { ConfiguracionSubnav } from './ConfiguracionSubnav'
import { DataTable } from '../../components/ui/DataTable'
import { DateField } from '../../components/ui/DateField'
import { Drawer } from '../../components/ui/Drawer'
import { SelectField } from '../../components/ui/SelectField'
import { useAuth } from '../../contexts/AuthContext'
import {
  TABLAS_CON_LOG,
  detalleLegible,
  listRegistrosEliminados,
  resumenRegistroEliminado,
  tablaLabel,
  type CampoDetalle,
  type RegistroEliminadoConDetalle,
} from '../../lib/registrosEliminados'
import { formatearFecha } from '../../lib/formato'

function formatearFechaHora(iso: string): string {
  const hora = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${formatearFecha(iso)} · ${hora}`
}

function DetalleRegistroDrawer({
  registro,
  onClose,
}: {
  registro: RegistroEliminadoConDetalle | null
  onClose: () => void
}) {
  const [campos, setCampos] = useState<CampoDetalle[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!registro) return
    let active = true
    setLoading(true)
    detalleLegible(registro).then((data) => {
      if (!active) return
      setCampos(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [registro])

  if (!registro) return null

  return (
    <Drawer open onClose={onClose} title={`Detalle — ${tablaLabel(registro.tabla)}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-inter text-[13px] text-text-primary">{resumenRegistroEliminado(registro)}</p>
          <p className="font-inter text-[11px] text-text-secondary">
            Eliminado por {registro.admin?.nombre ?? 'desconocido'} · {formatearFechaHora(registro.eliminado_at)}
          </p>
        </div>

        {loading ? (
          <p className="font-inter text-[12px] text-text-secondary">Cargando detalle…</p>
        ) : (
          <dl className="flex flex-col rounded-[10px] border border-border-subtle bg-bg-input">
            {campos.map((campo, i) => (
              <div
                key={campo.label}
                className={`flex items-start justify-between gap-4 px-3 py-2 ${
                  i > 0 ? 'border-t border-border-subtle' : ''
                }`}
              >
                <dt className="font-inter text-[12px] text-text-secondary">{campo.label}</dt>
                <dd className="font-inter text-[13px] text-text-primary text-right">{campo.valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Drawer>
  )
}

export function RegistrosEliminadosPage() {
  const { rol } = useAuth()
  const [registros, setRegistros] = useState<RegistroEliminadoConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<RegistroEliminadoConDetalle | null>(null)
  const [filtroTabla, setFiltroTabla] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    listRegistrosEliminados({
      tabla: filtroTabla || undefined,
      desde: filtroDesde || undefined,
      hasta: filtroHasta || undefined,
    }).then((data) => {
      if (!active) return
      setRegistros(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [filtroTabla, filtroDesde, filtroHasta])

  if (rol !== 'admin') return <Navigate to="/" replace />

  const hayFiltrosActivos = Boolean(filtroTabla || filtroDesde || filtroHasta)

  function limpiarFiltros() {
    setFiltroTabla('')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <ConfiguracionSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
            Registros eliminados
          </h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Log de auditoría de filas borradas en el sistema — consulta, no restauración.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
            <div className="flex-1">
              <SelectField
                label="Tabla"
                value={filtroTabla}
                onChange={(e) => setFiltroTabla(e.target.value)}
              >
                <option value="">Todas</option>
                {TABLAS_CON_LOG.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex-1">
              <DateField
                label="Desde"
                value={filtroDesde}
                onChange={setFiltroDesde}
                max={filtroHasta || undefined}
              />
            </div>

            <div className="flex-1">
              <DateField
                label="Hasta"
                value={filtroHasta}
                onChange={setFiltroHasta}
                min={filtroDesde || undefined}
              />
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-11 shrink-0 rounded-[10px] border border-border-subtle px-4 font-montserrat text-[13px] font-bold text-text-secondary hover:text-text-primary xl:h-10"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <DataTable<RegistroEliminadoConDetalle>
          columns={[
            { header: 'Tabla', accessor: (r) => tablaLabel(r.tabla) },
            { header: 'Qué era', accessor: (r) => resumenRegistroEliminado(r) },
            { header: 'Quién lo borró', accessor: (r) => r.admin?.nombre ?? '—' },
            { header: 'Cuándo', accessor: (r) => formatearFechaHora(r.eliminado_at) },
          ]}
          data={registros}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => setSeleccionado(r)}
          loading={loading}
          emptyMessage={
            hayFiltrosActivos
              ? 'Ningún registro coincide con los filtros.'
              : 'Todavía no hay registros eliminados.'
          }
        />
      </div>

      <DetalleRegistroDrawer registro={seleccionado} onClose={() => setSeleccionado(null)} />
    </AppLayout>
  )
}
