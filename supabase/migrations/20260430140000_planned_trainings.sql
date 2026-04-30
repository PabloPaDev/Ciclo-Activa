-- Igual que supabase/planned_trainings.sql (migración CLI)

create table if not exists public.planned_trainings (
	id uuid primary key default gen_random_uuid(),
	athlete_id uuid not null references public.athletes(id) on delete cascade,
	coach_id uuid not null references public.coaches(id) on delete cascade,
	planned_date date not null,
	title text not null,
	session_type text,
	objective text,
	estimated_duration_min integer,
	estimated_distance_km numeric,
	target_rpe numeric,
	athlete_notes text,
	status text not null default 'planned',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint planned_trainings_status_check check (status in ('planned', 'completed', 'cancelled', 'changed'))
);

create index if not exists planned_trainings_athlete_date_idx
	on public.planned_trainings (athlete_id, planned_date);

create or replace function public.set_planned_trainings_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_planned_trainings_updated_at on public.planned_trainings;

create trigger trg_planned_trainings_updated_at
before update on public.planned_trainings
for each row
execute function public.set_planned_trainings_updated_at();

alter table public.planned_trainings enable row level security;

grant select, insert, update, delete on public.planned_trainings to authenticated;
grant all on public.planned_trainings to service_role;

drop policy if exists "planned_trainings_select_athlete_own" on public.planned_trainings;
create policy "planned_trainings_select_athlete_own"
on public.planned_trainings
for select
to authenticated
using (
	exists (
		select 1
		from public.athletes a
		where a.id = planned_trainings.athlete_id
			and a.user_id = auth.uid()
	)
);

drop policy if exists "planned_trainings_select_coach_linked" on public.planned_trainings;
create policy "planned_trainings_select_coach_linked"
on public.planned_trainings
for select
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = planned_trainings.athlete_id
		where c.user_id = auth.uid()
	)
);

drop policy if exists "planned_trainings_insert_coach_linked" on public.planned_trainings;
create policy "planned_trainings_insert_coach_linked"
on public.planned_trainings
for insert
to authenticated
with check (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = planned_trainings.athlete_id
		where c.user_id = auth.uid()
			and c.id = planned_trainings.coach_id
	)
);

drop policy if exists "planned_trainings_update_coach_author" on public.planned_trainings;
create policy "planned_trainings_update_coach_author"
on public.planned_trainings
for update
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = planned_trainings.athlete_id
		where c.user_id = auth.uid()
			and c.id = planned_trainings.coach_id
	)
)
with check (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = planned_trainings.athlete_id
		where c.user_id = auth.uid()
			and c.id = planned_trainings.coach_id
	)
);

drop policy if exists "planned_trainings_delete_coach_author" on public.planned_trainings;
create policy "planned_trainings_delete_coach_author"
on public.planned_trainings
for delete
to authenticated
using (
	exists (
		select 1
		from public.coaches c
		inner join public.coach_athletes ca on ca.coach_id = c.id and ca.athlete_id = planned_trainings.athlete_id
		where c.user_id = auth.uid()
			and c.id = planned_trainings.coach_id
	)
);
