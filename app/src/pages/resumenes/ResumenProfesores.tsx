import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { PeriodoField } from '../../components/ui/PeriodoField'
import { useAuth } from '../../contexts/AuthContext'
import {
  formatearHoras,
  listHorariosProfesorEnRango,
  resumenPorProfesor,
  type HorarioProfesorConNombre,
  type ResumenProfesor,
} from '../../lib/horariosProfesor'
import { formatearFecha, formatearHora, formatearPeriodo, periodoActual, rangoDelMes } from '../../lib/formato'
import { ResumenesSubnav } from './ResumenesSubnav'

export function ResumenProfesores() {
  const { rol } = useAuth()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [horarios, setHorarios] = useState<HorarioProfesorConNombre[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<ResumenProfesor | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    const { inicio, fin } = rangoDelMes(periodo)
    listHorariosProfesorEnRango(inicio, fin).then((data) => {
      if (!active) return
      setHorarios(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [periodo])

  if (rol !== 'admin') return <Navigate to="/resumenes" replace />

  const resumen = resumenPorProfesor(horarios)
  const detalle = seleccionado
    ? [...horarios]
        .filter((h) => h.profesor_id === seleccionado.profesorId)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : []

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <ResumenesSubnav />

        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Profesores</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Horas trabajadas y módulos marcados por profesor.
          </p>
        </div>

        <div className="max-w-[280px]">
          <PeriodoField label="Período" value={periodo} onChange={setPeriodo} />
        </div>

        <DataTable<ResumenProfesor>
          columns={[
            { header: 'Nombre y apellido', accessor: (r) => r.profesorNombre },
            { header: 'Horas total', accessor: (r) => formatearHoras(r.horas) },
            { header: 'Módulos 2hs', accessor: (r) => r.modulos2hs },
            { header: 'Módulos 3hs', accessor: (r) => r.modulos3hs },
            { header: 'Sin módulo', accessor: (r) => r.sinModulo },
          ]}
          data={resumen}
          keyExtractor={(r) => r.profesorId}
          loading={loading}
          onRowClick={setSeleccionado}
          emptyMessage={`Sin registros en ${formatearPeriodo(periodo)}.`}
        />
      </div>

      <Drawer
        open={Boolean(seleccionado)}
        onClose={() => setSeleccionado(null)}
        title={seleccionado ? `${seleccionado.profesorNombre} — ${formatearPeriodo(periodo)}` : undefined}
      >
        <DataTable<HorarioProfesorConNombre>
          columns={[
            { header: 'Fecha', accessor: (h) => formatearFecha(h.fecha) },
            { header: 'Entrada', accessor: (h) => (h.hora_entrada ? formatearHora(h.hora_entrada) : '—') },
            { header: 'Salida', accessor: (h) => (h.hora_salida ? formatearHora(h.hora_salida) : 'En curso') },
            { header: 'Sucursal', accessor: (h) => h.sucursal?.nombre ?? '—' },
          ]}
          data={detalle}
          keyExtractor={(h) => h.id}
          emptyMessage="Sin registros."
        />
      </Drawer>
    </AppLayout>
  )
}
