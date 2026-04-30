export type ReadinessStatus = "green" | "yellow" | "red" | string | null;

export interface CoachAthleteOverviewRow {
	coach_id: string;
	coach_user_id: string;
	athlete_id: string;
	athlete_user_id: string;
	athlete_name: string | null;
	athlete_email: string | null;
	birth_date: string | null;
	main_sport: string | null;
	training_level: string | null;
	training_hours_per_week: number | null;
	menstrual_status: string | null;
	uses_hormonal_contraception: boolean | null;
	relation_status: string | null;
	leaf_q_total: number | null;
	leaf_q_risk_level: string | null;
	leaf_q_interpretation: string | null;
	leaf_q_created_at: string | null;
	readiness_status: ReadinessStatus;
	readiness_score: number | null;
	readiness_summary: string | null;
	readiness_reasons: string[] | null;
	readiness_calculated_at: string | null;
	active_flags_count: number | null;
	moderate_flags_count: number | null;
	high_flags_count: number | null;
	critical_flags_count: number | null;
	active_flag_titles: string[] | null;
	linked_at: string | null;
}
