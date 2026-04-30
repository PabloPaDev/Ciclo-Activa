export interface TrainingFeedbackRow {
	id: string;
	training_session_id: string;
	athlete_id: string;
	rpe: number | null;
	fatigue: number | null;
	energy: number | null;
	sleep_quality: number | null;
	mood: number | null;
	completed_as_planned: boolean | null;
	had_pain: boolean | null;
	pain_summary: string | null;
	comment: string | null;
}

export interface TrainingSessionRow {
	id: string;
	athlete_id: string;
	source: string | null;
	title: string | null;
	sport: string | null;
	status: string | null;
	started_at: string | null;
	duration_seconds: number | null;
	distance_meters: number | null;
	elevation_gain_meters: number | null;
	average_heart_rate: number | null;
	max_heart_rate: number | null;
	average_pace_seconds_per_km: number | null;
	perceived_load: number | null;
}

export interface TrainingSessionWithFeedback extends TrainingSessionRow {
	feedback: TrainingFeedbackRow | null;
}

export interface AthleteTrainingOverviewRow {
	training_session_id: string;
	athlete_id: string;
	source: string | null;
	external_id: string | null;
	title: string | null;
	sport: string | null;
	status: string | null;
	started_at: string | null;
	duration_seconds: number | null;
	distance_meters: number | null;
	elevation_gain_meters: number | null;
	average_heart_rate: number | null;
	max_heart_rate: number | null;
	average_pace_seconds_per_km: number | null;
	average_power_watts: number | null;
	perceived_load: number | null;
	feedback_id: string | null;
	rpe: number | null;
	fatigue: number | null;
	energy: number | null;
	sleep_quality: number | null;
	mood: number | null;
	completed_as_planned: boolean | null;
	had_pain: boolean | null;
	pain_summary: string | null;
	comment: string | null;
}
