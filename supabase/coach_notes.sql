-- Notas internas del entrenador (ejecutar en SQL Editor de Supabase o con CLI)
-- Políticas: cada coach solo gestiona sus propias filas y solo si la atleta está en coach_athletes.

create table if not exists public.coach_notes (
	id uuid primary key default gen_random_uuid(),
	athlete_id uuid not null references public.athletes(id) on delete cascade,
	coach_id uuid not null references public.coaches(id) on delete cascade,
	note text not null,
	is_pinned boolean not null default false,
	visibility text not null default 'private',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint coach_notes_visibility_check check (visibility in ('private', 'shared'))
);

create index if not exists coach_notes_athlete_coach_created_idx
	on public.coach_notes (athlete_id, coach_id, created_at desc);

create or replace function public.set_coach_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_coach_notes_updated_at on public.coach_notes;

create trigger trg_coach_notes_updated_at
before update on public.coach_notes
for each row
execute function public.set_coach_notes_updated_at();

alter table public.coach_notes enable row level security;

grant select, insert, update, delete on public.coach_notes to authenticated;
grant all on public.coach_notes to service_role;

-- Lectura: solo notas propias del coach autenticado y atleta vinculada
drop policy if exists "coach_notes_select_own_linked" on public.coach_notes;
create policy "coach_notes_select_own_linked"
on public.coach_notes
for select
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = coach_notes.athlete_id
		where c.user_id = auth.uid()
			and c.id = coach_notes.coach_id
	)
);

-- Alta: mismo coach, atleta vinculada
drop policy if exists "coach_notes_insert_own_linked" on public.coach_notes;
create policy "coach_notes_insert_own_linked"
on public.coach_notes
for insert
to authenticated
with check (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = coach_notes.athlete_id
		where c.user_id = auth.uid()
			and c.id = coach_notes.coach_id
	)
);

-- Edición: solo el autor, atleta vinculada
drop policy if exists "coach_notes_update_own_linked" on public.coach_notes;
create policy "coach_notes_update_own_linked"
on public.coach_notes
for update
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = coach_notes.athlete_id
		where c.user_id = auth.uid()
			and c.id = coach_notes.coach_id
	)
)
with check (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = coach_notes.athlete_id
		where c.user_id = auth.uid()
			and c.id = coach_notes.coach_id
	)
);

-- Borrado: solo el autor, atleta vinculada
drop policy if exists "coach_notes_delete_own_linked" on public.coach_notes;
create policy "coach_notes_delete_own_linked"
on public.coach_notes
for delete
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = coach_notes.athlete_id
		where c.user_id = auth.uid()
			and c.id = coach_notes.coach_id
	)
);
