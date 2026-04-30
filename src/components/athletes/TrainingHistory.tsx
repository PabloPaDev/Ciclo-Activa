import type { TrainingSessionWithFeedback } from "@/types/training";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";

interface TrainingHistoryProps {
	sessions: TrainingSessionWithFeedback[];
}

function displayValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

function formatDate(dateValue: string | null): string {
	if (!dateValue) return "Sin registrar";
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) return "Sin registrar";
	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function formatMinutes(seconds: number | null): string {
	if (seconds === null || seconds === undefined) return "Sin registrar";
	return `${Math.round(seconds / 60)} min`;
}

function formatDistance(meters: number | null): string {
	if (meters === null || meters === undefined) return "Sin registrar";
	return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number | null): string {
	if (meters === null || meters === undefined) return "Sin registrar";
	return `${meters} m`;
}

function formatPace(secondsPerKm: number | null): string {
	if (secondsPerKm === null || secondsPerKm === undefined) return "Sin registrar";
	const minutes = Math.floor(secondsPerKm / 60);
	const seconds = Math.round(secondsPerKm % 60);
	const paddedSeconds = String(seconds).padStart(2, "0");
	return `${minutes}:${paddedSeconds}/km`;
}

function formatSource(source: string | null): string {
	if (!source) return "Sin registrar";
	const normalized = source.toLowerCase();
	if (normalized === "manual" || normalized === "strava" || normalized === "garmin") return normalized;
	return source;
}

function formatBoolean(value: boolean | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	return value ? "Si" : "No";
}

export function TrainingHistory({ sessions }: TrainingHistoryProps) {
	return (
		<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
			<h3 className="text-xl font-bold tracking-tight text-[#0F2D2F] md:text-2xl">Ultimos entrenamientos</h3>

			{sessions.length === 0 ? (
				<p className="mt-5 text-sm text-[#5F6B6D]">Todavia no hay entrenamientos registrados.</p>
			) : (
				<div className="mt-6 space-y-4">
					{sessions.map((session) => (
						<article key={session.id} className="rounded-xl border border-[#D9DDD8] bg-white p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h4 className="text-sm font-semibold text-[#0F2D2F]">{displayValue(session.title)}</h4>
									<p className="mt-1 text-xs text-[#5F6B6D]">{formatDate(session.started_at)}</p>
								</div>
								<p className="rounded-full border border-[#D9DDD8] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#0F2D2F]">
									{formatTechnicalLabel(session.status)}
								</p>
							</div>

							<div className="mt-3 grid gap-2 text-sm text-[#0F2D2F]/90 sm:grid-cols-2 lg:grid-cols-4">
								<p><span className="text-[#5F6B6D]">Deporte:</span> {displayValue(session.sport)}</p>
								<p><span className="text-[#5F6B6D]">Duracion:</span> {formatMinutes(session.duration_seconds)}</p>
								<p><span className="text-[#5F6B6D]">Distancia:</span> {formatDistance(session.distance_meters)}</p>
								<p><span className="text-[#5F6B6D]">Desnivel:</span> {formatElevation(session.elevation_gain_meters)}</p>
								<p><span className="text-[#5F6B6D]">FC media:</span> {displayValue(session.average_heart_rate)}</p>
								<p><span className="text-[#5F6B6D]">FC maxima:</span> {displayValue(session.max_heart_rate)}</p>
								<p><span className="text-[#5F6B6D]">Ritmo medio:</span> {formatPace(session.average_pace_seconds_per_km)}</p>
								<p><span className="text-[#5F6B6D]">Fuente:</span> {formatSource(session.source)}</p>
							</div>

							{session.feedback && (
								<div className="mt-4 rounded-xl border border-[#D9DDD8] bg-[#D7EFE7]/25 p-4">
									<p className="text-sm font-semibold text-[#0F2D2F]">Feedback</p>
									<div className="mt-2 grid gap-2 text-sm text-[#0F2D2F]/90 sm:grid-cols-2 lg:grid-cols-4">
										<p><span className="text-[#5F6B6D]">RPE:</span> {displayValue(session.feedback.rpe)}</p>
										<p><span className="text-[#5F6B6D]">Fatiga:</span> {displayValue(session.feedback.fatigue)}</p>
										<p><span className="text-[#5F6B6D]">Energia:</span> {displayValue(session.feedback.energy)}</p>
										<p><span className="text-[#5F6B6D]">Sueno:</span> {displayValue(session.feedback.sleep_quality)}</p>
										<p><span className="text-[#5F6B6D]">Estado de animo:</span> {displayValue(session.feedback.mood)}</p>
										<p><span className="text-[#5F6B6D]">Completado segun plan:</span> {formatBoolean(session.feedback.completed_as_planned)}</p>
									</div>

									{session.feedback.had_pain && (
										<p className="mt-3 rounded-lg border border-[#D9A441]/35 bg-[#D9A441]/10 px-3 py-2 text-sm font-medium text-[#7A5A12]">
											Molestias reportadas
										</p>
									)}

									<div className="mt-3 space-y-1 text-sm text-[#5F6B6D]">
										<p><span className="text-[#5F6B6D]">Resumen de molestias:</span> {displayValue(session.feedback.pain_summary)}</p>
										<p><span className="text-[#5F6B6D]">Comentario:</span> {displayValue(session.feedback.comment)}</p>
									</div>
								</div>
							)}
						</article>
					))}
				</div>
			)}
		</section>
	);
}
