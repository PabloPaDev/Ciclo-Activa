create table if not exists public.daily_checkins (
	id uuid primary key default gen_random_uuid(),
	athlete_id uuid not null references public.athletes(id) on delete cascade,
	checkin_date date not null,
	sleep_quality int,
	sleep_hours numeric,
	energy int,
	mood int,
	stress int,
	soreness int,
	fatigue int,
	motivation int,
	resting_hr int,
	hrv numeric,
	notes text,
	created_at timestamp with time zone not null default now(),
	updated_at timestamp with time zone not null default now(),
	constraint daily_checkins_athlete_date_unique unique (athlete_id, checkin_date)
);

create or replace function public.set_daily_checkins_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_daily_checkins_updated_at on public.daily_checkins;

create trigger trg_daily_checkins_updated_at
before update on public.daily_checkins
for each row
execute function public.set_daily_checkins_updated_at();

alter table public.daily_checkins enable row level security;

drop policy if exists "daily_checkins_select_athlete_own" on public.daily_checkins;
create policy "daily_checkins_select_athlete_own"
on public.daily_checkins
for select
to authenticated
using (
	exists (
		select 1
		from public.athletes a
		where a.id = daily_checkins.athlete_id
			and a.user_id = auth.uid()
	)
);

drop policy if exists "daily_checkins_insert_athlete_own" on public.daily_checkins;
create policy "daily_checkins_insert_athlete_own"
on public.daily_checkins
for insert
to authenticated
with check (
	exists (
		select 1
		from public.athletes a
		where a.id = daily_checkins.athlete_id
			and a.user_id = auth.uid()
	)
);

drop policy if exists "daily_checkins_update_athlete_own" on public.daily_checkins;
create policy "daily_checkins_update_athlete_own"
on public.daily_checkins
for update
to authenticated
using (
	exists (
		select 1
		from public.athletes a
		where a.id = daily_checkins.athlete_id
			and a.user_id = auth.uid()
	)
)
with check (
	exists (
		select 1
		from public.athletes a
		where a.id = daily_checkins.athlete_id
			and a.user_id = auth.uid()
	)
);

drop policy if exists "daily_checkins_select_coach_linked_athletes" on public.daily_checkins;
create policy "daily_checkins_select_coach_linked_athletes"
on public.daily_checkins
for select
to authenticated
using (
	exists (
		select 1
		from public.coach_athletes ca
		inner join public.coaches c on c.id = ca.coach_id
		where ca.athlete_id = daily_checkins.athlete_id
			and c.user_id = auth.uid()
	)
);
