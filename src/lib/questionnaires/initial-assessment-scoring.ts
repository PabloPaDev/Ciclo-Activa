import type { QuestionOptionRow, QuestionRow } from "@/types/questionnaire";

export const INITIAL_ASSESSMENT_QUESTIONNAIRE_ORDER = [
	"leaf_q",
	"s_ede_q_short",
	"restq_short",
	"bpaq_short",
	"initial_readiness",
] as const;

export type OfficialScoreCode =
	| "leaf_q_risk"
	| "menstrual_function"
	| "gastrointestinal_function"
	| "injury_history"
	| "eating_behavior"
	| "stress_recovery"
	| "bone_load"
	| "readiness_initial";

export const OFFICIAL_SCORE_LABELS: Record<OfficialScoreCode, string> = {
	leaf_q_risk: "Riesgo LEAF-Q",
	menstrual_function: "Función menstrual",
	gastrointestinal_function: "Función gastrointestinal",
	injury_history: "Historial de lesiones",
	eating_behavior: "Conducta alimentaria",
	stress_recovery: "Estrés-recuperación",
	bone_load: "Salud ósea / carga de impacto",
	readiness_initial: "Readiness inicial",
};

export const PROFILE_SOURCE_BY_DOMAIN: Record<OfficialScoreCode, string> = {
	leaf_q_risk: "leaf_q",
	menstrual_function: "leaf_q",
	gastrointestinal_function: "leaf_q",
	injury_history: "leaf_q",
	eating_behavior: "s_ede_q_short",
	stress_recovery: "restq_short",
	bone_load: "bpaq_short",
	readiness_initial: "initial_readiness",
};

export function normalizeQuestionnaireCode(code: string | null): string {
	return (code ?? "").trim().toLowerCase();
}

/** Coincide con leaf_q / LEAF_Q tras normalizar. */
export function isLeafQuestionnaire(code: string | null): boolean {
	const n = normalizeQuestionnaireCode(code).replace(/-/g, "_");
	return n === "leaf_q";
}

export function leafSubdomainFromQuestionCode(questionCode: string | null): "injury_history" | "gastrointestinal_function" | "menstrual_function" | null {
	const q = questionCode ?? "";
	if (q.startsWith("1_")) return "injury_history";
	if (q.startsWith("2_")) return "gastrointestinal_function";
	if (q.startsWith("3.1_") || q.startsWith("3.2_")) return "menstrual_function";
	return null;
}

export function leafQOverallRiskLevel(total: number): "high" | "low" {
	return total >= 8 ? "high" : "low";
}

export function threeLevelRisk(score: number, lowMax: number, moderateMax: number): "low" | "moderate" | "high" {
	if (score <= lowMax) return "low";
	if (score <= moderateMax) return "moderate";
	return "high";
}

export function domainRiskFromLeafSubdomain(score: number): "low" | "moderate" | "high" {
	if (score <= 2) return "low";
	if (score <= 5) return "moderate";
	return "high";
}

const EDE_DANGER_PATTERN = /v[oó]mito|laxante|diur[eé]tic|diuretic|laxative|vomit/i;

export function optionLooksAffirmative(option: QuestionOptionRow | undefined): boolean {
	if (!option) return false;
	const sv = Number(option.score_value ?? 0);
	if (sv > 0) return true;
	const text = `${option.option_text ?? ""} ${option.raw_value ?? ""}`.toLowerCase();
	return /(^|\b)(s[ií]|yes|true|afirm|1)(\b|$)/i.test(text);
}

export function optionIndicatesEdBehaviors(option: QuestionOptionRow | undefined): boolean {
	if (!option) return false;
	const blob = `${option.option_text ?? ""} ${option.code ?? ""} ${option.raw_value ?? ""}`;
	return EDE_DANGER_PATTERN.test(blob);
}

export function eatingBehaviorRiskLevel(score: number, hasForcedHigh: boolean): "low" | "moderate" | "high" {
	let level: "low" | "moderate" | "high" = threeLevelRisk(score, 4, 9);
	if (hasForcedHigh) return "high";
	return level;
}

export function stressRecoveryRiskLevel(score: number): "low" | "moderate" | "high" {
	return threeLevelRisk(score, 5, 12);
}

export function boneLoadRiskLevel(score: number): "low" | "moderate" | "high" {
	return threeLevelRisk(score, 3, 8);
}

export function readinessInitialRiskLevel(riskScore: number): "low" | "moderate" | "high" {
	return threeLevelRisk(riskScore, 3, 6);
}

export function bpaqImpactYearsBonus(years: number | null): number {
	if (years === null || Number.isNaN(years)) return 3;
	if (years >= 5) return 0;
	if (years >= 1) return 1;
	return 3;
}

export function isBpaqImpactYearsQuestion(question: QuestionRow): boolean {
	const code = (question.code ?? "").toLowerCase();
	const text = (question.question_text ?? "").toLowerCase();
	if (code.includes("impact") && (code.includes("year") || code.includes("ano") || code.includes("año"))) return true;
	if (text.includes("impacto") && (text.includes("años") || text.includes("anos"))) return true;
	return false;
}

const READINESS_CODES = [
	"initial_sleep_quality",
	"initial_energy",
	"initial_fatigue",
	"initial_soreness",
	"initial_stress",
	"initial_motivation",
	"initial_recovery",
] as const;

export function computeReadinessInitialRiskScore(values: Partial<Record<(typeof READINESS_CODES)[number], number>>): number {
	const parts: number[] = [];
	const add = (v: number | undefined, fn: (x: number) => number) => {
		if (v === undefined || v === null || Number.isNaN(v)) return;
		parts.push(fn(v));
	};
	add(values.initial_sleep_quality, (x) => 10 - x);
	add(values.initial_energy, (x) => 10 - x);
	add(values.initial_fatigue, (x) => x);
	add(values.initial_soreness, (x) => x);
	add(values.initial_stress, (x) => x);
	add(values.initial_motivation, (x) => 10 - x);
	add(values.initial_recovery, (x) => 10 - x);
	if (parts.length === 0) return 0;
	return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export function readinessCodeList(): readonly string[] {
	return READINESS_CODES;
}
