"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { TrainingSessionWithFeedback } from "@/types/training";

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

interface Profile360RadarCardProps {
	athlete: CoachAthleteOverviewRow;
	menstrualLog: MenstrualLogLike | null;
	menstrualCycle: MenstrualCycleLike | null;
	trainingSessions: TrainingSessionWithFeedback[];
	initialProfileScores: InitialProfileScore[];
	/** Contenido entre el radar y el resumen de fuentes (p. ej. estado actual y lectura rápida). */
	children?: ReactNode;
	/** En informe impreso/PDF no mostrar CTA duplicada. */
	showInformeCtas?: boolean;
}

const DOMAIN_ORDER = [
	"leaf_q_risk",
	"menstrual_function",
	"gastrointestinal_function",
	"injury_history",
	"eating_behavior",
	"stress_recovery",
	"bone_load",
	"readiness_initial",
] as const;

const FALLBACK_DOMAIN_LABELS: Record<(typeof DOMAIN_ORDER)[number], string> = {
	leaf_q_risk: "Riesgo LEAF-Q",
	menstrual_function: "Función menstrual",
	gastrointestinal_function: "Función gastrointestinal",
	injury_history: "Historial de lesiones",
	eating_behavior: "Conducta alimentaria",
	stress_recovery: "Estrés-recuperación",
	bone_load: "Salud ósea / carga de impacto",
	readiness_initial: "Readiness inicial",
};

const DOMAIN_ALIASES: Record<(typeof DOMAIN_ORDER)[number], string[]> = {
	leaf_q_risk: ["leaf_q_risk", "leaf_q_total"],
	menstrual_function: ["menstrual_function", "menstrual"],
	gastrointestinal_function: ["gastrointestinal_function", "gastrointestinal"],
	injury_history: ["injury_history", "injuries"],
	eating_behavior: ["eating_behavior"],
	stress_recovery: ["stress_recovery"],
	bone_load: ["bone_load"],
	readiness_initial: ["readiness_initial"],
};

/** Textos fijos para entrenador; solo se muestran si hay fila en perfil inicial (no sustituyen datos en BD). */
const COACH_DOMAIN_INTERPRETATIONS: Record<(typeof DOMAIN_ORDER)[number], string> = {
	leaf_q_risk:
		"Puntuación LEAF-Q elevada. Conviene revisar disponibilidad energética, ciclo menstrual, molestias gastrointestinales e historial de lesiones antes de aumentar carga.",
	menstrual_function:
		"Señales de alteración menstrual. Revisar regularidad, ausencia de menstruación, cambios con la carga y uso de anticonceptivos.",
	gastrointestinal_function:
		"Señal baja en síntomas gastrointestinales. Mantener seguimiento si aparecen hinchazón, dolor abdominal o cambios digestivos.",
	injury_history:
		"Historial moderado de lesiones o ausencias. Conviene controlar progresión de carga y aparición de molestias recurrentes.",
	eating_behavior:
		"Sin señal elevada en este cribado reducido. Mantener observación si aparecen restricción, miedo a ganar peso o conductas compensatorias.",
	stress_recovery:
		"Señales moderadas de fatiga o recuperación insuficiente. Revisar sueño, descanso, carga acumulada y estrés percibido.",
	bone_load:
		"Señal baja en salud ósea/carga de impacto. Mantener seguimiento si hay amenorrea, fracturas por estrés o baja fuerza/carga mecánica.",
	readiness_initial:
		"Estado inicial moderado. Observar sueño, energía, fatiga, dolor, estrés y recuperación en los primeros check-ins.",
};

type RadarDatum = {
	domainCode: (typeof DOMAIN_ORDER)[number];
	area: string;
	risk: number;
	source: string | null;
	status: string | null;
	interpretation: string | null;
};

function clampScore(value: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.min(10, Math.max(0, Number(value.toFixed(1))));
}

function getLeafRisk(athlete: CoachAthleteOverviewRow): number {
	const total = athlete.leaf_q_total;
	if (total === null || total === undefined) return 0;
	return clampScore(total);
}

