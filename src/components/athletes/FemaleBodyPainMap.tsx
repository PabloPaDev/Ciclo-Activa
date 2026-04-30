import { useEffect, useMemo, useState } from "react";
import type { MappedPainEntry, PainVisualZoneId, ZoneAggregate } from "@/lib/body-map";
import { aggregateByZone, formatPainSide, zoneLabel } from "@/lib/body-map";

interface FemaleBodyPainMapProps {
	entries: MappedPainEntry[];
	selectedZone: PainVisualZoneId | null;
	selectedPainId?: string | null;
	onSelectZone: (zone: PainVisualZoneId | null, painId?: string | null) => void;
	size?: "normal" | "large";
}

type MapView = "front" | "back";
const SHOW_BODY_OVERLAYS = false;

interface ShapeDef {
	zone: PainVisualZoneId;
	view: MapView;
	d: string;
}

const shapes: ShapeDef[] = [
	{ zone: "head", view: "front", d: "M130 22c16 0 28 12 28 28s-12 28-28 28-28-12-28-28 12-28 28-28z" },
	{ zone: "head", view: "back", d: "M130 22c16 0 28 12 28 28s-12 28-28 28-28-12-28-28 12-28 28-28z" },
	{ zone: "neck", view: "front", d: "M118 80c4 3 8 4 12 4s8-1 12-4v18h-24z" },
	{ zone: "neck", view: "back", d: "M118 80c4 3 8 4 12 4s8-1 12-4v18h-24z" },
	{ zone: "shoulder_left", view: "front", d: "M101 94C96 97 92 101 90 107C90 112 93 116 97 119C102 120 106 117 109 113C109 108 106 102 102 97C102 96 101 95 101 94z" },
	{ zone: "shoulder_right", view: "front", d: "M169 102C177 106 183 113 184 122C182 130 176 136 168 138C159 138 151 133 147 126C149 116 155 107 163 102C165 101 167 101 169 102z" },
	{ zone: "shoulder_left", view: "back", d: "M81 101C77 104 73 108 72 113C73 118 76 122 80 124C84 125 88 122 90 117C90 112 87 107 84 103C83 102 82 101 81 101z" },
	{ zone: "shoulder_right", view: "back", d: "M168 100C176 103 182 109 184 118C183 126 177 133 169 135C160 136 152 132 147 124C148 114 154 105 162 101C164 100 166 100 168 100z" },
	{ zone: "upper_back", view: "back", d: "M101 114C112 108 124 106 130 106C136 106 148 108 159 114C164 121 165 132 162 141C154 149 143 153 130 153C117 153 106 149 98 141C95 132 96 121 101 114z" },
	{ zone: "lower_back", view: "back", d: "M104 188C112 184 121 183 130 183C139 183 148 184 156 188C160 197 160 208 157 218C149 226 140 230 130 230C120 230 111 226 103 218C100 208 100 197 104 188z" },
	{ zone: "upper_arm_left", view: "front", d: "M57 114c7-2 13 0 18 4-1 15-1 27 0 40-5 3-10 3-15 1-4-13-5-29-3-45z" },
	{ zone: "upper_arm_right", view: "front", d: "M203 114c2 16 1 32-3 45-5 2-10 2-15-1 1-13 1-25 0-40 5-4 11-6 18-4z" },
	{ zone: "upper_arm_left", view: "back", d: "M57 114c7-2 13 0 18 4-1 15-1 27 0 40-5 3-10 3-15 1-4-13-5-29-3-45z" },
	{ zone: "upper_arm_right", view: "back", d: "M203 114c2 16 1 32-3 45-5 2-10 2-15-1 1-13 1-25 0-40 5-4 11-6 18-4z" },
	{ zone: "forearm_left", view: "front", d: "M60 158c5-2 10-2 15 0 1 12 1 22 0 31-5 2-10 2-15 0-1-10-1-20 0-31z" },
	{ zone: "forearm_right", view: "front", d: "M185 158c5-2 10-2 15 0 1 11 1 21 0 31-5 2-10 2-15 0-1-9-1-19 0-31z" },
	{ zone: "forearm_left", view: "back", d: "M60 158c5-2 10-2 15 0 1 12 1 22 0 31-5 2-10 2-15 0-1-10-1-20 0-31z" },
	{ zone: "forearm_right", view: "back", d: "M185 158c5-2 10-2 15 0 1 11 1 21 0 31-5 2-10 2-15 0-1-9-1-19 0-31z" },
	{ zone: "elbow_left", view: "front", d: "M60 190c5-2 10-2 15 0v12c-5 2-10 2-15 0z" },
	{ zone: "elbow_right", view: "front", d: "M185 190c5-2 10-2 15 0v12c-5 2-10 2-15 0z" },
	{ zone: "elbow_left", view: "back", d: "M60 190c5-2 10-2 15 0v12c-5 2-10 2-15 0z" },
	{ zone: "elbow_right", view: "back", d: "M185 190c5-2 10-2 15 0v12c-5 2-10 2-15 0z" },
	{ zone: "wrist_left", view: "front", d: "M63 202c4-1 8-1 11 0v8c-3 1-7 1-11 0z" },
	{ zone: "wrist_right", view: "front", d: "M186 202c3-1 7-1 11 0v8c-4 1-8 1-11 0z" },
	{ zone: "wrist_left", view: "back", d: "M63 202c4-1 8-1 11 0v8c-3 1-7 1-11 0z" },
	{ zone: "wrist_right", view: "back", d: "M186 202c3-1 7-1 11 0v8c-4 1-8 1-11 0z" },
	{ zone: "hand_left", view: "front", d: "M56 210c7-2 14-2 21 0v19c-7 3-14 3-21 0z" },
	{ zone: "hand_right", view: "front", d: "M183 210c7-2 14-2 21 0v19c-7 3-14 3-21 0z" },
	{ zone: "hand_left", view: "back", d: "M56 210c7-2 14-2 21 0v19c-7 3-14 3-21 0z" },
	{ zone: "hand_right", view: "back", d: "M183 210c7-2 14-2 21 0v19c-7 3-14 3-21 0z" },
	{ zone: "hip_left", view: "front", d: "M91 224C98 228 106 230 115 231C118 239 117 246 113 252C104 252 96 249 89 244C87 237 88 230 91 224z" },
	{ zone: "hip_right", view: "front", d: "M169 224C162 228 154 230 145 231C142 239 143 246 147 252C156 252 164 249 171 244C173 237 172 230 169 224z" },
	{ zone: "hip_left", view: "back", d: "M92 223C99 227 107 229 116 230C119 238 118 246 114 252C104 252 96 248 90 242C88 236 89 229 92 223z" },
	{ zone: "hip_right", view: "back", d: "M168 223C161 227 153 229 144 230C141 238 142 246 146 252C156 252 164 248 170 242C172 236 171 229 168 223z" },
	{ zone: "glute_left", view: "back", d: "M97 230C106 236 114 239 121 240C124 249 123 259 118 267C109 266 101 261 95 254C93 246 94 237 97 230z" },
	{ zone: "glute_right", view: "back", d: "M163 230C154 236 146 239 139 240C136 249 137 259 142 267C151 266 159 261 165 254C167 246 166 237 163 230z" },
	{ zone: "quad_left", view: "front", d: "M101 254C108 258 115 260 122 260C126 280 125 300 120 321C114 324 107 324 101 321C96 301 95 281 101 254z" },
	{ zone: "quad_right", view: "front", d: "M159 254C152 258 145 260 138 260C134 280 135 300 140 321C146 324 153 324 159 321C164 301 165 281 159 254z" },
	{ zone: "hamstring_left", view: "back", d: "M101 254C108 258 115 260 122 260C126 280 126 302 121 324C115 327 108 327 102 324C97 302 96 280 101 254z" },
	{ zone: "hamstring_right", view: "back", d: "M159 254C152 258 145 260 138 260C134 280 134 302 139 324C145 327 152 327 158 324C163 302 164 280 159 254z" },
	{ zone: "knee_left", view: "front", d: "M103 323C109 321 115 321 120 323C123 328 123 335 119 339C113 341 108 341 103 339C99 335 99 328 103 323z" },
	{ zone: "knee_right", view: "front", d: "M140 323C145 321 151 321 157 323C161 328 161 335 157 339C152 341 146 341 140 339C137 335 137 328 140 323z" },
	{ zone: "knee_left", view: "back", d: "M103 326C109 324 115 324 120 326C123 330 123 336 119 340C113 342 108 342 103 340C100 336 100 330 103 326z" },
	{ zone: "knee_right", view: "back", d: "M140 326C145 324 151 324 157 326C160 330 160 336 157 340C151 342 146 342 140 340C137 336 137 330 140 326z" },
	{ zone: "shin_left", view: "front", d: "M98 333c6-2 12-2 17 0 4 13 3 24 0 34-5 2-10 2-15 0-4-10-5-20-2-34z" },
	{ zone: "shin_right", view: "front", d: "M145 333c5-2 11-2 17 0 3 13 2 24-2 34-5 2-10 2-15 0-3-10-4-20 0-34z" },
	{ zone: "calf_left", view: "back", d: "M103 338C108 334 114 333 119 336C124 343 126 354 123 365C120 372 114 376 108 375C103 370 100 361 101 350C101 345 102 341 103 338z" },
	{ zone: "calf_right", view: "back", d: "M157 338C152 334 146 333 141 336C136 343 134 354 137 365C140 372 146 376 152 375C157 370 160 361 159 350C159 345 158 341 157 338z" },
	{ zone: "achilles_left", view: "back", d: "M103 389c3-1 6-1 9 0v13c-3 1-6 1-9 0z" },
	{ zone: "achilles_right", view: "back", d: "M148 389c3-1 6-1 9 0v13c-3 1-6 1-9 0z" },
	{ zone: "ankle_left", view: "front", d: "M103 388C108 386 113 386 117 388C118 392 117 397 113 400C109 401 105 401 102 398C101 394 101 391 103 388z" },
	{ zone: "ankle_right", view: "front", d: "M157 388C152 386 147 386 143 388C142 392 143 397 147 400C151 401 155 401 158 398C159 394 159 391 157 388z" },
	{ zone: "ankle_left", view: "back", d: "M103 389C108 387 113 387 117 389C118 393 117 398 113 401C109 402 105 402 102 399C101 395 101 392 103 389z" },
	{ zone: "ankle_right", view: "back", d: "M157 389C152 387 147 387 143 389C142 393 143 398 147 401C151 402 155 402 158 399C159 395 159 392 157 389z" },
	{ zone: "foot_left", view: "front", d: "M88 403C98 399 110 399 121 402C123 407 121 412 116 415C106 416 95 416 87 413C85 409 86 406 88 403z" },
	{ zone: "foot_right", view: "front", d: "M172 403C162 399 150 399 139 402C137 407 139 412 144 415C154 416 165 416 173 413C175 409 174 406 172 403z" },
	{ zone: "foot_left", view: "back", d: "M88 404C98 401 110 401 120 404C122 409 120 413 115 416C105 417 95 417 87 414C85 410 86 407 88 404z" },
	{ zone: "foot_right", view: "back", d: "M172 404C162 401 150 401 140 404C138 409 140 413 145 416C155 417 165 417 173 414C175 410 174 407 172 404z" },
];

