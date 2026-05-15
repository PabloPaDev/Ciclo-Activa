"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrainingHistory } from "@/components/athletes/TrainingHistory";
import { PainMapSummary } from "@/components/athletes/PainMapSummary";
import { AthleteStateSummarySection } from "@/components/athletes/AthleteStateSummarySection";
import { CoachNotesSection } from "@/components/athletes/CoachNotesSection";
import { PlannedTrainingsSection } from "@/components/athletes/PlannedTrainingsSection";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchCoachAthleteDetailBundle } from "@/lib/athletes/coachAthleteDetailBundle";
import type {
	InitialProfileScoreRow,
	MenstrualCycleRow,
	MenstrualLogRow,
	MenstrualQueryError,
} from "@/lib/athletes/coachAthleteDetailBundle";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";
import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { TrainingSessionWithFeedback } from "@/types/training";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { DailyCheckinRow } from "@/types/daily-checkin";

function displayNumericValue(value: number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	return String(value);
}

function resolveReadinessVariant(status: string | null): "green" | "yellow" | "red" | "neutral" {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("green") || normalized.includes("verde") || normalized.includes("ready")) return "green";
	if (normalized.includes("yellow") || normalized.includes("amarillo") || normalized.includes("moderate")) return "yellow";
	if (normalized.includes("red") || normalized.includes("rojo") || normalized.includes("high")) return "red";
	return "neutral";
}

function athleteHeaderCardClasses(variant: "green" | "yellow" | "red" | "neutral"): string {
	if (variant === "green") return "border-[#4E9B6E]/30 bg-[#D7EFE7]/40";
	if (variant === "yellow") return "border-[#D9A441]/35 bg-[#D9A441]/8";
	if (variant === "red") return "border-[#C96B5C]/35 bg-[#C96B5C]/8";
	return "border-[#D9DDD8] bg-[#FCFBF8]";
}

function displayValue(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "boolean") return value ? "Si" : "No";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

