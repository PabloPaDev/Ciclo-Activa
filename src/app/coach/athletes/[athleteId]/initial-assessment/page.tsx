"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
	boneLoadRiskLevel,
	bpaqImpactYearsBonus,
	computeReadinessInitialRiskScore,
	domainRiskFromLeafSubdomain,
	eatingBehaviorRiskLevel,
	isBpaqImpactYearsQuestion,
	isLeafQuestionnaire,
	leafQOverallRiskLevel,
	leafSubdomainFromQuestionCode,
	normalizeQuestionnaireCode,
	OFFICIAL_SCORE_LABELS,
	optionIndicatesEdBehaviors,
	optionLooksAffirmative,
	PROFILE_SOURCE_BY_DOMAIN,
	readinessCodeList,
	readinessInitialRiskLevel,
	stressRecoveryRiskLevel,
	type OfficialScoreCode,
} from "@/lib/questionnaires/initial-assessment-scoring";
import { filterByColumns, getPublicTableColumns } from "@/lib/supabase/schema";
import type { QuestionOptionRow, QuestionnaireRow, QuestionnaireSectionRow, QuestionRow } from "@/types/questionnaire";

type NormalizedQuestionType =
	| "single_choice"
	| "multiple_choice"
	| "text"
	| "number"
	| "boolean"
	| "date"
	| "scale";

type QuestionAnswerState = {
	singleOptionId: string;
	multipleOptionIds: string[];
	textValue: string;
	numberValue: string;
	booleanValue: "" | "true" | "false";
	dateValue: string;
};

type QuestionnairePack = {
	questionnaire: QuestionnaireRow;
	sections: QuestionnaireSectionRow[];
	questions: QuestionRow[];
};

function sortByOrder<T extends { sort_order: number | null }>(items: T[]): T[] {
	return [...items].sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
}

function normalizeQuestionType(questionType: string | null, hasOptions: boolean): NormalizedQuestionType {
	const normalized = (questionType ?? "").toLowerCase();
	if (normalized.includes("multiple") || normalized.includes("multi") || normalized.includes("checkbox")) return "multiple_choice";
	if (normalized.includes("single") || normalized.includes("radio") || normalized.includes("select")) return "single_choice";
	if (normalized.includes("scale") || normalized.includes("likert")) return "scale";
	if (normalized.includes("number") || normalized.includes("numeric") || normalized.includes("decimal")) return "number";
	if (normalized.includes("boolean") || normalized.includes("bool") || normalized.includes("yes_no")) return "boolean";
	if (normalized.includes("date")) return "date";
	if (normalized.includes("text") || normalized.includes("textarea")) return "text";
	return hasOptions ? "single_choice" : "text";
}

function isQuestionAnswered(type: NormalizedQuestionType, answer: QuestionAnswerState): boolean {
	if (type === "single_choice") return Boolean(answer.singleOptionId);
	if (type === "multiple_choice") return answer.multipleOptionIds.length > 0;
	if (type === "text") return answer.textValue.trim().length > 0;
	if (type === "number" || type === "scale") return answer.numberValue.trim().length > 0;
	if (type === "boolean") return answer.booleanValue === "true" || answer.booleanValue === "false";
	if (type === "date") return answer.dateValue.trim().length > 0;
	return false;
}

const ASSESSMENT_TOTAL_STEPS = 6;

function getAssessmentStepTitle(q: QuestionnaireRow): string {
	if (isLeafQuestionnaire(q.code)) return "LEAF-Q";
	const n = normalizeQuestionnaireCode(q.code);
	if (n === "s_ede_q_short") return "Conducta alimentaria";
	if (n === "restq_short") return "Estrés-recuperación";
	if (n === "bpaq_short") return "Salud ósea / carga de impacto";
	if (n === "initial_readiness") return "Readiness inicial";
	return q.name ?? "Cuestionario";
}

function validatePackRequired(
	pack: QuestionnairePack,
	answers: Record<string, QuestionAnswerState>,
	optionsByQuestion: Map<string, QuestionOptionRow[]>,
): string | null {
	for (const question of pack.questions) {
		if (!question.is_required) continue;
		const opts = optionsByQuestion.get(question.id) ?? [];
		const type = normalizeQuestionType(question.question_type, opts.length > 0);
		const answer = answers[question.id];
		if (!answer || !isQuestionAnswered(type, answer)) {
			return "Completa todas las preguntas obligatorias de este paso antes de continuar.";
		}
	}
	return null;
}

function buildLeafOverallInterpretation(totalScore: number): string {
	if (totalScore >= 8) {
		return "Resultado compatible con riesgo aumentado según LEAF-Q. No es un diagnóstico, pero recomienda revisión profesional.";
	}
	return "Resultado sin señal elevada en el cribado LEAF-Q.";
}

function buildDomainInterpretation(domainLabel: string, riskLevel: "low" | "moderate" | "high"): string {
	if (riskLevel === "high") return `${domainLabel}: riesgo alto en esta subescala LEAF-Q; conviene revisión cercana.`;
	if (riskLevel === "moderate") return `${domainLabel}: señal moderada en esta subescala LEAF-Q; conviene seguimiento.`;
	return `${domainLabel}: sin patrón de riesgo elevado en esta subescala LEAF-Q.`;
}

