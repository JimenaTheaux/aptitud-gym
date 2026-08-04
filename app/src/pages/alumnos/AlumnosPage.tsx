import { useEffect, useMemo, useState } from 'react'
import { Edit2, Plus, Search, Trash2 } from 'react-feather'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { WhatsappIcon } from '../../components/icons/WhatsappIcon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { PinButton } from '../../components/ui/PinButton'
import { useAuth } from '../../contexts/AuthContext'
import { useSucursal } from '../../contexts/SucursalContext'
import { usePinnedRows } from '../../hooks/usePinnedRows'
import { deleteAlumno, listAlumnos } from '../../lib/alumnos'
import { getConfiguracionWhatsapp } from '../../lib/configuracion'
import { formatearCantidadDias, formatearFecha } from '../../lib/formato'
import { aplicarPlantilla, linkWhatsapp, registrarWhatsappEnvio } from '../../lib/whatsapp'
import { AltaAlumnoForm } from './AltaAlumnoForm'
import type { Alumno, ConfiguracionWhatsapp } from '../../types/db'

export function AlumnosPage() {
  const { perfil, rol } = useAuth()
  const { sucursales } = useSucursal()
  const { togglePin, estaFijado, limiteAlcanzado } = usePinnedRows('alumnos')
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [alumnoEditando, setAlumnoEditando] = useState<Alumno | null>(null)
  const [borrando, setBorrando] = useState<Alumno | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [configWhatsapp, setConfigWhatsapp] = useState<ConfiguracionWhatsapp | null>(null)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listAlumnos().then((data) => {
      if (!active) return
      setAlumnos(data)
      setLoading(false)
    })
    getConfiguracionWhatsapp().then((data) => {
      if (active) setConfigWhatsapp(data)
    })
    return () => {
      active = false
    }
  }, [])

  // Alumnos nuevos primero (orden alfabético en listAlumnos() es para los
  // selectores de otras pantallas — acá se reordena solo para esta vista).
  const alumnosOrdenados = useMemo(
    () => [...alumnos].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [alumnos],
  )

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return alumnosOrdenados
    return alumnosOrdenados.filter(
      (a) =>
        a.dni.toLowerCase().includes(texto) ||
        a.apellido.toLowerCase().includes(texto) ||
        a.nombre.toLowerCase().includes(texto),
    )
  }, [alumnosOrdenados, busqueda])

  if (rol === 'kiosco') return <Navigate to="/" replace />

  function handleCreated(alumno: Alumno) {
    setAlumnos((prev) =>
      alumnoEditando
        ? prev.map((a) => (a.id === alumno.id ? alumno : a))
        : [alumno, ...prev],
    )
    setDrawerOpen(false)
    setAlumnoEditando(null)
  }

  function handleEditar(alumno: Alumno) {
    setAlumnoEditando(alumno)
    setDrawerOpen(true)
  }

  function handleClose() {
    setDrawerOpen(false)
    setAlumnoEditando(null)
  }

  async function handleConfirmarBorrado() {
    if (!borrando) return
    setEliminandoId(borrando.id)
    setError(null)
    try {
      await deleteAlumno(borrando.id)
      setAlumnos((prev) => prev.filter((a) => a.id !== borrando.id))
      setBorrando(null)
    } catch {
      setError('No se pudo eliminar el alumno. Probá de nuevo.')
    } finally {
      setEliminandoId(null)
    }
  }

  async function handleEnviarWhatsapp(alumno: Alumno) {
    if (!perfil || !alumno.celular || !configWhatsapp) return
    setError(null)
    setEnviandoId(alumno.id)
    const mensaje = aplicarPlantilla(configWhatsapp.mensaje_bienvenida, alumno)
    try {
      window.open(linkWhatsapp(alumno.celular, mensaje), '_blank', 'noopener,noreferrer')
      await registrarWhatsappEnvio({
        alumno_id: alumno.id,
        plantilla_usada: mensaje,
        enviado_por: perfil.id,
      })
    } catch {
      setError('El link de WhatsApp se abrió, pero no se pudo guardar el registro del envío.')
    } finally {
      setEnviandoId(null)
    }
  }

  const sucursalNombre = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre ?? '—'

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-montserrat text-xl font-extrabold text-text-primary">
              Alumnos
            </h1>
            <p className="mt-1 font-inter text-[13px] text-text-secondary">
              {alumnos.length} alumno{alumnos.length === 1 ? '' : 's'} registrado
              {alumnos.length === 1 ? '' : 's'}.
            </p>
          </div>
          {(rol === 'admin' || rol === 'profesor') && (
            <button
              type="button"
              onClick={() => {
                setAlumnoEditando(null)
                setDrawerOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-[10px] bg-accent-cyan px-4 py-2 font-montserrat text-[13px] font-bold text-text-on-accent"
            >
              <Plus size={14} />
              Nuevo alumno
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por apellido, nombre o DNI…"
            aria-label="Buscar alumno"
            className="h-11 w-full rounded-[10px] border border-border-subtle bg-bg-input pl-9 pr-3 font-inter text-base text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-cyan xl:h-10 xl:text-[13px]"
          />
        </div>

        <DataTable<Alumno>
          columns={[
            { header: 'Alta', accessor: (a) => formatearFecha(a.created_at) },
            { header: 'Apellido y nombre', accessor: (a) => `${a.apellido}, ${a.nombre}` },
            { header: 'Sucursal', accessor: (a) => sucursalNombre(a.sucursal_alta_id) },
            { header: 'DNI', accessor: (a) => a.dni },
            { header: 'Celular', accessor: (a) => a.celular ?? '—' },
            { header: 'Días', accessor: (a) => formatearCantidadDias(a.cantidad_dias) ?? '—' },
            {
              header: '',
              accessor: (a) => (
                <div className="flex items-center justify-end gap-3">
                  {rol === 'admin' && (
                    <PinButton
                      fijado={estaFijado(a.id)}
                      disabled={!estaFijado(a.id) && limiteAlcanzado}
                      onClick={() => togglePin(a.id)}
                      label={`Fijar ${a.apellido}, ${a.nombre}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleEnviarWhatsapp(a)}
                    disabled={!a.celular || !configWhatsapp || enviandoId === a.id}
                    aria-label={`Enviar WhatsApp a ${a.apellido}, ${a.nombre}`}
                    title={a.celular ? undefined : 'Sin celular cargado'}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-cyan text-accent-cyan outline-none transition-colors hover:bg-accent-cyan/10 focus-visible:ring-2 focus-visible:ring-accent-cyan disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-muted disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <WhatsappIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditar(a)}
                    aria-label={`Editar ${a.apellido}, ${a.nombre}`}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    <Edit2 size={14} />
                  </button>
                  {rol === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setBorrando(a)}
                      disabled={eliminandoId === a.id}
                      aria-label={`Eliminar ${a.apellido}, ${a.nombre}`}
                      className="text-estado-error-text hover:opacity-80 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ),
              className: 'text-right',
            },
          ]}
          data={alumnosFiltrados}
          keyExtractor={(a) => a.id}
          loading={loading}
          tablaId="alumnos"
          emptyMessage={
            busqueda.trim()
              ? 'Ningún alumno coincide con la búsqueda.'
              : 'Todavía no hay alumnos registrados.'
          }
        />

        {limiteAlcanzado && (
          <p className="font-inter text-[11px] text-text-secondary">Máximo 5 filas fijadas.</p>
        )}
        {error && <p className="font-inter text-[11px] text-estado-error-text">{error}</p>}
      </div>

      <AltaAlumnoForm
        open={drawerOpen}
        mode="admin"
        alumno={alumnoEditando}
        onCreated={handleCreated}
        onClose={handleClose}
      />

      <ConfirmDialog
        open={Boolean(borrando)}
        title="Eliminar alumno"
        message={
          borrando
            ? `¿Eliminar a ${borrando.apellido}, ${borrando.nombre}? Se borra también su historial de asistencias, cargos y pagos. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={handleConfirmarBorrado}
        onCancel={() => setBorrando(null)}
      />
    </AppLayout>
  )
}
