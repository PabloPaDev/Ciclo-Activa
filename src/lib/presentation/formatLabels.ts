const LABEL_MAP: Record<string, string> = {
	yellow: "Precaucion",
	green: "Preparada",
	red: "Riesgo alto",
	high: "Alto",
	medium: "Medio",
	low: "Bajo",
	amateur_competitive: "Amateur competitivo",
	completed: "Completado",
	follicular: "Fase folicular",
	none: "Sin sangrado",
};

function normalizeKey(value: string): string {
	return value.trim().toLowerCase();
}

function fallbackLabel(value: string): string {
	const clean = value.trim().replaceAll("_", " ");
	if (!clean) return "Sin registrar";
	return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function formatTechnicalLabel(value: string | null | undefined): string {
	if (!value) return "Sin registrar";
	const mapped = LABEL_MAP[normalizeKey(value)];
	if (mapped) return mapped;
	return fallbackLabel(value);
}
