# PROMPT FASE 0 — Setup técnico + schema

## Archivos a adjuntar
- docs/05_stack_tecnico.md
- docs/06_estructura_de_datos.md
- schema/migracion_01_schema_inicial.sql
- skills/database-first/SKILL.md
- skills/phased-mvp-planning/SKILL.md

## Contexto
Arrancamos el proyecto Aptitud Centro desde cero. El schema SQL ya está escrito y aplicado manualmente en Supabase (migración 01). Ahora necesito el setup técnico del frontend siguiendo el stack documentado, sin escribir todavía lógica de negocio ni UI de negocio.

## Pasos ordenados

PASO 1 — Leer antes de tocar
Lee docs/05_stack_tecnico.md y docs/06_estructura_de_datos.md completos antes de escribir código.

PASO 2 — Scaffolding del proyecto
- Crear proyecto Vite + React + TypeScript en la raíz del repo (carpeta `app/`).
- Instalar: react-router-dom, @tanstack/react-query, @supabase/supabase-js, tailwindcss (v3) + postcss + autoprefixer, vite-plugin-pwa.
- Configurar `tsc -b` como paso obligatorio antes de `vite build`.
- Configurar oxlint con config mínima.

PASO 3 — Cliente Supabase
- Crear `src/lib/supabase.ts` con el wrapper único del cliente, usando `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde variables de entorno (`.env.local`, nunca hardcodeadas).
- Crear `.env.example` con las 2 variables vacías.

PASO 4 — Tipos TS derivados del schema
- Crear `src/types/db.ts` con los tipos derivados a mano de `schema/migracion_01_schema_inicial.sql`, siguiendo las reglas fijas: UUID→string, NUMERIC→number, TIMESTAMPTZ→string, enums→union types (`'admin' | 'profesor'`, etc.).
- No usar `supabase gen types`.

PASO 5 — Estructura de carpetas base
Crear la estructura vacía (solo carpetas + archivos placeholder mínimos, sin lógica de negocio todavía):
```
src/
├── assets/
├── components/
│   ├── layout/
│   └── ui/
├── config/
├── contexts/
├── hooks/
├── lib/
├── pages/
├── routes/
└── types/
```

PASO 6 — Verificar build
Correr `tsc -b && vite build` y confirmar que compila sin errores antes de terminar.

## Checklist de cierre
- [ ] Proyecto Vite + React + TS creado y corre en dev
- [ ] Supabase client conectado (probar una query simple a `sucursales`, debe devolver 2 filas)
- [ ] Tipos TS en `src/types/db.ts` cubren las 11 tablas del schema
- [ ] `.env.example` creado, `.env.local` en `.gitignore`
- [ ] Estructura de carpetas creada
- [ ] `tsc -b && vite build` sin errores

## Reglas de esta sesión
- No escribir componentes de negocio todavía (eso es Fase 1 — identidad visual, y Fase 3 en adelante).
- No tocar el schema SQL — ya está aplicado.
- No usar Redux/Zustand ni librería de forms — no están en el stack.
