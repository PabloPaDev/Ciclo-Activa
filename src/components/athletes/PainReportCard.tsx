import type { MappedPainEntry } from "@/lib/body-map";
import { formatPainSide, intensityStateLabel, zoneLabel } from "@/lib/body-map";

interface PainReportCardProps {
	entry: MappedPainEntry;
	selected: boolean;
	onClick: () => void;
}

function displayValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "Sin registrar";
	if (typeof value === "string" && value.trim().length === 0) return "Sin registrar";
	return String(value);
}

function formatDate(dateValue: string | null): string {
	if (!dateValue) return "Sin registrar";
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) return "Sin registrar";
	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

function shortDescription(text: string | null): string {
	if (!text || text.trim().length === 0) return "Sin descripcion";
	return text.length > 88 ? `${text.slice(0, 88)}...` : text;
}

export function PainReportCard({ entry, selected, onClick }: PainReportCardProps) {
	const primaryZone = entry.primaryZoneId;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full rounded-lg border p-3 text-left shadow-sm transition ${
				selected ? "border-teal-600 bg-teal-50 shadow-teal-100" : "border-slate-200 bg-slate-50 hover:border-slate-300"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<h4 className="text-sm font-semibold text-slate-900">{primaryZone ? zoneLabel(primaryZone) : displayValue(entry.item.body_area_name)}</h4>
				<span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
					{intensityStateLabel(entry.intensity)} ({displayValue(entry.intensity)})
				</span>
			</div>

			<div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
				<p>Lado: {formatPainSide(entry.side)}</p>
				<p>Tipo: {displayValue(entry.item.pain_type)}</p>
				<p>Fecha: {formatDate(entry.item.reported_at)}</p>
				<p>Afecta al entrenamiento: {entry.item.affects_training === null ? "Sin registrar" : entry.item.affects_training ? "Si" : "No"}</p>
			</div>

			<p className="mt-2 text-xs text-slate-600">{shortDescription(entry.item.description)}</p>
		</button>
	);
}
