---
name: pwa-app-performance-audit
description: Diagnóstico y solución de lentitud percibida en PWAs (React + Vite) que consumen un backend tipo Supabase/Postgres — cuando la app anda perfecta en local pero se siente lenta o "trabada" en producción, cuando cambiar de pantalla muestra loading de más, o cuando actualizar a una versión nueva no se refleja hasta cerrar y reabrir la app. Usar al auditar una PWA existente por quejas de lentitud, al configurar cache de datos en el cliente, o al definir la estrategia de actualización de un service worker. Cubre TanStack Query (staleTime, invalidation), estrategias de update de service worker (silencioso vs. con aviso), y checklist de precache del app shell.
---

# Auditoría de Performance en PWAs — Cache y Updates

## Cuándo se usa esta skill
Alguien reporta: "en local anda perfecto, en producción se traba" / "cambio de pantalla y queda cargando" / "actualicé y no se ve el cambio hasta cerrar la app". Estos 3 síntomas casi nunca son un problema de infraestructura (servidor lento, plan insuficiente) — son 3 causas puntuales y conocidas.

## Diagnóstico rápido (antes de tocar código)

| Síntoma | Causa más probable |
|---|---|
| Anda bien en local, mal en producción | Falta cache de datos en cliente — cada navegación vuelve a pedir todo al backend |
| Cambiar de pantalla muestra loading | Sin cache + posible falta de code-splitting/precache del bundle |
| La app no refleja la última versión | Service worker sirviendo build viejo, sin estrategia de update clara |
| Se traba tras días sin uso | Backend en plan free con auto-pause por inactividad (ej. Supabase) — no es tema de esta skill, resolver con plan pago o automatización de keep-alive |

## 1. Cache de datos en cliente — TanStack Query

Sin esto, cada render/navegación repite la misma consulta al backend aunque los datos no hayan cambiado.

```bash
npm install @tanstack/react-query
```

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

```tsx
// Uso
const { data, isLoading } = useQuery({
  queryKey: ['alumnos', filtros],
  queryFn: () => fetchAlumnos(filtros),
  staleTime: 60_000, // catálogos que cambian poco
})
```

**Guía de `staleTime` por tipo de dato:**

| Tipo de dato | staleTime sugerido |
|---|---|
| Catálogos que casi no cambian (config, tipos, categorías) | 60s+ |
| Listas operativas (registros del día, movimientos) | 5-10s |
| Datos que se ven una sola vez por sesión (perfil propio) | Infinity (no revalidar) |
| Datos críticos que deben verse al instante tras una acción | invalidar manualmente tras la mutation, no depender del staleTime |

**Invalidación tras mutaciones:**
```tsx
const mutation = useMutation({
  mutationFn: registrarMovimiento,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['movimientos'] })
    queryClient.invalidateQueries({ queryKey: ['estado-cuenta'] })
  },
})
```

Regla: toda mutation que afecte una lista visible en otra pantalla invalida esa query — si no, el usuario ve datos viejos hasta un refresh manual.

---

## 2. Update del Service Worker — silencioso vs. con aviso

Con `vite-plugin-pwa`, el modo por default (`autoUpdate`) baja la versión nueva pero no siempre la aplica hasta recargar. Hay que decidir explícitamente el comportamiento:

**Silencioso (recomendado para apps internas / dispositivos fijos, sin usuarios externos):**
```tsx
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onNeedRefresh() {
    // recargar solo si no hay una operación en curso (form sin guardar, etc.)
    if (!hayFormularioAbierto()) window.location.reload()
  },
})
```

**Con aviso (recomendado para apps con usuarios externos, donde interrumpir molesta):**
```tsx
registerSW({
  onNeedRefresh() {
    mostrarToast({
      mensaje: 'Nueva versión disponible',
      accion: () => updateSW(true),
    })
  },
})
```

Regla: elegir uno de los dos explícitamente. El modo por default sin manejar `onNeedRefresh` es el que genera la queja de "no se actualiza".

---

## 3. Precache del app shell

El objetivo: que el JS/CSS de la app viva en el dispositivo después de la primera visita, y que solo los datos (API) viajen por red en cada uso.

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*|\.supabase\.co\/rest\/.*/,
        handler: 'NetworkFirst', // datos: nunca CacheFirst
      },
    ],
  },
})
```

**Checklist de verificación (DevTools → Network, modo "Offline" tras la primera carga):**
```
[ ] La app carga sin conexión (aunque los datos no actualicen)
[ ] Los assets (JS/CSS/fuentes) no vuelven a pedirse por red en la segunda visita
[ ] Las rutas con lazy loading (code-splitting) están precacheadas, no solo cacheadas on-demand
[ ] Las llamadas a datos (Supabase/API) siguen en NetworkFirst, nunca CacheFirst
```

---

## Anti-patterns — nunca hacer esto

```
❌ Refetch de todo en cada navegación sin staleTime
❌ CacheFirst en llamadas de datos (sirve información vieja sin avisar)
❌ Service worker sin manejar onNeedRefresh (el update queda "colgado")
❌ Recargar la app a la fuerza en medio de un form sin guardar
❌ Confundir un problema de cache/update con un problema de plan/infraestructura del backend
```
