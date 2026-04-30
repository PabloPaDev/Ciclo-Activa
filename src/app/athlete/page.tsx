"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DailyCheckinRow } from "@/types/daily-checkin";

type CheckinFormState = {
	sleep_quality: string;
	sleep_hours: string;
	energy: string;
	mood: string;
	stress: string;
	soreness: string;
	fatigue: string;
	motivation: string;
	resting_hr: string;
	hrv: string;
	notes: string;
};

const INITIAL_FORM_STATE: CheckinFormState = {
	sleep_quality: "",
	sleep_hours: "",
	energy: "",
	mood: "",
	stress: "",
	soreness: "",
	fatigue: "",
	motivation: "",
	resting_hr: "",
	hrv: "",
	notes: "",
};

function getLocalISODate(date = new Date()): string {
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function toNullableInteger(value: string): number | null {
	if (!value.trim()) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return Math.trunc(parsed);
}

function toNullableDecimal(value: string): number | null {
	if (!value.trim()) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return parsed;
}

function toNullableText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function buildFormFromCheckin(checkin: DailyCheckinRow | null): CheckinFormState {
	if (!checkin) return INITIAL_FORM_STATE;

	return {
		sleep_quality: checkin.sleep_quality?.toString() ?? "",
		sleep_hours: checkin.sleep_hours?.toString() ?? "",
		energy: checkin.energy?.toString() ?? "",
		mood: checkin.mood?.toString() ?? "",
		stress: checkin.stress?.toString() ?? "",
		soreness: checkin.soreness?.toString() ?? "",
		fatigue: checkin.fatigue?.toString() ?? "",
		motivation: checkin.motivation?.toString() ?? "",
		resting_hr: checkin.resting_hr?.toString() ?? "",
		hrv: checkin.hrv?.toString() ?? "",
		notes: checkin.notes ?? "",
	};
}

export default function AthleteCheckinPage() {
	const router = useRouter();
	const [athleteId, setAthleteId] = useState<string | null>(null);
	const [formState, setFormState] = useState<CheckinFormState>(INITIAL_FORM_STATE);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [todayCheckin, setTodayCheckin] = useState<DailyCheckinRow | null>(null);

	const today = useMemo(() => getLocalISODate(), []);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setErrorMessage("Faltan variables de entorno de Supabase para cargar tu check-in.");
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

			const { data: athleteData, error: athleteError } = await supabase
				.from("athletes")
				.select("id")
				.eq("user_id", session.user.id)
				.maybeSingle();

			if (athleteError || !athleteData) {
				setErrorMessage("No se encontro un perfil de atleta vinculado a esta sesion.");
				setIsLoading(false);
				return;
			}

			const resolvedAthleteId = athleteData.id as string;
			setAthleteId(resolvedAthleteId);

			const { data: checkinData, error: checkinError } = await supabase
				.from("daily_checkins")
				.select("*")
				.eq("athlete_id", resolvedAthleteId)
				.eq("checkin_date", today)
				.maybeSingle();

			if (checkinError) {
				setErrorMessage("No se pudo cargar tu check-in de hoy.");
				setIsLoading(false);
				return;
			}

			const typedCheckin = (checkinData as DailyCheckinRow | null) ?? null;
			setTodayCheckin(typedCheckin);
			setFormState(buildFormFromCheckin(typedCheckin));
			setIsLoading(false);
		};

		void run();
	}, [router, today]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);
		setSuccessMessage(null);

		if (!athleteId) {
			setErrorMessage("No se encontro un identificador de atleta valido.");
			return;
		}

		const supabase = getSupabaseBrowserClient();
		if (!supabase) {
			setErrorMessage("No se pudo inicializar Supabase.");
			return;
		}

		setIsSaving(true);

		const payload = {
			athlete_id: athleteId,
			checkin_date: today,
			sleep_quality: toNullableInteger(formState.sleep_quality),
			sleep_hours: toNullableDecimal(formState.sleep_hours),
			energy: toNullableInteger(formState.energy),
			mood: toNullableInteger(formState.mood),
			stress: toNullableInteger(formState.stress),
			soreness: toNullableInteger(formState.soreness),
			fatigue: toNullableInteger(formState.fatigue),
			motivation: toNullableInteger(formState.motivation),
			resting_hr: toNullableInteger(formState.resting_hr),
			hrv: toNullableDecimal(formState.hrv),
			notes: toNullableText(formState.notes),
		};

		const { data, error } = await supabase
			.from("daily_checkins")
			.upsert(payload, { onConflict: "athlete_id,checkin_date" })
			.select("*")
			.maybeSingle();

		setIsSaving(false);

		if (error) {
			setErrorMessage("No se pudo guardar el check-in. Revisa los datos e intentalo de nuevo.");
			return;
		}

		const savedCheckin = (data as DailyCheckinRow | null) ?? null;
		setTodayCheckin(savedCheckin);
		setFormState(buildFormFromCheckin(savedCheckin));
		setSuccessMessage("Check-in guardado correctamente.");
	};

	const athleteFieldClass =
		"w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2 text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

	return (
		<main className="mx-auto w-full max-w-[920px] flex-1 px-6 py-12 md:py-14">
			<header className="mb-10 rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-8">
				<div className="grid items-center gap-6 md:grid-cols-[160px_1fr]">
					<div className="flex items-center">
						<Image
							src="/Ciclo-Activa.png"
							alt="Logo Ciclo Activa"
							width={140}
							height={40}
							unoptimized
							className="h-auto w-auto object-contain"
						/>
					</div>
					<div className="border-l-[3px] border-[#0F5C63] pl-5 md:pl-6">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C4DFF]">CicloActiva</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F2D2F] md:text-4xl">Portal atleta</h1>
						<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">Completa tu check-in diario para actualizar tu estado.</p>
					</div>
				</div>
			</header>

			<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
				<div className="mb-6">
					<h2 className="text-xl font-bold tracking-tight text-[#0F2D2F]">Check-in de hoy ({today})</h2>
					<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
						{todayCheckin ? "Puedes editar tus respuestas de hoy y volver a guardar." : "Todavia no has registrado tu check-in de hoy."}
					</p>
				</div>

				{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando check-in...</p>}
				{errorMessage && (
					<p className="mb-4 rounded-xl border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-3 py-2 text-sm text-[#8B3F35]">{errorMessage}</p>
				)}
				{successMessage && (
					<p className="mb-4 rounded-xl border border-[#4E9B6E]/30 bg-[#D7EFE7]/50 px-3 py-2 text-sm text-[#0F5C63]">{successMessage}</p>
				)}

				{!isLoading && (
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="grid gap-4 md:grid-cols-2">
							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Calidad del sueno (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.sleep_quality}
									onChange={(event) => setFormState((prev) => ({ ...prev, sleep_quality: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Horas de sueno</span>
								<input
									type="number"
									min={0}
									step="0.1"
									value={formState.sleep_hours}
									onChange={(event) => setFormState((prev) => ({ ...prev, sleep_hours: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Energia (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.energy}
									onChange={(event) => setFormState((prev) => ({ ...prev, energy: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Animo (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.mood}
									onChange={(event) => setFormState((prev) => ({ ...prev, mood: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Estres (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.stress}
									onChange={(event) => setFormState((prev) => ({ ...prev, stress: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Fatiga (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.fatigue}
									onChange={(event) => setFormState((prev) => ({ ...prev, fatigue: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Dolor muscular/molestias (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.soreness}
									onChange={(event) => setFormState((prev) => ({ ...prev, soreness: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Motivacion (1-10)</span>
								<input
									type="number"
									min={1}
									max={10}
									value={formState.motivation}
									onChange={(event) => setFormState((prev) => ({ ...prev, motivation: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">Frecuencia cardiaca en reposo (opcional)</span>
								<input
									type="number"
									min={0}
									value={formState.resting_hr}
									onChange={(event) => setFormState((prev) => ({ ...prev, resting_hr: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>

							<label className="text-sm text-[#0F2D2F]">
								<span className="mb-1 block font-medium">HRV (opcional)</span>
								<input
									type="number"
									min={0}
									step="0.1"
									value={formState.hrv}
									onChange={(event) => setFormState((prev) => ({ ...prev, hrv: event.target.value }))}
									className={athleteFieldClass}
								/>
							</label>
						</div>

						<label className="block text-sm text-[#0F2D2F]">
							<span className="mb-1 block font-medium">Notas</span>
							<textarea
								rows={4}
								value={formState.notes}
								onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
								className={athleteFieldClass}
							/>
						</label>

						<button
							type="submit"
							disabled={isSaving}
							className="inline-flex items-center justify-center rounded-xl bg-[#0F5C63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8]"
						>
							{isSaving ? "Guardando..." : "Guardar check-in"}
						</button>
					</form>
				)}
			</section>
		</main>
	);
}
