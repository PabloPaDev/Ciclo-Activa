"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateNewAthleteBasics } from "@/lib/athletes/newAthleteValidation";
import { resolveCoachIdForSession } from "@/lib/coach/resolveCoachId";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { logPostgrestError } from "@/lib/supabase/postgrestError";

type FormState = {
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

const INITIAL_FORM: FormState = {
	full_name: "",
	email: "",
	birth_date: "",
	sport: "",
	training_level: "",
	training_hours_per_week: "",
	height_cm: "",
	weight_kg: "",
	menstrual_status: "",
	uses_hormonal_contraception: false,
	notes: "",
};

const MENSTRUAL_STATUS_OPTIONS: { value: string; label: string }[] = [
	{ value: "", label: "Seleccionar…" },
	{ value: "Ciclo regular", label: "Ciclo regular" },
	{ value: "Ciclo irregular", label: "Ciclo irregular" },
	{ value: "Amenorrea", label: "Amenorrea" },
	{ value: "Oligomenorrea", label: "Oligomenorrea" },
	{ value: "Sangrado irregular o prolongado", label: "Sangrado irregular o prolongado" },
	{ value: "Lactancia o posparto (ciclo en adaptación)", label: "Lactancia o posparto (ciclo en adaptación)" },
	{ value: "Menopausia o climaterio", label: "Menopausia o climaterio" },
	{ value: "Prefiero no indicar", label: "Prefiero no indicar" },
];

export default function NewAthletePage() {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(INITIAL_FORM);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [coachId, setCoachId] = useState<string | null>(null);

	const canSubmit = useMemo(() => {
		return Boolean(form.full_name.trim() && form.email.trim() && form.sport.trim());
	}, [form.full_name, form.email, form.sport]);

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
			const session = sessionData.session;
			if (!session) {
				router.replace("/login");
				return;
			}

			const resolvedCoachId = await resolveCoachIdForSession(supabase, session.user.id);
			setCoachId(resolvedCoachId);

			setIsLoading(false);
		};

		void run();
	}, [router]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);

		if (!canSubmit) {
			return;
		}

		if (!coachId) {
			setErrorMessage("No se encontró un coach vinculado. Si usás demo, definí NEXT_PUBLIC_DEMO_COACH_ID.");
			return;
		}

		const normalizedEmail = form.email.trim().toLowerCase();
		const validation = validateNewAthleteBasics({
			full_name: form.full_name,
			email: normalizedEmail,
			main_sport: form.sport,
			birth_date: form.birth_date,
		});
		if (!validation.ok) {
			setErrorMessage(validation.message);
			return;
		}

		const supabase = getSupabaseBrowserClient();
		if (!supabase) {
			setErrorMessage("No se pudo inicializar Supabase.");
			return;
		}

		const { data: sessionData } = await supabase.auth.getSession();
		const accessToken = sessionData.session?.access_token;
		if (!accessToken) {
			setErrorMessage("No hay sesión. Volvé a iniciar sesión.");
			return;
		}

		setIsSaving(true);

		const res = await fetch("/api/coach/athletes", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				full_name: form.full_name,
				email: normalizedEmail,
				birth_date: form.birth_date,
				sport: form.sport,
				training_level: form.training_level,
				training_hours_per_week: form.training_hours_per_week,
				height_cm: form.height_cm,
				weight_kg: form.weight_kg,
				menstrual_status: form.menstrual_status,
				uses_hormonal_contraception: form.uses_hormonal_contraception,
				notes: form.notes,
			}),
		});

		const json = (await res.json().catch(() => ({}))) as {
			error?: string;
			code?: string;
			details?: string | null;
			hint?: string | null;
			athleteId?: string;
		};

		setIsSaving(false);

		if (!res.ok) {
			logPostgrestError("api POST /api/coach/athletes", {
				message: typeof json.error === "string" ? json.error : res.statusText || "Error desconocido",
				details: json.details ?? null,
				hint: json.hint ?? null,
				code: json.code,
			});
			setErrorMessage(typeof json.error === "string" ? json.error : "No se pudo crear la atleta.");
			return;
		}

		const athleteId = json.athleteId;
		if (!athleteId) {
			setErrorMessage("Respuesta inválida del servidor.");
			return;
		}

		router.push(`/coach/athletes/${athleteId}/initial-assessment`);
	};

	const inputClass =
		"w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2.5 text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

	const selectClass = `${inputClass} cursor-pointer`;

	return (
		<main className="mx-auto w-full max-w-[980px] flex-1 px-6 py-12 md:py-14">
			<header className="mb-10 rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-8 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-10">
				<div className="grid items-center gap-6 md:grid-cols-[160px_1fr_auto]">
					<div className="flex items-center">
						<Image src="/Ciclo-Activa.png" alt="Logo Ciclo Activa" width={140} height={40} unoptimized className="h-auto w-auto object-contain" />
					</div>
					<div className="min-w-0 border-l-[3px] border-[#0F5C63] pl-5 md:pl-6">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C4DFF]">CicloActiva</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F2D2F] md:text-4xl">Nueva atleta</h1>
						<p className="mt-3 text-sm font-medium text-[#0F5C63]">Paso 1 de 6 · Datos básicos</p>
						<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
							Crea el perfil y continúa con la evaluación inicial en varios pasos (LEAF‑Q, cuestionarios breves y readiness).
						</p>
						<div className="mt-5 max-w-xl">
							<div className="flex items-center justify-between text-xs font-medium text-[#5F6B6D]">
								<span>Progreso de la evaluación</span>
								<span className="tabular-nums">1/6</span>
							</div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D9DDD8]/80">
								<div className="h-full w-[16.666667%] rounded-full bg-[#0F5C63]" />
							</div>
						</div>
					</div>
					<Link
						href="/dashboard"
						className="inline-flex w-fit items-center rounded-xl border border-[#0F5C63] bg-white px-4 py-2 text-sm font-semibold text-[#0F5C63] transition hover:bg-[#D7EFE7]/50"
					>
						Volver
					</Link>
				</div>
			</header>

			<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
				{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando formulario...</p>}
				{errorMessage && (
					<p className="mb-4 rounded-xl border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-3 py-2 text-sm text-[#8B3F35]">{errorMessage}</p>
				)}

				{!isLoading && (
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="grid gap-4 md:grid-cols-2">
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Nombre completo</span>
								<input
									type="text"
									value={form.full_name}
									onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
									className={inputClass}
									autoComplete="name"
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Email</span>
								<input
									type="email"
									autoComplete="email"
									value={form.email}
									onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Fecha de nacimiento</span>
								<input
									type="date"
									value={form.birth_date}
									onChange={(event) => setForm((prev) => ({ ...prev, birth_date: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Deporte principal</span>
								<input
									type="text"
									value={form.sport}
									onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Nivel de entrenamiento</span>
								<input
									type="text"
									value={form.training_level}
									onChange={(event) => setForm((prev) => ({ ...prev, training_level: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Horas/semana</span>
								<input
									type="text"
									inputMode="decimal"
									value={form.training_hours_per_week}
									onChange={(event) => setForm((prev) => ({ ...prev, training_hours_per_week: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Altura (cm o m, ej. 160 o 1,60)</span>
								<input
									type="text"
									inputMode="decimal"
									value={form.height_cm}
									onChange={(event) => setForm((prev) => ({ ...prev, height_cm: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Peso (kg)</span>
								<input
									type="text"
									inputMode="decimal"
									value={form.weight_kg}
									onChange={(event) => setForm((prev) => ({ ...prev, weight_kg: event.target.value }))}
									className={inputClass}
								/>
							</label>
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Estado menstrual</span>
								<select
									value={form.menstrual_status}
									onChange={(event) => setForm((prev) => ({ ...prev, menstrual_status: event.target.value }))}
									className={selectClass}
								>
									{MENSTRUAL_STATUS_OPTIONS.map((opt) => (
										<option key={opt.value || "__none"} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</label>
							<label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-[#0F2D2F] md:col-span-2">
								<input
									type="checkbox"
									checked={form.uses_hormonal_contraception}
									onChange={(event) => setForm((prev) => ({ ...prev, uses_hormonal_contraception: event.target.checked }))}
									className="h-4 w-4 rounded border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63] focus:ring-[#0F5C63]"
								/>
								Usa anticonceptivos hormonales
							</label>
						</div>

						<label className="text-sm font-medium text-[#0F2D2F]">
							<span className="mb-1 block">Notas</span>
							<textarea
								rows={4}
								value={form.notes}
								onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
								className={inputClass}
							/>
						</label>

						<button
							type="submit"
							disabled={isSaving || !canSubmit}
							className="inline-flex w-fit items-center rounded-xl bg-[#0F5C63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
						>
							{isSaving ? "Guardando..." : "Guardar y continuar"}
						</button>
					</form>
				)}
			</section>
		</main>
	);
}