function getMenstrualRisk(
	athlete: CoachAthleteOverviewRow,
	menstrualLog: MenstrualLogLike | null,
	menstrualCycle: MenstrualCycleLike | null,
): number {
	let score = 0;
	const status = athlete.menstrual_status?.toLowerCase() ?? "";

	if (status.includes("amenor") || status.includes("ausen") || status.includes("irregular") || status.includes("alter")) {
		score += 4;
	}

	if (menstrualLog?.menstrual_pain !== null && menstrualLog?.menstrual_pain !== undefined) {
		if (menstrualLog.menstrual_pain >= 7) score += 3;
		else if (menstrualLog.menstrual_pain >= 4) score += 2;
		else if (menstrualLog.menstrual_pain >= 1) score += 1;
	}

	const symptomCount = menstrualLog?.symptoms?.filter((symptom) => symptom.trim().length > 0).length ?? 0;
	score += Math.min(3, Math.floor(symptomCount / 2));

	if (!status && !menstrualLog && !menstrualCycle) return 0;
	return clampScore(score);
}

function getInjuriesRisk(athlete: CoachAthleteOverviewRow): number {
	const high = athlete.high_flags_count ?? 0;
	const critical = athlete.critical_flags_count ?? 0;
	const moderate = athlete.moderate_flags_count ?? 0;
	const weightedScore = high * 2 + critical * 3 + moderate;
	return clampScore(weightedScore);
}

function getStressRecoveryRisk(athlete: CoachAthleteOverviewRow, trainingSessions: TrainingSessionWithFeedback[]): number {
	const latestFeedback = trainingSessions.find((session) => session.feedback !== null)?.feedback;

	if (!latestFeedback) {
		const readinessScore = athlete.readiness_score;
		if (readinessScore === null || readinessScore === undefined) return 0;
		return clampScore(10 - readinessScore / 10);
	}

	const fatigueRisk = latestFeedback.fatigue ?? 0;
	const energyRisk = latestFeedback.energy !== null && latestFeedback.energy !== undefined ? 10 - latestFeedback.energy : 0;
	const sleepRisk =
		latestFeedback.sleep_quality !== null && latestFeedback.sleep_quality !== undefined ? 10 - latestFeedback.sleep_quality : 0;
	const riskAverage = (fatigueRisk + energyRisk + sleepRisk) / 3;

	return clampScore(riskAverage);
}

function getReadinessInitialRisk(athlete: CoachAthleteOverviewRow): number {
	const readinessScore = athlete.readiness_score;
	if (readinessScore === null || readinessScore === undefined) return 0;
	return clampScore(10 - readinessScore / 10);
}

function buildFallbackData(
	athlete: CoachAthleteOverviewRow,
	menstrualLog: MenstrualLogLike | null,
	menstrualCycle: MenstrualCycleLike | null,
	trainingSessions: TrainingSessionWithFeedback[],
): RadarDatum[] {
	const fallbackValues: Record<(typeof DOMAIN_ORDER)[number], number> = {
		leaf_q_risk: getLeafRisk(athlete),
		menstrual_function: getMenstrualRisk(athlete, menstrualLog, menstrualCycle),
		gastrointestinal_function: 0,
		injury_history: getInjuriesRisk(athlete),
		eating_behavior: 0,
		stress_recovery: getStressRecoveryRisk(athlete, trainingSessions),
		bone_load: 0,
		readiness_initial: getReadinessInitialRisk(athlete),
	};

	return DOMAIN_ORDER.map((domainCode) => ({
		domainCode,
		area: FALLBACK_DOMAIN_LABELS[domainCode],
		risk: fallbackValues[domainCode],
		source: "fallback",
		status: domainCode === "gastrointestinal_function" || domainCode === "eating_behavior" || domainCode === "bone_load" ? "pending" : "estimated",
		interpretation: "Calculado con datos disponibles en la ficha.",
	}));
}

function normalizeSource(source: string | null): "real" | "estimated" | "pending" {
	const normalized = source?.toLowerCase() ?? "";
	if (normalized.includes("pending") || normalized.includes("pendiente")) return "pending";
	if (normalized.includes("estimate") || normalized.includes("estimad")) return "estimated";
	return "real";
}

