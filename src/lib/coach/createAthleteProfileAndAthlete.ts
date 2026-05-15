import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHeightCmInput, parseNumericField } from "@/lib/athletes/newAthleteValidation";

export type CoachCreateAthleteBody = {
	email: string;
	full_name: string;
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

export type CreateAthleteProfileAndAthleteResult =
	| { ok: true; athleteId: string }
	| {
			ok: false;
			status: number;
			message: string;
			code?: string;
			details?: string | null;
			hint?: string | null;
	  };

function logStep(step: string, err: unknown) {
	console.error(`[createAthleteProfileAndAthlete:${step}]`, err);
}

function athleteFieldsFromBody(body: CoachCreateAthleteBody) {
	const birthDateValue =
		typeof body.birth_date === "string" && body.birth_date.trim() ? body.birth_date.trim() : null;
	return {
		birth_date: birthDateValue,
		main_sport: body.sport.trim(),
		training_level:
			typeof body.training_level === "string" && body.training_level.trim()
				? body.training_level.trim()
				: null,
		training_hours_per_week: parseNumericField(
			typeof body.training_hours_per_week === "string" ? body.training_hours_per_week : "",
		),
		height_cm: parseHeightCmInput(typeof body.height_cm === "string" ? body.height_cm : ""),
		weight_kg: parseNumericField(typeof body.weight_kg === "string" ? body.weight_kg : ""),
		menstrual_status:
			typeof body.menstrual_status === "string" && body.menstrual_status.trim()
				? body.menstrual_status.trim()
				: null,
		uses_hormonal_contraception: Boolean(body.uses_hormonal_contraception),
		notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
	};
}

async function insertCoachAthleteLink(
	admin: SupabaseClient,
	coachId: string,
	athleteId: string,
): Promise<{ ok: true } | { ok: false; message: string; code?: string; details?: string | null; hint?: string | null }> {
	const { error: linkErr } = await admin.from("coach_athletes").insert({
		coach_id: coachId,
		athlete_id: athleteId,
		status: "active",
	});
	if (linkErr) {
		logStep("insert coach_athletes", linkErr);
		return {
			ok: false,
			message: "No se pudo vincular la atleta con el coach.",
			code: linkErr.code,
			details: linkErr.details,
			hint: linkErr.hint,
		};
	}
	return { ok: true };
}

/** Si ya hay `profiles` con ese email (atleta), reutiliza o enlaza. Si no aplica, devuelve `null`. */
async function tryReuseAthleteByEmail(
	admin: SupabaseClient,
	coachId: string,
	normalizedEmail: string,
	body: CoachCreateAthleteBody,
): Promise<CreateAthleteProfileAndAthleteResult | null> {
	const fullName = body.full_name.trim();
	const athletePayload = athleteFieldsFromBody(body);

	const { data: existingProfile, error: profSelErr } = await admin
		.from("profiles")
		.select("id, role")
		.eq("email", normalizedEmail)
		.maybeSingle();

	if (profSelErr) {
		logStep("select profile by athlete email", profSelErr);
		return { ok: false, status: 500, message: "No se pudo crear la atleta." };
	}

	if (!existingProfile?.id) {
		return null;
	}

	const role = String(existingProfile.role ?? "").toLowerCase();
	if (role !== "athlete") {
		return { ok: false, status: 409, message: "Ya existe una cuenta con ese email." };
	}

	const { data: existingAthlete, error: athSelErr } = await admin
		.from("athletes")
		.select("id")
		.eq("user_id", existingProfile.id)
		.maybeSingle();

	if (athSelErr) {
		logStep("select athlete by user_id", athSelErr);
		return { ok: false, status: 500, message: "No se pudo crear la atleta." };
	}

	const { error: nameErr } = await admin
		.from("profiles")
		.update({ full_name: fullName })
		.eq("id", existingProfile.id);
	if (nameErr) {
		logStep("update athlete profile full_name", nameErr);
	}

	if (existingAthlete?.id) {
		const athleteId = existingAthlete.id as string;
		const { data: existingLink, error: linkSelErr } = await admin
			.from("coach_athletes")
			.select("id")
			.eq("coach_id", coachId)
			.eq("athlete_id", athleteId)
			.maybeSingle();

		if (linkSelErr) {
			logStep("select coach_athletes", linkSelErr);
			return { ok: false, status: 500, message: "No se pudo vincular la atleta con el coach." };
		}

		if (existingLink?.id) {
			return { ok: true, athleteId };
		}

		const linked = await insertCoachAthleteLink(admin, coachId, athleteId);
		if (!linked.ok) {
			return {
				ok: false,
				status: 400,
				message: linked.message,
				code: linked.code,
				details: linked.details,
				hint: linked.hint,
			};
		}
		return { ok: true, athleteId };
	}

	const { data: athleteRow, error: athleteInsErr } = await admin
		.from("athletes")
		.insert({
			user_id: existingProfile.id,
			...athletePayload,
		})
		.select("id")
		.maybeSingle();

	if (athleteInsErr || !athleteRow?.id) {
		logStep("insert athletes (existing profile)", athleteInsErr);
		return {
			ok: false,
			status: 400,
			message: "No se pudo crear la atleta.",
			code: athleteInsErr?.code,
			details: athleteInsErr?.details,
			hint: athleteInsErr?.hint,
		};
	}

	const athleteId = athleteRow.id as string;
	const linked = await insertCoachAthleteLink(admin, coachId, athleteId);
	if (!linked.ok) {
		await admin.from("athletes").delete().eq("id", athleteId);
		return {
			ok: false,
			status: 400,
			message: linked.message,
			code: linked.code,
			details: linked.details,
			hint: linked.hint,
		};
	}

	return { ok: true, athleteId };
}

/**
 * Crea (o reutiliza) perfil de atleta, fila en `athletes` y vínculo `coach_athletes`.
 * Debe ejecutarse solo en servidor con cliente service role.
 */
export async function createAthleteProfileAndAthlete(
	admin: SupabaseClient,
	coachId: string,
	normalizedEmail: string,
	body: CoachCreateAthleteBody,
): Promise<CreateAthleteProfileAndAthleteResult> {
	const fullName = body.full_name.trim();
	const athletePayload = athleteFieldsFromBody(body);

	const reused = await tryReuseAthleteByEmail(admin, coachId, normalizedEmail, body);
	if (reused) {
		return reused;
	}

	const tempPassword = randomBytes(24).toString("hex");

	const { data: createdAuth, error: createUserError } = await admin.auth.admin.createUser({
		email: normalizedEmail,
		password: tempPassword,
		email_confirm: true,
		user_metadata: { full_name: fullName },
	});

	if (createUserError || !createdAuth.user?.id) {
		const msg = createUserError?.message ?? "No se pudo crear el usuario en Auth.";
		const dup =
			msg.toLowerCase().includes("already") ||
			msg.toLowerCase().includes("registered") ||
			msg.toLowerCase().includes("duplicate");

		if (dup) {
			const afterRace = await tryReuseAthleteByEmail(admin, coachId, normalizedEmail, body);
			if (afterRace) {
				return afterRace;
			}
			return { ok: false, status: 409, message: "Ya existe una cuenta con ese email." };
		}

		logStep("auth.admin.createUser", createUserError);
		return {
			ok: false,
			status: 400,
			message: msg,
			code: (createUserError as { code?: string } | undefined)?.code,
			details: msg,
			hint: null,
		};
	}

	const newUserId = createdAuth.user.id;

	const { error: profileError } = await admin.from("profiles").upsert(
		{
			id: newUserId,
			email: normalizedEmail,
			full_name: fullName,
			role: "athlete",
		},
		{ onConflict: "id" },
	);

	if (profileError) {
		logStep("upsert profile athlete", profileError);
		await admin.auth.admin.deleteUser(newUserId);
		return {
			ok: false,
			status: 400,
			message: "No se pudo crear la atleta.",
			code: profileError.code,
			details: profileError.details,
			hint: profileError.hint,
		};
	}

	const { data: athleteRow, error: athleteError } = await admin
		.from("athletes")
		.insert({
			user_id: newUserId,
			...athletePayload,
		})
		.select("id")
		.maybeSingle();

	if (athleteError || !athleteRow?.id) {
		logStep("insert athletes", athleteError);
		await admin.from("profiles").delete().eq("id", newUserId);
		await admin.auth.admin.deleteUser(newUserId);
		return {
			ok: false,
			status: 400,
			message: "No se pudo crear la atleta.",
			code: athleteError?.code,
			details: athleteError?.details,
			hint: athleteError?.hint,
		};
	}

	const athleteId = athleteRow.id as string;
	const linked = await insertCoachAthleteLink(admin, coachId, athleteId);
	if (!linked.ok) {
		await admin.from("athletes").delete().eq("id", athleteId);
		await admin.from("profiles").delete().eq("id", newUserId);
		await admin.auth.admin.deleteUser(newUserId);
		return {
			ok: false,
			status: 400,
			message: linked.message,
			code: linked.code,
			details: linked.details,
			hint: linked.hint,
		};
	}

	return { ok: true, athleteId };
}
