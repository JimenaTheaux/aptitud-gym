import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import type { Sucursal } from '../types/db'

// Contexto de sesión/dispositivo (doc 02 — "Modelo multi-sucursal"): la sucursal
// elegida acá NUNCA se guarda en la DB ni ata al perfil. Para admin es un filtro
// de vista; para kiosco es la sucursal física de la tablet. Vive solo en memoria
// mientras dure la sesión de la app — se pierde al recargar, y está bien así.
type SucursalContextValue = {
  sucursales: Sucursal[]
  loadingSucursales: boolean
  sucursalId: string | null
  setSucursalId: (id: string | null) => void
}

const SucursalContext = createContext<SucursalContextValue | null>(null)

export function SucursalProvider({ children }: { children: ReactNode }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loadingSucursales, setLoadingSucursales] = useState(true)
  const [sucursalId, setSucursalId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('sucursales')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        if (!active) return
        setSucursales((data as Sucursal[] | null) ?? [])
        setLoadingSucursales(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <SucursalContext.Provider
      value={{ sucursales, loadingSucursales, sucursalId, setSucursalId }}
    >
      {children}
    </SucursalContext.Provider>
  )
}

export function useSucursal() {
  const ctx = useContext(SucursalContext)
  if (!ctx) throw new Error('useSucursal debe usarse dentro de <SucursalProvider>')
  return ctx
}
