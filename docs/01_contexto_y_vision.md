# 01 — Contexto y visión

## Qué es
Sistema de gestión para gimnasio, enfocado en asistencia de alumnos, control de pagos/deuda y operación diaria de profesores y administradores.

## Para quién
- **APTITUD CENTRO** — gimnasio con 2 sucursales.
- **MVP (Fase 1):** una sola sucursal. La segunda queda preparada pero inactiva (ver doc 07, post-MVP).

## Problema que resuelve
Hoy el control de asistencia y de deuda es manual/informal. El sistema centraliza: quién entrenó, cuándo, y si tiene la cuota al día — visible en el momento del check-in, sin planillas paralelas.

## Roles reales (no hipotéticos)
- **Alumno** — solo interactúa en el autoregistro ("¿Primera vez?"). No tiene login.
- **Profesor** — usuario compartido por sucursal. Marca asistencia, registra pagos (sin validar), ve listados.
- **Admin** — usuario compartido, 3 cuentas. Visibilidad total, valida pagos, configura catálogos, edita todo.

## Flujo principal (una línea)
Alumno llega → profesor/kiosco marca asistencia por DNI → sistema muestra estado de cuenta → si hay pago, se registra → admin valida → impacta dashboard.

## Identidad visual (resumen — ver doc 08 para el detalle)
- **Tema: DARK** — confirmado sobre manual `aptitud-manual-diseno.md`.
- Fondo `#0B2240`, cards `#132C4D`, acento cyan `#2EB9FE`.
- Tipografía: Montserrat (headings/botones) + Inter (body/labels).
- Íconos: lineales simples, NO Material Symbols, NO emojis.

## Referencia de proceso
Metodología y stack basados en el proyecto TROPA GYM (mismo tipo de negocio, gimnasio). Se reutiliza stack técnico y skills de proceso; el design system es propio y distinto (dark navy/cyan vs. dark verde neón de Tropa).
