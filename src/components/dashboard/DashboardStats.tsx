interface DashboardStatsProps {
	totalAthletes: number;
	highAlerts: number;
	yellowCount: number;
	redCount: number;
}

const statCardClass =
	"rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-4 shadow-[0_2px_12px_rgba(15,45,47,0.05)] md:p-4";

export function DashboardStats({ totalAthletes, highAlerts, yellowCount, redCount }: DashboardStatsProps) {
	return (
		<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<article className={statCardClass}>
				<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5F6B6D]">Atletas evaluadas</p>
				<p className="mt-1.5 text-2xl font-bold tracking-tight text-[#0F2D2F]">{totalAthletes}</p>
			</article>
			<article className={statCardClass}>
				<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5F6B6D]">Alertas importantes</p>
				<p className="mt-1.5 text-2xl font-bold tracking-tight text-[#C96B5C]">{highAlerts}</p>
			</article>
			<article className={statCardClass}>
				<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5F6B6D]">Estado global en precaución</p>
				<p className="mt-1.5 text-2xl font-bold tracking-tight text-[#D9A441]">{yellowCount}</p>
			</article>
			<article className={statCardClass}>
				<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5F6B6D]">Estado global en alerta alta</p>
				<p className="mt-1.5 text-2xl font-bold tracking-tight text-[#C96B5C]">{redCount}</p>
			</article>
		</section>
	);
}
