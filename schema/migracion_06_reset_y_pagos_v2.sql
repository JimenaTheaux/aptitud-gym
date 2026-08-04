-- ============================================================
-- APTITUD CENTRO — Migración: Reset de datos + roster de
-- profesores + rediseño de pagos
-- (ya ejecutada en Supabase — este archivo es el registro histórico)
--
-- Hace 4 cosas:
-- 1. Reset completo de pagos/asistencias/cargos/horarios_profesor
--    (datos ficticios de prueba, ningún dato real en juego).
-- 2. Tabla `profesores`: roster de personas reales, separado del
--    login compartido `profesor` (ver doc 02).
-- 3. `horarios_profesor.profesor_id` pasa a referenciar `profesores`,
--    ya no `perfiles`.
-- 4. Rediseño de `pagos`: sucursal obligatoria, fecha propia editable,
--    profesor (persona real), disciplina, tipo de pago, detalle libre,
--    forma de pago simplificada (efectivo/transferencia/combinado).
-- ============================================================

-- ============================================================
-- 1. RESET — borrar en orden inverso de dependencia
-- ============================================================
delete from pagos;
delete from asistencias;
delete from cargos;
delete from horarios_profesor;

-- ============================================================
-- 2. TABLA `profesores` (roster de personas reales)
-- ============================================================
create table profesores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profesores enable row level security;

create policy "profesores: lectura autenticados" on profesores
  for select using (auth.role() = 'authenticated');
create policy "profesores: admin escribe" on profesores
  for all using (public.mi_rol() = 'admin');

-- ============================================================
-- 3. `horarios_profesor.profesor_id` — perfiles → profesores
-- ============================================================
alter table horarios_profesor drop constraint horarios_profesor_profesor_id_fkey;
alter table horarios_profesor
  add constraint horarios_profesor_profesor_id_fkey
  foreign key (profesor_id) references profesores(id) on delete cascade;

create index idx_horarios_profesor_profesor on horarios_profesor(profesor_id);

-- Las policies viejas comparaban profesor_id = auth.uid(), lo que ya no
-- tiene sentido (profesor_id ahora es un id de `profesores`, no del login).
-- El login `profesor` sigue siendo compartido: cualquier profesor/admin
-- autenticado puede registrar el horario de cualquier persona del roster.
drop policy if exists "horarios_profesor: propio o admin" on horarios_profesor;
drop policy if exists "horarios_profesor: insert propio" on horarios_profesor;
drop policy if exists "horarios_profesor: update admin" on horarios_profesor;

create policy "horarios_profesor: lectura autenticados" on horarios_profesor
  for select using (auth.role() = 'authenticated');
create policy "horarios_profesor: insert autenticados" on horarios_profesor
  for insert with check (auth.role() = 'authenticated');
create policy "horarios_profesor: update admin" on horarios_profesor
  for update using (public.mi_rol() = 'admin');

-- ============================================================
-- 4. REDISEÑO DE `pagos`
-- ============================================================

-- 4.1 Sucursal pasa a obligatoria (tabla ya vacía tras el reset — el
--     NOT NULL no choca con datos existentes).
alter table pagos alter column sucursal_id set not null;

-- 4.2 Fecha propia del pago — autocompletada con hoy, editable en el form.
--     Distinta de created_at (momento real de inserción del registro).
alter table pagos add column fecha_pago date not null default current_date;

-- 4.3 Profesor (persona real que recibió el pago) — roster `profesores`,
--     no el login de sesión.
alter table pagos add column profesor_id uuid references profesores(id);
create index idx_pagos_profesor on pagos(profesor_id);

-- 4.4 Disciplina a la que corresponde el pago.
alter table pagos add column disciplina_id uuid references disciplinas(id);

-- 4.5 Tipo de pago (enum fijo) — distinto del "detalle" libre (4.6).
create type tipo_pago as enum ('cuota', 'media_cuota', 'inicio_caja');
alter table pagos add column tipo_pago tipo_pago not null;

-- 4.6 Detalle libre (texto), independiente del tipo_pago.
alter table pagos add column detalle text;

-- 4.7 Forma de pago simplificada: efectivo/transferencia/combinado
--     (se sacan las variantes de cuenta A/B). Tabla vacía tras el reset,
--     se puede recrear el enum sin backfill.
alter table pagos drop column forma_pago;
drop type forma_pago;
create type forma_pago as enum ('efectivo', 'transferencia', 'combinado');
alter table pagos add column forma_pago forma_pago not null;

-- 4.8 Desglose de montos — solo se completan si forma_pago = 'combinado',
--     y deben sumar el monto total (UI valida antes de guardar; el CHECK
--     de acá es la garantía a nivel de datos).
alter table pagos add column monto_efectivo numeric(10,2);
alter table pagos add column monto_transferencia numeric(10,2);
alter table pagos add constraint chk_pagos_combinado_suma check (
  forma_pago <> 'combinado'
  or (
    monto_efectivo is not null
    and monto_transferencia is not null
    and monto_efectivo + monto_transferencia = monto
  )
);

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select count(*) from pagos;              -- esperado: 0
-- select count(*) from asistencias;         -- esperado: 0
-- select count(*) from cargos;              -- esperado: 0
-- select count(*) from horarios_profesor;   -- esperado: 0
-- select count(*) from profesores;          -- esperado: 0 hasta cargar el roster
-- select policyname, cmd from pg_policies where tablename in ('profesores', 'horarios_profesor');
-- select unnest(enum_range(null::forma_pago));  -- efectivo, transferencia, combinado
-- select unnest(enum_range(null::tipo_pago));   -- cuota, media_cuota, inicio_caja
