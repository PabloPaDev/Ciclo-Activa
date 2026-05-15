import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { AthleteTrainingOverviewRow, TrainingSessionWithFeedback } from "@/types/training";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { DailyCheckinRow } from "@/types/daily-checkin";

export type MenstrualLogRow = {
	id: string;
	athlete_id: string;
	menstrual_cycle_id: string | null;
	log_date: string;
	phase: string | null;
	cycle_day: number | null;
	bleeding: string | null;
	menstrual_pain: number | null;
	energy: number | null;
	mood: number | null;
	sleep_quality: number | null;
	symptoms: string[] | null;
	notes: string | null;
};

export type MenstrualCycleRow = {
	id: string;
	athlete_id: string;
	period_start_date: string;
	period_end_date: string | null;
	estimated_cycle_length_days: number | null;
	notes: string | null;
};

export type MenstrualQueryError = {
	message?: string;
	code?: string;
	details?: string;
	hint?: string;
} | null;

export type InitialProfileScoreRow = {
	id: string;
	athlete_id: string;
	domain_code: string;
	domain_label: string;
	score_value: number | null;
	score_max: number | null;
	status: string | null;
	source: string | null;
	interpretation: string | null;
};

export type CoachAthleteDetailBundle = {
	athlete: CoachAthleteOverviewRow;
	trainingSessions: TrainingSessionWithFeedback[];
	menstrualLog: MenstrualLogRow | null;
	menstrualCycle: MenstrualCycleRow | null;
	menstrualError: string | null;
	menstrualLogErrorInfo: MenstrualQueryError;
	menstrualCycleErrorInfo: MenstrualQueryError;
	initialProfileScores: InitialProfileScoreRow[];
	painItems: AthletePainOverviewRow[];
	painError: boolean;
	latestDailyCheckin: DailyCheckinRow | null;
	todayDailyCheckin: DailyCheckinRow | null;
};

export type CoachAthleteDetailFetchFailure =
	| { kind: "config" }
	| { kind: "no_athlete_id" }
	| { kind: "supabase_init" }
	| { kind: "overview_error"; message: string }
	| { kind: "not_found" }
	| { kind: "sessions_error"; message: string };

