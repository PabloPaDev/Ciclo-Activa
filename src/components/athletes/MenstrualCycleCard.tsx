"use client";

import { formatTechnicalLabel } from "@/lib/presentation/formatLabels";

type MenstrualLog = {
	id: string;
	athlete_id: string;
	menstrual_cycle_id: string | null;
	log_date: string;
	phase: string | null;
	cycle_day: number | null;
	bleeding: string | null;
	menstrual_pain: number | null;
	energy: number | null;
	mood: number | null;
	sleep_quality: number | null;
	symptoms: string[] | null;
	notes: string | null;
};

type MenstrualCycle = {
	id: string;
	athlete_id: string;
	period_start_date: string;
	period_end_date: string | null;
	estimated_cycle_length_days: number | null;
	notes: string | null;
};

interface MenstrualCycleCardProps {
	menstrualLog: MenstrualLog | null;
	menstrualCycle: MenstrualCycle | null;
	menstrualError: string | null;
	menstrualLogErrorInfo?: {
		message?: string;
		code?: string;
		details?: string;
		hint?: string;
	} | null;
	menstrualCycleErrorInfo?: {
		message?: string;
		code?: string;
		details?: string;
		hint?: string;
	} | null;
}

function displayValue(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "boolean") return value ? "Si" : "No";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

function formatDate(dateValue: string | null | undefined): string {
	if (!dateValue) return "Sin registrar";
	const parsedDate = new Date(dateValue);
	if (Number.isNaN(parsedDate.getTime())) return "Sin registrar";
	return parsedDate.toLocaleDateString("es-ES");
}

function mapPhase(phase: string | null | undefined): string {
	if (!phase) return "Sin registrar";
	return formatTechnicalLabel(phase);
}

function mapBleeding(bleeding: string | null | undefined): string {
	if (!bleeding) return "Sin registrar";
	return formatTechnicalLabel(bleeding);
}

function normalizeSymptoms(symptoms: string[] | null | undefined): string[] {
	if (!symptoms || symptoms.length === 0) return [];
	return symptoms.filter((symptom) => typeof symptom === "string" && symptom.trim().length > 0);
}

function formatScaleValue(value: number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	return `${value}/10`;
}

function formatCycleLength(value: number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	return `${value} días`;
}

