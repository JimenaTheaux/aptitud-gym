-- ============================================================
-- APTITUD CENTRO — Migración 01: Schema inicial (Fase 1 MVP)
-- Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- 1. ENUMS
create type rol_usuario as enum ('admin', 'profesor');
create type forma_pago as enum ('efectivo', 'transferencia_a', 'transferencia_b', 'combinado');

-- 2. SUCURSALES
create table sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed: sucursal 1 activa, sucursal 2 ya existe pero sin uso en Fase 1
insert into sucursales (nombre, activa) values
  ('Sucursal 1', true),
  ('Sucursal 2', false);

-- 3. PERFILES (vinculado a Supabase Auth)
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null,
  sucursal_id uuid not null references sucursales(id),
  created_at timestamptz not null default now()
);

-- 4. ALUMNOS
create table alumnos (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  apellido text not null,
  nombre text not null,
  fecha_nacimiento date,
  celular text,
  consideraciones text,
  sucursal_id uuid not null references sucursales(id),
  estado_manual text, -- 'activo' | 'inactivo' | null (lógica de días: pendiente definir, ver doc 03)
  created_at timestamptz not null default now()
);
create index idx_alumnos_dni on alumnos(dni);
create index idx_alumnos_sucursal on alumnos(sucursal_id);

-- 5. DISCIPLINAS
create table disciplinas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default true,
  sucursal_id uuid not null references sucursales(id),
  created_at timestamptz not null default now()
);

-- 6. HORARIOS DE DISCIPLINA
create table horarios_disciplina (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references disciplinas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0=domingo
  hora_inicio time not null,
  hora_fin time not null
);

-- 7. ASISTENCIAS
create table asistencias (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  disciplina_id uuid references disciplinas(id),
  fecha date not null default current_date,
  hora time not null default current_time,
  sucursal_id uuid not null references sucursales(id),
  profesor_id uuid references perfiles(id), -- quién marcó (null si autoregistro sin profesor logueado)
  created_at timestamptz not null default now()
);
create index idx_asistencias_alumno_fecha on asistencias(alumno_id, fecha);

-- 8. CARGOS (snapshot — el monto queda congelado al crearse)
create table cargos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  periodo text not null, -- ej. '2026-08'
  monto numeric(10,2) not null,
  disciplina_id uuid references disciplinas(id),
  created_by uuid references perfiles(id),
  created_at timestamptz not null default now()
);
create index idx_cargos_alumno_periodo on cargos(alumno_id, periodo);

-- 9. PAGOS
create table pagos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id) on delete cascade,
  cargo_id uuid references cargos(id), -- null si es adelantado
  monto numeric(10,2) not null,
  forma_pago forma_pago not null,
  parcial boolean not null default false,
  registrado_por uuid not null references perfiles(id),
  validado_por uuid references perfiles(id),
  validado_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_pagos_alumno on pagos(alumno_id);
create index idx_pagos_pendientes on pagos(validado_por) where validado_por is null;

-- 10. HORARIOS DE PROFESOR (entrada/salida)
create table horarios_profesor (
  id uuid primary key default gen_random_uuid(),
  profesor_id uuid not null references perfiles(id) on delete cascade,
  fecha date not null default current_date,
  hora_entrada time,
  hora_salida time
);

-- 11. NOTAS INTERNAS (admin)
create table notas_internas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references perfiles(id),
  texto text not null,
  created_at timestamptz not null default now()
);

-- 12. LOG DE ENVÍOS WHATSAPP
create table whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id),
  plantilla_usada text not null,
  enviado_por uuid not null references perfiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCIONES SECURITY DEFINER (evitan RLS recursivo)
-- ============================================================

-- Devuelve rol y sucursal del usuario logueado sin recursión en RLS
create or replace function public.mi_rol()
returns rol_usuario
language sql security definer stable
as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function public.mi_sucursal()
returns uuid
language sql security definer stable
as $$
  select sucursal_id from perfiles where id = auth.uid();
$$;

