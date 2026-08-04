import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Users, CheckSquare, UserPlus } from 'react-feather'
import { AppLayout } from '../../components/layout/AppLayout'
import { StatTile } from '../../components/ui/StatTile'
import { RankingList, type RankingItem } from '../../components/ui/RankingList'
import { useAuth } from '../../contexts/AuthContext'
import {
  finSemanaActual,
  inicioSemanaActual,
  movimientoAlumnos,
  ocupacionSemanal,
  resumenMensual,
  type MovimientoAlumnos,
  type ResumenMensualData,
} from '../../lib/resumenes'
import { formatearFecha, formatearPeriodo } from '../../lib/formato'

export function ResumenProfesor() {
  const { rol } = useAuth()
  const [loading, setLoading] = useState(true)
  const [franjas, setFranjas] = useState<RankingItem[]>([])
  const [movimiento, setMovimiento] = useState<MovimientoAlumnos | null>(null)
  const [mensual, setMensual] = useState<ResumenMensualData | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      ocupacionSemanal(),
      movimientoAlumnos(inicioSemanaActual(), finSemanaActual()),
      resumenMensual(),
    ]).then(([franjasData, movimientoData, mensualData]) => {
      if (!active) return
      setFranjas(
        franjasData.map((f) => ({
          key: `${f.diaSemana}-${f.hora}`,
          label: `${f.diaSemana} ${f.hora}`,
          value: f.cantidad,
          valueLabel: `${f.cantidad} asist.`,
        })),
      )
      setMovimiento(movimientoData)
      setMensual(mensualData)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="font-montserrat text-xl font-extrabold text-text-primary">Resumen de turno</h1>
          <p className="mt-1 font-inter text-[13px] text-text-secondary">
            Semana del {formatearFecha(inicioSemanaActual())} al {formatearFecha(finSemanaActual())}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="Asistencias esta semana"
            value={loading ? '—' : (movimiento?.asistenciasTotales ?? 0)}
            icon={CheckSquare}
          />
          <StatTile
            label="Alumnos únicos"
            value={loading ? '—' : (movimiento?.alumnosUnicos ?? 0)}
            icon={Users}
          />
          <StatTile label="Altas nuevas" value={loading ? '—' : (movimiento?.altas ?? 0)} icon={UserPlus} />
        </div>

        <div>
          <h2 className="mb-3 font-montserrat text-base font-bold text-text-primary">
            Horarios de mayor ocupación
          </h2>
          <RankingList items={loading ? [] : franjas} emptyMessage="No hay asistencias esta semana." />
        </div>

        <div>
          <h2 className="mb-3 font-montserrat text-base font-bold text-text-primary">
            Resumen mensual {mensual && `· ${formatearPeriodo(mensual.periodo)}`}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Asistencias del mes"
              value={loading ? '—' : (mensual?.asistenciasTotales ?? 0)}
              icon={CheckSquare}
            />
            <StatTile
              label="Alumnos únicos"
              value={loading ? '—' : (mensual?.alumnosUnicos ?? 0)}
              icon={Users}
            />
            <StatTile label="Altas del mes" value={loading ? '—' : (mensual?.altas ?? 0)} icon={UserPlus} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