function getLocalISODate(date = new Date()): string {
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function mapTrainingRows(rows: AthleteTrainingOverviewRow[]): TrainingSessionWithFeedback[] {
	return rows.map((trainingRow) => ({
		id: trainingRow.training_session_id,
		athlete_id: trainingRow.athlete_id,
		source: trainingRow.source,
		title: trainingRow.title,
		sport: trainingRow.sport,
		status: trainingRow.status,
		started_at: trainingRow.started_at,
		duration_seconds: trainingRow.duration_seconds,
		distance_meters: trainingRow.distance_meters,
		elevation_gain_meters: trainingRow.elevation_gain_meters,
		average_heart_rate: trainingRow.average_heart_rate,
		max_heart_rate: trainingRow.max_heart_rate,
		average_pace_seconds_per_km: trainingRow.average_pace_seconds_per_km,
		perceived_load: trainingRow.perceived_load,
		feedback: trainingRow.feedback_id
			? {
					id: trainingRow.feedback_id,
					training_session_id: trainingRow.training_session_id,
					athlete_id: trainingRow.athlete_id,
					rpe: trainingRow.rpe,
					fatigue: trainingRow.fatigue,
					energy: trainingRow.energy,
					sleep_quality: trainingRow.sleep_quality,
					mood: trainingRow.mood,
					completed_as_planned: trainingRow.completed_as_planned,
					had_pain: trainingRow.had_pain,
					pain_summary: trainingRow.pain_summary,
					comment: trainingRow.comment,
				}
			: null,
	}));
}

/**
 * Carga ficha completa del vínculo coach–atleta (misma lógica que la página de ficha).
 */
export async function fetchCoachAthleteDetailBundle(
	supabase: SupabaseClient,
	athleteId: string,
	coachUserId: string,
): Promise<{ ok: true; data: CoachAthleteDetailBundle } | { ok: false; failure: CoachAthleteDetailFetchFailure }> {
	const { data, error } = await supabase
		.from("coach_athlete_overview")
		.select("*")
		.eq("athlete_id", athleteId)
		.eq("coach_user_id", coachUserId)
		.maybeSingle();

	if (error) {
		return { ok: false, failure: { kind: "overview_error", message: "No se pudo cargar la ficha de la atleta." } };
	}

	if (!data) {
		return { ok: false, failure: { kind: "not_found" } };
	}

	const athlete = data as CoachAthleteOverviewRow;

	const { data: trainings, error: sessionsError } = await supabase
		.from("athlete_training_overview")
		.select("*")
		.eq("athlete_id", athleteId)
		.order("started_at", { ascending: false })
		.limit(5);

	if (sessionsError) {
		return { ok: false, failure: { kind: "sessions_error", message: "No se pudieron cargar los entrenamientos de la atleta." } };
	}

	const trainingRows = (trainings ?? []) as AthleteTrainingOverviewRow[];
	const trainingSessions = mapTrainingRows(trainingRows);

	let menstrualLogData: MenstrualLogRow | null = null;
	let menstrualCycleData: MenstrualCycleRow | null = null;
	let menstrualLogErrorInfo: MenstrualQueryError = null;
	let menstrualCycleErrorInfo: MenstrualQueryError = null;
	let menstrualError: string | null = null;

	const { data: rawMenstrualLog, error: menstrualLogError } = await supabase
		.from("menstrual_logs")
		.select(
			"id, athlete_id, menstrual_cycle_id, log_date, phase, cycle_day, bleeding, menstrual_pain, energy, mood, sleep_quality, symptoms, notes, created_at, updated_at",
		)
		.eq("athlete_id", athleteId)
		.order("log_date", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (menstrualLogError) {
		menstrualLogErrorInfo = {
			message: menstrualLogError.message,
			code: menstrualLogError.code,
			details: menstrualLogError.details,
			hint: menstrualLogError.hint,
		};
	} else {
		menstrualLogData = (rawMenstrualLog as MenstrualLogRow | null) ?? null;
	}

	let menstrualCycleError: MenstrualQueryError = null;

	if (menstrualLogData?.menstrual_cycle_id) {
		const { data: rawMenstrualCycle, error: rawMenstrualCycleError } = await supabase
			.from("menstrual_cycles")
			.select("id, athlete_id, period_start_date, period_end_date, estimated_cycle_length_days, notes, created_at, updated_at")
			.eq("id", menstrualLogData.menstrual_cycle_id)
			.maybeSingle();

		menstrualCycleData = (rawMenstrualCycle as MenstrualCycleRow | null) ?? null;
		menstrualCycleError = rawMenstrualCycleError
			? {
					message: rawMenstrualCycleError.message,
					code: rawMenstrualCycleError.code,
					details: rawMenstrualCycleError.details,
					hint: rawMenstrualCycleError.hint,
				}
			: null;
	} else {
		const { data: rawLatestCycle, error: rawLatestCycleError } = await supabase
			.from("menstrual_cycles")
			.select("id, athlete_id, period_start_date, period_end_date, estimated_cycle_length_days, notes, created_at, updated_at")
			.eq("athlete_id", athleteId)
			.order("period_start_date", { ascending: false })
			.limit(1)
			.maybeSingle();

		menstrualCycleData = (rawLatestCycle as MenstrualCycleRow | null) ?? null;
		menstrualCycleError = rawLatestCycleError
			? {
					message: rawLatestCycleError.message,
					code: rawLatestCycleError.code,
					details: rawLatestCycleError.details,
					hint: rawLatestCycleError.hint,
				}
			: null;
	}

	if (menstrualCycleError) {
		menstrualCycleErrorInfo = menstrualCycleError;
	}

	if (menstrualLogError || menstrualCycleError) {
		menstrualError = "No se pudo cargar la informacion del ciclo menstrual.";
	}

	const { data: initialScoresData, error: initialScoresError } = await supabase
		.from("athlete_initial_profile_scores")
		.select("id, athlete_id, domain_code, domain_label, score_value, score_max, status, source, interpretation, created_at, updated_at")
		.eq("athlete_id", athleteId);

	let initialProfileScores: InitialProfileScoreRow[] = [];
	if (initialScoresError) {
		if (process.env.NODE_ENV === "development") {
			console.error("initialProfileScoresError", initialScoresError);
		}
		initialProfileScores = [];
	} else {
		initialProfileScores = (initialScoresData ?? []) as InitialProfileScoreRow[];
	}

	const { data: painData, error: painLoadError } = await supabase
		.from("athlete_pain_overview")
		.select("*")
		.eq("athlete_id", athleteId)
		.order("reported_at", { ascending: false })
		.limit(10);

	const painError = Boolean(painLoadError);
	const painItems = painError ? [] : ((painData ?? []) as AthletePainOverviewRow[]);

	const today = getLocalISODate();
	const { data: checkinData, error: checkinError } = await supabase
		.from("daily_checkins")
		.select("*")
		.eq("athlete_id", athleteId)
		.order("checkin_date", { ascending: false })
		.limit(1);

	let latestDailyCheckin: DailyCheckinRow | null = null;
	let todayDailyCheckin: DailyCheckinRow | null = null;

	if (!checkinError) {
		const latest = ((checkinData ?? [])[0] as DailyCheckinRow | undefined) ?? null;
		latestDailyCheckin = latest;
		todayDailyCheckin = latest && latest.checkin_date === today ? latest : null;
	}

	return {
		ok: true,
		data: {
			athlete,
			trainingSessions,
			menstrualLog: menstrualLogData,
			menstrualCycle: menstrualCycleData,
			menstrualError,
			menstrualLogErrorInfo,
			menstrualCycleErrorInfo,
			initialProfileScores,
			painItems,
			painError,
			latestDailyCheckin,
			todayDailyCheckin,
		},
	};
}
