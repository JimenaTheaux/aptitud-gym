# 07 — Guía de desarrollo iterativo

Orden de fases técnico (distinto de las "Fases" comerciales del cliente — esto es la secuencia de construcción de la Fase 1 comercial).

```
FASE 0 — Documentación y schema
  → Docs 01-06 aprobados
  → Schema SQL aplicado (ver doc 06)
  → Tipos TS derivados
  → Sin UI todavía

FASE 1 — Identidad visual
  → Tokens de color dark/cyan en tailwind.config.ts (doc 08)
  → Manifest PWA con marca Aptitud
  → Layout base (header + nav)
  → Sin lógica de negocio todavía

FASE 2 — Auth y routing
  → Login funcional: 3 roles (admin / profesor / kiosco)
  → Selector de sucursal para admin (filtro) y kiosco (contexto del dispositivo) — profesor no elige
  → Routing protegido por rol únicamente (ya no por sucursal, ver migración 02)
  → Probar con usuario real antes de avanzar

FASE 3 — ABM base
  → Disciplinas y horarios (sin relaciones complejas)
  → Alta de alumno (autoregistro + alta desde admin)

FASE 4 — Flujo principal: asistencia + estado de cuenta
  → Marcar asistencia por DNI/nombre
  → Mostrar estado de cuenta con aviso de color
  → Probar de punta a punta con datos reales

FASE 5 — Pagos
  → Registro de pago (profesor, pendiente) y (admin, directo)
  → Validación de pagos por admin
  → Historial y estado de cuenta completo

FASE 6 — Recordatorios WhatsApp + resúmenes
  → Selección de deudores + plantilla editable
  → Resúmenes de turno/semanal/mensual (profesor y admin)

FASE 7 — Polish y deploy
  → Revisión en dispositivo real (tablet de kiosco)
  → Build de producción sin errores
  → Variables de entorno en Vercel
```

**Regla:** no avanzar de fase sin probar la anterior con datos reales.

## Skills a adjuntar por tipo de tarea

| Tarea | Skill |
|---|---|
| Cualquier tabla o migración nueva | `database-first` |
| Cualquier componente de UI nuevo | `frontend-standards` (auditar tokens propios de Aptitud, no los de Tropa) |
| Armar o revisar un prompt de desarrollo | `dev-prompting` |
| Configurar cache / service worker | `pwa-performance-supabase` |
| Decidir alcance de una fase | `phased-mvp-planning` (este mismo documento aplica su metodología) |

---

## Post-MVP — Roadmap por fases (documentado para no perder contexto)

### Fase 2 — Contabilidad / reportes
**Qué hace:** egresos, cash flow, integración ARCA.
**Qué ya está preparado:** ninguna tabla todavía — no bloquea el schema de Fase 1.
**Qué falta:** modelo de egresos, reportes, integración fiscal.
**Dependencias:** ninguna sobre Fase 1.

### Fase 2/3 — Combos y descuentos configurables
**Qué hace:** reemplaza el cargo manual por reglas de precio.
**Qué ya está preparado:** `cargos.monto` como snapshot — el mecanismo de congelar precio ya sirve para combos futuros.
**Qué falta:** tabla `combos`/`descuentos`, UI de configuración, lógica de aplicación al generar cargo.

### Fase 2 — Estado híbrido automático/manual (activo/inactivo)
**Qué hace:** define el umbral de días sin asistir para marcar inactivo, con override manual.
**Qué ya está preparado:** campo `estado_manual` en `alumnos` (Fase 1).
**Qué falta:** definir umbral de días con el cliente, función tipo `sync_estados_automaticos()` (patrón de Tropa Gym), historial de estado.
**Dependencias:** definición de negocio primero, después implementación técnica.

### Fase 3 — Mobile
**Qué hace:** app nativa o wrapper.
**Qué ya está preparado:** PWA desde Fase 1 cubre buena parte del caso de uso mobile-web.
**Qué falta:** evaluar si hace falta nativo además de PWA.

### Fase 4 — Sucursal 2
**Qué hace:** activar la segunda sucursal.
**Qué ya está preparado:** `sucursal_id` en perfiles, alumnos, asistencias, disciplinas desde el día uno de Fase 1.
**Qué falta:** crear la fila de sucursal, crear usuarios con esa sucursal — sin cambios de schema.

### Fase 5 — Asistencia desde celular de profesores
**Qué hace:** marcar asistencia sin depender del kiosco fijo.
**Qué ya está preparado:** el flujo de asistencia ya es agnóstico de dispositivo (PWA).
**Qué falta:** UI adaptada a uso desde celular propio, posible geolocalización/validación de horario.

### Fase 5/6 — Cuenta individual de alumno (autoregistro desde su propio celular)
**Qué hace:** cada alumno tiene su login/cuenta propia, se autoregistra y marca asistencia desde su celular, sin depender de la tablet kiosco.
**Qué ya está preparado:** el modelo multi-sucursal (migración 02) ya no ata datos a un dispositivo/usuario fijo, así que no requiere rediseño de schema para escalar a esto.
**Qué falta:** rol/tabla de autenticación de alumnos, UI mobile de autoregistro y marcado, geovalidación opcional (¿debe estar físicamente en el gimnasio para marcar?).

### Fase 6 — Armador de planes de musculación
**Qué hace:** hoy se comparte por WhatsApp/PDF manual → a futuro, app propia.
**Qué ya está preparado:** nada — es la fase más lejana del roadmap.
**Qué falta:** todo — evaluar alcance cuando se llegue.

---

## Métricas de "Fase 1 lista para lanzar"
```
✅ Flujo asistencia → estado de cuenta → pago → validación probado de punta a punta con datos reales
✅ Probado en la tablet/dispositivo real del kiosco de Aptitud
✅ Build de producción sin errores de TS ni warnings críticos
✅ Variables de entorno en Vercel, no en el código
✅ 3 cuentas admin creadas + al menos 1 profesor real
✅ Disciplinas y horarios reales cargados (no de prueba)
✅ Sin errores en consola en producción
✅ Service worker verificado en modo avión
```
