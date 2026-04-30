-- Ver ../coach_athlete_onboarding_rls.sql

drop policy if exists "profiles_insert_athlete_by_coach" on public.profiles;
create policy "profiles_insert_athlete_by_coach"
on public.profiles
for insert
to authenticated
with check (
	role::text = 'athlete'
	and exists (select 1 from public.coaches c where c.user_id = auth.uid())
);

drop policy if exists "profiles_delete_orphan_athlete_by_coach" on public.profiles;
create policy "profiles_delete_orphan_athlete_by_coach"
on public.profiles
for delete
to authenticated
using (
	role::text = 'athlete'
	and exists (select 1 from public.coaches c where c.user_id = auth.uid())
	and not exists (select 1 from public.athletes a where a.user_id = profiles.id)
);

drop policy if exists "athletes_insert_by_coach_for_new_profile" on public.athletes;
create policy "athletes_insert_by_coach_for_new_profile"
on public.athletes
for insert
to authenticated
with check (
	exists (select 1 from public.coaches c where c.user_id = auth.uid())
	and exists (
		select 1 from public.profiles p
		where p.id = athletes.user_id
		and p.role::text = 'athlete'
	)
);

drop policy if exists "athletes_delete_if_unlinked_by_coach" on public.athletes;
create policy "athletes_delete_if_unlinked_by_coach"
on public.athletes
for delete
to authenticated
using (
	not exists (select 1 from public.coach_athletes ca where ca.athlete_id = athletes.id)
	and exists (select 1 from public.coaches c where c.user_id = auth.uid())
);

drop policy if exists "coach_athletes_insert_own_coach" on public.coach_athletes;
create policy "coach_athletes_insert_own_coach"
on public.coach_athletes
for insert
to authenticated
with check (
	coach_id in (select c.id from public.coaches c where c.user_id = auth.uid())
	and exists (select 1 from public.athletes a where a.id = coach_athletes.athlete_id)
);
