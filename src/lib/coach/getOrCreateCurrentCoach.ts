import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CoachProfileRow = {
	id: string;
	email: string | null;
	full_name: string | null;
	role: string | null;
};

export type CoachRow = {
	id: string;
	user_id: string;
};

export type GetOrCreateCurrentCoachResult =
	| { ok: true; profile: CoachProfileRow; coach: CoachRow }
	| { ok: false; status: number; message: string };

function logStep(step: string, err: unknown) {
	console.error(`[getOrCreateCurrentCoach:${step}]`, err);
}

/**
 * Obtiene o crea el `profiles` del coach (id = auth user) y la fila en `coaches` (user_id = profile.id).
 * Debe ejecutarse solo en servidor con cliente service role.
 */
export async function getOrCreateCurrentCoach(
	admin: SupabaseClient,
	authUser: User,
): Promise<GetOrCreateCurrentCoachResult> {
	const authEmail = authUser.email?.trim().toLowerCase() ?? "";

	const { data: byId, error: errById } = await admin
		.from("profiles")
		.select("id, email, full_name, role")
		.eq("id", authUser.id)
		.maybeSingle();

	if (errById) {
		logStep("select profile by id", errById);
		return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
	}

	let profile: CoachProfileRow | null = byId ? (byId as CoachProfileRow) : null;

	if (!profile && authEmail) {
		const { data: byEmail, error: errByEmail } = await admin
			.from("profiles")
			.select("id, email, full_name, role")
			.eq("email", authEmail)
			.maybeSingle();

		if (errByEmail) {
			logStep("select profile by email", errByEmail);
			return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
		}

		if (byEmail) {
			const row = byEmail as CoachProfileRow;
			if (row.id !== authUser.id) {
				logStep("email profile id mismatch auth id", { profileId: row.id, authId: authUser.id });
				return {
					ok: false,
					status: 409,
					message: "Hay un conflicto con el email del perfil. Contactá soporte.",
				};
			}
			profile = row;
		}
	}

	if (!profile) {
		const metaName = authUser.user_metadata;
		const fullName =
			(typeof metaName?.full_name === "string" && metaName.full_name.trim().length > 0
				? metaName.full_name.trim()
				: null) ||
			(authEmail ? authEmail.split("@")[0] : null) ||
			"Coach";

		const { data: inserted, error: insErr } = await admin
			.from("profiles")
			.upsert(
				{
					id: authUser.id,
					email: authEmail || null,
					full_name: fullName,
					role: "coach",
				},
				{ onConflict: "id" },
			)
			.select("id, email, full_name, role")
			.maybeSingle();

		if (insErr || !inserted) {
			logStep("insert profile coach", insErr);
			return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
		}
		profile = inserted as CoachProfileRow;
	} else {
		const roleRaw = profile.role == null ? "" : String(profile.role).trim().toLowerCase();

		if (roleRaw === "athlete") {
			return { ok: false, status: 403, message: "El usuario actual no tiene rol de coach." };
		}

		if (roleRaw !== "coach") {
			if (roleRaw === "") {
				const { error: upErr } = await admin.from("profiles").update({ role: "coach" }).eq("id", profile.id);
				if (upErr) {
					logStep("update profile role to coach", upErr);
					return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
				}
				profile = { ...profile, role: "coach" };
			} else {
				return { ok: false, status: 403, message: "El usuario actual no tiene rol de coach." };
			}
		}
	}

	const { data: coachExisting, error: coachSelErr } = await admin
		.from("coaches")
		.select("id, user_id")
		.eq("user_id", profile.id)
		.maybeSingle();

	if (coachSelErr) {
		logStep("select coach", coachSelErr);
		return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
	}

	if (coachExisting?.id) {
		return {
			ok: true,
			profile,
			coach: { id: coachExisting.id as string, user_id: coachExisting.user_id as string },
		};
	}

	const professionalName =
		(profile.full_name && profile.full_name.trim()) ||
		(authEmail ? authEmail.split("@")[0] : null) ||
		"Coach";

	const { data: newCoach, error: coachInsErr } = await admin
		.from("coaches")
		.insert({
			user_id: profile.id,
			professional_name: professionalName,
			professional_type: "coach",
			bio: null,
		})
		.select("id, user_id")
		.maybeSingle();

	if (coachInsErr || !newCoach?.id) {
		logStep("insert coach", coachInsErr);
		return { ok: false, status: 500, message: "No se pudo crear el perfil del coach." };
	}

	return {
		ok: true,
		profile,
		coach: { id: newCoach.id as string, user_id: newCoach.user_id as string },
	};
}
