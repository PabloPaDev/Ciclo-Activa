import { useEffect, useMemo, useState } from "react";
import type { AthletePainOverviewRow } from "@/types/pain";
import { FemaleBodyPainMap } from "@/components/athletes/FemaleBodyPainMap";
import { PainLegend } from "@/components/athletes/PainLegend";
import { PainReportList } from "@/components/athletes/PainReportList";
import {
	aggregateByZone,
	buildMappedPainEntries,
	formatPainSide,
	intensityStateLabel,
	type MappedPainEntry,
	type PainVisualZoneId,
	zoneLabel,
} from "@/lib/body-map";

interface PainMapSummaryProps {
	painItems: AthletePainOverviewRow[];
	hasError?: boolean;
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
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export function PainMapSummary({ painItems, hasError = false }: PainMapSummaryProps) {
	const [selectedZoneId, setSelectedZoneId] = useState<PainVisualZoneId | null>(null);
	const [selectedPainId, setSelectedPainId] = useState<string | null>(null);
	const [isExpandedOpen, setIsExpandedOpen] = useState(false);
	const mappedEntries = useMemo(
		() =>
			buildMappedPainEntries(painItems).sort((a, b) => {
				const aTime = a.item.reported_at ? new Date(a.item.reported_at).getTime() : 0;
				const bTime = b.item.reported_at ? new Date(b.item.reported_at).getTime() : 0;
				return bTime - aTime;
			}),
		[painItems],
	);
	const zoneAggregates = useMemo(() => aggregateByZone(mappedEntries), [mappedEntries]);
	const selectedZoneEntries = selectedZoneId ? zoneAggregates.get(selectedZoneId)?.entries ?? [] : [];
	const selectedPainEntry = selectedPainId ? mappedEntries.find((entry) => entry.id === selectedPainId) ?? null : null;
	const activeDetailEntries = selectedPainEntry ? [selectedPainEntry] : selectedZoneEntries;
	const resolveDetailZoneLabel = (entry: MappedPainEntry): string => {
		if (entry.primaryZoneId) return zoneLabel(entry.primaryZoneId);
		if (selectedZoneId) return zoneLabel(selectedZoneId);
		return displayValue(entry.item.body_area_name);
	};

	const handleSelectEntry = (entry: MappedPainEntry) => {
		setSelectedZoneId(entry.primaryZoneId);
		setSelectedPainId(entry.id);
	};

	const handleSelectZone = (zone: PainVisualZoneId | null, painId?: string | null) => {
		setSelectedZoneId(zone);
		setSelectedPainId(painId ?? null);
	};

	useEffect(() => {
		if (!isExpandedOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsExpandedOpen(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isExpandedOpen]);

	return (
		<section className="rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-6 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-8">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-xl font-bold tracking-tight text-[#0F2D2F] md:text-2xl">Mapa de molestias</h3>
					<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">Zonas reportadas por la atleta en sus ultimos registros.</p>
					<PainLegend />
				</div>
				<button
					type="button"
					onClick={() => setIsExpandedOpen(true)}
					className="inline-flex items-center rounded-xl border border-[#0F5C63] bg-white px-4 py-2 text-sm font-semibold text-[#0F5C63] transition hover:bg-[#D7EFE7]/50"
					aria-label="Abrir mapa corporal ampliado"
				>
					Ver mapa ampliado
				</button>
			</div>

			{hasError ? (
				<p className="mt-4 rounded-xl border border-[#D9A441]/35 bg-[#D9A441]/10 px-3 py-2 text-sm text-[#7A5A12]">
					No se pudieron cargar las molestias.
				</p>
			) : (
				<div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
					<div>
						<FemaleBodyPainMap
							entries={mappedEntries}
							selectedZone={selectedZoneId}
							selectedPainId={selectedPainId}
							onSelectZone={handleSelectZone}
						/>
						{painItems.length === 0 && (
							<p className="mt-3 text-sm text-slate-600">No hay molestias registradas en los ultimos reportes.</p>
						)}
					</div>

					<div className="space-y-4">
						<div className="rounded-xl border border-[#D9DDD8] bg-white p-4">
							<p className="text-sm font-semibold text-[#0F2D2F]">Detalle de zona</p>
							{!selectedZoneId ? (
								<p className="mt-2 text-sm text-slate-600">Selecciona una zona del cuerpo o una molestia para ver el detalle.</p>
							) : activeDetailEntries.length === 0 ? (
								<p className="mt-2 text-sm text-slate-600">No hay molestias asociadas a esta zona.</p>
							) : (
								<div className="mt-3 space-y-3">
									{activeDetailEntries.map((entry) => (
										<div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="font-medium text-slate-900">{resolveDetailZoneLabel(entry)}</p>
												<p className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
													{intensityStateLabel(entry.intensity)}
												</p>
											</div>
											<div className="mt-2 grid gap-1 sm:grid-cols-2">
												<p><span className="text-slate-500">Lado:</span> {formatPainSide(entry.side)}</p>
												<p><span className="text-slate-500">Intensidad:</span> {displayValue(entry.intensity)}</p>
												<p><span className="text-slate-500">Tipo:</span> {displayValue(entry.item.pain_type)}</p>
												<p>
													<span className="text-slate-500">Afecta al entrenamiento:</span>{" "}
													{entry.item.affects_training === null ? "Sin registrar" : entry.item.affects_training ? "Si" : "No"}
												</p>
												<p><span className="text-slate-500">Fecha:</span> {formatDate(entry.item.reported_at)}</p>
												<p><span className="text-slate-500">Nivel general:</span> {displayValue(entry.item.general_pain_level)}</p>
											</div>
											<p className="mt-2">
												<span className="text-slate-500">Descripcion:</span> {displayValue(entry.item.description)}
											</p>
										</div>
									))}
								</div>
							)}
						</div>

						<PainReportList
							entries={mappedEntries}
							selectedZone={selectedZoneId}
							selectedPainId={selectedPainId}
							onSelectEntry={handleSelectEntry}
						/>
					</div>
				</div>
			)}

			{isExpandedOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							setIsExpandedOpen(false);
						}
					}}
				>
					<div className="max-h-[95vh] w-full max-w-7xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
						<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
							<div>
								<h4 className="text-lg font-semibold text-slate-900">Mapa corporal de molestias</h4>
								<p className="mt-1 text-sm text-slate-600">Visualizacion ampliada para revisar zonas con mayor detalle.</p>
								<PainLegend />
							</div>
							<button
								type="button"
								onClick={() => setIsExpandedOpen(false)}
								className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								aria-label="Cerrar mapa ampliado"
							>
								Cerrar
							</button>
						</div>

						<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
							<div>
								<FemaleBodyPainMap
									entries={mappedEntries}
									selectedZone={selectedZoneId}
									selectedPainId={selectedPainId}
									onSelectZone={handleSelectZone}
									size="large"
								/>
								{painItems.length === 0 && (
									<p className="mt-3 text-sm text-slate-600">No hay molestias registradas en los ultimos reportes.</p>
								)}
							</div>

							<div className="space-y-4">
								<div className="rounded-xl border border-[#D9DDD8] bg-white p-4">
									<p className="text-sm font-semibold text-[#0F2D2F]">Detalle de zona</p>
									{!selectedZoneId ? (
										<p className="mt-2 text-sm text-slate-600">Selecciona una zona del cuerpo o una molestia para ver el detalle.</p>
									) : activeDetailEntries.length === 0 ? (
										<p className="mt-2 text-sm text-slate-600">No hay molestias asociadas a esta zona.</p>
									) : (
										<div className="mt-3 space-y-3">
											{activeDetailEntries.map((entry) => (
												<div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<p className="font-medium text-slate-900">{resolveDetailZoneLabel(entry)}</p>
														<p className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs">
															{intensityStateLabel(entry.intensity)}
														</p>
													</div>
													<div className="mt-2 grid gap-1 sm:grid-cols-2">
														<p><span className="text-slate-500">Lado:</span> {formatPainSide(entry.side)}</p>
														<p><span className="text-slate-500">Intensidad:</span> {displayValue(entry.intensity)}</p>
														<p><span className="text-slate-500">Tipo:</span> {displayValue(entry.item.pain_type)}</p>
														<p>
															<span className="text-slate-500">Afecta al entrenamiento:</span>{" "}
															{entry.item.affects_training === null ? "Sin registrar" : entry.item.affects_training ? "Si" : "No"}
														</p>
														<p><span className="text-slate-500">Fecha:</span> {formatDate(entry.item.reported_at)}</p>
														<p><span className="text-slate-500">Nivel general:</span> {displayValue(entry.item.general_pain_level)}</p>
													</div>
													<p className="mt-2">
														<span className="text-slate-500">Descripcion:</span> {displayValue(entry.item.description)}
													</p>
												</div>
											))}
										</div>
									)}
								</div>

								<PainReportList
									entries={mappedEntries}
									selectedZone={selectedZoneId}
									selectedPainId={selectedPainId}
									onSelectEntry={handleSelectEntry}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
