export interface DailyCheckinRow {
	id: string;
	athlete_id: string;
	checkin_date: string;
	sleep_quality: number | null;
	sleep_hours: number | null;
	energy: number | null;
	mood: number | null;
	stress: number | null;
	soreness: number | null;
	fatigue: number | null;
	motivation: number | null;
	resting_hr: number | null;
	hrv: number | null;
	notes: string | null;
	created_at: string | null;
	updated_at: string | null;
}
