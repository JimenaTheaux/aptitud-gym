# 05 — Stack técnico

Reutilizado de TROPA GYM (funcionando en producción). Mismas decisiones salvo lo indicado en "Diferencias".

## Frontend
| Capa | Elección |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 (bundler Rolldown — API de code-splitting distinta a Vite 5/6, ver nota abajo) |
| Routing | React Router DOM 7, rutas protegidas por rol |
| Estado servidor | TanStack Query 5 — todo fetch/mutación a Supabase pasa por acá, `queryKeys.ts` centralizado |
| Estado UI | Context API nativo (`AuthContext`) — sin Redux/Zustand |
| Forms | Componentes propios (`FormField.tsx`), sin librería, salvo que la complejidad de Fase 1 lo justifique |
| UI kit | Tailwind CSS 3 + shadcn/ui solo como scaffolding inicial |
| Iconos | **Lineales simples** (confirmado) — NO Material Symbols, NO Lucide por default. Buscar set de íconos lineales consistente (ver doc 08). |
| PWA | `vite-plugin-pwa` — confirmado, igual que Tropa Gym |
| Gráficos | **A definir** — componentes propios vs. recharts (pendiente, no bloquea Fase 1-4) |

## Backend / datos
| Capa | Elección |
|---|---|
| Motor | Supabase (Postgres) |
| Auth | Supabase Auth + tabla de perfiles, login compartido por rol |
| Cliente | `@supabase/supabase-js` v2, wrapper único en `src/lib/supabase.ts` |
| Autorización | RLS en todas las tablas |
| Operaciones atómicas | RPCs `SECURITY DEFINER` para toda operación multi-tabla (validar pago, generar cargo, cambiar estado) |
| Migraciones | SQL versionado a mano, numerado secuencial, sin editar migraciones ya aplicadas |
| Tipos TS | Derivados a mano del schema, reglas fijas (UUID→string, NUMERIC→number, enums→union) |

## Build tools, linters, testing
- Linter: oxlint.
- Type-check estricto: `tsc -b` como paso obligatorio del build.
- Testing: sin suite automatizada — verificación manual con datos reales + `SELECT COUNT(*)` post-migración + prueba en dispositivo real.
- CSS: PostCSS + Autoprefixer.

## Deploy
- Vercel, deploy directo desde repo.
- Variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en Vercel, nunca hardcodeadas.
- Checklist pre-deploy: build sin errores, Lighthouse mobile > 85, sin `SELECT *`, listas paginadas, service worker verificado offline, URL en allowlist de Supabase Auth.

## Diferencias vs. Tropa Gym
| Punto | Tropa Gym | Aptitud Centro |
|---|---|---|
| Tema | Dark, verde neón | Dark, navy + cyan |
| Tipografía | Anton + Oswald + Inter | Montserrat + Inter |
| Íconos | Material Symbols Outlined | Lineales simples |
| Sucursales | 1 | 2 (Fase 1 = 1 activa) |
| Charts | Propios | A definir |

## Fixes conocidos a aplicar desde el día uno
1. **Vite 8 / Rolldown:** `manualChunks` no aplica — usar `build.rolldownOptions.output.codeSplitting.groups`.
2. **Cache offline de Google Fonts + íconos:** `StaleWhileRevalidate` para CSS de fuentes, `CacheFirst` (1 año) para `.woff2`/binarios de íconos. Evita que íconos degraden a texto en modo offline.
3. **RLS recursivo:** política de perfiles solo `auth.uid() = id`, nunca subquery a la misma tabla.
