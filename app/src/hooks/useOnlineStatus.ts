import { useEffect, useState } from 'react'

// navigator.onLine solo refleja si el dispositivo tiene una interfaz de red
// activa, no si Supabase es alcanzable — alcanza para el caso que importa acá
// (wifi/datos cortados a mitad de un check-in/check-out), no detecta cortes
// más finos (DNS, servidor caído) mientras la interfaz siga "up".
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
