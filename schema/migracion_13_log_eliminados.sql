-- ============================================================
-- APTITUD CENTRO — Migración 13: log de registros eliminados (auditoría)
-- Ya ejecutada manualmente en Supabase antes de crear este archivo;
-- se agrega acá para dejar registro en el historial de migraciones.
-- ============================================================

-- Log genérico de auditoría: guarda un snapshot completo (jsonb) de
-- cualquier fila borrada en las tablas operativas listadas abajo. Solo
-- consulta/recuperación de referencia — no hay restauración automática en
-- Fase 1 (ver doc 04, sección 6).
create table registros_eliminados (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,               -- nombre de la tabla de origen, ej. 'alumnos'
  registro_id uuid not null,         -- id de la fila borrada dentro de esa tabla
  datos jsonb not null,              -- snapshot completo de la fila al momento de borrarse
  eliminado_por uuid references perfiles(id),
  eliminado_at timestamptz not null default now()
);

create index idx_registros_eliminados_tabla on registros_eliminados(tabla);
create index idx_registros_eliminados_eliminado_at on registros_eliminados(eliminado_at desc);

alter table registros_eliminados enable row level security;

create policy "registros_eliminados: solo admin lee" on registros_eliminados
  for select using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

-- Trigger genérico: se dispara antes de cada DELETE en las tablas operativas
-- y guarda la fila completa como jsonb, con quién y cuándo. auth.uid() toma
-- el usuario logueado en la transacción que ejecuta el DELETE — no hace
-- falta tocar el código de los borrados ya existentes en la app.
create or replace function fn_log_eliminacion()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into registros_eliminados (tabla, registro_id, datos, eliminado_por)
  values (tg_table_name, old.id, to_jsonb(old), auth.uid());
  return old;
end;
$$;

create trigger trg_log_eliminacion_alumnos
  before delete on alumnos
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_asistencias
  before delete on asistencias
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_cargos
  before delete on cargos
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_pagos
  before delete on pagos
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_disciplinas
  before delete on disciplinas
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_horarios_disciplina
  before delete on horarios_disciplina
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_horarios_profesor
  before delete on horarios_profesor
  for each row execute function fn_log_eliminacion();

create trigger trg_log_eliminacion_profesores
  before delete on profesores
  for each row execute function fn_log_eliminacion();

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select count(*) from registros_eliminados;
-- select tabla, registro_id, eliminado_at from registros_eliminados order by eliminado_at desc limit 5;
