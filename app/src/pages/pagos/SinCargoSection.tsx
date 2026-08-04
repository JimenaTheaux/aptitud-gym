import { useEffect, useState } from 'react'
import { Calendar, Plus } from 'react-feather'
import { DataTable } from '../../components/ui/DataTable'
import { PinButton } from '../../components/ui/PinButton'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { listSinCargoGenerado } from '../../lib/pagos'
import { AsistenciasAlumnoDrawer } from './AsistenciasAlumnoDrawer'
import type { Alumno } from '../../types/db'

export function SinCargoSection({
  reloadToken,
  onAgregarCargo,
}: {
  reloadToken: number
  onAgregarCargo: (alumnoId: string) => void
}) {
  const { habilitado: pinHabilitado, togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('sin_cargo_generado')
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [loading, setLoading] = useState(true)
  const [asistenciasAlumno, setAsistenciasAlumno] = useState<Alumno | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listSinCargoGenerado().then((data) => {
      if (!active) return
      setAlumnos(data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reloadToken])

  return (
    <div className="flex flex-col gap-3">
      <p className="font-inter text-[13px] text-text-secondary">
        Alumnos que asistieron este período y todavía no tienen un cargo generado.
      </p>

      <DataTable<Alumno>
        columns={[
          {
            header: 'Alumno',
            accessor: (a) => `${a.apellido}, ${a.nombre}`,
          },
          { header: 'DNI', accessor: (a) => a.dni },
          {
            header: '',
            accessor: (a) => (
              <div className="flex items-center justify-end gap-2">
                {pinHabilitado && (
                  <PinButton
                    fijado={estaFijado(a.id)}
                    disabled={!estaFijado(a.id) && limiteAlcanzado}
                    onClick={() => togglePin(a.id)}
                    label={`Fijar ${a.apellido}, ${a.nombre}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setAsistenciasAlumno(a)}
                  className="flex items-center gap-1.5 rounded-[10px] border border-border-subtle px-3 py-1.5 font-montserrat text-[12px] font-bold text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                >
                  <Calendar size={13} />
                  Ver asistencias
                </button>
                <button
                  type="button"
                  onClick={() => onAgregarCargo(a.id)}
                  className="flex items-center gap-1.5 rounded-[10px] border border-accent-cyan px-3 py-1.5 font-montserrat text-[12px] font-bold text-accent-cyan outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                >
                  <Plus size={13} />
                  Agregar cargo
                </button>
              </div>
            ),
            className: 'text-right',
          },
        ]}
        data={alumnos}
        keyExtractor={(a) => a.id}
        loading={loading}
        tablaId="sin_cargo_generado"
        emptyMessage="No hay alumnos sin cargo generado este período."
      />

      {limiteAlcanzado && (
        <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
      )}

      <AsistenciasAlumnoDrawer
        open={asistenciasAlumno !== null}
        alumno={asistenciasAlumno}
        onClose={() => setAsistenciasAlumno(null)}
      />
    </div>
  )
}