const bodyOutlines: Record<MapView, string> = {
	front:
		"M130 20c16 0 29 13 29 31 0 9-3 18-9 24l-2 17c16 1 28 7 37 17 10 12 15 30 15 54 0 21 1 39 4 56l-7 19-15 5-8-24v-26l-3-5c-9 5-19 7-31 8v17c7 4 13 11 17 21 6 13 8 30 8 49 0 19-1 36-5 49-3 10-11 16-20 16s-17-6-20-16c-4-13-5-30-5-49 0-19 2-36 8-49 4-10 10-17 17-21v-17c-12-1-22-3-31-8l-3 5v26l-8 24-15-5-7-19c3-17 4-35 4-56 0-24 5-42 15-54 9-10 21-16 37-17l-2-17c-6-6-9-15-9-24 0-18 13-31 29-31z",
	back:
		"M130 20c16 0 29 13 29 31 0 9-3 18-9 24l-2 17c16 1 28 7 37 17 10 12 15 30 15 54 0 21 1 39 4 56l-7 19-15 5-8-24v-26l-3-5c-9 5-19 7-31 8v17c7 4 13 11 17 21 6 13 8 30 8 49 0 19-1 36-5 49-3 10-11 16-20 16s-17-6-20-16c-4-13-5-30-5-49 0-19 2-36 8-49 4-10 10-17 17-21v-17c-12-1-22-3-31-8l-3 5v26l-8 24-15-5-7-19c3-17 4-35 4-56 0-24 5-42 15-54 9-10 21-16 37-17l-2-17c-6-6-9-15-9-24 0-18 13-31 29-31z",
};