-- RPC: validar un pago (único punto de escritura para validado_por + validado_at)
create or replace function public.fn_validar_pago(p_pago_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if public.mi_rol() <> 'admin' then
    raise exception 'Solo un admin puede validar pagos';
  end if;

  update pagos
  set validado_por = auth.uid(), validado_at = now()
  where id = p_pago_id and validado_por is null;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table sucursales enable row level security;
alter table perfiles enable row level security;
alter table alumnos enable row level security;
alter table disciplinas enable row level security;
alter table horarios_disciplina enable row level security;
alter table asistencias enable row level security;
alter table cargos enable row level security;
alter table pagos enable row level security;
alter table horarios_profesor enable row level security;
alter table notas_internas enable row level security;
alter table whatsapp_envios enable row level security;

-- perfiles: regla de oro, SIN subquery a la misma tabla
create policy "perfiles: cada uno ve el suyo" on perfiles
  for select using (auth.uid() = id);
create policy "perfiles: admin actualiza cualquiera" on perfiles
  for all using (public.mi_rol() = 'admin');

-- sucursales: lectura para cualquier usuario logueado
create policy "sucursales: lectura autenticados" on sucursales
  for select using (auth.role() = 'authenticated');

-- alumnos: acceso por sucursal, todos los roles logueados
create policy "alumnos: por sucursal" on alumnos
  for select using (sucursal_id = public.mi_sucursal());
create policy "alumnos: insert por sucursal" on alumnos
  for insert with check (sucursal_id = public.mi_sucursal());
create policy "alumnos: update admin" on alumnos
  for update using (public.mi_rol() = 'admin');

-- disciplinas / horarios_disciplina: lectura por sucursal, escritura solo admin
create policy "disciplinas: lectura por sucursal" on disciplinas
  for select using (sucursal_id = public.mi_sucursal());
create policy "disciplinas: admin escribe" on disciplinas
  for all using (public.mi_rol() = 'admin');

create policy "horarios_disciplina: lectura" on horarios_disciplina
  for select using (
    disciplina_id in (select id from disciplinas where sucursal_id = public.mi_sucursal())
  );
create policy "horarios_disciplina: admin escribe" on horarios_disciplina
  for all using (public.mi_rol() = 'admin');

-- asistencias: por sucursal, profesor y admin pueden insertar/leer
create policy "asistencias: por sucursal" on asistencias
  for select using (sucursal_id = public.mi_sucursal());
create policy "asistencias: insert por sucursal" on asistencias
  for insert with check (sucursal_id = public.mi_sucursal());
create policy "asistencias: update admin" on asistencias
  for update using (public.mi_rol() = 'admin');

-- cargos: por sucursal del alumno
create policy "cargos: lectura" on cargos
  for select using (
    alumno_id in (select id from alumnos where sucursal_id = public.mi_sucursal())
  );
create policy "cargos: insert" on cargos
  for insert with check (
    alumno_id in (select id from alumnos where sucursal_id = public.mi_sucursal())
  );

-- pagos: profesor inserta sin validar, solo admin valida (vía RPC) y ve todo
create policy "pagos: lectura por sucursal" on pagos
  for select using (
    alumno_id in (select id from alumnos where sucursal_id = public.mi_sucursal())
  );
create policy "pagos: insert profesor/admin" on pagos
  for insert with check (
    registrado_por = auth.uid()
    and alumno_id in (select id from alumnos where sucursal_id = public.mi_sucursal())
  );
-- No hay policy de UPDATE directa para pagos: la validación pasa SIEMPRE por fn_validar_pago (SECURITY DEFINER)

-- horarios_profesor: cada profesor ve/edita el suyo, admin ve todos
create policy "horarios_profesor: propio o admin" on horarios_profesor
  for select using (profesor_id = auth.uid() or public.mi_rol() = 'admin');
create policy "horarios_profesor: insert propio" on horarios_profesor
  for insert with check (profesor_id = auth.uid());
create policy "horarios_profesor: update admin" on horarios_profesor
  for update using (public.mi_rol() = 'admin' or profesor_id = auth.uid());

-- notas_internas: solo admin
create policy "notas_internas: solo admin" on notas_internas
  for all using (public.mi_rol() = 'admin');

-- whatsapp_envios: por sucursal
create policy "whatsapp_envios: lectura" on whatsapp_envios
  for select using (
    alumno_id in (select id from alumnos where sucursal_id = public.mi_sucursal())
  );
create policy "whatsapp_envios: insert" on whatsapp_envios
  for insert with check (enviado_por = auth.uid());

-- ============================================================
-- Verificación post-migración (correr manualmente después)
-- ============================================================
-- select count(*) from sucursales;         -- esperado: 2
-- select count(*) from perfiles;           -- esperado: 0 hasta crear usuarios en Auth
