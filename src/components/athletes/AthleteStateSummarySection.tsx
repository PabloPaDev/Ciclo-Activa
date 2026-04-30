"use client";

import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { TrainingSessionWithFeedback } from "@/types/training";
import type { DailyCheckinRow } from "@/types/daily-checkin";
import { Profile360RadarCard } from "@/components/athletes/Profile360RadarCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";

type MenstrualLogLike = {
	phase: string | null;
	menstrual_pain: number | null;
	symptoms: string[] | null;
};

type MenstrualCycleLike = {
	id: string;
};

type InitialProfileScore = {
	domain_code: string;
	domain_label: string;
	score_value: number | null;
	score_max: number | null;
	status: string | null;
	source: string | null;
	interpretation: string | null;
};

interface AthleteStateSummarySectionProps {
	athlete: CoachAthleteOverviewRow;
	trainingSessions: TrainingSessionWithFeedback[];
	painItems: AthletePainOverviewRow[];
	menstrualLog: MenstrualLogLike | null;
	menstrualCycle: MenstrualCycleLike | null;
	initialProfileScores: InitialProfileScore[];
	latestDailyCheckin: DailyCheckinRow | null;
}

function displayValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

function formatDate(value: string | null | undefined): string {
	if (!value) return "Sin registrar";
	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) return "Sin registrar";
	return parsedDate.toLocaleDateString("es-ES");
}

function buildQuickReadText(
	athlete: CoachAthleteOverviewRow,
	activePainCount: number,
	lastTrainingHasPain: boolean,
	hasMenstrualSignals: boolean,
	latestDailyCheckin: DailyCheckinRow | null,
): string {
	const statements: string[] = [];
	const readinessScore = athlete.readiness_score ?? 0;
	const leafRisk = athlete.leaf_q_total ?? 0;

	if (readinessScore < 55) {
		statements.push("Conviene ajustar o controlar la carga de entrenamiento a corto plazo.");
	} else if (readinessScore < 75) {
		statements.push("Mantener una progresion conservadora de la carga con seguimiento cercano.");
	} else {
		statements.push("El estado general permite progresar carga con monitoreo habitual.");
	}

	if (leafRisk >= 8) {
		statements.push("Existe riesgo LEAF-Q elevado y requiere seguimiento especifico.");
	}

	if (activePainCount > 0 || lastTrainingHasPain) {
		statements.push("Hay molestias activas o recientes; priorizar control de sintomas antes de subir intensidad.");
	}

	if (hasMenstrualSignals) {
		statements.push("Revisar evolucion de sintomas menstruales y recuperacion en la planificacion semanal.");
	}

	if ((latestDailyCheckin?.fatigue ?? 0) >= 7 || (latestDailyCheckin?.stress ?? 0) >= 7 || (latestDailyCheckin?.sleep_quality ?? 10) <= 4) {
		statements.push("El check-in diario reporta fatiga/estres elevados o sueno bajo; conviene ajustar recuperacion.");
	}

	if (statements.length === 1) {
		statements.push("Continuar monitorizando readiness, molestias y percepcion de fatiga para detectar cambios tempranos.");
	}

	return statements.join(" ");
}

function recommendedStateLabel(variant: "green" | "yellow" | "red" | "neutral"): string {
	if (variant === "green") return "Puede mantener o progresar carga";
	if (variant === "yellow") return "Conviene ajustar o controlar carga";
	if (variant === "red") return "Reducir carga o revisar antes de entrenar fuerte";
	return "Estado no concluyente";
}

