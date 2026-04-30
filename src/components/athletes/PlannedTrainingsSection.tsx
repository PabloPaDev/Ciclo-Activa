"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PlannedTrainingRow, PlannedTrainingStatus } from "@/types/planned-training";

type PlannedTrainingsSectionProps = {
	athleteId: string;
};

const inputClass =
	"w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2 text-sm text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

const STATUS_OPTIONS: { value: PlannedTrainingStatus; label: string }[] = [
	{ value: "planned", label: "Planificado" },
	{ value: "completed", label: "Completado" },
	{ value: "cancelled", label: "Cancelado" },
	{ value: "changed", label: "Modificado" },
];

function statusLabel(status: string): string {
	return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function getLocalISODate(date = new Date()): string {
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
	try {
		const [y, m, d] = isoDate.split("-").map(Number);
		const dt = new Date(y, (m ?? 1) - 1, d);
		return dt.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
	} catch {
		return isoDate;
	}
}

function parseOptionalInt(value: string): number | null {
	const t = value.trim();
	if (!t) return null;
	const n = Number.parseInt(t, 10);
	return Number.isFinite(n) ? n : null;
}

function parseOptionalDecimal(value: string): number | null {
	const t = value.trim();
	if (!t) return null;
	const n = Number.parseFloat(t.replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

function displayOptNum(n: number | null | undefined, suffix?: string): string {
	if (n === null || n === undefined) return "—";
	return suffix ? `${n}${suffix}` : String(n);
}

export function PlannedTrainingsSection({ athleteId }: PlannedTrainingsSectionProps) {
	const [coachId, setCoachId] = useState<string | null>(null);
	const [rows, setRows] = useState<PlannedTrainingRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

	const [plannedDate, setPlannedDate] = useState("");
	const [title, setTitle] = useState("");
	const [sessionType, setSessionType] = useState("");
	const [objective, setObjective] = useState("");
	const [durationMin, setDurationMin] = useState("");
	const [distanceKm, setDistanceKm] = useState("");
	const [targetRpe, setTargetRpe] = useState("");
	const [athleteNotes, setAthleteNotes] = useState("");

	const { upcoming, past } = useMemo(() => {
		const today = getLocalISODate();
		const up = rows.filter((r) => r.planned_date >= today).sort((a, b) => a.planned_date.localeCompare(b.planned_date));
		const pa = rows
			.filter((r) => r.planned_date < today)
			.sort((a, b) => b.planned_date.localeCompare(a.planned_date))
			.slice(0, 8);
		return { upcoming: up, past: pa };
	}, [rows]);

	const fetchPlanned = useCallback(async () => {
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		const { data, error: qError } = await supabase
			.from("planned_trainings")
			.select(
				"id, athlete_id, coach_id, planned_date, title, session_type, objective, estimated_duration_min, estimated_distance_km, target_rpe, athlete_notes, status, created_at, updated_at",
			)
			.eq("athlete_id", athleteId)
			.order("planned_date", { ascending: true });

		if (qError) {
			if (process.env.NODE_ENV === "development") {
				console.error("planned_trainings fetch", qError);
			}
			setError(
				qError.code === "42P01" || qError.message?.includes("does not exist")
					? "La tabla de planificación aún no existe. Aplica supabase/planned_trainings.sql en Supabase."
					: qError.code === "42501"
						? "Sin permiso. Ejecuta los GRANT del script SQL en el proyecto."
						: "No se pudieron cargar los entrenamientos planificados.",
			);
			setRows([]);
			return;
		}
		setRows((data ?? []) as PlannedTrainingRow[]);
		setError(null);
	}, [athleteId]);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setLoading(false);
				setError("Supabase no está configurado.");
				return;
			}
			const supabase = getSupabaseBrowserClient();
			if (!supabase) {
				setLoading(false);
				setError("No se pudo inicializar el cliente.");
				return;
			}
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setLoading(false);
				return;
			}
			const { data: coachData } = await supabase.from("coaches").select("id").eq("user_id", sessionData.session.user.id).maybeSingle();
			if (!coachData?.id) {
				setCoachId(null);
				setLoading(false);
				return;
			}
			setCoachId(coachData.id as string);
			await fetchPlanned();
			setLoading(false);
		};
		void run();
	}, [athleteId, fetchPlanned]);

	const handleCreate = async (event: FormEvent) => {
		event.preventDefault();
		const titleTrim = title.trim();
		if (!titleTrim || !plannedDate || !coachId) return;
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		setSaving(true);
		setError(null);
		const { error: insError } = await supabase.from("planned_trainings").insert({
			athlete_id: athleteId,
			coach_id: coachId,
			planned_date: plannedDate,
			title: titleTrim,
			session_type: sessionType.trim() || null,
			objective: objective.trim() || null,
			estimated_duration_min: parseOptionalInt(durationMin),
			estimated_distance_km: parseOptionalDecimal(distanceKm),
			target_rpe: parseOptionalDecimal(targetRpe),
			athlete_notes: athleteNotes.trim() || null,
			status: "planned",
		});
		setSaving(false);
		if (insError) {
			if (process.env.NODE_ENV === "development") {
				console.error("planned_trainings insert", insError);
			}
			setError("No se pudo planificar el entrenamiento. Revisa permisos RLS y datos.");
			return;
		}
		setPlannedDate("");
		setTitle("");
		setSessionType("");
		setObjective("");
		setDurationMin("");
		setDistanceKm("");
		setTargetRpe("");
		setAthleteNotes("");
		await fetchPlanned();
	};

	const handleStatusChange = async (id: string, next: PlannedTrainingStatus) => {
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		setStatusUpdatingId(id);
		setError(null);
		const { error: upError } = await supabase.from("planned_trainings").update({ status: next }).eq("id", id);
		setStatusUpdatingId(null);
		if (upError) {
			if (process.env.NODE_ENV === "development") {
				console.error("planned_trainings update", upError);
			}
			setError("No se pudo actualizar el estado. Solo el entrenador que creó la sesión puede modificarla.");
			return;
		}
		await fetchPlanned();
	};

	if (loading) {
		return (
			<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
				<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Planificación de entrenamientos</h3>
				<p className="mt-2 text-sm text-[#5F6B6D]">Cargando…</p>
			</section>
		);
	}

	if (!coachId) {
		return null;
	}

	return (
		<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
			<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Planificación de entrenamientos</h3>
			<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
				Entrenamientos programados por el entrenador. La atleta podrá consultarlos desde su zona privada.
			</p>

			{error && (
				<p className="mt-4 rounded-xl border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-4 py-2 text-sm text-[#8B3F35]">{error}</p>
			)}

			<form className="mt-6 rounded-xl border border-[#D9DDD8] bg-white p-5 shadow-[0_2px_12px_rgba(15,45,47,0.04)]" onSubmit={handleCreate}>
				<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Nuevo entrenamiento</p>
				<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<label className="text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Fecha</span>
						<input type="date" required value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={inputClass} />
					</label>
					<label className="sm:col-span-2 text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Título</span>
						<input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Ej. Rodaje suave" />
					</label>
					<label className="text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Tipo de sesión</span>
						<input type="text" value={sessionType} onChange={(e) => setSessionType(e.target.value)} className={inputClass} placeholder="Rodaje, series…" />
					</label>
					<label className="sm:col-span-2 text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Objetivo</span>
						<input type="text" value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} />
					</label>
					<label className="text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Duración (min)</span>
						<input type="number" min={0} step={1} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className={inputClass} />
					</label>
					<label className="text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Distancia (km)</span>
						<input type="text" inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} className={inputClass} />
					</label>
					<label className="text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">RPE objetivo</span>
						<input type="text" inputMode="decimal" value={targetRpe} onChange={(e) => setTargetRpe(e.target.value)} className={inputClass} />
					</label>
					<label className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-[#0F2D2F]">
						<span className="mb-1 block">Notas para la atleta</span>
						<textarea
							rows={2}
							value={athleteNotes}
							onChange={(e) => setAthleteNotes(e.target.value)}
							className={`${inputClass} py-2.5`}
							placeholder="Indicaciones que verá la atleta"
						/>
					</label>
				</div>
				<button
					type="submit"
					disabled={saving || !title.trim() || !plannedDate}
					className="mt-4 inline-flex items-center rounded-xl bg-[#0F5C63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
				>
					{saving ? "Guardando…" : "Planificar entrenamiento"}
				</button>
			</form>

			<div className="mt-8">
				<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Próximos entrenamientos</p>
				{upcoming.length === 0 ? (
					<p className="mt-3 text-sm text-[#5F6B6D]">
						No hay sesiones programadas desde hoy ({formatDisplayDate(getLocalISODate())}).
					</p>
				) : (
					<ul className="mt-4 space-y-3">
						{upcoming.map((row) => (
							<li
								key={row.id}
								className="rounded-xl border border-[#D9DDD8] bg-white p-4 shadow-[0_2px_12px_rgba(15,45,47,0.04)]"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1 space-y-1.5 text-sm">
										<p className="font-semibold text-[#0F2D2F]">{formatDisplayDate(row.planned_date)} · {row.title}</p>
										<p className="text-[#5F6B6D]">
											<span className="text-[#5F6B6D]">Tipo:</span> {row.session_type?.trim() ? row.session_type : "—"}
										</p>
										<p className="text-[#5F6B6D]">
											Duración: {displayOptNum(row.estimated_duration_min, " min")} · Distancia:{" "}
											{row.estimated_distance_km != null ? `${row.estimated_distance_km} km` : "—"} · RPE:{" "}
											{displayOptNum(row.target_rpe)}
										</p>
										<p className="text-[#5F6B6D]">
											<span className="font-medium text-[#0F2D2F]">Estado:</span> {statusLabel(row.status)}
										</p>
										{row.objective?.trim() ? (
											<p className="text-[#0F2D2F]/90">
												<span className="text-[#5F6B6D]">Objetivo:</span> {row.objective}
											</p>
										) : null}
										{row.athlete_notes?.trim() ? (
											<p className="border-t border-[#D9DDD8]/80 pt-2 text-[#0F2D2F]/90">
												<span className="text-[#5F6B6D]">Notas para la atleta:</span> {row.athlete_notes}
											</p>
										) : null}
									</div>
									{coachId === row.coach_id ? (
										<label className="flex shrink-0 flex-col gap-1 text-xs font-medium text-[#5F6B6D]">
											Cambiar estado
											<select
												disabled={statusUpdatingId === row.id}
												value={row.status}
												onChange={(e) => handleStatusChange(row.id, e.target.value as PlannedTrainingStatus)}
												className="rounded-lg border border-[#D9DDD8] bg-white px-2 py-1.5 text-sm text-[#0F2D2F] outline-none focus:border-[#7C4DFF]/45 focus:ring-2 focus:ring-[#7C4DFF]/15"
											>
												{STATUS_OPTIONS.map((o) => (
													<option key={o.value} value={o.value}>
														{o.label}
													</option>
												))}
											</select>
										</label>
									) : (
										<p className="max-w-[140px] text-xs text-[#5F6B6D]">Solo el autor puede cambiar el estado.</p>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			{past.length > 0 ? (
				<div className="mt-8 border-t border-[#D9DDD8]/80 pt-8">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Últimas sesiones pasadas</p>
					<ul className="mt-3 space-y-2">
						{past.map((row) => (
							<li
								key={row.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D9DDD8]/90 bg-white/90 px-3 py-2 text-xs text-[#0F2D2F]"
							>
								<span className="font-medium">{formatDisplayDate(row.planned_date)}</span>
								<span className="min-w-0 flex-1 truncate">{row.title}</span>
								<span className="text-[#5F6B6D]">{statusLabel(row.status)}</span>
								{coachId === row.coach_id ? (
									<select
										disabled={statusUpdatingId === row.id}
										value={row.status}
										onChange={(e) => handleStatusChange(row.id, e.target.value as PlannedTrainingStatus)}
										className="rounded-lg border border-[#D9DDD8] bg-white px-2 py-1 text-[11px] text-[#0F2D2F]"
									>
										{STATUS_OPTIONS.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</section>
	);
}
