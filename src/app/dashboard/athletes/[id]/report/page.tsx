"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SpecialistHandoffReport } from "@/components/reports/SpecialistHandoffReport";
import { fetchCoachAthleteDetailBundle } from "@/lib/athletes/coachAthleteDetailBundle";
import type {
	CoachAthleteDetailBundle,
	InitialProfileScoreRow,
	MenstrualCycleRow,
	MenstrualLogRow,
} from "@/lib/athletes/coachAthleteDetailBundle";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { DailyCheckinRow } from "@/types/daily-checkin";
import "./report-print.css";

export default function AthleteRiskReportPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const athleteId = params.id;

	const [athlete, setAthlete] = useState<CoachAthleteOverviewRow | null>(null);
	const [painItems, setPainItems] = useState<AthletePainOverviewRow[]>([]);
	const [menstrualLog, setMenstrualLog] = useState<MenstrualLogRow | null>(null);
	const [menstrualCycle, setMenstrualCycle] = useState<MenstrualCycleRow | null>(null);
	const [menstrualError, setMenstrualError] = useState<string | null>(null);
	const [initialProfileScores, setInitialProfileScores] = useState<InitialProfileScoreRow[]>([]);
	const [latestDailyCheckin, setLatestDailyCheckin] = useState<DailyCheckinRow | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [generatedLabel, setGeneratedLabel] = useState<string>("");

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setErrorMessage("Faltan variables de entorno de Supabase.");
				setIsLoading(false);
				return;
			}
			if (!athleteId) {
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

			const result = await fetchCoachAthleteDetailBundle(supabase, athleteId, session.user.id);

			if (!result.ok) {
				if (result.failure.kind === "not_found") {
					setNotFound(true);
				} else if (result.failure.kind === "sessions_error" || result.failure.kind === "overview_error") {
					setErrorMessage(result.failure.message);
				} else {
					setErrorMessage("No se pudo cargar el informe.");
				}
				setIsLoading(false);
				return;
			}

			const bundle: CoachAthleteDetailBundle = result.data;
			setAthlete(bundle.athlete);
			setPainItems(bundle.painItems);
			setMenstrualLog(bundle.menstrualLog);
			setMenstrualCycle(bundle.menstrualCycle);
			setMenstrualError(bundle.menstrualError);
			setInitialProfileScores(bundle.initialProfileScores);
			setLatestDailyCheckin(bundle.latestDailyCheckin);
			setGeneratedLabel(
				new Date().toLocaleString("es-ES", {
					dateStyle: "long",
					timeStyle: "short",
				}),
			);
			setIsLoading(false);
		};

		void run();
	}, [athleteId, router]);

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	return (
		<main className="informe-print-root mx-auto w-full max-w-[900px] flex-1 px-6 py-12 md:py-14">
			<div className="report-no-print mb-8 flex flex-col gap-4 border-b border-[#D9DDD8] pb-6 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-sm font-semibold text-[#0F2D2F]">Informe para otros profesionales</p>
					<p className="mt-1 max-w-xl text-sm leading-relaxed text-[#5F6B6D]">
						Documento narrativo y tabular para compartir con medicina deportiva, nutrición, ginecología u otros miembros del equipo. En
						impresión, guarde como PDF desde el navegador.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={handlePrint}
						className="inline-flex items-center rounded-xl bg-[#0F5C63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54]"
					>
						Exportar PDF (imprimir)
					</button>
					<Link
						href={`/athletes/${athleteId}`}
						className="inline-flex items-center rounded-xl border border-[#0F5C63] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F5C63] transition hover:bg-[#D7EFE7]/50"
					>
						Ficha interactiva
					</Link>
					<Link
						href="/dashboard"
						className="inline-flex items-center rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] px-4 py-2.5 text-sm font-semibold text-[#0F2D2F] transition hover:bg-white"
					>
						Panel
					</Link>
				</div>
			</div>

			<header className="report-no-print mb-10 rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:px-8 md:py-8">
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
					<div className="min-w-0 border-l-[3px] border-[#0F5C63] pl-5 md:pl-6">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C4DFF]">CICLOACTIVA</p>
						<h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F2D2F] md:text-3xl">Informe de coordinación</h1>
						<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
							Vista previa en pantalla; el PDF generado prioriza lectura clara para especialistas externos a la plataforma.
						</p>
					</div>
				</div>
			</header>

			{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando informe…</p>}

			{errorMessage && (
				<p className="rounded-xl border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-4 py-3 text-sm text-[#8B3F35]">{errorMessage}</p>
			)}

			{!isLoading && !errorMessage && notFound && (
				<p className="rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] px-4 py-3 text-sm text-[#5F6B6D]">
					No se ha encontrado esta atleta o no tienes acceso.
				</p>
			)}

			{!isLoading && !errorMessage && athlete && (
				<SpecialistHandoffReport
					athlete={athlete}
					initialProfileScores={initialProfileScores}
					menstrualLog={menstrualLog}
					menstrualCycle={menstrualCycle}
					menstrualError={menstrualError}
					painItems={painItems}
					latestDailyCheckin={latestDailyCheckin}
					generatedLabel={generatedLabel}
				/>
			)}
		</main>
	);
}
