import { NextResponse } from "next/server";
import { validateNewAthleteBasics } from "@/lib/athletes/newAthleteValidation";
import { createAthleteProfileAndAthlete, type CoachCreateAthleteBody } from "@/lib/coach/createAthleteProfileAndAthlete";
import { getOrCreateCurrentCoach } from "@/lib/coach/getOrCreateCurrentCoach";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CreateAthleteBody = CoachCreateAthleteBody;

function jsonError(
	status: number,
	message: string,
	extra?: { code?: string; details?: string | null; hint?: string | null },
) {
	return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: Request) {
	const admin = createSupabaseAdmin();
	if (!admin) {
		return jsonError(
			503,
			"Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Añádela en el entorno de despliegue (nunca en el cliente).",
		);
	}

	const authHeader = request.headers.get("authorization");
	const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
	if (!token) {
		return jsonError(401, "No hay sesión activa.");
	}

	const {
		data: { user: coachUser },
		error: authErr,
	} = await admin.auth.getUser(token);
	if (authErr || !coachUser) {
		return jsonError(401, "No hay sesión activa.");
	}

	const coachResult = await getOrCreateCurrentCoach(admin, coachUser);
	if (!coachResult.ok) {
		return jsonError(coachResult.status, coachResult.message);
	}

	let body: CreateAthleteBody;
	try {
		body = (await request.json()) as CreateAthleteBody;
	} catch {
		return jsonError(400, "Cuerpo JSON inválido.");
	}

	const normalizedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const validation = validateNewAthleteBasics({
		full_name: typeof body.full_name === "string" ? body.full_name : "",
		email: normalizedEmail,
		main_sport: typeof body.sport === "string" ? body.sport : "",
		birth_date: typeof body.birth_date === "string" ? body.birth_date : "",
	});
	if (!validation.ok) {
		return jsonError(400, validation.message);
	}

	const created = await createAthleteProfileAndAthlete(admin, coachResult.coach.id, normalizedEmail, body);
	if (!created.ok) {
		return jsonError(created.status, created.message, {
			code: created.code,
			details: created.details,
			hint: created.hint,
		});
	}

	return NextResponse.json({ athleteId: created.athleteId });
}