/** Etiqueta solo para UI; los valores en BD no cambian. */
function formatStatusDisplay(status: string | null | undefined, source: string | null | undefined): string {
	const raw = status?.trim() ?? "";
	const lower = raw.toLowerCase();

	if (lower === "estimated" || lower.includes("estimate")) {
		return "Calculado";
	}
	if (lower === "pending" || lower.includes("pending")) {
		return "Pendiente";
	}
	if (lower === "real" || lower.includes("real") || lower.includes("confirm")) {
		return "Confirmado";
	}

	if (!raw) {
		const derived = normalizeSource(source ?? null);
		if (derived === "estimated") return "Calculado";
		if (derived === "pending") return "Pendiente";
		return "Confirmado";
	}

	return raw;
}

function formatSourceLabel(source: string | null): string {
	const normalized = source?.toLowerCase() ?? "";
	if (!normalized) return "Sin registrar";
	if (normalized === "leaf_q") return "LEAF-Q";
	if (normalized === "s_ede_q_short") return "S-EDE-Q reducido";
	if (normalized === "restq_short") return "RESTQ reducido";
	if (normalized === "bpaq_short") return "BPAQ reducido";
	if (normalized === "initial_readiness") return "Readiness inicial";
	return source ?? "Sin registrar";
}

export function Profile360RadarCard({
	athlete,
	menstrualLog,
	menstrualCycle,
	trainingSessions,
	initialProfileScores,
	children,
	showInformeCtas = true,
}: Profile360RadarCardProps) {
	const hasInitialScores = initialProfileScores.length > 0;
	const initialScoresByDomain = new Map(initialProfileScores.map((item) => [item.domain_code, item]));
	const data: RadarDatum[] = hasInitialScores
		? DOMAIN_ORDER.map((domainCode) => {
				const aliasCandidates = DOMAIN_ALIASES[domainCode];
				const item = aliasCandidates.map((candidate) => initialScoresByDomain.get(candidate)).find(Boolean);
				const hasRow = Boolean(item);
				const coachInterpretation = COACH_DOMAIN_INTERPRETATIONS[domainCode];
				const interpretation = hasRow
					? coachInterpretation ?? item?.interpretation ?? "Sin interpretación"
					: "Eje pendiente de carga.";
				return {
					domainCode,
					area: item?.domain_label ?? FALLBACK_DOMAIN_LABELS[domainCode],
					risk: clampScore(item?.score_value ?? 0),
					source: item?.source ?? null,
					status: item?.status ?? (item ? null : "pending"),
					interpretation,
				};
			})
		: buildFallbackData(athlete, menstrualLog, menstrualCycle, trainingSessions);

	const pendingCount = data.filter((item) => (item.status?.toLowerCase() ?? "").includes("pending")).length;
	const estimatedCount = data.filter((item) => {
		const status = item.status?.toLowerCase() ?? "";
		if (status.includes("pending")) return false;
		return normalizeSource(item.source) === "estimated";
	}).length;
	const realCount = data.length - pendingCount - estimatedCount;
	const rankedInitialScores = [...initialProfileScores]
		.filter((item) => item.score_value !== null && item.score_value !== undefined)
		.sort((a, b) => (b.score_value ?? 0) - (a.score_value ?? 0));
	const topDomains = rankedInitialScores.slice(0, 3);
	const lowDomains = [...rankedInitialScores].sort((a, b) => (a.score_value ?? 0) - (b.score_value ?? 0)).slice(0, 2);

	return (
		<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
			<h2 className="text-xl font-bold tracking-tight text-[#0F2D2F] md:text-2xl">Perfil 360º inicial</h2>
			<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
				Informe inicial de riesgo: resumen visual de las áreas evaluadas en la primera valoración para apoyar la toma de decisiones del
				profesional.
			</p>
			<div className="mt-6 h-[360px] w-full min-w-0">
				<ResponsiveContainer width="100%" height="100%">
					<RadarChart data={data} outerRadius="70%">
						<PolarGrid stroke="#D9DDD8" />
						<PolarAngleAxis dataKey="area" tick={{ fill: "#0F2D2F", fontSize: 12 }} />
						<PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fill: "#5F6B6D", fontSize: 11 }} />
						<Radar dataKey="risk" stroke="#0F5C63" fill="#0F5C63" fillOpacity={0.2} strokeWidth={2} />
					</RadarChart>
				</ResponsiveContainer>
			</div>
			{children ? <div className="mt-6 space-y-6">{children}</div> : null}
			{showInformeCtas ? (
				<div className="report-no-print mt-6">
					<Link
						href={`/dashboard/athletes/${athlete.athlete_id}/report`}
						className="inline-flex items-center rounded-xl bg-[#0F5C63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54]"
					>
						Ver informe completo
					</Link>
				</div>
			) : null}
			<div className="mt-6 grid gap-3 text-xs text-[#5F6B6D] md:grid-cols-3">
				<p className="rounded-xl border border-[#4E9B6E]/25 bg-[#D7EFE7]/50 px-3 py-2.5"><span className="font-semibold text-[#0F5C63]">Datos reales:</span> {realCount}</p>
				<p className="rounded-xl border border-[#D9A441]/25 bg-[#D9A441]/8 px-3 py-2.5"><span className="font-semibold text-[#7A5A12]">Estimados:</span> {estimatedCount}</p>
				<p className="rounded-xl border border-[#D9DDD8] bg-white px-3 py-2.5"><span className="font-semibold text-[#5F6B6D]">Pendientes:</span> {pendingCount}</p>
			</div>
			<div className="mt-6 grid gap-4 md:grid-cols-2">
				<article className="rounded-xl border border-[#D9DDD8] bg-white p-5">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Áreas principales a vigilar</p>
					{topDomains.length === 0 ? (
						<p className="mt-2 text-sm text-[#5F6B6D]">Sin scores iniciales registrados.</p>
					) : (
						<ul className="mt-3 space-y-1.5 text-sm text-[#0F2D2F]">
							{topDomains.map((item) => (
								<li key={`top-${item.domain_code}`}>{item.domain_label}: {item.score_value}</li>
							))}
						</ul>
					)}
				</article>
				<article className="rounded-xl border border-[#D9DDD8] bg-white p-5">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Áreas con menor señal actual</p>
					{lowDomains.length === 0 ? (
						<p className="mt-2 text-sm text-[#5F6B6D]">Sin scores iniciales registrados.</p>
					) : (
						<ul className="mt-3 space-y-1.5 text-sm text-[#0F2D2F]">
							{lowDomains.map((item) => (
								<li key={`low-${item.domain_code}`}>{item.domain_label}: {item.score_value}</li>
							))}
						</ul>
					)}
				</article>
			</div>
			<div className="mt-6 overflow-hidden rounded-xl border border-[#D9DDD8]">
				<table className="w-full table-fixed text-left text-xs">
					<thead>
						<tr className="border-b border-[#D9DDD8] bg-[#D7EFE7]/30 text-[#5F6B6D]">
							<th className="w-[28%] py-3 pr-3 pl-4 font-semibold">Eje</th>
							<th className="w-[22%] py-3 pr-3 font-semibold">Fuente</th>
							<th className="w-[16%] py-3 pr-3 font-semibold">Estado</th>
							<th className="w-[34%] py-3 pr-4 font-semibold">Interpretación por eje</th>
						</tr>
					</thead>
					<tbody>
						{data.map((item) => (
							<tr key={item.domainCode} className="border-b border-[#D9DDD8]/60 text-[#0F2D2F] last:border-b-0">
								<td className="py-3 pr-3 pl-4 align-top break-words">{item.area}</td>
								<td className="py-3 pr-3 align-top break-words">{formatSourceLabel(item.source)}</td>
								<td className="py-3 pr-3 align-top break-words">{formatStatusDisplay(item.status, item.source)}</td>
								<td className="py-3 pr-4 align-top break-words text-[#5F6B6D]">{item.interpretation ?? "Sin interpretación"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="mt-4 text-xs leading-relaxed text-[#5F6B6D]">
				Más hacia fuera indica mayor necesidad de atención o seguimiento. Los ejes pendientes no deben interpretarse como ausencia de riesgo.
				Información orientativa para el profesional; no representa diagnóstico médico.
			</p>
		</section>
	);
}
