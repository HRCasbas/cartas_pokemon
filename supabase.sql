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

-- La palabra secreta. La persona la escribe al entrar, la web la manda en la
-- cabecera "x-clave-cartas" de cada petición y aquí se comprueba. Sin ella el
-- servidor devuelve la lista vacía y rechaza cualquier escritura.
--
-- ¡OJO! Abajo pone LA-PALABRA-VA-AQUI a propósito. **La palabra de verdad no se
-- escribe en este fichero**, que está en un repositorio público: vive sólo
-- dentro de la base de datos, en esta función, y en la cabeza de los dos que la
-- usan. Al ejecutar esto, cámbiala por la buena antes de darle a Run.
--
-- Va en minúsculas porque la web pasa a minúsculas lo que se teclea, para que
-- dé igual cómo se escriba en el móvil. Para cambiarla, se vuelve a ejecutar
-- este "create or replace" con la nueva y la vieja deja de valer al momento.
create or replace function public.clave_correcta()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-clave-cartas',
    ''
  ) = 'LA-PALABRA-VA-AQUI';
$$;

revoke all on function public.clave_correcta() from public;
grant execute on function public.clave_correcta() to anon;

-- Permisos. Se activa RLS y se abre justo lo que la web necesita, con palabra.
alter table public.marcas enable row level security;
alter table public.puntos enable row level security;

grant select, insert, update, delete on public.marcas to anon;
grant select, insert, update on public.puntos to anon;

create policy "leer las marcas"    on public.marcas for select to anon using (public.clave_correcta());
create policy "marcar"             on public.marcas for insert to anon with check (public.clave_correcta());
create policy "remarcar"           on public.marcas for update to anon using (public.clave_correcta()) with check (public.clave_correcta());
create policy "desmarcar"          on public.marcas for delete to anon using (public.clave_correcta());

create policy "leer los puntos"    on public.puntos for select to anon using (public.clave_correcta());
create policy "poner los puntos"   on public.puntos for insert to anon with check (public.clave_correcta());
create policy "cambiar los puntos" on public.puntos for update to anon using (public.clave_correcta()) with check (public.clave_correcta());