function buildQuickReadReasons(
	athlete: CoachAthleteOverviewRow,
	activePainCount: number,
	lastTrainingHasPain: boolean,
	hasMenstrualSignals: boolean,
	latestDailyCheckin: DailyCheckinRow | null,
): string[] {
	const reasons: string[] = [];
	const readinessSummary = athlete.readiness_summary?.trim();
	const readinessReasons = athlete.readiness_reasons ?? [];
	const leafRisk = athlete.leaf_q_risk_level?.toLowerCase() ?? "";
	const activeFlags = athlete.active_flags_count ?? 0;

	if (readinessSummary) {
		reasons.push(readinessSummary);
	}

	readinessReasons.slice(0, 2).forEach((reason) => reasons.push(reason));

	if (leafRisk.includes("high") || leafRisk.includes("alto")) {
		reasons.push("Riesgo LEAF-Q elevado en la valoracion actual.");
	}

	if (activeFlags > 0) {
		reasons.push(`Hay ${activeFlags} alerta(s) activa(s) que requieren seguimiento.`);
	}

	if (activePainCount > 0 || lastTrainingHasPain) {
		reasons.push("Se detectan molestias activas o dolor reciente asociado al entrenamiento.");
	}

	if (hasMenstrualSignals) {
		reasons.push("El ciclo/sintomas menstruales conviene integrarlos en la planificacion de carga.");
	}

	if ((latestDailyCheckin?.fatigue ?? 0) >= 7) {
		reasons.push("Fatiga elevada en el ultimo check-in diario.");
	}

	if ((latestDailyCheckin?.stress ?? 0) >= 7) {
		reasons.push("Estres elevado en el ultimo check-in diario.");
	}

	if ((latestDailyCheckin?.sleep_quality ?? 10) <= 4) {
		reasons.push("Calidad de sueno baja en el ultimo check-in diario.");
	}

	if (reasons.length === 0) {
		reasons.push("No hay señales criticas registradas; mantener monitorizacion habitual.");
	}

	return reasons.slice(0, 5);
}

function resolveReadinessVariant(status: string | null): "green" | "yellow" | "red" | "neutral" {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("green") || normalized.includes("verde") || normalized.includes("ready")) return "green";
	if (normalized.includes("yellow") || normalized.includes("amarillo") || normalized.includes("moderate")) return "yellow";
	if (normalized.includes("red") || normalized.includes("rojo") || normalized.includes("high")) return "red";
	return "neutral";
}

function tileClassesByVariant(variant: "green" | "yellow" | "red" | "neutral"): string {
	if (variant === "green") return "border-[#4E9B6E]/25 bg-[#D7EFE7]/45";
	if (variant === "yellow") return "border-[#D9A441]/30 bg-[#D9A441]/10";
	if (variant === "red") return "border-[#C96B5C]/30 bg-[#C96B5C]/10";
	return "border-[#D9DDD8] bg-white";
}

function getLeafVariant(risk: string | null): "green" | "yellow" | "red" | "neutral" {
	const normalized = risk?.toLowerCase() ?? "";
	if (normalized.includes("high") || normalized.includes("alto")) return "red";
	if (normalized.includes("moderate") || normalized.includes("medio")) return "yellow";
	if (normalized.includes("low") || normalized.includes("bajo")) return "green";
	return "neutral";
}

function progressWidth(value: number | null | undefined, max = 100): number {
	if (value === null || value === undefined) return 0;
	if (max <= 0) return 0;
	return Math.max(0, Math.min(100, (value / max) * 100));
}

