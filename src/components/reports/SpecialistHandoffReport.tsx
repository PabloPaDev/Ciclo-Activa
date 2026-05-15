"use client";

import type { CoachAthleteOverviewRow } from "@/types/dashboard";
import type { InitialProfileScoreRow, MenstrualCycleRow, MenstrualLogRow } from "@/lib/athletes/coachAthleteDetailBundle";
import type { AthletePainOverviewRow } from "@/types/pain";
import type { DailyCheckinRow } from "@/types/daily-checkin";
import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";
import {
	buildCoordinationSuggestions,
	buildExecutiveSummaryParagraphs,
	buildLatestCheckinSummary,
	countPainWithIntensity,
	sortProfileScoresForReport,
} from "@/lib/reports/specialistHandoffCopy";

function display(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "boolean") return value ? "Sí" : "No";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

function formatSourceLabel(source: string | null): string {
	const normalized = source?.toLowerCase() ?? "";
	if (!normalized) return "Sin registrar";
	if (normalized === "leaf_q") return "LEAF-Q";
	if (normalized === "s_ede_q_short") return "S-EDE-Q reducido";
	if (normalized === "restq_short") return "RESTQ reducido";
	if (normalized === "bpaq_short") return "BPAQ reducido";
	if (normalized === "initial_readiness") return "Readiness inicial";
	return source ?? "Sin registrar";
}

function formatDate(value: string | null | undefined): string {
	if (!value) return "Sin registrar";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "Sin registrar";
	return d.toLocaleDateString("es-ES");
}

const tableHeadClass = "border border-[#D9DDD8] bg-[#D7EFE7]/50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]";
const tableCellClass = "border border-[#D9DDD8] px-3 py-2 text-sm text-[#0F2D2F]/90 align-top";

export interface SpecialistHandoffReportProps {
	athlete: CoachAthleteOverviewRow;
	initialProfileScores: InitialProfileScoreRow[];
	menstrualLog: MenstrualLogRow | null;
	menstrualCycle: MenstrualCycleRow | null;
	menstrualError: string | null;
	painItems: AthletePainOverviewRow[];
	latestDailyCheckin: DailyCheckinRow | null;
	generatedLabel: string;
}

