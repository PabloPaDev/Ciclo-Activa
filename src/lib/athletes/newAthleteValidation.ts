/** Números con coma o punto decimal; vacío → null */
export function parseNumericField(raw: string): number | null {
	const t = raw.trim().replace(/\s/g, "").replace(",", ".");
	if (!t) return null;
	const n = Number(t);
	return Number.isFinite(n) ? n : null;
}

/**
 * Altura en cm: 160 → 160; 1,6 / 1.6 → 160 (metros); valores intermedios razonables en cm.
 */
export function parseHeightCmInput(raw: string): number | null {
	const t = raw.trim().replace(/\s/g, "").replace(",", ".");
	if (!t) return null;
	const n = Number(t);
	if (!Number.isFinite(n)) return null;
	if (n > 0 && n < 3) {
		return Math.round(n * 100);
	}
	if (n >= 50 && n <= 280) {
		return Math.round(n);
	}
	return Math.round(n);
}

export type NewAthleteValidationResult =
	| { ok: true }
	| { ok: false; message: string };

/** Validaciones previas al alta: nombre, email y deporte obligatorios; fecha opcional pero en formato ISO si se informa. */
export function validateNewAthleteBasics(input: {
	full_name: string;
	email: string;
	main_sport: string;
	birth_date: string;
}): NewAthleteValidationResult {
	if (!input.full_name.trim()) {
		return { ok: false, message: "El nombre completo es obligatorio." };
	}
	if (!input.email.trim()) {
		return { ok: false, message: "El email es obligatorio." };
	}
	if (!input.main_sport.trim()) {
		return { ok: false, message: "El deporte principal es obligatorio." };
	}
	const bd = input.birth_date.trim();
	if (bd && !/^\d{4}-\d{2}-\d{2}$/.test(bd)) {
		return { ok: false, message: "La fecha de nacimiento debe ser válida (YYYY-MM-DD)." };
	}
	return { ok: true };
}