export function AthleteStateSummarySection({
	athlete,
	trainingSessions,
	painItems,
	menstrualLog,
	menstrualCycle,
	initialProfileScores,
	latestDailyCheckin,
}: AthleteStateSummarySectionProps) {
	const readinessStatus = formatTechnicalLabel(athlete.readiness_status);
	const activePainCount = painItems.filter((item) => (item.intensity ?? 0) > 0).length;
	const lastTraining = trainingSessions[0] ?? null;
	const lastTrainingLabel = lastTraining?.title ?? lastTraining?.sport ?? "Sin registrar";
	const lastTrainingDate = formatDate(lastTraining?.started_at);
	const currentCycle = menstrualLog?.phase
		? formatTechnicalLabel(menstrualLog.phase)
		: athlete.menstrual_status ?? (menstrualCycle ? "Con registro de ciclo" : null);
	const hasMenstrualSignals = Boolean(menstrualLog?.phase || (athlete.menstrual_status ?? "").toLowerCase().includes("irregular"));
	const lastTrainingHasPain = Boolean(lastTraining?.feedback?.had_pain);
	const quickRead = buildQuickReadText(athlete, activePainCount, lastTrainingHasPain, hasMenstrualSignals, latestDailyCheckin);
	const readinessVariant = resolveReadinessVariant(athlete.readiness_status);
	const leafVariant = getLeafVariant(athlete.leaf_q_risk_level);
	const readinessProgress = progressWidth(athlete.readiness_score, 100);
	const alertsProgress = progressWidth(athlete.active_flags_count, 10);
	const recommendedState = recommendedStateLabel(readinessVariant);
	const quickReadReasons = buildQuickReadReasons(athlete, activePainCount, lastTrainingHasPain, hasMenstrualSignals, latestDailyCheckin);

	return (
		<section className="space-y-6">
			<div className="max-w-3xl">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C4DFF]">Seguimiento</p>
				<h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0F2D2F] md:text-3xl">Resumen de estado</h2>
				<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
					Vista rapida para orientar decisiones de carga, recuperacion y seguimiento.
				</p>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
				<div className="min-w-0">
					<Profile360RadarCard
						athlete={athlete}
						menstrualLog={menstrualLog}
						menstrualCycle={menstrualCycle}
						initialProfileScores={initialProfileScores}
						trainingSessions={trainingSessions}
					/>
				</div>

				<div className="space-y-6">
					<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Estado actual</h3>
							<StatusBadge label={formatTechnicalLabel(athlete.readiness_status)} variant={readinessVariant} />
						</div>
						<div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
							<div className={`rounded-xl border p-4 ${tileClassesByVariant(readinessVariant)}`}>
								<p className="text-xs font-medium text-[#5F6B6D]">Estado readiness</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{displayValue(readinessStatus)}</p>
							</div>
							<div className={`rounded-xl border p-4 ${tileClassesByVariant(readinessVariant)}`}>
								<p className="text-xs font-medium text-[#5F6B6D]">Score readiness</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{displayValue(athlete.readiness_score)}</p>
								<div className="mt-2 h-2 rounded-full bg-[#D9DDD8]/50">
									<div className="h-full rounded-full bg-[#0F5C63]" style={{ width: `${readinessProgress}%` }} />
								</div>
							</div>
							<div className={`rounded-xl border p-4 ${tileClassesByVariant(leafVariant)}`}>
								<p className="text-xs font-medium text-[#5F6B6D]">Riesgo LEAF-Q</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{formatTechnicalLabel(athlete.leaf_q_risk_level)}</p>
							</div>
							<div className="rounded-xl border border-[#D9DDD8] bg-white p-4">
								<p className="text-xs font-medium text-[#5F6B6D]">Alertas activas</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{displayValue(athlete.active_flags_count)}</p>
								<div className="mt-2 h-2 rounded-full bg-[#D9DDD8]/50">
									<div className="h-full rounded-full bg-[#C96B5C]" style={{ width: `${alertsProgress}%` }} />
								</div>
							</div>
							<div className="rounded-xl border border-[#D9DDD8] bg-white p-4">
								<p className="text-xs font-medium text-[#5F6B6D]">Ciclo actual</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{displayValue(currentCycle)}</p>
							</div>
							<div className="rounded-xl border border-[#D9DDD8] bg-white p-4">
								<p className="text-xs font-medium text-[#5F6B6D]">Molestias activas</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{activePainCount}</p>
							</div>
							<div className="col-span-2 rounded-xl border border-[#D9DDD8] bg-[#D7EFE7]/35 p-4">
								<p className="text-xs font-medium text-[#5F6B6D]">Ultimo entrenamiento</p>
								<p className="mt-1 text-sm font-semibold text-[#0F2D2F]">{displayValue(lastTrainingLabel)}</p>
								<p className="mt-1 text-xs text-[#5F6B6D]">{lastTrainingDate}</p>
							</div>
						</div>
					</article>

					<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
						<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Lectura rapida</h3>
						<div className="mt-4 rounded-xl border border-[#D9DDD8] bg-white p-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Estado recomendado</p>
							<div className="mt-2 flex flex-wrap items-center gap-3">
								<StatusBadge label={formatTechnicalLabel(athlete.readiness_status)} variant={readinessVariant} />
								<p className="text-sm font-semibold text-[#0F2D2F]">{recommendedState}</p>
							</div>
						</div>
						<div className="mt-5">
							<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Motivos principales</p>
							<ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#5F6B6D]">
								{quickReadReasons.map((reason) => (
									<li key={reason}>{reason}</li>
								))}
							</ul>
						</div>
						<p className="mt-4 text-sm leading-relaxed text-[#0F2D2F]/90">{quickRead}</p>
						<p className="mt-4 text-xs leading-relaxed text-[#5F6B6D]">
							No representa diagnostico medico. Es una ayuda para contextualizar la toma de decisiones del
							entrenador/profesional.
						</p>
					</article>
				</div>
			</div>
		</section>
	);
}
