import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { InitialProfileScoreRow, MenstrualLogRow, MenstrualCycleRow } from "@/lib/athletes/coachAthleteDetailBundle";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { DailyCheckinRow } from "@/types/daily-checkin";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";

function display(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "boolean") return value ? "Sí" : "No";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

export function formatAgeFromBirthDate(birthDate: string | null): string | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;
	const ageYears = Math.floor((Date.now() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	if (ageYears < 10 || ageYears > 90) return null;
	return `${ageYears} años (aprox.)`;
}

function leafRiskIsElevated(level: string | null): boolean {
	const n = level?.toLowerCase() ?? "";
	return n.includes("high") || n.includes("alto") || n.includes("moderate") || n.includes("medio");
}

function menstrualNeedsClinicalContext(status: string | null): boolean {
	const n = status?.toLowerCase() ?? "";
	return (
		n.includes("amenor") ||
		n.includes("ausen") ||
		n.includes("irregular") ||
		n.includes("oligo") ||
		n.includes("alter")
	);
}

/**
 * Párrafos de resumen ejecutivo para lectura por otros profesionales (no diagnóstico).
 */
export function buildExecutiveSummaryParagraphs(
	athlete: CoachAthleteOverviewRow,
	menstrualLog: MenstrualLogRow | null,
): string[] {
	const name = athlete.athlete_name?.trim() || "La deportista";
	const age = formatAgeFromBirthDate(athlete.birth_date);
	const sport = display(athlete.main_sport);
	const level = formatTechnicalLabel(athlete.training_level);
	const hours = display(athlete.training_hours_per_week);
	const leafTotal = display(athlete.leaf_q_total);
	const leafRisk = formatTechnicalLabel(athlete.leaf_q_risk_level);
	const leafInterp = athlete.leaf_q_interpretation?.trim();
	const readinessScore = display(athlete.readiness_score);
	const readinessLabel = formatTechnicalLabel(athlete.readiness_status);
	const readinessSummary = athlete.readiness_summary?.trim();
	const alerts = athlete.active_flags_count ?? 0;
	const alertTitles = (athlete.active_flag_titles ?? []).filter(Boolean).slice(0, 5);
	const menstrualStatus = display(athlete.menstrual_status);
	const ahc = display(athlete.uses_hormonal_contraception);

	const p: string[] = [];

	p.push(
		`Este informe resume el cribado inicial de riesgo en mujer deportista para ${name}${age ? ` (${age})` : ""}, elaborado con la herramienta CicloActiva. Su finalidad es alinear al equipo asistencial y deportivo sobre la situación global en el momento de la emisión; no sustituye historia clínica ni exploración física.`,
	);

	p.push(
		`Contexto deportivo declarado: deporte principal ${sport}, nivel ${level}, carga aproximada de ${hours} horas por semana. Estado menstrual declarado en ficha: ${menstrualStatus}. Anticonceptivos hormonales: ${ahc}.`,
	);

	const leafLine = leafInterp
		? `LEAF-Q total ${leafTotal}, categoría ${leafRisk}. Interpretación registrada en plataforma: ${leafInterp}`
		: `LEAF-Q total ${leafTotal}, categoría de riesgo ${leafRisk}.`;
	p.push(
		`${leafLine}. El LEAF-Q es un instrumento de cribado orientativo sobre baja energía disponible y factores asociados; la decisión clínica corresponde al profesional sanitario.`,
	);

	const reasons = (athlete.readiness_reasons ?? []).filter((r) => r.trim().length > 0).slice(0, 4);
	const reasonsText = reasons.length > 0 ? ` Motivos registrados: ${reasons.join("; ")}.` : "";
	const rs = readinessSummary ? ` Resumen subjetivo: ${readinessSummary}.` : "";
	p.push(
		`La puntuación global de readiness (autorregistro orientado al entrenador) es ${readinessScore}/100, con estado ${readinessLabel}.${rs}${reasonsText}`,
	);

	if (menstrualLog?.log_date) {
		const phase = formatTechnicalLabel(menstrualLog.phase);
		const day = menstrualLog.cycle_day != null ? `día ${menstrualLog.cycle_day} del ciclo` : "día del ciclo no indicado";
		p.push(
			`Último registro menstrual en app: fecha ${new Date(menstrualLog.log_date).toLocaleDateString("es-ES")}, fase declarada ${phase}, ${day}. Estos datos son autorreportados y sirven como contexto fisiológico; no confirman fase hormonal por sí solos.`,
		);
	} else if (menstrualNeedsClinicalContext(athlete.menstrual_status)) {
		p.push(
			`En ficha figura un patrón menstrual que conviene integrar en la valoración global (irregularidad u otras señales declaradas). No hay registro reciente detallado de síntomas en la app en el momento del informe.`,
		);
	}

	if (alerts > 0) {
		const titles = alertTitles.length > 0 ? ` Títulos: ${alertTitles.join("; ")}.` : "";
		p.push(`Hay ${alerts} alerta(s) activa(s) en el sistema.${titles} Se sugiere revisar su significado en el contexto clínico y deportivo de la atleta.`);

		if (leafRiskIsElevated(athlete.leaf_q_risk_level) || alerts >= 2) {
			p.push(
				`En conjunto, las señales sugieren priorizar una valoración multidisciplinar prudente antes de aumentar la exigencia del plan, sin por ello implicar una decisión terapéutica concreta en este documento.`,
			);
		}
	} else {
		p.push(
			`No constan alertas activas numeradas en el sistema en el momento de la emisión; ello no excluye vigilancia clínica según criterio del profesional.`,
		);
	}

	return p;
}

/**
 * Sugerencias de coordinación entre profesionales (orientativas, no prescriptivas).
 */
export function buildCoordinationSuggestions(athlete: CoachAthleteOverviewRow, painWithIntensity: number): string[] {
	const suggestions: string[] = [];
	const leaf = athlete.leaf_q_risk_level?.toLowerCase() ?? "";
	const highLeaf = leaf.includes("high") || leaf.includes("alto");
	const modLeaf = leaf.includes("moderate") || leaf.includes("medio");

	if (highLeaf || modLeaf) {
		suggestions.push(
			"Valorar interconsulta o coordinación con medicina deportiva y/o nutrición deportiva para revisión de disponibilidad energética y hábitos, según criterio clínico.",
		);
	}

	if (menstrualNeedsClinicalContext(athlete.menstrual_status)) {
		suggestions.push(
			"Ante alteraciones menstruales declaradas, considerar valoración ginecológica o de medicina interna si procede en su contexto asistencial.",
		);
	}

	if ((athlete.active_flags_count ?? 0) > 0) {
		suggestions.push(
			"Revisar en la plataforma emisora el detalle de alertas activas y contrastarlas con la exploración y la historia clínica.",
		);
	}

	if (painWithIntensity > 0) {
		suggestions.push(
			"Existen registros recientes de molestias o dolor; puede ser útil coordinar con fisioterapia o traumatología según la clínica local y la intensidad referida.",
		);
	}

	if (suggestions.length === 0) {
		suggestions.push(
			"Mantener seguimiento periódico acorde al nivel competitivo y a la evolución subjetiva de la atleta; reemitir informe actualizado si cambian los datos en CicloActiva.",
		);
	}

	suggestions.push(
		"La ficha digital en CicloActiva conserva tablas por dominio, lectura rápida y gráficos interactivos que complementan este PDF.",
	);

	return suggestions;
}

export function buildLatestCheckinSummary(checkin: DailyCheckinRow | null): string | null {
	if (!checkin) return null;
	const parts: string[] = [];
	parts.push(`Fecha del último check-in registrado: ${checkin.checkin_date}.`);
	if (checkin.sleep_quality != null) parts.push(`Calidad de sueño (escala): ${checkin.sleep_quality}.`);
	if (checkin.energy != null) parts.push(`Energía: ${checkin.energy}.`);
	if (checkin.fatigue != null) parts.push(`Fatiga: ${checkin.fatigue}.`);
	if (checkin.stress != null) parts.push(`Estrés: ${checkin.stress}.`);
	if (checkin.notes?.trim()) parts.push(`Notas: ${checkin.notes.trim()}`);
	return parts.join(" ");
}

export function sortProfileScoresForReport(rows: InitialProfileScoreRow[]): InitialProfileScoreRow[] {
	return [...rows]
		.filter((r) => r.score_value !== null && r.score_value !== undefined)
		.sort((a, b) => (b.score_value ?? 0) - (a.score_value ?? 0));
}

export function countPainWithIntensity(items: AthletePainOverviewRow[]): number {
	return items.filter((i) => (i.intensity ?? 0) > 0).length;
}