export function MenstrualCycleCard({
	menstrualLog,
	menstrualCycle,
	menstrualError,
	menstrualLogErrorInfo,
	menstrualCycleErrorInfo,
}: MenstrualCycleCardProps) {
	const symptoms = normalizeSymptoms(menstrualLog?.symptoms);
	const hasData = Boolean(menstrualLog || menstrualCycle);
	const showDevErrorDetails = process.env.NODE_ENV === "development";

	return (
		<article className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:col-span-2 md:p-8">
			<h3 className="text-xl font-bold tracking-tight text-[#0F2D2F] md:text-2xl">Ciclo menstrual</h3>
			<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">
				Contexto fisiológico reciente (autorregistro) para contrastar con el informe inicial de riesgo.
			</p>

			{menstrualError ? (
				<div className="mt-4 space-y-3">
					<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
						No se pudo cargar la informacion del ciclo menstrual.
					</p>
					{showDevErrorDetails && (
						<div className="rounded-lg border border-[#D9DDD8] bg-white p-3 text-xs text-[#5F6B6D]">
							<p className="font-semibold text-[#0F2D2F]">Detalle tecnico (solo desarrollo)</p>
							<div className="mt-2 space-y-1">
								<p><span className="text-[#5F6B6D]">menstrualLogError.message:</span> {displayValue(menstrualLogErrorInfo?.message)}</p>
								<p><span className="text-[#5F6B6D]">menstrualLogError.code:</span> {displayValue(menstrualLogErrorInfo?.code)}</p>
								<p><span className="text-[#5F6B6D]">menstrualLogError.details:</span> {displayValue(menstrualLogErrorInfo?.details)}</p>
								<p><span className="text-[#5F6B6D]">menstrualLogError.hint:</span> {displayValue(menstrualLogErrorInfo?.hint)}</p>
								<p><span className="text-[#5F6B6D]">menstrualCycleError.message:</span> {displayValue(menstrualCycleErrorInfo?.message)}</p>
								<p><span className="text-[#5F6B6D]">menstrualCycleError.code:</span> {displayValue(menstrualCycleErrorInfo?.code)}</p>
								<p><span className="text-[#5F6B6D]">menstrualCycleError.details:</span> {displayValue(menstrualCycleErrorInfo?.details)}</p>
								<p><span className="text-[#5F6B6D]">menstrualCycleError.hint:</span> {displayValue(menstrualCycleErrorInfo?.hint)}</p>
							</div>
						</div>
					)}
				</div>
			) : !hasData ? (
				<p className="mt-4 text-sm text-[#5F6B6D]">No hay registros recientes del ciclo menstrual.</p>
			) : (
				<>
					<div className="mt-4 flex flex-wrap gap-2">
						<span className="inline-flex items-center rounded-full border border-[#4E9B6E]/30 bg-[#D7EFE7]/60 px-2.5 py-1 text-xs font-medium text-[#0F5C63]">
							{mapPhase(menstrualLog?.phase)}
						</span>
						{symptoms.map((symptom) => (
							<span
								key={symptom}
								className="inline-flex items-center rounded-full border border-[#D9DDD8] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#5F6B6D]"
							>
								{symptom}
							</span>
						))}
					</div>

					<div className="mt-4 grid gap-2 text-sm text-[#0F2D2F]/90 md:grid-cols-2">
						<p><span className="text-[#5F6B6D]">Fase actual:</span> {displayValue(mapPhase(menstrualLog?.phase))}</p>
						<p><span className="text-[#5F6B6D]">Dia del ciclo:</span> {displayValue(menstrualLog?.cycle_day)}</p>
						<p><span className="text-[#5F6B6D]">Fecha del registro:</span> {formatDate(menstrualLog?.log_date)}</p>
						<p><span className="text-[#5F6B6D]">Sangrado:</span> {displayValue(mapBleeding(menstrualLog?.bleeding))}</p>
						<p><span className="text-[#5F6B6D]">Dolor menstrual:</span> {formatScaleValue(menstrualLog?.menstrual_pain)}</p>
						<p><span className="text-[#5F6B6D]">Energía:</span> {formatScaleValue(menstrualLog?.energy)}</p>
						<p><span className="text-[#5F6B6D]">Estado de ánimo:</span> {formatScaleValue(menstrualLog?.mood)}</p>
						<p><span className="text-[#5F6B6D]">Sueño:</span> {formatScaleValue(menstrualLog?.sleep_quality)}</p>
						<p className="md:col-span-2">
							<span className="text-[#5F6B6D]">Síntomas:</span> {symptoms.length > 0 ? symptoms.join(", ") : "Sin sintomas registrados."}
						</p>
						<p className="md:col-span-2"><span className="text-[#5F6B6D]">Notas del log:</span> {displayValue(menstrualLog?.notes)}</p>
						<p><span className="text-[#5F6B6D]">Inicio última menstruación:</span> {formatDate(menstrualCycle?.period_start_date)}</p>
						<p><span className="text-[#5F6B6D]">Fin última menstruación:</span> {formatDate(menstrualCycle?.period_end_date)}</p>
						<p>
							<span className="text-[#5F6B6D]">Duración estimada del ciclo:</span>{" "}
							{formatCycleLength(menstrualCycle?.estimated_cycle_length_days)}
						</p>
						<p className="md:col-span-2"><span className="text-[#5F6B6D]">Notas del ciclo:</span> {displayValue(menstrualCycle?.notes)}</p>
					</div>
				</>
			)}

			<p className="mt-4 rounded-lg border border-[#D9A441]/30 bg-[#D9A441]/10 px-3 py-2 text-xs leading-relaxed text-[#7A5A12]">
				Información orientativa para apoyar la interpretación del profesional. No sustituye valoración médica ni constituye por sí sola un
				diagnóstico.
			</p>
		</article>
	);
}
