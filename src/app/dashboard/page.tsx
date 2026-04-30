"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteCard } from "@/components/dashboard/AthleteCard";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CoachAthleteOverviewRow } from "@/types/dashboard";

export default function DashboardPage() {
	const router = useRouter();
	const [athletes, setAthletes] = useState<CoachAthleteOverviewRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setErrorMessage("Faltan variables de entorno de Supabase para cargar el dashboard.");
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

			const { data, error } = await supabase
				.from("coach_athlete_overview")
				.select("*")
				.eq("coach_user_id", session.user.id)
				.order("athlete_name", { ascending: true });

			if (error) {
				setErrorMessage("No se pudieron cargar los datos del dashboard.");
				setIsLoading(false);
				return;
			}

			setAthletes((data ?? []) as CoachAthleteOverviewRow[]);
			setIsLoading(false);
		};

		void run();
	}, [router]);

	const stats = useMemo(() => {
		const yellowCount = athletes.filter((athlete) => {
			const status = athlete.readiness_status?.toLowerCase() ?? "";
			return status.includes("yellow") || status.includes("amarillo") || status.includes("moderate");
		}).length;

		const redCount = athletes.filter((athlete) => {
			const status = athlete.readiness_status?.toLowerCase() ?? "";
			return status.includes("red") || status.includes("rojo") || status.includes("high");
		}).length;

		const highAlerts = athletes.reduce((acc, athlete) => acc + (athlete.high_flags_count ?? 0), 0);

		return {
			totalAthletes: athletes.length,
			highAlerts,
			yellowCount,
			redCount,
		};
	}, [athletes]);

	const headerCard =
		"rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] px-5 py-6 shadow-[0_2px_16px_rgba(15,45,47,0.05)] md:px-8 md:py-7";

	return (
		<main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-6 md:py-8">
			<header className={`${headerCard} relative mb-6 overflow-hidden`}>
				<div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-[#D7EFE7]/50" aria-hidden />
				<div className="pointer-events-none absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-[#7C4DFF]/6" aria-hidden />
				<div className="relative grid items-center gap-5 md:grid-cols-[120px_1fr_120px] md:gap-6">
					<div className="flex items-center">
						<Image src="/Ciclo-Activa.png" alt="Logo Ciclo Activa" width={112} height={32} unoptimized className="h-auto w-auto object-contain" />
					</div>
					<div className="min-w-0 border-l-[3px] border-[#0F5C63] pl-4 md:pl-5">
						<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C4DFF]">CicloActiva</p>
						<h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#0F2D2F] md:text-3xl">Panel entrenador</h1>
						<p className="mt-2 max-w-xl text-sm leading-snug text-[#5F6B6D]">
							Visión global de estado, riesgo y seguimiento de tus atletas.
						</p>
					</div>
					<div className="flex items-center justify-start md:justify-end">
						<Image src="/logoendurance.png" alt="Logo Endurance" width={112} height={32} className="h-auto w-auto object-contain" />
					</div>
				</div>
			</header>

			<DashboardStats
				totalAthletes={stats.totalAthletes}
				highAlerts={stats.highAlerts}
				yellowCount={stats.yellowCount}
				redCount={stats.redCount}
			/>

			<section className="mt-6 space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="text-xl font-bold tracking-tight text-[#0F2D2F] md:text-2xl">Atletas</h2>
						<p className="mt-0.5 text-xs text-[#5F6B6D]">Listado por nombre con lectura rápida de estado.</p>
					</div>
					<Link
						href="/coach/athletes/new"
						className="inline-flex items-center rounded-lg bg-[#0F5C63] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d4e54]"
					>
						Añadir atleta
					</Link>
				</div>

				{isLoading && <p className="text-sm text-[#5F6B6D]">Cargando dashboard…</p>}

				{errorMessage && (
					<p className="rounded-xl border border-[#C96B5C]/40 bg-[#C96B5C]/10 px-4 py-3 text-sm text-[#8B3F35]">{errorMessage}</p>
				)}

				{!isLoading && !errorMessage && athletes.length === 0 && (
					<p className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] px-6 py-5 text-sm text-[#5F6B6D] shadow-[0_4px_24px_rgba(15,45,47,0.06)]">
						No hay atletas vinculadas para este entrenador.
					</p>
				)}

				<div className="space-y-4">
					{athletes.map((athlete) => (
						<AthleteCard key={athlete.athlete_id} athlete={athlete} />
					))}
				</div>
			</section>
		</main>
	);
}