function interpretationForOfficialScore(code: OfficialScoreCode, riskLevel: string, score: number): string {
	const label = OFFICIAL_SCORE_LABELS[code];
	if (code === "eating_behavior") {
		if (riskLevel === "high") return `${label}: puntuación elevada o señales de conductas de alto riesgo; priorizar valoración especializada.`;
		if (riskLevel === "moderate") return `${label}: zona intermedia (${score}); reforzar seguimiento nutricional y emocional.`;
		return `${label}: sin señal fuerte desde el cribado (${score}).`;
	}
	if (code === "stress_recovery") {
		if (riskLevel === "high") return `${label}: carga estrés‑recuperación elevada (${score}); reducir carga y mejorar recuperación.`;
		if (riskLevel === "moderate") return `${label}: equilibrio tensión‑recuperación algo desviado (${score}).`;
		return `${label}: equilibrio aceptable en esta escala (${score}).`;
	}
	if (code === "bone_load") {
		if (riskLevel === "high") return `${label}: alta carga/implicación ósea (${score}); vigilar sintomas de estrés óseo.`;
		if (riskLevel === "moderate") return `${label}: carga intermedia (${score}); ajustes graduales.`;
		return `${label}: carga perceptual contenida (${score}).`;
	}
	if (code === "readiness_initial") {
		if (riskLevel === "high") return `${label}: alto riesgo percibido en la valoración inicial (media ${score.toFixed(1)}).`;
		if (riskLevel === "moderate") return `${label}: riesgo intermedio (media ${score.toFixed(1)}).`;
		return `${label}: lectura inicial favorable (media ${score.toFixed(1)}).`;
	}
	return `${label}: valor ${score}, nivel ${riskLevel}.`;
}

function toRadarProfileValue(score: number): number {
	return Math.min(10, Math.max(0, score));
}

async function upsertRiskFlag(
	supabase: ReturnType<typeof getSupabaseBrowserClient>,
	columns: Set<string> | null,
	params: {
		athleteId: string;
		responseId?: string | null;
		flagCode: string;
		title: string;
		description: string;
	},
): Promise<{ ok: boolean; error?: string }> {
	if (!supabase) return { ok: false, error: "Sin cliente Supabase." };

	let flagQuery = supabase.from("risk_flags").select("id").eq("athlete_id", params.athleteId).eq("flag_code", params.flagCode).limit(1);

	if (columns?.has("is_active")) {
		flagQuery = flagQuery.eq("is_active", true);
	}

	const { data: existingFlag } = await flagQuery.maybeSingle();
	if (existingFlag?.id) return { ok: true };

	const payloadRaw: Record<string, unknown> = {
		athlete_id: params.athleteId,
		flag_code: params.flagCode,
		title: params.title,
		description: params.description,
		risk_level: "high",
		is_active: true,
	};
	if (params.responseId && columns?.has("response_id")) payloadRaw.response_id = params.responseId;

	const flagPayload = filterByColumns(payloadRaw, columns);
	const { error } = await supabase.from("risk_flags").insert(flagPayload);
	if (error) return { ok: false, error: error.message };
	return { ok: true };
}