export function SpecialistHandoffReport({
	athlete,
	initialProfileScores,
	menstrualLog,
	menstrualCycle,
	menstrualError,
	painItems,
	latestDailyCheckin,
	generatedLabel,
}: SpecialistHandoffReportProps) {
	const executive = buildExecutiveSummaryParagraphs(athlete, menstrualLog);
	const coordination = buildCoordinationSuggestions(athlete, countPainWithIntensity(painItems));
	const checkinSummary = buildLatestCheckinSummary(latestDailyCheckin);
	const sortedScores = sortProfileScoresForReport(initialProfileScores);
	const painSample = painItems.slice(0, 6);

	return (
		<article className="informe-doc space-y-10 text-[#0F2D2F]">
			<header className="informe-print-only-header mb-8 hidden border-b-2 border-[#0F5C63] pb-4 print:block">
				<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7C4DFF]">CicloActiva</p>
				<h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0F2D2F] md:text-3xl">
					Informe de riesgo inicial · Coordinación entre profesionales
				</h1>
				<p className="mt-2 text-xs text-[#5F6B6D]">Documento generado el {generatedLabel}</p>
			</header>

			<section className="informe-doc-section informe-print-avoid-break rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Objetivo del documento</h2>
				<p className="informe-prose mt-4 text-sm leading-relaxed text-[#0F2D2F]/90">
					Poner en común, de forma breve y ordenada, cómo se presenta la atleta en un cribado inicial de riesgo en mujer deportista y qué
					contexto menstrual y subjetivo acompaña a ese momento. Destinatarios típicos: medicina deportiva, nutrición, ginecología,
					fisioterapia o entrenador principal de referencia. No constituye diagnóstico ni prescripción.
				</p>
			</section>

			<section className="informe-doc-section informe-print-avoid-break rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Identificación</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="informe-table w-full min-w-[480px] border-collapse text-sm">
						<tbody>
							<tr>
								<th className={`${tableHeadClass} w-[32%]`}>Nombre</th>
								<td className={tableCellClass}>{display(athlete.athlete_name)}</td>
							</tr>
							<tr>
								<th className={tableHeadClass}>Contacto (ficha)</th>
								<td className={tableCellClass}>{display(athlete.athlete_email)}</td>
							</tr>
							<tr>
								<th className={tableHeadClass}>Identificador interno</th>
								<td className={`${tableCellClass} font-mono text-xs`}>{athlete.athlete_id}</td>
							</tr>
							<tr>
								<th className={tableHeadClass}>Fecha de emisión</th>
								<td className={tableCellClass}>{generatedLabel}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section className="informe-doc-section rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Resumen ejecutivo para el equipo</h2>
				<div className="informe-prose mt-4 space-y-4 text-sm leading-relaxed text-[#0F2D2F]/90">
					{executive.map((paragraph, index) => (
						<p key={index}>{paragraph}</p>
					))}
				</div>
			</section>

			<section className="informe-doc-section rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Hallazgos cuantitativos clave</h2>
				<div className="mt-4 overflow-x-auto">
					<table className="informe-table w-full min-w-[520px] border-collapse">
						<thead>
							<tr>
								<th className={tableHeadClass}>Indicador</th>
								<th className={tableHeadClass}>Valor en el momento del informe</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className={tableCellClass}>LEAF-Q (total)</td>
								<td className={tableCellClass}>{display(athlete.leaf_q_total)}</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Clasificación de riesgo LEAF-Q</td>
								<td className={tableCellClass}>{formatTechnicalLabel(athlete.leaf_q_risk_level)}</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Readiness (puntuación / estado)</td>
								<td className={tableCellClass}>
									{display(athlete.readiness_score)} / 100 — {formatTechnicalLabel(athlete.readiness_status)}
								</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Alertas activas (recuento)</td>
								<td className={tableCellClass}>{display(athlete.active_flags_count)}</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Deporte principal</td>
								<td className={tableCellClass}>{display(athlete.main_sport)}</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Nivel y carga declarada</td>
								<td className={tableCellClass}>
									{formatTechnicalLabel(athlete.training_level)} · {display(athlete.training_hours_per_week)} h/sem.
								</td>
							</tr>
							<tr>
								<td className={tableCellClass}>Estado menstrual (declarado en ficha)</td>
								<td className={tableCellClass}>{display(athlete.menstrual_status)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{sortedScores.length > 0 ? (
				<section className="informe-doc-section informe-page-break-before rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
					<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">
						Perfil inicial por dominios (valoración 360º)
					</h2>
					<p className="mt-3 text-xs leading-relaxed text-[#5F6B6D]">
						Puntuaciones y estados procedentes de la evaluación inicial registrada en CicloActiva. Útil para localizar ejes con mayor
						señal en el cribado.
					</p>
					<div className="mt-4 overflow-x-auto">
						<table className="informe-table w-full min-w-[640px] border-collapse text-sm">
							<thead>
								<tr>
									<th className={tableHeadClass}>Dominio</th>
									<th className={tableHeadClass}>Puntuación</th>
									<th className={tableHeadClass}>Fuente</th>
									<th className={tableHeadClass}>Estado</th>
									<th className={tableHeadClass}>Nota interpretativa (registro)</th>
								</tr>
							</thead>
							<tbody>
								{sortedScores.map((row) => (
									<tr key={row.id}>
										<td className={tableCellClass}>{display(row.domain_label)}</td>
										<td className={tableCellClass}>
											{row.score_value ?? "—"}
											{row.score_max != null ? ` / ${row.score_max}` : ""}
										</td>
										<td className={tableCellClass}>{formatSourceLabel(row.source)}</td>
										<td className={tableCellClass}>{formatTechnicalLabel(row.status)}</td>
										<td className={`${tableCellClass} max-w-[280px]`}>{display(row.interpretation)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : (
				<section className="informe-doc-section informe-page-break-before rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
					<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">
						Perfil inicial por dominios (valoración 360º)
					</h2>
					<p className="mt-4 text-sm text-[#5F6B6D]">
						No hay puntuaciones por dominio registradas en la evaluación inicial. El cribado LEAF-Q y otros datos de la ficha siguen
						siendo relevantes para el contexto global.
					</p>
				</section>
			)}

			<section className="informe-doc-section rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Señal subjetiva y readiness</h2>
				{(athlete.readiness_reasons ?? []).filter((r) => r.trim()).length > 0 ? (
					<div className="mt-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Motivos asociados al readiness</p>
						<ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#0F2D2F]/90">
							{(athlete.readiness_reasons ?? [])
								.filter((r) => r.trim())
								.map((r) => (
									<li key={r}>{r}</li>
								))}
						</ul>
					</div>
				) : (
					<p className="mt-4 text-sm text-[#5F6B6D]">No constan motivos textuales adicionales del readiness en el momento del informe.</p>
				)}
				{checkinSummary ? (
					<div className="mt-6 rounded-lg border border-[#D9DDD8] bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B6D]">Último check-in diario (contexto)</p>
						<p className="mt-2 text-sm leading-relaxed text-[#0F2D2F]/90">{checkinSummary}</p>
					</div>
				) : (
					<p className="mt-6 text-sm text-[#5F6B6D]">No hay check-in diario reciente registrado.</p>
				)}
			</section>

			<section className="informe-doc-section informe-page-break-before rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Ciclo menstrual (autorregistro)</h2>
				{menstrualError ? (
					<p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{menstrualError}</p>
				) : menstrualLog || menstrualCycle ? (
					<div className="mt-4 overflow-x-auto">
						<table className="informe-table w-full min-w-[520px] border-collapse text-sm">
							<tbody>
								<tr>
									<th className={tableHeadClass}>Fecha del último registro</th>
									<td className={tableCellClass}>{formatDate(menstrualLog?.log_date)}</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Fase declarada / día del ciclo</th>
									<td className={tableCellClass}>
										{formatTechnicalLabel(menstrualLog?.phase)} {menstrualLog?.cycle_day != null ? `· día ${menstrualLog.cycle_day}` : ""}
									</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Sangrado / dolor / energía / ánimo / sueño (escalas)</th>
									<td className={tableCellClass}>
										{menstrualLog?.bleeding ? formatTechnicalLabel(menstrualLog.bleeding) : "Sin registrar"} · dolor{" "}
										{display(menstrualLog?.menstrual_pain)} · energía {display(menstrualLog?.energy)} · ánimo {display(menstrualLog?.mood)}{" "}
										· sueño {display(menstrualLog?.sleep_quality)}
									</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Síntomas declarados</th>
									<td className={tableCellClass}>
										{menstrualLog?.symptoms?.length
											? menstrualLog.symptoms.filter(Boolean).join(", ")
											: "Sin síntomas textuales registrados."}
									</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Inicio / fin última menstruación (registro)</th>
									<td className={tableCellClass}>
										{formatDate(menstrualCycle?.period_start_date)} — {formatDate(menstrualCycle?.period_end_date)}
									</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Duración estimada del ciclo / notas</th>
									<td className={tableCellClass}>
										{menstrualCycle?.estimated_cycle_length_days != null
											? `${menstrualCycle.estimated_cycle_length_days} días`
											: "Sin registrar"}{" "}
										· {display(menstrualCycle?.notes)}
									</td>
								</tr>
								<tr>
									<th className={tableHeadClass}>Notas del último log</th>
									<td className={tableCellClass}>{display(menstrualLog?.notes)}</td>
								</tr>
							</tbody>
						</table>
					</div>
				) : (
					<p className="mt-4 text-sm text-[#5F6B6D]">Sin registro menstrual detallado en la aplicación en el momento del informe.</p>
				)}
				<p className="mt-4 rounded-lg border border-[#D9A441]/30 bg-[#D9A441]/10 px-3 py-2 text-xs leading-relaxed text-[#7A5A12]">
					Los datos de ciclo son autorreportados y orientativos; no sustituyen exploración ginecológica ni seguimiento clínico.
				</p>
			</section>

			<section className="informe-doc-section rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">Molestias o dolor recientes (registro)</h2>
				{painSample.length === 0 ? (
					<p className="mt-4 text-sm text-[#5F6B6D]">No constan informes recientes de molestias en el mapa corporal.</p>
				) : (
					<div className="mt-4 overflow-x-auto">
						<table className="informe-table w-full min-w-[560px] border-collapse text-sm">
							<thead>
								<tr>
									<th className={tableHeadClass}>Fecha</th>
									<th className={tableHeadClass}>Zona</th>
									<th className={tableHeadClass}>Intensidad</th>
									<th className={tableHeadClass}>Tipo / nota</th>
								</tr>
							</thead>
							<tbody>
								{painSample.map((row, index) => (
									<tr key={`${row.pain_report_id}-${row.pain_report_area_id}-${index}`}>
										<td className={tableCellClass}>{formatDate(row.reported_at)}</td>
										<td className={tableCellClass}>{display(row.body_area_name ?? row.body_region)}</td>
										<td className={tableCellClass}>{display(row.intensity)}</td>
										<td className={tableCellClass}>
											{formatTechnicalLabel(row.pain_type)} {row.description ? `· ${row.description}` : ""}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="informe-doc-section rounded-xl border border-[#D9DDD8] bg-white p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#0F5C63]/25 pb-2 text-lg font-semibold text-[#0F2D2F]">
					Sugerencias de coordinación (orientativas)
				</h2>
				<ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#0F2D2F]/90">
					{coordination.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</section>

			<section className="informe-doc-section informe-print-avoid-break rounded-xl border border-[#C96B5C]/25 bg-[#C96B5C]/6 p-6 md:p-8">
				<h2 className="informe-doc-h2 border-b border-[#C96B5C]/30 pb-2 text-lg font-semibold text-[#8B3F35]">Limitaciones del informe</h2>
				<p className="informe-prose mt-4 text-sm leading-relaxed text-[#0F2D2F]/90">
					Este PDF es un extracto estructurado en la fecha indicada. No incluye gráficos interactivos ni la totalidad de campos de la ficha
					digital. No constituye diagnóstico médico, certificado de aptitud ni documento forense. La responsabilidad de la decisión clínica y
					deportiva recae en los profesionales que atienden a la persona. Para el detalle completo (radar, lectura rápida ampliada, planificación
					y otros módulos) debe consultarse la ficha en CicloActiva con los permisos adecuados.
				</p>
			</section>
		</article>
	);
}