export default function AthleteProfilePage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const [athlete, setAthlete] = useState<CoachAthleteOverviewRow | null>(null);
	const [trainingSessions, setTrainingSessions] = useState<TrainingSessionWithFeedback[]>([]);
	const [painItems, setPainItems] = useState<AthletePainOverviewRow[]>([]);
	const [menstrualLog, setMenstrualLog] = useState<MenstrualLogRow | null>(null);
	const [menstrualCycle, setMenstrualCycle] = useState<MenstrualCycleRow | null>(null);
	const [menstrualError, setMenstrualError] = useState<string | null>(null);
	const [menstrualLogErrorInfo, setMenstrualLogErrorInfo] = useState<MenstrualQueryError>(null);
	const [menstrualCycleErrorInfo, setMenstrualCycleErrorInfo] = useState<MenstrualQueryError>(null);
	const [initialProfileScores, setInitialProfileScores] = useState<InitialProfileScoreRow[]>([]);
	const [latestDailyCheckin, setLatestDailyCheckin] = useState<DailyCheckinRow | null>(null);
	const [todayDailyCheckin, setTodayDailyCheckin] = useState<DailyCheckinRow | null>(null);
	const [painError, setPainError] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setErrorMessage("Faltan variables de entorno de Supabase para cargar la ficha.");
				setIsLoading(false);
				return;
			}

			if (!params.id) {
				setNotFound(true);
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

			const result = await fetchCoachAthleteDetailBundle(supabase, params.id, session.user.id);

			if (!result.ok) {
				if (result.failure.kind === "not_found") {
					setNotFound(true);
				} else if (result.failure.kind === "sessions_error") {
					setErrorMessage(result.failure.message);
				} else if (result.failure.kind === "overview_error") {
					setErrorMessage(result.failure.message);
				} else {
					setErrorMessage("No se pudo cargar la ficha de la atleta.");
				}
				setIsLoading(false);
				return;
			}

			const bundle = result.data;
			setAthlete(bundle.athlete);
			setTrainingSessions(bundle.trainingSessions);
			setMenstrualLog(bundle.menstrualLog);
			setMenstrualCycle(bundle.menstrualCycle);
			setMenstrualError(bundle.menstrualError);
			setMenstrualLogErrorInfo(bundle.menstrualLogErrorInfo);
			setMenstrualCycleErrorInfo(bundle.menstrualCycleErrorInfo);
			setInitialProfileScores(bundle.initialProfileScores);
			setPainItems(bundle.painItems);
			setPainError(bundle.painError);
			setLatestDailyCheckin(bundle.latestDailyCheckin);
			setTodayDailyCheckin(bundle.todayDailyCheckin);
			setIsLoading(false);
		};

		void run();
	}, [params.id, router]);

	const readinessVariant = useMemo(
		() => resolveReadinessVariant(athlete?.readiness_status ?? null),
		[athlete?.readiness_status],
	);

	const readinessReasons = athlete?.readiness_reasons ?? [];
	const activeFlagTitles = athlete?.active_flag_titles ?? [];

	return (
		<main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:py-14">
			<header className="mb-10 rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-8 md:py-8">
				<div className="grid items-center gap-6 md:grid-cols-[160px_1fr_auto]">
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
					<div className="min-w-0 border-l-[3px] border-[#0F5C63] pl-5 md:pl-6">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C4DFF]">CICLOACTIVA</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F2D2F] md:text-4xl">Ficha de atleta</h1>
						<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
							Perfil inicial de riesgo y ciclo menstrual para apoyar la toma de decisiones del profesional. No representa diagnóstico
							médico.
						</p>
					</div>
					<div className="flex justify-start md:justify-end">
						<Link
							href="/dashboard"
							className="inline-flex items-center rounded-xl border border-[#0F5C63] bg-white px-4 py-2 text-sm font-semibold text-[#0F5C63] transition hover:bg-[#D7EFE7]/50"
						>
							Volver al dashboard
						</Link>
					</div>
				</div>
			</header>

			{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando ficha...</p>}

			{errorMessage && (
				<p className="rounded-xl border border-[#D9A441]/35 bg-[#D9A441]/10 px-4 py-3 text-sm text-[#7A5A12]">{errorMessage}</p>
			)}

			{!isLoading && !errorMessage && notFound && (
				<p className="rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] px-4 py-3 text-sm text-[#5F6B6D]">
					No se ha encontrado esta atleta o no tienes acceso.
				</p>
			)}

			{!isLoading && !errorMessage && athlete && (
				<div className="space-y-8">
					<section
						className={`rounded-[1.125rem] border p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8 ${athleteHeaderCardClasses(readinessVariant)}`}
					>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Estado global</p>
								<h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0F2D2F] md:text-3xl">{displayValue(athlete.athlete_name)}</h2>
								<p className="mt-2 text-sm text-[#5F6B6D]">{displayValue(athlete.athlete_email)}</p>
							</div>
							<StatusBadge label={formatTechnicalLabel(athlete.readiness_status)} variant={readinessVariant} />
						</div>
					</section>

					<AthleteStateSummarySection
						athlete={athlete}
						painItems={painItems}
						menstrualLog={menstrualLog}
						menstrualCycle={menstrualCycle}
						initialProfileScores={initialProfileScores}
						trainingSessions={trainingSessions}
						latestDailyCheckin={latestDailyCheckin}
						menstrualError={menstrualError}
						menstrualLogErrorInfo={menstrualLogErrorInfo}
						menstrualCycleErrorInfo={menstrualCycleErrorInfo}
					/>

					<details className="group rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
						<summary className="cursor-pointer list-none text-lg font-bold tracking-tight text-[#0F2D2F] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
							<span className="inline-flex items-center gap-2">
								Información complementaria
								<span className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">(planificación, entrenos, molestias)</span>
							</span>
						</summary>
						<div className="mt-6 space-y-8 border-t border-[#D9DDD8]/80 pt-6">
							<CoachNotesSection athleteId={params.id} />

							<PlannedTrainingsSection athleteId={params.id} />

							<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
								<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Check-in de hoy</h3>
								{!todayDailyCheckin ? (
									<div className="mt-4 rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-5">
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-sm font-semibold text-[#0F2D2F]">Check-in de hoy</p>
											<span className="inline-flex items-center rounded-full border border-[#D9A441]/40 bg-[#D9A441]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#7A5A12]">
												Pendiente de registro
											</span>
										</div>
										<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
											Cuando la atleta complete su check-in diario aparecerán aquí sueño, energía, fatiga, dolor, estrés y sensación de recuperación.
										</p>
									</div>
								) : (
									<div className="mt-4 grid gap-3 text-sm leading-relaxed text-[#0F2D2F]/90 md:grid-cols-2 lg:grid-cols-3">
										<p><span className="text-[#5F6B6D]">Fecha:</span> {displayValue(todayDailyCheckin.checkin_date)}</p>
										<p><span className="text-[#5F6B6D]">Calidad de sueño:</span> {displayNumericValue(todayDailyCheckin.sleep_quality)}</p>
										<p><span className="text-[#5F6B6D]">Horas de sueño:</span> {displayNumericValue(todayDailyCheckin.sleep_hours)}</p>
										<p><span className="text-[#5F6B6D]">Energía:</span> {displayNumericValue(todayDailyCheckin.energy)}</p>
										<p><span className="text-[#5F6B6D]">Ánimo:</span> {displayNumericValue(todayDailyCheckin.mood)}</p>
										<p><span className="text-[#5F6B6D]">Estrés:</span> {displayNumericValue(todayDailyCheckin.stress)}</p>
										<p><span className="text-[#5F6B6D]">Fatiga:</span> {displayNumericValue(todayDailyCheckin.fatigue)}</p>
										<p><span className="text-[#5F6B6D]">Dolor/molestias:</span> {displayNumericValue(todayDailyCheckin.soreness)}</p>
										<p><span className="text-[#5F6B6D]">Motivación:</span> {displayNumericValue(todayDailyCheckin.motivation)}</p>
										<p><span className="text-[#5F6B6D]">FC reposo:</span> {displayNumericValue(todayDailyCheckin.resting_hr)}</p>
										<p><span className="text-[#5F6B6D]">HRV:</span> {displayNumericValue(todayDailyCheckin.hrv)}</p>
										<p className="md:col-span-2 lg:col-span-3">
											<span className="text-[#5F6B6D]">Notas:</span> {displayValue(todayDailyCheckin.notes)}
										</p>
									</div>
								)}
							</section>

							<section className="grid gap-6 md:grid-cols-2">
								<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
									<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Perfil deportivo</h3>
									<div className="mt-4 space-y-2 text-sm leading-relaxed text-[#0F2D2F]/90">
										<p><span className="text-[#5F6B6D]">Deporte:</span> {displayValue(athlete.main_sport)}</p>
										<p><span className="text-[#5F6B6D]">Nivel:</span> {formatTechnicalLabel(athlete.training_level)}</p>
										<p><span className="text-[#5F6B6D]">Horas/semana:</span> {displayValue(athlete.training_hours_per_week)}</p>
									</div>
								</article>

								<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
									<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Contexto fisiológico</h3>
									<div className="mt-4 space-y-2 text-sm leading-relaxed text-[#0F2D2F]/90">
										<p><span className="text-[#5F6B6D]">Estado menstrual:</span> {displayValue(athlete.menstrual_status)}</p>
										<p>
											<span className="text-[#5F6B6D]">Uso anticonceptivos hormonales:</span>{" "}
											{displayValue(athlete.uses_hormonal_contraception)}
										</p>
									</div>
								</article>

								<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
									<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Readiness (detalle)</h3>
									<div className="mt-4 space-y-2 text-sm leading-relaxed text-[#0F2D2F]/90">
										<p><span className="text-[#5F6B6D]">Estado:</span> {formatTechnicalLabel(athlete.readiness_status)}</p>
										<p><span className="text-[#5F6B6D]">Puntuación:</span> {displayValue(athlete.readiness_score)}</p>
										<p><span className="text-[#5F6B6D]">Resumen:</span> {displayValue(athlete.readiness_summary)}</p>
									</div>
									<div className="mt-4">
										<p className="text-sm font-semibold text-[#0F2D2F]">Motivos de readiness</p>
										{readinessReasons.length === 0 ? (
											<p className="mt-1 text-sm text-[#5F6B6D]">Sin registrar</p>
										) : (
											<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#5F6B6D]">
												{readinessReasons.map((reason) => (
													<li key={reason}>{reason}</li>
												))}
											</ul>
										)}
									</div>
								</article>

								<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-white p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
									<h3 className="text-lg font-bold tracking-tight text-[#0F2D2F]">Riesgo LEAF-Q y alertas</h3>
									<div className="mt-4 space-y-2 text-sm leading-relaxed text-[#0F2D2F]/90">
										<p><span className="text-[#5F6B6D]">LEAF-Q total:</span> {displayValue(athlete.leaf_q_total)}</p>
										<p><span className="text-[#5F6B6D]">Riesgo LEAF-Q:</span> {formatTechnicalLabel(athlete.leaf_q_risk_level)}</p>
										<p>
											<span className="text-[#5F6B6D]">Interpretación LEAF-Q:</span>{" "}
											{displayValue(athlete.leaf_q_interpretation)}
										</p>
										<p><span className="text-[#5F6B6D]">Alertas activas:</span> {displayValue(athlete.active_flags_count)}</p>
									</div>
									<div className="mt-4">
										<p className="text-sm font-semibold text-[#0F2D2F]">Títulos de alertas activas</p>
										{activeFlagTitles.length === 0 ? (
											<p className="mt-1 text-sm text-[#5F6B6D]">Sin registrar</p>
										) : (
											<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#5F6B6D]">
												{activeFlagTitles.map((title) => (
													<li key={title}>{title}</li>
												))}
											</ul>
										)}
									</div>
								</article>
							</section>

							<TrainingHistory sessions={trainingSessions} />
							<PainMapSummary painItems={painItems} hasError={painError} />
						</div>
					</details>
				</div>
			)}
		</main>
	);
}