function sanitizeReferenceSvgInner(svgText: string): string | null {
	const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
	const rawInner = innerMatch?.[1] ?? "";
	if (!rawInner) return null;

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${rawInner}</svg>`, "image/svg+xml");
		const rects = Array.from(doc.querySelectorAll("rect"));
		for (const rect of rects) {
			const width = rect.getAttribute("width")?.trim() ?? "";
			const height = rect.getAttribute("height")?.trim() ?? "";
			const x = rect.getAttribute("x")?.trim() ?? "";
			const y = rect.getAttribute("y")?.trim() ?? "";
			const fill = (rect.getAttribute("fill") ?? "").toLowerCase();
			const looksLikeBackground =
				(x === "0" || x === "") &&
				(y === "0" || y === "") &&
				(width === "100%" || width === "1254") &&
				(height === "100%" || height === "1254");
			if (looksLikeBackground || fill === "#f8fafc" || fill === "rgb(248,250,252)") {
				rect.remove();
			}
		}
		return doc.documentElement.innerHTML || rawInner;
	} catch {
		return rawInner
			.replace(/<rect[^>]*\/>\s*/gi, "")
			.replace(/<rect[^>]*>[\s\S]*?<\/rect>\s*/gi, "");
	}
}

function zoneFill(aggregate: ZoneAggregate | undefined, selected: boolean, hovered: boolean): string {
	if (!aggregate && !selected && !hovered) return "transparent";
	if (selected || hovered) return "#0f766e";
	if (!aggregate || aggregate.severity === "none") return "transparent";
	if (aggregate.severity === "low") return "#facc15";
	if (aggregate.severity === "medium") return "#f97316";
	return "#dc2626";
}

function zoneStroke(hasData: boolean, selected: boolean, hovered: boolean): string {
	if (selected || hovered) return "#0f766e";
	if (hasData) return "#cbd5e1";
	return "transparent";
}

function BodyViewSvg({
	view,
	selectedZone,
	hoveredZone,
	zoneMap,
	onHover,
	onLeave,
	onClick,
	svgClassName,
	referenceSvgInner,
	showOverlays,
}: {
	view: MapView;
	selectedZone: PainVisualZoneId | null;
	hoveredZone: PainVisualZoneId | null;
	zoneMap: Map<PainVisualZoneId, ZoneAggregate>;
	onHover: (zone: PainVisualZoneId, x: number, y: number) => void;
	onLeave: () => void;
	onClick: (zone: PainVisualZoneId | null, painId?: string | null) => void;
	svgClassName: string;
	referenceSvgInner: string | null;
	showOverlays: boolean;
}) {
	const viewShapes = shapes.filter((shape) => shape.view === view);
	const referenceScaleY = 470 / 1254;
	const sourceWindow = view === "front" ? { x: 72, width: 520 } : { x: 662, width: 520 };
	const sourceScaleX = 260 / sourceWindow.width;
	return (
		<div className="rounded-lg border border-slate-200 bg-white p-3">
			<p className="mb-2 text-center text-xs font-medium text-slate-600">{view === "front" ? "Vista frontal" : "Vista posterior"}</p>
			<svg viewBox="0 0 260 470" className={svgClassName}>
				<g id={`${view}-view`}>
					{referenceSvgInner ? (
						<g transform={`scale(${sourceScaleX} ${referenceScaleY})`}>
							<g transform={`translate(${-sourceWindow.x} 0)`}>
								<g dangerouslySetInnerHTML={{ __html: referenceSvgInner }} />
							</g>
						</g>
					) : (
						<path d={bodyOutlines[view]} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.5} />
					)}
				</g>
				{showOverlays &&
					viewShapes.map((shape) => {
					const aggregate = zoneMap.get(shape.zone);
					const hasData = Boolean(aggregate && aggregate.entries.length > 0);
					const selected = selectedZone === shape.zone;
					const hovered = hoveredZone === shape.zone;
					const topEntry = aggregate?.entries?.slice().sort((a, b) => (b.intensity ?? -1) - (a.intensity ?? -1))[0] ?? null;
						return (
							<path
								id={shape.zone}
								key={`${view}-${shape.zone}-${shape.d}`}
								d={shape.d}
								fill={zoneFill(aggregate, selected, hovered)}
								stroke={zoneStroke(hasData, selected, hovered)}
								strokeWidth={selected ? 2.5 : hovered ? 2 : 1.5}
								strokeOpacity={selected || hovered || hasData ? 0.75 : 0}
								fillOpacity={selected || hovered ? 0.45 : aggregate ? 0.32 : 0}
								pointerEvents="all"
								aria-label={`Zona ${shape.zone}`}
								className="cursor-pointer transition"
								onMouseEnter={(event) => {
									onHover(shape.zone, event.clientX, event.clientY);
								}}
								onMouseMove={(event) => {
									onHover(shape.zone, event.clientX, event.clientY);
								}}
								onMouseLeave={onLeave}
								onClick={() => {
									onClick(shape.zone, topEntry?.id ?? null);
								}}
							/>
						);
					})}
			</svg>
		</div>
	);
}

export function FemaleBodyPainMap({ entries, selectedZone, onSelectZone, size = "normal" }: FemaleBodyPainMapProps) {
	const [mobileView, setMobileView] = useState<MapView>("front");
	const [hoveredZone, setHoveredZone] = useState<PainVisualZoneId | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
	const [referenceSvgInner, setReferenceSvgInner] = useState<string | null>(null);

	const zoneMap = useMemo(() => aggregateByZone(entries), [entries]);
	const activeZone = hoveredZone ?? selectedZone;
	const activeEntries = activeZone ? zoneMap.get(activeZone)?.entries ?? [] : [];
	const topEntry = activeEntries.slice().sort((a, b) => (b.intensity ?? -1) - (a.intensity ?? -1))[0];

	const handleHover = (zone: PainVisualZoneId, x: number, y: number) => {
		setHoveredZone(zone);
		setTooltipPosition({ x, y });
	};

	const handleLeave = () => {
		setHoveredZone(null);
		setTooltipPosition(null);
	};

	useEffect(() => {
		const loadReferenceSvg = async () => {
			try {
				const response = await fetch("/references/female-body-muscle-reference.vector.svg");
				const svgText = await response.text();
				setReferenceSvgInner(sanitizeReferenceSvgInner(svgText));
			} catch {
				setReferenceSvgInner(null);
			}
		};

		void loadReferenceSvg();
	}, []);

	const svgClassName = size === "large" ? "mx-auto h-[520px] w-full max-w-[340px]" : "mx-auto h-[400px] w-full max-w-[260px]";

	return (
		<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
			<div className="mb-3 flex items-center justify-between md:hidden">
				<button
					type="button"
					onClick={() => setMobileView("front")}
					className={`rounded-md px-3 py-1 text-xs font-medium ${mobileView === "front" ? "bg-teal-600 text-white" : "bg-white text-slate-700"}`}
				>
					Frontal
				</button>
				<button
					type="button"
					onClick={() => setMobileView("back")}
					className={`rounded-md px-3 py-1 text-xs font-medium ${mobileView === "back" ? "bg-teal-600 text-white" : "bg-white text-slate-700"}`}
				>
					Posterior
				</button>
			</div>

			<div className="hidden gap-3 md:grid md:grid-cols-2">
				<BodyViewSvg
					view="front"
					selectedZone={selectedZone}
					hoveredZone={hoveredZone}
					zoneMap={zoneMap}
					onHover={handleHover}
					onLeave={handleLeave}
					onClick={onSelectZone}
					svgClassName={svgClassName}
					referenceSvgInner={referenceSvgInner}
					showOverlays={SHOW_BODY_OVERLAYS}
				/>
				<BodyViewSvg
					view="back"
					selectedZone={selectedZone}
					hoveredZone={hoveredZone}
					zoneMap={zoneMap}
					onHover={handleHover}
					onLeave={handleLeave}
					onClick={onSelectZone}
					svgClassName={svgClassName}
					referenceSvgInner={referenceSvgInner}
					showOverlays={SHOW_BODY_OVERLAYS}
				/>
			</div>

			<div className="md:hidden">
				<BodyViewSvg
					view={mobileView}
					selectedZone={selectedZone}
					hoveredZone={hoveredZone}
					zoneMap={zoneMap}
					onHover={handleHover}
					onLeave={handleLeave}
					onClick={onSelectZone}
					svgClassName={svgClassName}
					referenceSvgInner={referenceSvgInner}
					showOverlays={SHOW_BODY_OVERLAYS}
				/>
			</div>

			<p className="mt-3 text-xs text-slate-500">
				Visualizacion anatomica de referencia. El resaltado interactivo por zonas se incorporara en la siguiente iteracion.
			</p>

			{SHOW_BODY_OVERLAYS && hoveredZone && topEntry && tooltipPosition && (
				<div
					className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow"
					style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
				>
					<p className="font-medium">{zoneLabel(hoveredZone)}</p>
					<p>Lado: {formatPainSide(topEntry.side)}</p>
					<p>Intensidad: {topEntry.intensity ?? "Sin registrar"}</p>
					<p>Tipo: {topEntry.item.pain_type ?? "Sin registrar"}</p>
				</div>
			)}
		</div>
	);
}
