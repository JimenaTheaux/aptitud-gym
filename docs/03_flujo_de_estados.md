# 03 — Flujo de estados

## Cargos y pagos por período — lógica base (revisada, migraciones 07/08)

**Regla central:** el pago impacta el período al que corresponde, exista o no exista todavía el cargo. `pagos.periodo` es un campo propio del pago (`'YYYY-MM'`), independiente de si tiene `cargo_id` asociado. Esto permite pagos adelantados que se reconcilian solos cuando el cargo se genera después.

**Cálculo del estado de cuenta, por alumno + período:**
```
cargo = fila en `cargos` para ese alumno+período (puede no existir todavía)
pagado = suma de pagos VALIDADOS (o de admin) de ese alumno+período,
         sin importar si tienen cargo_id o no

si no existe cargo todavía:
  → alumno aparece en "Sin cargo generado" (si tuvo asistencia ese período)
si existe cargo:
  pagado >= cargo.monto  → AL DÍA   (cargo.monto = 0 siempre da Al día — clase de prueba)
  0 < pagado < cargo.monto → PENDIENTE (parcial)
  pagado = 0              → DEUDA
```

- Un cargo puede ser **$0** (clase de prueba, cortesía) — se marca al día directo, sin necesidad de pago.
- Un solo cargo por alumno/período (constraint en DB, migración 07) — no se duplican cargos del mismo mes.
- Un pago registrado por profesor **no cambia el estado visible en dashboard** hasta que un admin lo valida — sigue igual que antes, esto no cambió.
- Asistencia con deuda: **se permite igual** — solo aviso visual en pantalla de check-in. No bloquea el ingreso.

## Disparador: "Sin cargo generado"
Cuando un alumno registra **al menos una asistencia en el período actual** y todavía no tiene `cargos` para ese alumno+período, aparece en el listado "Sin cargo generado" (submenú de Pagos, entre "Pendientes de validar" y "Deudores"). Desde esa misma fila el admin carga el cargo (campo libre de monto, puede ser $0) sin salir del listado.

## Estado activo/inactivo del alumno
- Existe el campo, lógica de "días sin asistir" **aún sin definir** (pendiente de definición de negocio — no técnica). Se deja el campo preparado en schema desde el día uno para no migrar después.
- Referencia Tropa Gym: automático a los 25 días sin asistir vía función lazy al abrir la app (sin cron) + override manual de admin/profesor, todo por una única función que escribe estado + historial juntos (evita desincronización). Se reutiliza el patrón cuando se defina el umbral de días para Aptitud.

## Ciclo de vida de un pago
```
Profesor registra pago (con período elegido) ──> estado "pendiente de validación"
Admin valida ──> impacta estado de cuenta y dashboard
Admin registra pago directo ──> impacta al instante (no pasa por "pendiente")
```
- Cada validación queda registrada con qué admin la hizo (son 3 cuentas nombradas).
- El cargo es manual — el admin/profesor escribe el monto, no hay combos/descuentos configurables en Fase 1 (eso es Fase 2/3).

## Ciclo de vida del alumno nuevo (autoregistro)
```
Toca "¿Primera vez?" ──> completa form (DNI, nombre, fecha nac., celular, consideraciones)
──> queda registrado ──> marca asistencia en el mismo flujo
```

## Regla heredada de Tropa Gym (evitar bug de historial)
Cualquier alta de alumno debe sembrar automáticamente la fila inicial en el historial de estado (vía trigger `AFTER INSERT`, no depender de que cada punto de inserción lo recuerde). Aplica igual acá si se implementa historial de estado activo/inactivo.

## Post-MVP
- Estado híbrido automático/manual con umbral de días — definir con cliente antes de implementar (Fase 2).
- Egresos, combos/descuentos configurables — Fase 2/3, no tocan este flujo en Fase 1.

