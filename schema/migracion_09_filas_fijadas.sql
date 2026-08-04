-- ============================================================
-- APTITUD CENTRO — Migración 09: filas fijadas (admin)
-- Tabla genérica, reutilizable en cualquier listado del sistema.
-- ============================================================

create table filas_fijadas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references perfiles(id) on delete cascade,
  tabla text not null,        -- identificador del listado, ej. 'alumnos', 'deudores', 'historial_pagos'
  registro_id uuid not null,  -- id de la fila fijada (alumno_id, pago_id, etc. según `tabla`)
  created_at timestamptz not null default now(),
  unique (admin_id, tabla, registro_id)
);

create index idx_filas_fijadas_admin_tabla on filas_fijadas(admin_id, tabla);

alter table filas_fijadas enable row level security;

create policy "filas_fijadas: propias" on filas_fijadas
  for select using (admin_id = auth.uid());
create policy "filas_fijadas: insert propio" on filas_fijadas
  for insert with check (admin_id = auth.uid());
create policy "filas_fijadas: delete propio" on filas_fijadas
  for delete using (admin_id = auth.uid());

-- Nota: el límite de 5 fijadas por tabla se controla en el front
-- (deshabilitar el botón de fijar al llegar a 5), no con constraint
-- de DB, para poder mostrar un mensaje claro en vez de un error SQL.

-- ============================================================
-- Verificación
-- ============================================================
-- select count(*) from filas_fijadas; -- 0
