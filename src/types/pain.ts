export interface AthletePainOverviewRow {
	pain_report_id: string;
	athlete_id: string;
	training_session_id: string | null;
	reported_at: string | null;
	general_pain_level: number | null;
	affects_training: boolean | null;
	report_comment: string | null;
	pain_report_area_id: string;
	body_area_code: string | null;
	body_area_name: string | null;
	body_region: string | null;
	side: string | null;
	pain_type: string | null;
	intensity: number | null;
	description: string | null;
}
