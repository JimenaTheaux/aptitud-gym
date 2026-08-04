# 02 — Roles y permisos

## Roles del sistema (Fase 1)
- `admin` — 3 cuentas, acceso total.
- `profesor` — usuario compartido por sucursal.
- (Alumno no es un rol de login — es autoregistro público desde la pantalla de check-in.)

## Login
- Usuario y contraseña, Supabase Auth.
- **Login compartido por rol, no por persona** — decisión heredada de Tropa Gym: evita exponer `service_role` key en el cliente. Auditoría fina (quién exactamente hizo cada acción) se resuelve igual (ver abajo, validación de pagos queda con usuario admin registrado porque son solo 3 cuentas nombradas, no un login genérico).
- Recuperación de contraseña: la maneja deciDATA vía mantenimiento (fuera del sistema).

## Modelo multi-sucursal (revisado, migración 02)
**Ningún rol queda atado a una sola sucursal.** Admin y profesor pueden operar en las 2 sucursales — no hay restricción de acceso por sucursal en el login ni en RLS.

Lo que se etiqueta por sucursal es el **dato**, no el usuario:
- Cada asistencia, cargo y pago queda con su `sucursal_id`/contexto correspondiente.
- El "contexto de sucursal" es de **sesión/dispositivo**: el kiosco físico de Sucursal 1 etiqueta ahí, sin depender de qué usuario esté logueado.
- Alumno: base única (no separada por sucursal), puede asistir a las 2. `alumnos.sucursal_alta_id` es solo informativo (dónde se autoregistró la primera vez) — se confirma en el form de autoregistro, no restringe nada después.
- Admin: selector de sucursal siempre disponible como **filtro de vista/reportes**, no como restricción de acceso.

## Roles (Fase 1)
- `admin` — 3 cuentas, acceso total, ambas sucursales.
- `profesor` — acceso a ambas sucursales (ya no restringido a una).
- `kiosco` — login genérico "Alumnos" para la pantalla de check-in. Entra en Fase 1 (antes documentado como post-MVP).

## Matriz de permisos

| Acción | Kiosco (Alumnos) | Profesor | Admin |
|---|---|---|---|
| Marcar asistencia | ✅ | ✅ | ✅ |
| Ver estado de cuenta (al marcar) | ✅ | ✅ | ✅ |
| Autoregistro de alumno nuevo | ✅ | — | — |
| Registrar horario propio (entrada/salida) | — | ✅ | — |
| Ver listado de alumnos / asistencias | — | ✅ | ✅ |
| Eliminar alumnos | — | — | ✅ |
| Registrar pago | — | ✅ (pendiente validación) | ✅ (directo) |
| Validar pagos | — | — | ✅ |
| Editar asistencias / horarios de profesores | — | — | ✅ |
| Crear usuarios | — | — | ✅ |
| Configurar disciplinas/horarios | — | — | ✅ |
| Dejar notas internas | — | — | ✅ |

## Regla de oro RLS (heredada de Tropa Gym)
La política de la tabla de perfiles usa únicamente `auth.uid() = id`. Nunca una subquery a la misma tabla dentro de su propia política (causa recursión infinita en Postgres). Si un admin necesita leer todos los perfiles, se resuelve con `service_role` desde una Edge Function, no con una política RLS recursiva.

## Roster de profesores vs. login (migración 06)
El login `profesor` sigue siendo una cuenta compartida (1 sola por ahora). Para saber **qué persona real** recibió un pago o marcó horario de entrada/salida, se usa una tabla separada `profesores` (roster), que el admin gestiona desde Configuración. Hoy tiene 1 solo profesor cargado, pero admite más sin necesidad de crear logins nuevos — el login sigue siendo compartido, el roster es solo para identificar a la persona en los registros.

## Alcance confirmado del rol `kiosco`
Sesión abierta en la tablet física de cada sucursal, compartida entre todos los alumnos que pasan por ahí:
- Marcar asistencia (DNI/nombre).
- Ver estado de cuenta al marcar.
- Autoregistro completo si es la primera vez (form) → marca asistencia al terminar.

Post-MVP: cuenta individual por alumno para autoregistrarse/marcar desde su propio celular (ver doc 07, roadmap).
