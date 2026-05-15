import type { PostgrestError } from "@supabase/supabase-js";

type ErrorLike = {
	message?: string;
	details?: string | null;
	hint?: string | null;
	code?: string;
	status?: number;
	name?: string;
	bodyPreview?: string;
};

function pickErrorFields(error: unknown): ErrorLike {
	if (error == null) {
		return { message: String(error) };
	}
	if (typeof error === "string") {
		return { message: error };
	}
	if (typeof error !== "object") {
		return { message: String(error) };
	}
	const o = error as Record<string, unknown>;
	const fromError = error as Error;
	const fromProto = typeof fromError.message === "string" && fromError.message ? { message: fromError.message } : {};
	const messageFromKeys =
		(o.message as string | undefined) ||
		fromError.message ||
		(typeof o.error_description === "string" ? o.error_description : undefined);
	const oKeys = Object.keys(o);
	if (!messageFromKeys && oKeys.length === 0) {
		return {
			message:
				"Objeto de error vacío; suele ser fallo de red, CORS o respuesta no JSON. Revisá la pestaña Red y el insert en Supabase.",
		};
	}
	const explicitDetails = (o.details as string | null | undefined) ?? null;
	const bodyPreview =
		typeof o.bodyPreview === "string" && o.bodyPreview.trim() ? o.bodyPreview.trim() : undefined;
	const details =
		explicitDetails != null && explicitDetails !== "" ? explicitDetails : bodyPreview ?? null;
	return {
		...fromProto,
		message: messageFromKeys || `Error no estándar keys=[${oKeys.join(", ")}]`,
		details,
		hint: (o.hint as string | null | undefined) ?? null,
		code: (o.code as string | undefined) ?? undefined,
		status: typeof o.status === "number" ? o.status : undefined,
		name: (o.name as string | undefined) ?? fromError.name,
		bodyPreview,
	};
}

/**
 * Loguea errores de Supabase/PostgREST de forma que siempre se vea algo útil en consola
 * (incl. Turbopack/minify donde un literal con campos undefined puede mostrarse como {}).
 */
export function logPostgrestError(context: string, error: PostgrestError | unknown): void {
	const fields = pickErrorFields(error);
	const line = [
		`[${context}]`,
		fields.message && `message=${JSON.stringify(fields.message)}`,
		fields.details != null && fields.details !== "" && `details=${JSON.stringify(fields.details)}`,
		fields.hint != null && fields.hint !== "" && `hint=${JSON.stringify(fields.hint)}`,
		fields.code && `code=${JSON.stringify(fields.code)}`,
		fields.status != null && `status=${fields.status}`,
		fields.name && `name=${JSON.stringify(fields.name)}`,
		fields.bodyPreview && `bodyPreview=${JSON.stringify(fields.bodyPreview)}`,
	]
		.filter(Boolean)
		.join(" | ");

	console.error(line || `[${context}] (error sin mensaje)`);

	const logPayload = {
		message: fields.message,
		details: fields.details,
		hint: fields.hint,
		code: fields.code ?? null,
		status: fields.status ?? null,
		name: fields.name ?? null,
		bodyPreview: fields.bodyPreview ?? null,
	};
	try {
		console.error(
			`[${context}] payload:`,
			JSON.stringify(logPayload, (_key, value) => (value === undefined ? null : value)),
		);
	} catch {
		console.error(`[${context}] payload: (no serializable)`);
	}

	if (error instanceof Error && error.stack) {
		console.error(`[${context}] stack:`, error.stack);
	}
}
