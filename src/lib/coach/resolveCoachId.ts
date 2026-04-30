import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Coach del usuario autenticado; fallback vista overview; opcional NEXT_PUBLIC_DEMO_COACH_ID (solo demo/local).
 */
export async function resolveCoachIdForSession(supabase: SupabaseClient, sessionUserId: string): Promise<string | null> {
	const { data: coachData } = await supabase.from("coaches").select("id").eq("user_id", sessionUserId).maybeSingle();
	if (coachData?.id) {
		return coachData.id as string;
	}

	const { data: overview } = await supabase
		.from("coach_athlete_overview")
		.select("coach_id")
		.eq("coach_user_id", sessionUserId)
		.limit(1)
		.maybeSingle();
	if (overview?.coach_id) {
		return overview.coach_id as string;
	}

	const demo = process.env.NEXT_PUBLIC_DEMO_COACH_ID?.trim();
	if (demo) {
		return demo;
	}

	return null;
}
