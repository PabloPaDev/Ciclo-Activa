import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";

interface AthleteCardProps {
	athlete: CoachAthleteOverviewRow;
}

function resolveReadinessVariant(status: string | null): "green" | "yellow" | "red" | "neutral" {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("green") || normalized.includes("verde") || normalized.includes("ready")) return "green";
	if (normalized.includes("yellow") || normalized.includes("amarillo") || normalized.includes("moderate")) return "yellow";
	if (normalized.includes("red") || normalized.includes("rojo") || normalized.includes("high")) return "red";
	return "neutral";
}

function getStatusSummary(_variant: "green" | "yellow" | "red" | "neutral"): string {
	return "Estado de precaucion: requiere seguimiento cercano antes de aumentar la carga.";
}

function getRecommendation(
	variant: "green" | "yellow" | "red" | "neutral",
	leafRisk: string | null,
	activeFlagsCount: number | null,
): string {
	const normalizedLeafRisk = leafRisk?.toLowerCase() ?? "";
	const alerts = activeFlagsCount ?? 0;
	const hasHighLeafRisk = normalizedLeafRisk.includes("high") || normalizedLeafRisk.includes("alto");

	if (variant === "red" || hasHighLeafRisk || alerts >= 2) {
		return "Evitar carga intensa, revisar sintomas clave y priorizar recuperacion antes de progresar.";
	}
	if (variant === "yellow" || alerts === 1) {
		return "Evitar carga intensa, revisar sintomas clave y priorizar recuperacion antes de progresar.";
	}
	if (variant === "green") {
		return "Evitar carga intensa, revisar sintomas clave y priorizar recuperacion antes de progresar.";
	}
	return "Evitar carga intensa, revisar sintomas clave y priorizar recuperacion antes de progresar.";
}

export function AthleteCard({ athlete }: AthleteCardProps) {
	const readinessVariant = resolveReadinessVariant(athlete.readiness_status);
	const reasons = athlete.readiness_reasons?.slice(0, 3) ?? [];

	const cardColorClass =
		readinessVariant === "yellow"
			? "border-[#D9A441]/35 bg-[#FCFBF8]"
			: readinessVariant === "green"
				? "border-[#4E9B6E]/30 bg-[#FCFBF8]"
				: readinessVariant === "red"
					? "border-[#C96B5C]/35 bg-[#FCFBF8]"
					: "border-[#D9DDD8] bg-[#FCFBF8]";
	const accentColorClass =
		readinessVariant === "yellow"
			? "bg-[#D9A441]"
			: readinessVariant === "green"
				? "bg-[#4E9B6E]"
				: readinessVariant === "red"
					? "bg-[#C96B5C]"
					: "bg-[#0F5C63]";

	const statusSummary = getStatusSummary(readinessVariant);
	const recommendation = getRecommendation(readinessVariant, athlete.leaf_q_risk_level, athlete.active_flags_count);

	const pillClass =
		"min-w-0 flex-1 rounded-lg border border-[#D9DDD8] bg-white px-1.5 py-2 shadow-[0_1px_6px_rgba(15,45,47,0.05)] sm:px-2.5";

	return (
		<article
			className={`relative overflow-hidden rounded-xl border p-4 shadow-[0_2px_16px_rgba(15,45,47,0.05)] md:p-5 ${cardColorClass}`}
		>
			<div className={`absolute inset-x-0 top-0 h-0.5 ${accentColorClass}`} />

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 space-y-0.5">
					<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7C4DFF]">Atleta</p>
					<h3 className="text-lg font-bold leading-tight tracking-tight text-[#0F2D2F] md:text-xl">
						{athlete.athlete_name ?? "Atleta sin nombre"}
					</h3>
					<p className="text-xs font-medium uppercase tracking-[0.06em] text-[#5F6B6D]">{athlete.main_sport ?? "Deporte no disponible"}</p>
				</div>
				<div className="shrink-0 rounded-full border border-[#D9DDD8] bg-[#FCFBF8] px-0.5 py-0.5">
					<StatusBadge label={formatTechnicalLabel(athlete.readiness_status)} variant={readinessVariant} />
				</div>
			</div>

			<div className="mt-3 flex min-w-0 gap-1.5 sm:gap-2">
				<div className={pillClass}>
					<p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5F6B6D] sm:text-[10px]">
						Horas/sem.
					</p>
					<p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0F2D2F] sm:mt-1 sm:text-base">
						{athlete.training_hours_per_week ?? "N/A"}
					</p>
				</div>
				<div className={pillClass}>
					<p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5F6B6D] sm:text-[10px]">
						Readiness
					</p>
					<p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0F2D2F] sm:mt-1 sm:text-base">
						{athlete.readiness_score ?? "N/A"}
					</p>
				</div>
				<div className={pillClass}>
					<p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5F6B6D] sm:text-[10px]">LEAF-Q</p>
					<p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0F2D2F] sm:mt-1 sm:text-base">
						{athlete.leaf_q_total ?? "N/A"}
					</p>
				</div>
				<div className={pillClass}>
					<p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5F6B6D] sm:text-[10px]">
						Riesgo L-Q
					</p>
					<p className="mt-0.5 line-clamp-2 text-sm font-bold leading-tight text-[#0F2D2F] sm:mt-1 sm:line-clamp-1 sm:text-base">
						{formatTechnicalLabel(athlete.leaf_q_risk_level)}
					</p>
				</div>
				<div className={pillClass}>
					<p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5F6B6D] sm:text-[10px]">Alertas</p>
					<p className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#0F2D2F] sm:mt-1 sm:text-base">{athlete.active_flags_count ?? 0}</p>
				</div>
			</div>

			<div className="mt-3 border-t border-[#D9DDD8]/70 pt-3">
				<p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#0F2D2F]">Factores principales del estado actual</p>
				{reasons.length === 0 ? (
					<p className="mt-1 text-xs leading-snug text-[#5F6B6D]">No hay motivos registrados.</p>
				) : (
					<ul className="mt-1.5 space-y-1 text-xs leading-snug text-[#5F6B6D]">
						{reasons.map((reason) => (
							<li key={reason} className="flex items-start gap-2">
								<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0F5C63]" />
								<span>{reason}</span>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="mt-3 grid gap-2 md:grid-cols-2">
				<div className="rounded-lg border border-[#D9DDD8] bg-[#D7EFE7]/35 px-3 py-2.5">
					<p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#0F5C63]">Estado actual</p>
					<p className="mt-1 text-xs leading-snug text-[#0F2D2F]/90">{statusSummary}</p>
				</div>
				<div className="rounded-lg border border-[#D9DDD8] bg-white px-3 py-2.5">
					<p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#7C4DFF]">Recomendación</p>
					<p className="mt-1 text-xs leading-snug text-[#0F2D2F]/90">{recommendation}</p>
				</div>
			</div>

			<Link
				href={`/athletes/${athlete.athlete_id}`}
				className="mt-3 inline-flex w-fit items-center rounded-lg bg-[#0F5C63] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d4e54]"
			>
				Ver ficha
			</Link>
		</article>
	);
}
