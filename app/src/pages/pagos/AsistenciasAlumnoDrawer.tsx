import { useEffect, useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { listAsistenciasByAlumnoPeriodo, type AsistenciaAlumnoResumen } from '../../lib/asistencias'
import { formatearFecha, formatearHora, formatearPeriodo, periodoActual } from '../../lib/formato'
import type { Alumno } from '../../types/db'

export function AsistenciasAlumnoDrawer({
  open,
  alumno,
  onClose,
}: {
  open: boolean
  alumno: Alumno | null
  onClose: () => void
}) {
  const [asistencias, setAsistencias] = useState<AsistenciaAlumnoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const periodo = periodoActual()

  useEffect(() => {
    if (!open || !alumno) return
    let active = true
    setLoading(true)
    listAsistenciasByAlumnoPeriodo(alumno.id, periodo).then((data) => {
      if (!active) return
      setAsistencias(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [open, alumno, periodo])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={alumno ? `Asistencias de ${alumno.apellido}, ${alumno.nombre}` : 'Asistencias'}
    >
      <div className="flex flex-col gap-3">
        <p className="font-inter text-[13px] text-text-secondary">
          Período {formatearPeriodo(periodo)} — {asistencias.length}{' '}
          {asistencias.length === 1 ? 'asistencia' : 'asistencias'} en total.
        </p>

        <DataTable<AsistenciaAlumnoResumen>
          columns={[
            { header: 'Fecha', accessor: (a) => formatearFecha(a.fecha) },
            { header: 'Disciplina', accessor: (a) => a.disciplina?.nombre ?? '—' },
            { header: 'Hora', accessor: (a) => formatearHora(a.hora) },
          ]}
          data={asistencias}
          keyExtractor={(a) => a.id}
          loading={loading}
          emptyMessage="Sin asistencias registradas este período."
        />
      </div>
    </Drawer>
  )
}
