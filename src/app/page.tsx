import Link from "next/link";

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-24 md:py-28">
			<div className="w-full rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-10 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-14">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7C4DFF]">CicloActiva</p>
				<h1 className="mt-5 text-3xl font-bold tracking-tight text-[#0F2D2F] md:text-4xl md:leading-[1.15]">
					Panel inteligente para entrenadores que trabajan con mujeres deportistas.
				</h1>
				<p className="mt-6 max-w-3xl text-base leading-relaxed text-[#5F6B6D]">
					Evalúa riesgo, seguimiento y estado actual combinando cuestionarios, entrenamiento, ciclo menstrual, molestias y feedback
					subjetivo.
				</p>
				<Link
					href="/login"
					className="mt-10 inline-flex items-center rounded-xl bg-[#0F5C63] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4e54]"
				>
					Entrar al panel
				</Link>
			</div>
		</main>
	);
}
