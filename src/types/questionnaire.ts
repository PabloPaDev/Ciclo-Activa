export interface QuestionnaireRow {
	id: string;
	code: string | null;
	name: string | null;
	description: string | null;
	version: string | null;
	is_active: boolean | null;
}

export interface QuestionnaireSectionRow {
	id: string;
	questionnaire_id: string;
	code: string | null;
	title: string | null;
	description: string | null;
	sort_order: number | null;
}

export interface QuestionRow {
	id: string;
	questionnaire_id: string;
	section_id: string | null;
	code: string | null;
	question_text: string | null;
	help_text: string | null;
	question_type: string | null;
	is_required: boolean | null;
	sort_order: number | null;
	visibility_condition: Record<string, unknown> | null;
}

export interface QuestionOptionRow {
	id: string;
	question_id: string;
	code: string | null;
	option_text: string | null;
	score_value: number | null;
	raw_value: string | null;
	sort_order: number | null;
}
