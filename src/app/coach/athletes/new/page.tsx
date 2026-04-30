"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { filterByColumns, getPublicTableColumns } from "@/lib/supabase/schema";

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

function parseNullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function resolveColumn(columns: Set<string> | null, candidates: string[]): string | null {
	if (!columns) return candidates[0] ?? null;
	for (const candidate of candidates) {
		if (columns.has(candidate)) return candidate;
	}
	return null;
}

export default function NewAthletePage() {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(INITIAL_FORM);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [athletesColumns, setAthletesColumns] = useState<Set<string> | null>(null);
	const [coachAthletesColumns, setCoachAthletesColumns] = useState<Set<string> | null>(null);
	const [coachId, setCoachId] = useState<string | null>(null);

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

			const [athletesCols, coachAthletesCols] = await Promise.all([
				getPublicTableColumns(supabase, "athletes"),
				getPublicTableColumns(supabase, "coach_athletes"),
			]);
			setAthletesColumns(athletesCols);
			setCoachAthletesColumns(coachAthletesCols);

			const { data: coachData } = await supabase.from("coaches").select("id").eq("user_id", session.user.id).limit(1).maybeSingle();
			if (coachData?.id) {
				setCoachId(coachData.id as string);
			} else {
				const { data: coachFallback } = await supabase
					.from("coach_athlete_overview")
					.select("coach_id")
					.eq("coach_user_id", session.user.id)
					.limit(1)
					.maybeSingle();
				setCoachId((coachFallback?.coach_id as string | undefined) ?? null);
			}

			setIsLoading(false);
		};

		void run();
	}, [router]);

	const fieldColumns = useMemo(
		() => ({
			fullName: resolveColumn(athletesColumns, ["full_name", "name"]),
			email: resolveColumn(athletesColumns, ["email"]),
			birthDate: resolveColumn(athletesColumns, ["birth_date"]),
			sport: resolveColumn(athletesColumns, ["sport", "main_sport"]),
			trainingLevel: resolveColumn(athletesColumns, ["training_level"]),
			trainingHours: resolveColumn(athletesColumns, ["training_hours_per_week"]),
			height: resolveColumn(athletesColumns, ["height_cm"]),
			weight: resolveColumn(athletesColumns, ["weight_kg"]),
			menstrualStatus: resolveColumn(athletesColumns, ["menstrual_status"]),
			contraception: resolveColumn(athletesColumns, ["uses_hormonal_contraception"]),
			notes: resolveColumn(athletesColumns, ["notes"]),
		}),
		[athletesColumns],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);

		if (!coachId) {
			setErrorMessage("No se encontro un coach vinculado para crear atletas.");
			return;
		}

		const supabase = getSupabaseBrowserClient();
		if (!supabase) {
			setErrorMessage("No se pudo inicializar Supabase.");
			return;
		}

		setIsSaving(true);

		const athletePayloadRaw: Record<string, unknown> = {};
		if (fieldColumns.fullName) athletePayloadRaw[fieldColumns.fullName] = form.full_name.trim() || null;
		if (fieldColumns.email) athletePayloadRaw[fieldColumns.email] = form.email.trim() || null;
		if (fieldColumns.birthDate) athletePayloadRaw[fieldColumns.birthDate] = form.birth_date || null;
		if (fieldColumns.sport) athletePayloadRaw[fieldColumns.sport] = form.sport.trim() || null;
		if (fieldColumns.trainingLevel) athletePayloadRaw[fieldColumns.trainingLevel] = form.training_level.trim() || null;
		if (fieldColumns.trainingHours) athletePayloadRaw[fieldColumns.trainingHours] = parseNullableNumber(form.training_hours_per_week);
		if (fieldColumns.height) athletePayloadRaw[fieldColumns.height] = parseNullableNumber(form.height_cm);
		if (fieldColumns.weight) athletePayloadRaw[fieldColumns.weight] = parseNullableNumber(form.weight_kg);
		if (fieldColumns.menstrualStatus) athletePayloadRaw[fieldColumns.menstrualStatus] = form.menstrual_status.trim() || null;
		if (fieldColumns.contraception) athletePayloadRaw[fieldColumns.contraception] = form.uses_hormonal_contraception;
		if (fieldColumns.notes) athletePayloadRaw[fieldColumns.notes] = form.notes.trim() || null;

		const athletePayload = filterByColumns(athletePayloadRaw, athletesColumns);
		const { data: athleteInsertData, error: athleteInsertError } = await supabase.from("athletes").insert(athletePayload).select("id").maybeSingle();

		if (athleteInsertError || !athleteInsertData?.id) {
			setIsSaving(false);
			setErrorMessage("No se pudo crear la atleta. Revisa los datos requeridos de la tabla athletes.");
			return;
		}

		const athleteId = athleteInsertData.id as string;
		const linkPayloadRaw: Record<string, unknown> = {
			coach_id: coachId,
			athlete_id: athleteId,
			relation_status: "active",
		};
		const linkPayload = filterByColumns(linkPayloadRaw, coachAthletesColumns);
		const { error: linkError } = await supabase.from("coach_athletes").insert(linkPayload);

		setIsSaving(false);

		if (linkError) {
			setErrorMessage("La atleta se creo, pero no se pudo vincular al coach actual.");
			return;
		}

		router.push(`/coach/athletes/${athleteId}/initial-assessment`);
	};

	const inputClass =
		"w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2.5 text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

	return (
		<main className="mx-auto w-full max-w-[980px] flex-1 px-6 py-12 md:py-14">
			<header className="relative mb-10 overflow-hidden rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-8 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-10">
				<div className="pointer-events-none absolute -right-6 top-0 h-32 w-32 rounded-full bg-[#D7EFE7]/50" aria-hidden />
				<div className="relative grid items-center gap-6 md:grid-cols-[160px_1fr_auto_160px]">
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
					<div className="flex items-center justify-start md:justify-end">
						<Image src="/logoendurance.png" alt="Logo Endurance" width={140} height={40} className="h-auto w-auto object-contain" />
					</div>
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
							{fieldColumns.fullName && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Nombre completo</span>
									<input
										type="text"
										required
										value={form.full_name}
										onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.email && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Email</span>
									<input
										type="email"
										value={form.email}
										onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.birthDate && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Fecha de nacimiento</span>
									<input
										type="date"
										value={form.birth_date}
										onChange={(event) => setForm((prev) => ({ ...prev, birth_date: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.sport && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Deporte</span>
									<input
										type="text"
										value={form.sport}
										onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.trainingLevel && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Nivel de entrenamiento</span>
									<input
										type="text"
										value={form.training_level}
										onChange={(event) => setForm((prev) => ({ ...prev, training_level: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.trainingHours && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Horas/semana</span>
									<input
										type="number"
										min={0}
										step="0.1"
										value={form.training_hours_per_week}
										onChange={(event) => setForm((prev) => ({ ...prev, training_hours_per_week: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.height && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Altura (cm)</span>
									<input
										type="number"
										min={0}
										step="0.1"
										value={form.height_cm}
										onChange={(event) => setForm((prev) => ({ ...prev, height_cm: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.weight && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Peso (kg)</span>
									<input
										type="number"
										min={0}
										step="0.1"
										value={form.weight_kg}
										onChange={(event) => setForm((prev) => ({ ...prev, weight_kg: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.menstrualStatus && (
								<label className="text-sm font-medium text-[#0F2D2F]">
									<span className="mb-1 block">Estado menstrual</span>
									<input
										type="text"
										value={form.menstrual_status}
										onChange={(event) => setForm((prev) => ({ ...prev, menstrual_status: event.target.value }))}
										className={inputClass}
									/>
								</label>
							)}
							{fieldColumns.contraception && (
								<label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-[#0F2D2F]">
									<input
										type="checkbox"
										checked={form.uses_hormonal_contraception}
										onChange={(event) => setForm((prev) => ({ ...prev, uses_hormonal_contraception: event.target.checked }))}
										className="h-4 w-4 rounded border-[#D9DDD8] text-[#0F5C63] accent-[#0F5C63] focus:ring-[#0F5C63]"
									/>
									Usa anticonceptivos hormonales
								</label>
							)}
						</div>

						{fieldColumns.notes && (
							<label className="text-sm font-medium text-[#0F2D2F]">
								<span className="mb-1 block">Notas</span>
								<textarea
									rows={4}
									value={form.notes}
									onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
									className={inputClass}
								/>
							</label>
						)}

						<button
							type="submit"
							disabled={isSaving}
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
