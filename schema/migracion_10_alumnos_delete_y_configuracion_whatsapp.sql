-- ============================================================
-- APTITUD CENTRO — Migración 10: Baja de alumnos (admin) +
-- configuración de mensajes de WhatsApp (deudores y bienvenida)
-- Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- ============================================================
-- 1. BAJA DE ALUMNOS
-- ============================================================

-- 1.1 Policy de DELETE para alumnos — no existía (antes no se podía eliminar
--     un alumno desde la app, solo actualizar).
create policy "alumnos: delete admin" on alumnos
  for delete using (public.mi_rol() = 'admin');

-- 1.2 whatsapp_envios.alumno_id no tenía ON DELETE CASCADE, a diferencia de
--     asistencias/cargos/pagos (migración 01) — al borrar un alumno con algún
--     envío de WhatsApp ya registrado, el delete fallaba por violación de FK.
--     Se alinea con el resto de las tablas hijas de alumnos: eliminar un
--     alumno borra en cascada su historial completo.
alter table whatsapp_envios drop constraint whatsapp_envios_alumno_id_fkey;
alter table whatsapp_envios
  add constraint whatsapp_envios_alumno_id_fkey
  foreign key (alumno_id) references alumnos(id) on delete cascade;

-- ============================================================
-- 2. CONFIGURACIÓN DE MENSAJES DE WHATSAPP
-- ============================================================
-- Fila única (id fijo = 1) con las plantillas de mensaje que antes vivían
-- hardcodeadas en el frontend (Recordatorios.tsx) y se perdían al recargar.
-- Se editan desde Configuración > WhatsApp (admin) y se leen desde:
--   - Alumnos (botón WhatsApp por fila) -> mensaje_bienvenida
--   - Pagos > Deudores (botón WhatsApp por fila) -> mensaje_deudores
create table configuracion_whatsapp (
  id smallint primary key default 1 check (id = 1),
  mensaje_deudores text not null,
  mensaje_bienvenida text not null,
  updated_by uuid references perfiles(id),
  updated_at timestamptz not null default now()
);

insert into configuracion_whatsapp (id, mensaje_deudores, mensaje_bienvenida) values (
  1,
  'Hola {nombre}! Te escribimos de Aptitud Centro para recordarte que tenés un saldo pendiente de {monto}. Cualquier consulta, respondé este mensaje. ¡Gracias!',
  '¡Bienvenido/a a Aptitud Centro, {nombre}! Sumate a nuestra comunidad de WhatsApp para enterarte de novedades: [LINK DE LA COMUNIDAD]'
);

alter table configuracion_whatsapp enable row level security;

-- Lectura para cualquier usuario logueado (el botón de WhatsApp en Alumnos lo
-- puede usar admin y profesor). Escritura de la plantilla, solo admin.
create policy "configuracion_whatsapp: lectura autenticados" on configuracion_whatsapp
  for select using (auth.role() = 'authenticated');
create policy "configuracion_whatsapp: admin escribe" on configuracion_whatsapp
  for update using (public.mi_rol() = 'admin');

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select policyname, cmd from pg_policies where tablename = 'alumnos';
-- select conname, confdeltype from pg_constraint where conname = 'whatsapp_envios_alumno_id_fkey'; -- esperado: c (cascade)
-- select * from configuracion_whatsapp; -- esperado: 1 fila (id = 1)
