# 04 — Funcionalidades por módulo (Fase 1 = MVP)

## 1. Login
- Usuario/contraseña, Supabase Auth.
- Validación de acceso por rol (admin/profesor/kiosco) — sin restricción por sucursal (ver doc 02).

## 2. Asistencia alumnos
- Marcar por DNI o nombre.
- Muestra estado de cuenta al marcar (al día / deuda / parcial), con aviso por color.
- Autoregistro "¿Primera vez?" junto al teclado → form → marca asistencia al terminar.
- Datos del alumno: DNI, apellido y nombre, fecha de nacimiento, celular (formato preparado para WhatsApp), **cantidad de días** (opcional: 2 / 3 / 5 / pase libre, migración 11 — antes de "consideraciones", visible en el detalle del alumno, referencia clave al generar cargos), campo libre "consideraciones".
- Registro de disciplina, fecha y horario de entrada.
- **Disciplinas de horario fijo** (ej. clases con turno): el alumno elige la disciplina y el sistema toma la franja horaria configurada (`horarios_disciplina`) — solo tienen hora de inicio definida, la hora de fin es opcional/informativa.
- **Disciplinas de horario libre** (ej. musculación): sin franjas horarias — al marcar, el sistema registra directamente la hora real de entrada, sin pedir ni validar contra un horario configurado.

## 3. Profesores
- Usuario general, sin restricción de sucursal (ver doc 02).
- **"Asistencia Profesores" es la pantalla de Inicio del login `profesor`** (migración 07):
  - Selector de sucursal arriba de todo (mismo patrón que el resto de las pantallas).
  - Mini cards, una por profesor del roster (`profesores`, doc 06) — más chicas que una card individual, porque conviven varias a la vez. Cada card: nombre, badge de estado ("En turno" / "Sin turno abierto"), botón "Registrar entrada" o "Registrar salida" según corresponda.
  - Debajo, tabla resumen con filtro de período (mes-año): columnas Profesor, Fecha, Entrada, Salida, Horas (calculadas), Acciones.
  - **Rol profesor**: solo puede registrar entradas/salidas desde las cards y ver la tabla (sin editar ni borrar filas).
  - **Rol admin**: ve la misma pantalla desde su nav como pestaña "Resumen de profesores" — además puede editar fecha/hora de entrada/salida y eliminar registros directo desde la tabla.
- Ver listado de asistencias y listado de alumnos.
- Registrar pagos (quedan pendientes de validación por admin — ver más abajo).
- Resúmenes de turno: horarios de mayor ocupación por semana, movimiento de alumnos + resumen mensual.

## 4. Pagos
- Historial de pagos por alumno.
- Estado de cuenta (misma info que ve el alumno al marcar asistencia).
- **"Sin cargo generado"**: listado (submenú Pagos, entre "Pendientes de validar" y "Deudores") con alumnos que asistieron en el período actual y todavía no tienen cargo. Desde la misma fila, botón para cargar el cargo de ese período (campo libre de $, puede ser $0 — clase de prueba/cortesía).
- **"Deudores"** (submenú Pagos, admin): listado de alumnos con cargo generado en el período actual que todavía no están al día. Por fila, 2 acciones (no "Agregar cargo" — eso vive solo en "Sin cargo generado"):
  - **WhatsApp**: abre `wa.me` con la plantilla "Mensaje de deudores" (Configuración > WhatsApp, ver módulo 5) ya completada para ese alumno, y registra el envío en `whatsapp_envios`. Deshabilitado si el alumno no tiene celular cargado.
  - **Ver detalle**: lleva a la pestaña "Historial y estado de cuenta" filtrada en ese alumno.
- Cargo manual: admin escribe monto (campo libre, sin combos/descuentos aún). Un solo cargo por alumno/período.

