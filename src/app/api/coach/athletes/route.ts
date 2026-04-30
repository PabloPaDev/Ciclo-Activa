import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { parseHeightCmInput, parseNumericField, validateNewAthleteBasics } from "@/lib/athletes/newAthleteValidation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CreateAthleteBody = {
	full_name: string;
	email: string;
	birth_date: string;
	sport: string;
	training_level: string;
	training_hours_per_week: string;
	height_cm: string;
	weight_kg: string;
	menstrual_status: string;
	uses_hormonal_contraception: boolean;
	notes: string;
};

async function resolveCoachId(admin: ReturnType<typeof createSupabaseAdmin>, sessionUserId: string): Promise<string | null> {
	if (!admin) return null;
	const { data: coachData } = await admin.from("coaches").select("id").eq("user_id", sessionUserId).maybeSingle();
	if (coachData?.id) {
		return coachData.id as string;
	}
	const { data: overview } = await admin
		.from("coach_athlete_overview")
		.select("coach_id")
		.eq("coach_user_id", sessionUserId)
		.limit(1)
		.maybeSingle();
	if (overview?.coach_id) {
		return overview.coach_id as string;
	}
	const demo = process.env.DEMO_COACH_ID?.trim() || process.env.NEXT_PUBLIC_DEMO_COACH_ID?.trim();
	return demo ?? null;
}

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
		return jsonError(401, "Sesión no válida.");
	}

	const {
		data: { user: coachUser },
		error: authErr,
	} = await admin.auth.getUser(token);
	if (authErr || !coachUser) {
		return jsonError(401, "Sesión no válida.");
	}

	const coachId = await resolveCoachId(admin, coachUser.id);
	if (!coachId) {
		return jsonError(403, "No se encontró un coach vinculado.");
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

	const tempPassword = randomBytes(24).toString("hex");

	const { data: createdAuth, error: createUserError } = await admin.auth.admin.createUser({
		email: normalizedEmail,
		password: tempPassword,
		email_confirm: true,
		user_metadata: { full_name: body.full_name.trim() },
	});

	if (createUserError || !createdAuth.user?.id) {
		const msg = createUserError?.message ?? "No se pudo crear el usuario en Auth.";
		const dup =
			msg.toLowerCase().includes("already") ||
			msg.toLowerCase().includes("registered") ||
			msg.toLowerCase().includes("duplicate");
		return jsonError(dup ? 409 : 400, dup ? "Ya existe una cuenta con ese email." : msg, {
			code: (createUserError as { code?: string } | undefined)?.code,
			details: msg,
			hint: null,
		});
	}

	const newUserId = createdAuth.user.id;

	const { error: profileError } = await admin.from("profiles").upsert(
		{
			id: newUserId,
			email: normalizedEmail,
			full_name: body.full_name.trim(),
			role: "athlete",
		},
		{ onConflict: "id" },
	);

	if (profileError) {
		await admin.auth.admin.deleteUser(newUserId);
		return jsonError(400, "No se pudo crear el perfil de la atleta.", {
			code: profileError.code,
			details: profileError.details,
			hint: profileError.hint,
		});
	}

	const birthDateValue = typeof body.birth_date === "string" && body.birth_date.trim() ? body.birth_date.trim() : null;

	const { data: athleteRow, error: athleteError } = await admin
		.from("athletes")
		.insert({
			user_id: newUserId,
			birth_date: birthDateValue,
			main_sport: body.sport.trim(),
			training_level: typeof body.training_level === "string" && body.training_level.trim() ? body.training_level.trim() : null,
			training_hours_per_week: parseNumericField(typeof body.training_hours_per_week === "string" ? body.training_hours_per_week : ""),
			height_cm: parseHeightCmInput(typeof body.height_cm === "string" ? body.height_cm : ""),
			weight_kg: parseNumericField(typeof body.weight_kg === "string" ? body.weight_kg : ""),
			menstrual_status:
				typeof body.menstrual_status === "string" && body.menstrual_status.trim() ? body.menstrual_status.trim() : null,
			uses_hormonal_contraception: Boolean(body.uses_hormonal_contraception),
			notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
		})
		.select("id")
		.maybeSingle();

	if (athleteError || !athleteRow?.id) {
		await admin.auth.admin.deleteUser(newUserId);
		return jsonError(400, "No se pudo crear la ficha deportiva de la atleta.", {
			code: athleteError?.code,
			details: athleteError?.details,
			hint: athleteError?.hint,
		});
	}

	const athleteId = athleteRow.id as string;

	const { error: linkError } = await admin.from("coach_athletes").insert({
		coach_id: coachId,
		athlete_id: athleteId,
		relation_status: "active",
	});

	if (linkError) {
		await admin.from("athletes").delete().eq("id", athleteId);
		await admin.auth.admin.deleteUser(newUserId);
		return jsonError(400, "No se pudo vincular la atleta al entrenador.", {
			code: linkError.code,
			details: linkError.details,
			hint: linkError.hint,
		});
	}

	return NextResponse.json({ athleteId });
}
