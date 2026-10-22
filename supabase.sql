-- Las dos tablas de la web, para el proyecto de Supabase "cartas-pokemon".
--
-- Se ejecuta una sola vez, entera, en el editor de SQL de Supabase.
-- No hay cuentas ni contraseñas: la web entra con la clave publicable, que en
-- Postgres es el papel "anon". Aquí no hay ningún dato personal, sólo qué
-- cartas ha registrado cada uno.

-- Una fila = ese jugador registró esa carta alguna vez.
-- Que luego la regale no borra la fila: lo que cuenta es haberla tenido.
create table public.marcas (
  numero_carta smallint    not null check (numero_carta between 1 and 402),
  jugador      text        not null check (jugador in ('hector', 'adrian')),
  marcada_en   timestamptz not null default now(),
  primary key (numero_carta, jugador)
);

-- Los puntos de sobre que tiene cada uno ahora mismo, para la simulación.
create table public.puntos (
  jugador        text        primary key check (jugador in ('hector', 'adrian')),
  puntos         integer     not null default 0 check (puntos between 0 and 2500),
  actualizado_en timestamptz not null default now()
);

insert into public.puntos (jugador, puntos) values ('hector', 0), ('adrian', 0);

-- Permisos. Se activa RLS y se abre justo lo que la web necesita.
alter table public.marcas enable row level security;
alter table public.puntos enable row level security;

grant select, insert, update, delete on public.marcas to anon;
grant select, insert, update on public.puntos to anon;

create policy "leer las marcas"    on public.marcas for select to anon using (true);
create policy "marcar"             on public.marcas for insert to anon with check (true);
create policy "remarcar"           on public.marcas for update to anon using (true) with check (true);
create policy "desmarcar"          on public.marcas for delete to anon using (true);

create policy "leer los puntos"    on public.puntos for select to anon using (true);
create policy "poner los puntos"   on public.puntos for insert to anon with check (true);
create policy "cambiar los puntos" on public.puntos for update to anon using (true) with check (true);