### Form de registro de pago — orden fijo de campos (migración 06)
1. **Sucursal** (botones, obligatorio — se elige siempre, no depende del login).
2. **Fecha del pago** — autocompletada con hoy, editable.
3. **Profe** — se elige de un listado de profesores + admins cargados (roster `profesores`, ver doc 06), no del login de sesión. Es quién recibió el pago en persona.
4. **Detalle** (enum fijo): Cuota / Media cuota / Inicio de caja.
5. **Alumno** (buscador).
6. **Disciplina**.
7. **Período al que aplica el pago** (mes-año).
8. **Detalle libre** (campo de texto, distinto del punto 4).
9. **Monto** ($).
10. **Forma de pago**: Efectivo / Transferencia / Combinado. Si es combinado, se abren 2 campos more: cuánto en efectivo y cuánto en transferencia — deben sumar el monto total.

- Un pago impacta el estado de cuenta de su período apenas está validado (o registrado por admin), independientemente de si el cargo se generó antes o después.
- Al registrar, se muestra si hay cargos anteriores pendientes.
- **Historial completo de pagos (admin)**: tabla con alumno, período, sucursal, **profesor que registró el pago**, monto, fecha de pago — filtrada por la sucursal seleccionada en el filtro de admin (doc 02). Buscador para encontrar un pago puntual. Selección múltiple de filas con total acumulado visible (suma en vivo de los montos seleccionados).

## 5. WhatsApp
No es más un menú propio de nivel superior — es submenú de **Configuración**, después de Disciplinas y Profesores (`/configuracion/whatsapp`, admin). No lista deudores ni tiene selección de alumnos: es solo la pantalla donde se editan las 2 plantillas de mensaje, persistidas en `configuracion_whatsapp` (doc 06, migración 10):
- **Mensaje de deudores** — placeholders `{nombre}` y `{monto}`. Se usa desde el botón WhatsApp de Pagos > Deudores (módulo 4).
- **Mensaje de bienvenida** — placeholder `{nombre}`. Se usa desde el botón WhatsApp del listado de Alumnos (módulo 6). El link a la comunidad de WhatsApp del gimnasio va escrito adentro de este mensaje (texto libre, no es un campo separado).

El envío en sí (abrir `wa.me` con el mensaje ya completado + registrar el envío en `whatsapp_envios`) pasa a estar en el botón de WhatsApp de cada fila, en Alumnos y en Pagos > Deudores — no hay una pantalla separada de "seleccionar y enviar en masa".

## 6. Admin
- Visibilidad total.
- Creación de usuarios (profesores, otros admins).
- Resúmenes de asistencias y horas trabajadas por profesor.
- Edición de horarios de profesores y asistencias de alumnos — desde el listado de asistencias, el admin puede editar todos los campos de un registro ya cargado (alumno, disciplina, fecha, hora, sucursal), no solo horarios de profesor.
- Configuración de disciplinas, profesores y mensajes de WhatsApp (submenús de Configuración).
- Panel de deudores / pagos pendientes de validar.
- Validación de pagos (queda registrado qué admin validó).
- Notas internas visibles para el equipo admin.
- **Listado de alumnos** (`/alumnos`, visible admin y profesor):
  - Buscador (apellido, nombre o DNI) arriba de la tabla, filtra en vivo.
  - Orden fijo: alumnos nuevos primero (por fecha de alta descendente) — no depende de la búsqueda.
  - Columnas, en orden: Alta, Apellido y nombre, Sucursal, DNI, Celular, Acciones.
  - Acciones por fila: **editar** (lápiz, abre el form — ya no se edita clickeando la fila), **WhatsApp** (mensaje de bienvenida, deshabilitado sin celular) y **eliminar** (solo admin, con diálogo de confirmación — borra en cascada asistencias/cargos/pagos/envíos de WhatsApp de ese alumno).

---

## Fuera de alcance en Fase 1 (explícito)
- Egresos / contabilidad.
- Combos y descuentos configurables.
- Lógica de días para activo/inactivo (campo existe, lógica no).
- Segunda sucursal operativa (campo existe, sin usuarios activos).
- App mobile nativa.
- Armador de planes de musculación.

Ver doc 07 para detalle de cada fase futura.
