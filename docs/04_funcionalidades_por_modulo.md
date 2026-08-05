# 04 — Funcionalidades por módulo (Fase 1 = MVP)

## 1. Login
- Usuario/contraseña, Supabase Auth.
- Validación de acceso por rol (admin/profesor/kiosco) — sin restricción por sucursal (ver doc 02).

## 2. Asistencia alumnos
- Marcar por DNI o nombre.
- Muestra estado de cuenta al marcar (al día / deuda / parcial), con aviso por color.
- Autoregistro "¿Primera vez?" junto al teclado → form → marca asistencia al terminar.
- Datos del alumno: DNI, apellido y nombre, fecha de nacimiento, celular (formato preparado para WhatsApp), **cantidad de días** (opcional: 2 / 3 / 5 / pase libre — antes de "consideraciones", visible en el detalle del alumno, referencia clave al generar cargos), campo libre "consideraciones".
- Registro de disciplina, fecha y horario de entrada.
- **Disciplinas de horario fijo** (ej. clases con turno): el alumno elige la disciplina y el sistema toma la franja horaria configurada (`horarios_disciplina`) — solo tienen hora de inicio definida, la hora de fin es opcional/informativa.
- **Disciplinas de horario libre** (ej. musculación): sin franjas horarias — al marcar, el sistema registra directamente la hora real de entrada, sin pedir ni validar contra un horario configurado.

## 3. Profesores
- Usuario general, sin restricción de sucursal (ver doc 02).
- **"Asistencia Profesores" es la pantalla de Inicio del login `profesor`** (migración 07):
  - Selector de sucursal arriba de todo (mismo patrón que el resto de las pantallas).
  - Mini cards, una por profesor del roster (`profesores`, doc 06) — más chicas que una card individual, porque conviven varias a la vez.
  - **Módulo opcional (migración 11)**: arriba del botón "Registrar entrada", 2 botones — "Mod 2hs" / "Mod 3hs" — mismo ancho combinado que ocupa el botón de entrada. Selección opcional, uno de los dos o ninguno. Se elige de nuevo en cada turno (no queda fijo por profesor). Si se selecciona, queda guardado en ese registro de `horarios_profesor` junto con la entrada.
  - Cada card: nombre, badge de estado ("En turno" / "Sin turno abierto"), los 2 botones de módulo (opcionales, solo visibles/activos antes de registrar entrada), botón "Registrar entrada" o "Registrar salida" según corresponda.
  - Debajo, tabla resumen con filtro de período (mes-año): columnas Profesor, Fecha, Entrada, Salida, Horas (calculadas), Módulo (si se marcó), Acciones.
  - **Rol profesor**: solo puede registrar entradas/salidas (con o sin módulo) desde las cards y ver la tabla (sin editar ni borrar filas).
  - **Rol admin**: ve la misma pantalla desde su nav como pestaña "Resumen de profesores" — además puede editar fecha/hora de entrada/salida **y el módulo marcado** (agregarlo si no se marcó, sacarlo si se marcó por error), y eliminar registros directo desde la tabla.
- Ver listado de asistencias y listado de alumnos.
- Registrar pagos (quedan pendientes de validación por admin — ver más abajo).
- Resúmenes de turno: horarios de mayor ocupación por semana, movimiento de alumnos + resumen mensual.

### Resúmenes → Turnos (admin) — mapa de calor de ocupación
- Selector de rango de fechas: 3 días, una semana, un mes, una quincena, o rango manual (fecha desde / fecha hasta).
- Grilla tipo mapa de calor: filas = franjas horarias del gimnasio, columnas = días del rango. Cada celda muestra el color de ocupación + el contador de alumnos que asistieron en esa franja (según asistencias reales registradas, disciplina Musculación — horario libre).
- Leyenda fija arriba: Libre (0-3 alumnos, cyan) / Quedan cupos (4-6 alumnos, naranja) / Capacidad llena (7+ alumnos, rojo).
- Reemplaza la planilla manual que se usaba antes para lo mismo — misma función, sistema propio.

### Resúmenes → Profesores (admin) — columnas de la tabla, en este orden
El selector de período se mantiene igual. Por cada profesor, en este orden exacto:
1. **Horas total** — suma real de horas trabajadas según los registros de entrada/salida del período.
2. **Módulos 2hs** — cantidad de turnos del período en los que se marcó "Mod 2hs".
3. **Módulos 3hs** — cantidad de turnos del período en los que se marcó "Mod 3hs".
4. **Sin módulo** — cantidad de turnos del período en los que no se marcó ningún módulo.
Las columnas 2, 3 y 4 son **contadores de turnos**, no sumas de horas.

## 4. Pagos
- Historial de pagos por alumno.
- Estado de cuenta (misma info que ve el alumno al marcar asistencia).
- **"Sin cargo generado"**: listado (submenú Pagos, entre "Pendientes de validar" y "Deudores") con alumnos que asistieron en el período actual y todavía no tienen cargo. Desde la misma fila, botón para cargar el cargo de ese período (campo libre de $, puede ser $0 — clase de prueba/cortesía).
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

## 5. Recordatorios WhatsApp
- Selección de alumnos con deuda.
- Plantilla de mensaje editable.
- Registro de envíos (log, no tracking de entrega).
- Botón unirse a comunidad de WhatsApp (a revisar con cliente).
- Botón escribir a deudores (a revisar con cliente).

## 6. Admin
- Visibilidad total.
- Creación de usuarios (profesores, otros admins).
- Resúmenes de asistencias y horas trabajadas por profesor.
- Edición de horarios de profesores y asistencias de alumnos — desde el listado de asistencias, el admin puede editar todos los campos de un registro ya cargado (alumno, disciplina, fecha, hora, sucursal), no solo horarios de profesor.
- Configuración de disciplinas y horarios disponibles.
- Panel de deudores / pagos pendientes de validar.
- Validación de pagos (queda registrado qué admin validó).
- Notas internas visibles para el equipo admin.
- **Registros eliminados** (migración 13): pantalla donde el admin puede ver el detalle completo de cualquier fila borrada en el sistema (alumnos, asistencias, cargos, pagos, disciplinas, horarios, profesores) — qué era, quién lo borró y cuándo. Es un log de auditoría/consulta, no un botón de "deshacer": no restaura la fila automáticamente en Fase 1.

---

## Fuera de alcance en Fase 1 (explícito)
- Egresos / contabilidad.
- Combos y descuentos configurables.
- Lógica de días para activo/inactivo (campo existe, lógica no).
- Segunda sucursal operativa (campo existe, sin usuarios activos).
- App mobile nativa.
- Armador de planes de musculación.

Ver doc 07 para detalle de cada fase futura.
