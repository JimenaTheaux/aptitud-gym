import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { listPinned, pinRow, unpinRow } from '../lib/filasFijadas'

const LIMITE_POR_TABLA = 5

// Reutilizable en cualquier listado: `usePinnedRows('alumnos')`,
// `usePinnedRows('deudores')`, etc. — los 5 fijados son independientes por
// tabla. Gateado a rol admin acá adentro (no en cada pantalla): si el rol no
// es admin, no dispara la consulta y el hook queda inerte (togglePin no-op,
// estaFijado siempre false) — cubre también el caso profesor/kiosco viendo
// una tabla que tenga `tablaId` (doc 08, "Fijar filas").
export function usePinnedRows(tabla: string | undefined) {
  const { perfil, rol } = useAuth()
  const queryClient = useQueryClient()
  const adminId = perfil?.id ?? null
  const habilitado = Boolean(tabla) && rol === 'admin' && adminId !== null

  const queryKey = ['filas_fijadas', tabla, adminId] as const

  const { data: fijadas = [] } = useQuery({
    queryKey,
    queryFn: () => listPinned(tabla as string, adminId as string),
    enabled: habilitado,
  })

  const pinnedIds = useMemo(() => new Set(fijadas.map((f) => f.registro_id)), [fijadas])
  const limiteAlcanzado = pinnedIds.size >= LIMITE_POR_TABLA

  const pinMutation = useMutation({
    mutationFn: (registroId: string) => pinRow(tabla as string, registroId, adminId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const unpinMutation = useMutation({
    mutationFn: (registroId: string) => unpinRow(tabla as string, registroId, adminId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  function estaFijado(registroId: string) {
    return pinnedIds.has(registroId)
  }

  function togglePin(registroId: string) {
    if (!habilitado) return
    if (estaFijado(registroId)) {
      unpinMutation.mutate(registroId)
    } else if (!limiteAlcanzado) {
      pinMutation.mutate(registroId)
    }
  }

  return {
    habilitado,
    estaFijado,
    togglePin,
    limiteAlcanzado,
    isPending: pinMutation.isPending || unpinMutation.isPending,
  }
}