export default function InitialAssessmentPage() {
	const router = useRouter();
	const params = useParams<{ athleteId: string }>();
	const athleteId = params.athleteId;

	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [packs, setPacks] = useState<QuestionnairePack[]>([]);
	const [options, setOptions] = useState<QuestionOptionRow[]>([]);
	const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>({});
	const [activeStep, setActiveStep] = useState(0);

	const allQuestions = useMemo(() => packs.flatMap((p) => p.questions), [packs]);

	useEffect(() => {
		if (packs.length === 0) return;
		setActiveStep((s) => Math.min(s, packs.length - 1));
	}, [packs.length]);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setErrorMessage("Faltan variables de entorno de Supabase.");
				setIsLoading(false);
				return;
			}

			const supabase = getSupabaseBrowserClient();
			if (!supabase) {
				setErrorMessage("No se pudo inicializar Supabase.");
				setIsLoading(false);
				return;
			}

			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				router.replace("/login");
				return;
			}

			const { data: leafByCode } = await supabase
				.from("questionnaires")
				.select("id, code, name, description, version, is_active")
				.eq("is_active", true)
				.eq("code", "leaf_q")
				.limit(1)
				.maybeSingle();

			const { data: leafByUpper } = !leafByCode
				? await supabase
						.from("questionnaires")
						.select("id, code, name, description, version, is_active")
						.eq("is_active", true)
						.eq("code", "LEAF_Q")
						.limit(1)
						.maybeSingle()
				: { data: null };

			const { data: leafByName } = !leafByCode && !leafByUpper
				? await supabase
						.from("questionnaires")
						.select("id, code, name, description, version, is_active")
						.eq("is_active", true)
						.ilike("name", "%LEAF%")
						.order("updated_at", { ascending: false })
						.limit(1)
						.maybeSingle()
				: { data: null };

			const leafQ = (leafByCode ?? leafByUpper ?? leafByName) as QuestionnaireRow | null;

			const secondaryCodes = ["s_ede_q_short", "restq_short", "bpaq_short", "initial_readiness"] as const;
			const { data: secondaryList } = await supabase
				.from("questionnaires")
				.select("id, code, name, description, version, is_active")
				.eq("is_active", true)
				.in("code", [...secondaryCodes]);

			const codeMap = new Map<string, QuestionnaireRow>();
			for (const row of secondaryList ?? []) {
				const qr = row as QuestionnaireRow;
				if (qr.code) codeMap.set(normalizeQuestionnaireCode(qr.code), qr);
			}

			const ordered: QuestionnaireRow[] = [];
			if (!leafQ) {
				setErrorMessage("No se encontró el cuestionario LEAF-Q activo (leaf_q / LEAF_Q / nombre LEAF).");
				setIsLoading(false);
				return;
			}
			ordered.push(leafQ);

			const missing: string[] = [];
			for (const c of secondaryCodes) {
				const hit = codeMap.get(c);
				if (hit) ordered.push(hit);
				else missing.push(c);
			}

			if (missing.length > 0) {
				setErrorMessage(`Faltan cuestionarios activos en Supabase: ${missing.join(", ")}.`);
				setIsLoading(false);
				return;
			}

			const loadedPacks: QuestionnairePack[] = [];
			const allOpts: QuestionOptionRow[] = [];

			for (const questionnaire of ordered) {
				const { data: sectionsData, error: sectionsError } = await supabase
					.from("questionnaire_sections")
					.select("id, questionnaire_id, code, title, description, sort_order")
					.eq("questionnaire_id", questionnaire.id);

				if (sectionsError) {
					setErrorMessage("No se pudieron cargar las secciones del cuestionario.");
					setIsLoading(false);
					return;
				}

				const { data: questionsData, error: questionsError } = await supabase
					.from("questions")
					.select(
						"id, questionnaire_id, section_id, code, question_text, help_text, question_type, is_required, sort_order, visibility_condition",
					)
					.eq("questionnaire_id", questionnaire.id);

				if (questionsError) {
					setErrorMessage("No se pudieron cargar las preguntas del cuestionario.");
					setIsLoading(false);
					return;
				}

				const typedQuestions = sortByOrder((questionsData ?? []) as QuestionRow[]);
				const questionIds = typedQuestions.map((item) => item.id);
				const { data: optionsData, error: optionsError } =
					questionIds.length > 0
						? await supabase.from("question_options").select("id, question_id, code, option_text, score_value, raw_value, sort_order").in("question_id", questionIds)
						: { data: [], error: null };

				if (optionsError) {
					setErrorMessage("No se pudieron cargar las opciones del cuestionario.");
					setIsLoading(false);
					return;
				}

				const typedOptions = sortByOrder((optionsData ?? []) as QuestionOptionRow[]);
				allOpts.push(...typedOptions);

				loadedPacks.push({
					questionnaire,
					sections: sortByOrder((sectionsData ?? []) as QuestionnaireSectionRow[]),
					questions: typedQuestions,
				});
			}

			setPacks(loadedPacks);
			setOptions(allOpts);

			const initialAnswers: Record<string, QuestionAnswerState> = {};
			for (const pq of loadedPacks) {
				for (const question of pq.questions) {
					initialAnswers[question.id] = {
						singleOptionId: "",
						multipleOptionIds: [],
						textValue: "",
						numberValue: "",
						booleanValue: "",
						dateValue: "",
					};
				}
			}
			setAnswers(initialAnswers);
			setIsLoading(false);
		};

		void run();
	}, [athleteId, router]);

	const optionsByQuestion = useMemo(() => {
		const map = new Map<string, QuestionOptionRow[]>();
		for (const option of options) {
			if (!map.has(option.question_id)) map.set(option.question_id, []);
			map.get(option.question_id)?.push(option);
		}
		for (const [key, value] of map.entries()) map.set(key, sortByOrder(value));
		return map;
	}, [options]);

	const sectionQuestionMaps = useMemo(() => {
		const outer = new Map<string, Map<string, QuestionRow[]>>();
		for (const pack of packs) {
			const map = new Map<string, QuestionRow[]>();
			for (const section of pack.sections) map.set(section.id, []);
			for (const question of pack.questions) {
				if (!question.section_id) continue;
				if (!map.has(question.section_id)) map.set(question.section_id, []);
				map.get(question.section_id)?.push(question);
			}
			for (const [key, value] of map.entries()) map.set(key, sortByOrder(value));
			outer.set(pack.questionnaire.id, map);
		}
		return outer;
	}, [packs]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);

		if (packs.length === 0) {
			setErrorMessage("No hay cuestionarios cargados.");
			return;
		}

		const unansweredRequired = allQuestions.find((question) => {
			if (!question.is_required) return false;
			const type = normalizeQuestionType(question.question_type, (optionsByQuestion.get(question.id) ?? []).length > 0);
			const answer = answers[question.id];
			return !answer || !isQuestionAnswered(type, answer);
		});

		if (unansweredRequired) {
			setErrorMessage("Completa todas las preguntas requeridas antes de enviar.");
			return;
		}

		const supabase = getSupabaseBrowserClient();
		if (!supabase) {
			setErrorMessage("No se pudo inicializar Supabase.");
			return;
		}

		setIsSaving(true);
		const nowIso = new Date().toISOString();

		const [responseCols, answersCols, scoresCols, profileCols, riskCols] = await Promise.all([
			getPublicTableColumns(supabase, "questionnaire_responses"),
			getPublicTableColumns(supabase, "questionnaire_answers"),
			getPublicTableColumns(supabase, "questionnaire_scores"),
			getPublicTableColumns(supabase, "athlete_initial_profile_scores"),
			getPublicTableColumns(supabase, "risk_flags"),
		]);

		type OfficialAgg = Partial<
			Record<
				OfficialScoreCode,
				{
					value: number;
					risk: string;
					interpretation: string;
					responseId: string;
					questionnaireId: string;
				}
			>
		>;

		const official: OfficialAgg = {};
		let contraceptionFromLeafQ: boolean | null = null;

		for (const pack of packs) {
			const { questionnaire, questions } = pack;
			const qnorm = normalizeQuestionnaireCode(questionnaire.code);

			const insertResponseRaw: Record<string, unknown> = {
				questionnaire_id: questionnaire.id,
				athlete_id: athleteId,
				status: "completed",
				started_at: nowIso,
				completed_at: nowIso,
			};
			const responsePayload = filterByColumns(insertResponseRaw, responseCols);

			const { data: responseRow, error: responseError } = await supabase
				.from("questionnaire_responses")
				.insert(responsePayload)
				.select("id")
				.maybeSingle();

			if (responseError || !responseRow?.id) {
				setIsSaving(false);
				setErrorMessage("No se pudo crear la respuesta del cuestionario.");
				return;
			}

			const responseId = responseRow.id as string;
			const answerRows: Record<string, unknown>[] = [];

			let totalLeaf = 0;
			let leafInjuries = 0;
			let leafGi = 0;
			let leafMenstrual = 0;

			let edeSum = 0;
			let edeForceHigh = false;

			let restqSum = 0;

			let bpaqSum = 0;
			let bpaqYearsRaw: number | null = null;

			const readinessValues: Partial<
				Record<
					"initial_sleep_quality" | "initial_energy" | "initial_fatigue" | "initial_soreness" | "initial_stress" | "initial_motivation" | "initial_recovery",
					number
				>
			> = {};

			for (const question of questions) {
				const answer = answers[question.id];
				if (!answer) continue;

				const questionOpts = optionsByQuestion.get(question.id) ?? [];
				const qType = normalizeQuestionType(question.question_type, questionOpts.length > 0);
				if (!isQuestionAnswered(qType, answer)) continue;

				const row: Record<string, unknown> = {
					response_id: responseId,
					question_id: question.id,
				};

				let optionScoreContribution = 0;

				if (qType === "single_choice") {
					row.selected_option_id = answer.singleOptionId;
					const sel = questionOpts.find((o) => o.id === answer.singleOptionId);
					optionScoreContribution = Number(sel?.score_value ?? 0);

					if (isLeafQuestionnaire(questionnaire.code)) {
						const lc = `${question.code ?? ""}`.toLowerCase();
						if (lc === "3.1_a") {
							const raw = `${sel?.raw_value ?? ""} ${sel?.option_text ?? ""}`.toLowerCase();
							if (raw.includes("si") || raw.includes("sí") || raw.includes("yes") || raw.includes("true")) contraceptionFromLeafQ = true;
							if (raw.includes("no") || raw.includes("false")) contraceptionFromLeafQ = false;
						}
					}

					if (qnorm === "s_ede_q_short") {
						edeSum += optionScoreContribution;
						if (optionLooksAffirmative(sel) && optionIndicatesEdBehaviors(sel)) edeForceHigh = true;
					}
					if (qnorm === "restq_short") restqSum += optionScoreContribution;
					if (qnorm === "bpaq_short") bpaqSum += optionScoreContribution;
				}

				if (qType === "multiple_choice") {
					row.selected_option_ids = answer.multipleOptionIds;
					const selected = questionOpts.filter((o) => answer.multipleOptionIds.includes(o.id));
					optionScoreContribution = selected.reduce((acc, o) => acc + Number(o.score_value ?? 0), 0);

					if (qnorm === "s_ede_q_short") {
						edeSum += optionScoreContribution;
						for (const o of selected) {
							if (optionLooksAffirmative(o) && optionIndicatesEdBehaviors(o)) edeForceHigh = true;
						}
					}
					if (qnorm === "restq_short") restqSum += optionScoreContribution;
					if (qnorm === "bpaq_short") bpaqSum += optionScoreContribution;
				}

				if (qType === "text") row.answer_text = answer.textValue.trim();

				if (qType === "number" || qType === "scale") {
					const num = Number(answer.numberValue);
					row.answer_number = num;
					if (qnorm === "bpaq_short" && isBpaqImpactYearsQuestion(question)) bpaqYearsRaw = num;
					if (qnorm === "initial_readiness" && question.code) {
						const cc = question.code.trim().toLowerCase();
						if (readinessCodeList().includes(cc)) {
							(readinessValues as Record<string, number>)[cc] = num;
						}
					}
				}

				if (qType === "boolean") row.answer_boolean = answer.booleanValue === "true";
				if (qType === "date") row.answer_date = answer.dateValue;

				const filteredRow = filterByColumns(row, answersCols);
				answerRows.push(filteredRow);

				if (isLeafQuestionnaire(questionnaire.code) && (qType === "single_choice" || qType === "multiple_choice")) {
					const qScore = optionScoreContribution;
					totalLeaf += qScore;
					const sub = leafSubdomainFromQuestionCode(question.code);
					if (sub === "injury_history") leafInjuries += qScore;
					if (sub === "gastrointestinal_function") leafGi += qScore;
					if (sub === "menstrual_function") leafMenstrual += qScore;
				}
			}

			if (qnorm === "bpaq_short") {
				bpaqSum += bpaqImpactYearsBonus(bpaqYearsRaw);
			}

			if (answerRows.length > 0) {
				const { error: answersErr } = await supabase.from("questionnaire_answers").insert(answerRows);
				if (answersErr) {
					setIsSaving(false);
					setErrorMessage("No se pudieron guardar las respuestas del cuestionario.");
					return;
				}
			}

			const scoreInsertRows: Record<string, unknown>[] = [];

			if (isLeafQuestionnaire(questionnaire.code)) {
				const leafOverall = leafQOverallRiskLevel(totalLeaf);
				const interpOverall = buildLeafOverallInterpretation(totalLeaf);
				const rInj = domainRiskFromLeafSubdomain(leafInjuries);
				const rGi = domainRiskFromLeafSubdomain(leafGi);
				const rMen = domainRiskFromLeafSubdomain(leafMenstrual);

				scoreInsertRows.push(
					{
						response_id: responseId,
						questionnaire_id: questionnaire.id,
						athlete_id: athleteId,
						score_code: "leaf_q_risk",
						score_label: OFFICIAL_SCORE_LABELS.leaf_q_risk,
						score_value: totalLeaf,
						risk_level: leafOverall,
						interpretation: interpOverall,
					},
					{
						response_id: responseId,
						questionnaire_id: questionnaire.id,
						athlete_id: athleteId,
						score_code: "injury_history",
						score_label: OFFICIAL_SCORE_LABELS.injury_history,
						score_value: leafInjuries,
						risk_level: rInj,
						interpretation: buildDomainInterpretation("Historial de lesiones LEAF‑Q", rInj),
					},
					{
						response_id: responseId,
						questionnaire_id: questionnaire.id,
						athlete_id: athleteId,
						score_code: "gastrointestinal_function",
						score_label: OFFICIAL_SCORE_LABELS.gastrointestinal_function,
						score_value: leafGi,
						risk_level: rGi,
						interpretation: buildDomainInterpretation("Función gastrointestinal LEAF‑Q", rGi),
					},
					{
						response_id: responseId,
						questionnaire_id: questionnaire.id,
						athlete_id: athleteId,
						score_code: "menstrual_function",
						score_label: OFFICIAL_SCORE_LABELS.menstrual_function,
						score_value: leafMenstrual,
						risk_level: rMen,
						interpretation: buildDomainInterpretation("Función menstrual LEAF‑Q", rMen),
					},
				);

				official.leaf_q_risk = { value: totalLeaf, risk: leafOverall, interpretation: interpOverall, responseId, questionnaireId: questionnaire.id };
				official.injury_history = {
					value: leafInjuries,
					risk: rInj,
					interpretation: buildDomainInterpretation("Historial de lesiones LEAF‑Q", rInj),
					responseId,
					questionnaireId: questionnaire.id,
				};
				official.gastrointestinal_function = {
					value: leafGi,
					risk: rGi,
					interpretation: buildDomainInterpretation("Función gastrointestinal LEAF‑Q", rGi),
					responseId,
					questionnaireId: questionnaire.id,
				};
				official.menstrual_function = {
					value: leafMenstrual,
					risk: rMen,
					interpretation: buildDomainInterpretation("Función menstrual LEAF‑Q", rMen),
					responseId,
					questionnaireId: questionnaire.id,
				};
			} else if (qnorm === "s_ede_q_short") {
				const rl = eatingBehaviorRiskLevel(edeSum, edeForceHigh);
				const interp = interpretationForOfficialScore("eating_behavior", rl, edeSum);
				scoreInsertRows.push({
					response_id: responseId,
					questionnaire_id: questionnaire.id,
					athlete_id: athleteId,
					score_code: "eating_behavior",
					score_label: OFFICIAL_SCORE_LABELS.eating_behavior,
					score_value: edeSum,
					risk_level: rl,
					interpretation: interp,
				});
				official.eating_behavior = { value: edeSum, risk: rl, interpretation: interp, responseId, questionnaireId: questionnaire.id };
			} else if (qnorm === "restq_short") {
				const rl = stressRecoveryRiskLevel(restqSum);
				const interp = interpretationForOfficialScore("stress_recovery", rl, restqSum);
				scoreInsertRows.push({
					response_id: responseId,
					questionnaire_id: questionnaire.id,
					athlete_id: athleteId,
					score_code: "stress_recovery",
					score_label: OFFICIAL_SCORE_LABELS.stress_recovery,
					score_value: restqSum,
					risk_level: rl,
					interpretation: interp,
				});
				official.stress_recovery = { value: restqSum, risk: rl, interpretation: interp, responseId, questionnaireId: questionnaire.id };
			} else if (qnorm === "bpaq_short") {
				const rl = boneLoadRiskLevel(bpaqSum);
				const interp = interpretationForOfficialScore("bone_load", rl, bpaqSum);
				scoreInsertRows.push({
					response_id: responseId,
					questionnaire_id: questionnaire.id,
					athlete_id: athleteId,
					score_code: "bone_load",
					score_label: OFFICIAL_SCORE_LABELS.bone_load,
					score_value: bpaqSum,
					risk_level: rl,
					interpretation: interp,
				});
				official.bone_load = { value: bpaqSum, risk: rl, interpretation: interp, responseId, questionnaireId: questionnaire.id };
			} else if (qnorm === "initial_readiness") {
				const riskScore = computeReadinessInitialRiskScore(readinessValues);
				const rl = readinessInitialRiskLevel(riskScore);
				const interp = interpretationForOfficialScore("readiness_initial", rl, riskScore);
				scoreInsertRows.push({
					response_id: responseId,
					questionnaire_id: questionnaire.id,
					athlete_id: athleteId,
					score_code: "readiness_initial",
					score_label: OFFICIAL_SCORE_LABELS.readiness_initial,
					score_value: riskScore,
					risk_level: rl,
					interpretation: interp,
				});
				official.readiness_initial = { value: riskScore, risk: rl, interpretation: interp, responseId, questionnaireId: questionnaire.id };
			}

			if (scoreInsertRows.length > 0) {
				const filteredScores = scoreInsertRows.map((r) => filterByColumns(r, scoresCols));
				const { error: scoresErr } = await supabase.from("questionnaire_scores").insert(filteredScores);
				if (scoresErr) {
					setIsSaving(false);
					setErrorMessage("No se pudo guardar la puntuación del cuestionario.");
					return;
				}
			}
		}

		const domainKeys: OfficialScoreCode[] = [
			"leaf_q_risk",
			"menstrual_function",
			"gastrointestinal_function",
			"injury_history",
			"eating_behavior",
			"stress_recovery",
			"bone_load",
			"readiness_initial",
		];

		for (const domainCode of domainKeys) {
			const hit = official[domainCode];
			if (!hit) continue;

			const source = PROFILE_SOURCE_BY_DOMAIN[domainCode];
			const domainLabel = OFFICIAL_SCORE_LABELS[domainCode];
			const rawProfileScore = toRadarProfileValue(hit.value);

			const baseProfilePayload = filterByColumns(
				{
					athlete_id: athleteId,
					domain_code: domainCode,
					domain_label: domainLabel,
					score_value: rawProfileScore,
					score_max: 10,
					status: "estimated",
					source,
					interpretation: hit.interpretation,
				},
				profileCols,
			);

			const { data: existingRow } = await supabase
				.from("athlete_initial_profile_scores")
				.select("id, score_max")
				.eq("athlete_id", athleteId)
				.eq("domain_code", domainCode)
				.limit(1)
				.maybeSingle();

			const resolvedScoreMax = Number(existingRow?.score_max ?? 10);
			const safeScoreMax = Number.isFinite(resolvedScoreMax) && resolvedScoreMax > 0 ? resolvedScoreMax : 10;
			const normalizedScore = Math.min(safeScoreMax, rawProfileScore);
			const normalizedPayload = {
				...baseProfilePayload,
				...(profileCols?.has("score_value") ? { score_value: normalizedScore } : {}),
				...(profileCols?.has("score_max") ? { score_max: safeScoreMax } : {}),
			};

			if (existingRow?.id) {
				const { error: upErr } = await supabase.from("athlete_initial_profile_scores").update(normalizedPayload).eq("id", existingRow.id);
				if (upErr) {
					setIsSaving(false);
					setErrorMessage("No se pudo actualizar el perfil 360 inicial.");
					return;
				}
			} else {
				const { error: insErr } = await supabase.from("athlete_initial_profile_scores").insert(normalizedPayload);
				if (insErr) {
					setIsSaving(false);
					setErrorMessage("No se pudo guardar el perfil 360 inicial.");
					return;
				}
			}
		}

		const leafHit = official.leaf_q_risk;
		if (leafHit && leafHit.value >= 8) {
			const r = await upsertRiskFlag(supabase, riskCols, {
				athleteId,
				responseId: leafHit.responseId,
				flagCode: "leaf_q_high",
				title: "Riesgo elevado en LEAF-Q",
				description: "La puntuación total del LEAF-Q es igual o superior a 8.",
			});
			if (!r.ok) {
				setIsSaving(false);
				setErrorMessage(r.error ?? "No se pudo registrar la alerta LEAF-Q.");
				return;
			}
		}

		const eat = official.eating_behavior;
		if (eat && eat.risk === "high") {
			const r = await upsertRiskFlag(supabase, riskCols, {
				athleteId,
				responseId: eat.responseId,
				flagCode: "eating_behavior_high",
				title: "Conducta alimentaria: riesgo alto",
				description: "S-EDE-Q reducido con nivel de riesgo alto.",
			});
			if (!r.ok) {
				setIsSaving(false);
				setErrorMessage(r.error ?? "No se pudo registrar la alerta de conducta alimentaria.");
				return;
			}
		}

		const rest = official.stress_recovery;
		if (rest && rest.risk === "high") {
			const r = await upsertRiskFlag(supabase, riskCols, {
				athleteId,
				responseId: rest.responseId,
				flagCode: "stress_recovery_high",
				title: "Estrés-recuperación: riesgo alto",
				description: "RESTQ reducido con nivel de riesgo alto.",
			});
			if (!r.ok) {
				setIsSaving(false);
				setErrorMessage(r.error ?? "No se pudo registrar la alerta de estrés-recuperación.");
				return;
			}
		}

		const bone = official.bone_load;
		if (bone && bone.risk === "high") {
			const r = await upsertRiskFlag(supabase, riskCols, {
				athleteId,
				responseId: bone.responseId,
				flagCode: "bone_load_high",
				title: "Carga ósea / impacto: riesgo alto",
				description: "BPAQ reducido con nivel de riesgo alto.",
			});
			if (!r.ok) {
				setIsSaving(false);
				setErrorMessage(r.error ?? "No se pudo registrar la alerta de carga ósea.");
				return;
			}
		}

		const readi = official.readiness_initial;
		if (readi && readi.risk === "high") {
			const r = await upsertRiskFlag(supabase, riskCols, {
				athleteId,
				responseId: readi.responseId,
				flagCode: "readiness_initial_high",
				title: "Readiness inicial: riesgo alto",
				description: "La valoración inicial de readiness muestra riesgo alto.",
			});
			if (!r.ok) {
				setIsSaving(false);
				setErrorMessage(r.error ?? "No se pudo registrar la alerta de readiness inicial.");
				return;
			}
		}

		if (contraceptionFromLeafQ !== null) {
			const athleteColumns = await getPublicTableColumns(supabase, "athletes");
			if (athleteColumns?.has("uses_hormonal_contraception")) {
				const athleteUpdatePayload = filterByColumns({ uses_hormonal_contraception: contraceptionFromLeafQ }, athleteColumns);
				const { error: athleteUpdateError } = await supabase.from("athletes").update(athleteUpdatePayload).eq("id", athleteId);
				if (athleteUpdateError) {
					setIsSaving(false);
					setErrorMessage("Se guardó la evaluación, pero no se pudo actualizar el contexto fisiológico.");
					return;
				}
			}
		}

		setIsSaving(false);
		router.push(`/coach/athletes/${athleteId}`);
	};

	const handleContinueStep = () => {
		setErrorMessage(null);
		const stepIdx = packs.length === 0 ? 0 : Math.min(activeStep, packs.length - 1);
		const pack = packs[stepIdx];
		if (!pack) return;
		const err = validatePackRequired(pack, answers, optionsByQuestion);
		if (err) {
			setErrorMessage(err);
			return;
		}
		setActiveStep((s) => s + 1);
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const fieldInputClass =
		"w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2 text-sm text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

	const safeStep = packs.length === 0 ? 0 : Math.min(activeStep, packs.length - 1);
	const currentPack = packs[safeStep];
	const stepLabelNumber = safeStep + 2;
	const isLastStep = packs.length > 0 && safeStep >= packs.length - 1;
	const stepQuestionnaire = currentPack?.questionnaire;
	const stepSectionMap = stepQuestionnaire ? sectionQuestionMaps.get(stepQuestionnaire.id) : undefined;

	return (
		<main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-12 md:py-14">
			<header className="relative mb-10 overflow-hidden rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-8 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-10">
				<div className="pointer-events-none absolute -right-8 top-0 h-36 w-36 rounded-full bg-[#D7EFE7]/50" aria-hidden />
				<div className="relative grid items-center gap-6 md:grid-cols-[160px_1fr_auto_160px]">
					<div className="flex items-center">
						<Image src="/Ciclo-Activa.png" alt="Logo Ciclo Activa" width={140} height={40} unoptimized className="h-auto w-auto object-contain" />
					</div>
					<div className="min-w-0 border-l-[3px] border-[#0F5C63] pl-5 md:pl-6">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C4DFF]">CicloActiva</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F2D2F] md:text-4xl">Evaluación inicial 360</h1>
						<p className="mt-3 text-sm leading-relaxed text-[#5F6B6D]">
							Cuestionario unificado LEAF‑Q, S‑EDE‑Q reducido, RESTQ reducido, BPAQ reducido y Readiness inicial. Las respuestas alimentan el
							perfil 360 sin sustituir lecturas posteriores de entrenamiento o readiness diario.
						</p>
						{!isLoading && packs.length > 0 && currentPack ? (
							<>
								<p className="mt-3 text-sm font-medium text-[#0F5C63]">
									Paso {stepLabelNumber} de {ASSESSMENT_TOTAL_STEPS} · {getAssessmentStepTitle(currentPack.questionnaire)}
								</p>
								<div className="mt-4 max-w-xl">
									<div className="flex items-center justify-between text-xs font-medium text-[#5F6B6D]">
										<span>Progreso de la evaluación</span>
										<span className="tabular-nums">
											{stepLabelNumber}/{ASSESSMENT_TOTAL_STEPS}
										</span>
									</div>
									<div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D9DDD8]/80">
										<div
											className="h-full rounded-full bg-[#0F5C63] transition-[width] duration-300"
											style={{ width: `${(stepLabelNumber / ASSESSMENT_TOTAL_STEPS) * 100}%` }}
										/>
									</div>
								</div>
							</>
						) : null}
					</div>
					<Link
						href="/dashboard"
						className="inline-flex w-fit items-center rounded-xl border border-[#0F5C63] bg-white px-4 py-2 text-sm font-semibold text-[#0F5C63] transition hover:bg-[#D7EFE7]/50"
					>
						Volver
					</Link>
					<div className="flex items-center justify-start md:justify-end">
						<Image src="/logoendurance.png" alt="Logo Endurance" width={140} height={40} className="h-auto w-auto object-contain" />
					</div>
				</div>
			</header>

			<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
				{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando evaluación…</p>}
				{errorMessage && (
					<p className="mb-4 rounded-xl border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-4 py-2 text-sm text-[#8B3F35]">{errorMessage}</p>
				)}

				{!isLoading && packs.length > 0 && currentPack && (
					<form className="space-y-10" onSubmit={handleSubmit}>
						<p className="text-sm font-medium text-[#0F2D2F]">
							<span className="text-[#5F6B6D]">
								Paso {stepLabelNumber} de {ASSESSMENT_TOTAL_STEPS} ·
							</span>{" "}
							{getAssessmentStepTitle(currentPack.questionnaire)}
						</p>
						<div key={stepQuestionnaire?.id} className="space-y-6">
							<div className="rounded-xl border border-[#0F5C63]/20 bg-[#D7EFE7]/45 px-5 py-5">
								<h2 className="text-lg font-bold tracking-tight text-[#0F5C63]">
									{stepQuestionnaire?.name ?? stepQuestionnaire?.code ?? "Cuestionario"}
								</h2>
								{stepQuestionnaire?.version ? <p className="mt-1 text-xs text-[#5F6B6D]">Versión {stepQuestionnaire.version}</p> : null}
								{stepQuestionnaire?.description ? (
									<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">{stepQuestionnaire.description}</p>
								) : null}
							</div>

							{currentPack.sections.map((section) => {
								const sectionQuestions = stepSectionMap?.get(section.id) ?? [];
										if (sectionQuestions.length === 0) return null;
										return (
											<section key={section.id} className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.04)] md:p-8">
												<h3 className="text-xl font-bold tracking-tight text-[#0F2D2F]">{section.title ?? section.code ?? "Sección"}</h3>
												{section.description ? <p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">{section.description}</p> : null}

												<div className="mt-4 space-y-5">
													{sectionQuestions.map((question) => {
														const questionOptions = optionsByQuestion.get(question.id) ?? [];
														const questionType = normalizeQuestionType(question.question_type, questionOptions.length > 0);
														const answer = answers[question.id] ?? {
															singleOptionId: "",
															multipleOptionIds: [],
															textValue: "",
															numberValue: "",
															booleanValue: "",
															dateValue: "",
														};

														return (
															<article key={question.id} className="rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-4 md:p-5">
																<p className="text-sm font-semibold text-[#0F2D2F]">
																	{question.question_text ?? "Pregunta sin texto"}{" "}
																	{question.is_required ? <span className="text-[#0F5C63]">*</span> : null}
																</p>
																{question.help_text ? <p className="mt-1 text-xs leading-relaxed text-[#5F6B6D]">{question.help_text}</p> : null}

																<div className="mt-3 space-y-2">
																	{questionType === "single_choice" &&
																		questionOptions.map((option) => (
																			<label key={option.id} className="flex items-start gap-2 text-sm text-[#0F2D2F]/90">
																				<input
																					type="radio"
																					name={question.id}
																					checked={answer.singleOptionId === option.id}
																					onChange={() =>
																						setAnswers((prev) => ({
																							...prev,
																							[question.id]: { ...answer, singleOptionId: option.id },
																						}))
																					}
																					className="mt-0.5 h-4 w-4 border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63]"
																				/>
																				<span>{option.option_text ?? option.code ?? "Opción"}</span>
																			</label>
																		))}

																	{questionType === "multiple_choice" &&
																		questionOptions.map((option) => (
																			<label key={option.id} className="flex items-start gap-2 text-sm text-[#0F2D2F]/90">
																				<input
																					type="checkbox"
																					checked={answer.multipleOptionIds.includes(option.id)}
																					onChange={(event) =>
																						setAnswers((prev) => {
																							const next = event.target.checked
																								? [...answer.multipleOptionIds, option.id]
																								: answer.multipleOptionIds.filter((id) => id !== option.id);
																							return { ...prev, [question.id]: { ...answer, multipleOptionIds: next } };
																						})
																					}
																					className="mt-0.5 h-4 w-4 border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63]"
																				/>
																				<span>{option.option_text ?? option.code ?? "Opción"}</span>
																			</label>
																		))}

																	{questionType === "text" && (
																		<textarea
																			rows={3}
																			value={answer.textValue}
																			onChange={(event) =>
																				setAnswers((prev) => ({ ...prev, [question.id]: { ...answer, textValue: event.target.value } }))
																			}
																			className={fieldInputClass}
																		/>
																	)}

																	{questionType === "number" && (
																		<input
																			type="number"
																			value={answer.numberValue}
																			onChange={(event) =>
																				setAnswers((prev) => ({ ...prev, [question.id]: { ...answer, numberValue: event.target.value } }))
																			}
																			className={fieldInputClass}
																		/>
																	)}

																	{questionType === "scale" && (
																		<div className="flex flex-wrap items-center gap-3">
																			<input
																				type="range"
																				min={1}
																				max={10}
																				step={1}
																				value={answer.numberValue === "" ? 1 : Number(answer.numberValue)}
																				onChange={(event) =>
																					setAnswers((prev) => ({
																						...prev,
																						[question.id]: { ...answer, numberValue: String(event.target.value) },
																					}))
																				}
																				className="w-full max-w-xs accent-[#0F5C63]"
																			/>
																			<span className="text-sm font-semibold tabular-nums text-[#0F5C63]">
																				{answer.numberValue === "" ? "Selecciona 1–10" : answer.numberValue}
																			</span>
																		</div>
																	)}

																	{questionType === "boolean" && (
																		<div className="flex gap-3">
																			<label className="inline-flex items-center gap-2 text-sm text-[#0F2D2F]/90">
																				<input
																					type="radio"
																					name={question.id}
																					checked={answer.booleanValue === "true"}
																					onChange={() =>
																						setAnswers((prev) => ({ ...prev, [question.id]: { ...answer, booleanValue: "true" } }))
																					}
																					className="h-4 w-4 border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63]"
																				/>
																				Sí
																			</label>
																			<label className="inline-flex items-center gap-2 text-sm text-[#0F2D2F]/90">
																				<input
																					type="radio"
																					name={question.id}
																					checked={answer.booleanValue === "false"}
																					onChange={() =>
																						setAnswers((prev) => ({ ...prev, [question.id]: { ...answer, booleanValue: "false" } }))
																					}
																					className="h-4 w-4 border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63]"
																				/>
																				No
																			</label>
																		</div>
																	)}

																	{questionType === "date" && (
																		<input
																			type="date"
																			value={answer.dateValue}
																			onChange={(event) =>
																				setAnswers((prev) => ({ ...prev, [question.id]: { ...answer, dateValue: event.target.value } }))
																			}
																			className={fieldInputClass}
																		/>
																	)}
																</div>
															</article>
														);
													})}
												</div>
											</section>
										);
							})}
						</div>

						<div className="flex flex-wrap items-center gap-3 pt-2">
							{!isLastStep ? (
								<button
									type="button"
									onClick={handleContinueStep}
									disabled={isSaving}
									className="inline-flex w-fit items-center rounded-xl bg-[#0F5C63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
								>
									Continuar
								</button>
							) : (
								<button
									type="submit"
									disabled={isSaving}
									className="inline-flex w-fit items-center rounded-xl bg-[#0F5C63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
								>
									{isSaving ? "Guardando…" : "Finalizar evaluación"}
								</button>
							)}
						</div>
					</form>
				)}
			</section>
		</main>
	);
}
