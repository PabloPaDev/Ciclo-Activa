export type PlannedTrainingStatus = "planned" | "completed" | "cancelled" | "changed";

export type PlannedTrainingRow = {
	id: string;
	athlete_id: string;
	coach_id: string;
	planned_date: string;
	title: string;
	session_type: string | null;
	objective: string | null;
	estimated_duration_min: number | null;
	estimated_distance_km: number | null;
	target_rpe: number | null;
	athlete_notes: string | null;
	status: PlannedTrainingStatus;
	created_at: string;
	updated_at: string;
};
