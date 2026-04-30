import type { AthletePainOverviewRow } from "@/types/pain";

export type BodyMapView = "front" | "back";
export type PainSide = "left" | "right" | "bilateral" | "central";
export type PainSeverity = "none" | "low" | "medium" | "high";
export type PainVisualZoneId =
	| "head"
	| "neck"
	| "shoulder_left"
	| "shoulder_right"
	| "chest"
	| "abdomen"
	| "oblique_left"
	| "oblique_right"
	| "upper_back"
	| "mid_back"
	| "lower_back"
	| "hip_left"
	| "hip_right"
	| "glute_left"
	| "glute_right"
	| "upper_arm_left"
	| "upper_arm_right"
	| "forearm_left"
	| "forearm_right"
	| "elbow_left"
	| "elbow_right"
	| "wrist_left"
	| "wrist_right"
	| "hand_left"
	| "hand_right"
	| "quad_left"
	| "quad_right"
	| "hamstring_left"
	| "hamstring_right"
	| "knee_left"
	| "knee_right"
	| "calf_left"
	| "calf_right"
	| "shin_left"
	| "shin_right"
	| "achilles_left"
	| "achilles_right"
	| "ankle_left"
	| "ankle_right"
	| "foot_left"
	| "foot_right";

export interface MappedPainEntry {
	id: string;
	item: AthletePainOverviewRow;
	zones: PainVisualZoneId[];
	primaryZoneId: PainVisualZoneId | null;
	side: PainSide;
	intensity: number | null;
	severity: PainSeverity;
}

export interface ZoneAggregate {
	entries: MappedPainEntry[];
	maxIntensity: number | null;
	severity: PainSeverity;
}

function toSearchText(item: AthletePainOverviewRow): string {
	return [item.body_area_code, item.body_area_name, item.body_region, item.pain_type]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function normalizeAreaCode(code: string | null): string {
	return (code ?? "")
		.toLowerCase()
		.trim()
		.replace(/[\s-]+/g, "_");
}

function resolveFromCode(code: string, side: PainSide): PainVisualZoneId[] {
	const explicitRight = code.endsWith("_right") || code.endsWith("_r") || code === "right_knee" || code === "right_calf";
	const explicitLeft = code.endsWith("_left") || code.endsWith("_l") || code === "left_knee" || code === "left_calf";
	const base = code.replace(/_(left|right|l|r)$/, "").replace(/^(left|right)_/, "");

	if (base === "knee") {
		if (explicitLeft) return ["knee_left"];
		if (explicitRight) return ["knee_right"];
		return mapWithSide(side, "knee_left", "knee_right");
	}
	if (base === "calf" || base === "gemelo" || base === "pantorrilla") {
		if (explicitLeft) return ["calf_left"];
		if (explicitRight) return ["calf_right"];
		return mapWithSide(side, "calf_left", "calf_right");
	}
	if (base === "quad" || base === "quadriceps") {
		if (explicitLeft) return ["quad_left"];
		if (explicitRight) return ["quad_right"];
		return mapWithSide(side, "quad_left", "quad_right");
	}
	if (base === "hamstring") {
		if (explicitLeft) return ["hamstring_left"];
		if (explicitRight) return ["hamstring_right"];
		return mapWithSide(side, "hamstring_left", "hamstring_right");
	}
	if (base === "shoulder" || base === "hombro") {
		if (explicitLeft) return ["shoulder_left"];
		if (explicitRight) return ["shoulder_right"];
		return mapWithSide(side, "shoulder_left", "shoulder_right");
	}
	if (base === "ankle") {
		if (explicitLeft) return ["ankle_left"];
		if (explicitRight) return ["ankle_right"];
		return mapWithSide(side, "ankle_left", "ankle_right");
	}
	if (base === "foot") {
		if (explicitLeft) return ["foot_left"];
		if (explicitRight) return ["foot_right"];
		return mapWithSide(side, "foot_left", "foot_right");
	}
	if (base === "lumbar" || base === "lower_back") return ["lower_back"];
	return [];
}

export function normalizePainSide(side: string | null): PainSide {
	const value = side?.toLowerCase() ?? "";
	if (value.includes("left") || value.includes("izq")) return "left";
	if (value.includes("right") || value.includes("der")) return "right";
	if (value.includes("both") || value.includes("bilat") || value.includes("amb")) return "bilateral";
	if (value.includes("central") || value.includes("center") || value.includes("medio")) return "central";
	return "central";
}

export function intensityLevel(intensity: number | null): PainSeverity {
	if (intensity === null || intensity === undefined) return "none";
	if (intensity >= 7) return "high";
	if (intensity >= 4) return "medium";
	return "low";
}

export function intensityStateLabel(intensity: number | null): string {
	const level = intensityLevel(intensity);
	if (level === "high") return "Alta";
	if (level === "medium") return "Moderada";
	if (level === "low") return "Leve";
	return "Sin registrar";
}

export function formatPainSide(side: PainSide): string {
	if (side === "left") return "izquierda";
	if (side === "right") return "derecha";
	if (side === "bilateral") return "ambos";
	return "central";
}

const zoneLabels: Record<PainVisualZoneId, string> = {
	head: "Cabeza",
	neck: "Cuello",
	shoulder_left: "Hombro izquierdo",
	shoulder_right: "Hombro derecho",
	chest: "Pecho",
	abdomen: "Abdomen",
	oblique_left: "Oblicuo izquierdo",
	oblique_right: "Oblicuo derecho",
	upper_back: "Espalda alta",
	mid_back: "Espalda media",
	lower_back: "Lumbar",
	hip_left: "Cadera izquierda",
	hip_right: "Cadera derecha",
	glute_left: "Gluteo izquierdo",
	glute_right: "Gluteo derecho",
	upper_arm_left: "Brazo izquierdo",
	upper_arm_right: "Brazo derecho",
	forearm_left: "Antebrazo izquierdo",
	forearm_right: "Antebrazo derecho",
	elbow_left: "Codo izquierdo",
	elbow_right: "Codo derecho",
	wrist_left: "Muneca izquierda",
	wrist_right: "Muneca derecha",
	hand_left: "Mano izquierda",
	hand_right: "Mano derecha",
	quad_left: "Cuadriceps izquierdo",
	quad_right: "Cuadriceps derecho",
	hamstring_left: "Isquio izquierdo",
	hamstring_right: "Isquio derecho",
	knee_left: "Rodilla izquierda",
	knee_right: "Rodilla derecha",
	calf_left: "Gemelo izquierdo",
	calf_right: "Gemelo derecho",
	shin_left: "Tibia izquierda",
	shin_right: "Tibia derecha",
	achilles_left: "Aquiles izquierdo",
	achilles_right: "Aquiles derecho",
	ankle_left: "Tobillo izquierdo",
	ankle_right: "Tobillo derecho",
	foot_left: "Pie izquierdo",
	foot_right: "Pie derecho",
};

export function zoneLabel(zone: PainVisualZoneId): string {
	return zoneLabels[zone];
}

function mapWithSide(side: PainSide, left: PainVisualZoneId, right: PainVisualZoneId): PainVisualZoneId[] {
	if (side === "left") return [left];
	if (side === "right") return [right];
	if (side === "bilateral") return [left, right];
	return [left, right];
}

function resolvePainZones(item: AthletePainOverviewRow, side: PainSide): PainVisualZoneId[] {
	const code = normalizeAreaCode(item.body_area_code);
	const text = toSearchText(item);
	const codeZones = resolveFromCode(code, side);
	if (codeZones.length > 0) return codeZones;

	if (text.includes("head") || text.includes("cabeza") || text.includes("skull")) return ["head"];
	if (text.includes("neck") || text.includes("cuello") || text.includes("cervical")) return ["neck"];
	if (text.includes("shoulder") || text.includes("hombro")) return mapWithSide(side, "shoulder_left", "shoulder_right");
	if (text.includes("chest") || text.includes("pecho") || text.includes("pectoral")) return ["chest"];
	if (text.includes("oblique") || text.includes("oblic")) return mapWithSide(side, "oblique_left", "oblique_right");
	if (text.includes("abdomen") || text.includes("abdominal") || text.includes("core")) return ["abdomen"];
	if (text.includes("upper_back") || text.includes("espalda alta") || text.includes("dorsal")) return ["upper_back"];
	if (text.includes("mid_back") || text.includes("espalda media")) return ["mid_back"];
	if (text.includes("hip") || text.includes("cadera")) return mapWithSide(side, "hip_left", "hip_right");
	if (text.includes("glute") || text.includes("gluteo")) return mapWithSide(side, "glute_left", "glute_right");
	if (text.includes("elbow") || text.includes("codo")) return mapWithSide(side, "elbow_left", "elbow_right");
	if (text.includes("wrist") || text.includes("muneca") || text.includes("muñeca")) return mapWithSide(side, "wrist_left", "wrist_right");
	if (text.includes("hand") || text.includes("mano")) return mapWithSide(side, "hand_left", "hand_right");
	if (text.includes("forearm") || text.includes("antebrazo")) return mapWithSide(side, "forearm_left", "forearm_right");
	if (text.includes("arm") || text.includes("brazo") || text.includes("bicep") || text.includes("tricep")) {
		return mapWithSide(side, "upper_arm_left", "upper_arm_right");
	}
	if (text.includes("quad") || text.includes("cuad") || text.includes("thigh anterior") || text.includes("muslo anterior")) {
		return mapWithSide(side, "quad_left", "quad_right");
	}
	if (text.includes("hamstring") || text.includes("isquio") || text.includes("muslo posterior")) {
		return mapWithSide(side, "hamstring_left", "hamstring_right");
	}
	if (text.includes("knee") || text.includes("rodilla")) return mapWithSide(side, "knee_left", "knee_right");
	if (text.includes("calf") || text.includes("gemelo") || text.includes("pantorrilla")) {
		return mapWithSide(side, "calf_left", "calf_right");
	}
	if (text.includes("shin") || text.includes("tibia")) return mapWithSide(side, "shin_left", "shin_right");
	if (text.includes("achilles") || text.includes("aquiles")) return mapWithSide(side, "achilles_left", "achilles_right");
	if (text.includes("ankle") || text.includes("tobillo")) return mapWithSide(side, "ankle_left", "ankle_right");
	if (text.includes("foot") || text.includes("pie")) return mapWithSide(side, "foot_left", "foot_right");
	if (text.includes("lumbar") || text.includes("lower_back") || text.includes("espalda baja") || text.includes("back")) {
		return ["lower_back"];
	}

	return [];
}

export function buildMappedPainEntries(items: AthletePainOverviewRow[]): MappedPainEntry[] {
	return items.map((item) => {
		const side = normalizePainSide(item.side);
		const zones = resolvePainZones(item, side);
		return {
			id: item.pain_report_area_id,
			item,
			side,
			intensity: item.intensity,
			severity: intensityLevel(item.intensity),
			zones,
			primaryZoneId: zones[0] ?? null,
		};
	});
}

export function aggregateByZone(entries: MappedPainEntry[]): Map<PainVisualZoneId, ZoneAggregate> {
	const map = new Map<PainVisualZoneId, ZoneAggregate>();
	for (const entry of entries) {
		for (const zone of entry.zones) {
			const current = map.get(zone);
			const maxIntensity =
				entry.intensity === null
					? (current?.maxIntensity ?? null)
					: Math.max(entry.intensity, current?.maxIntensity ?? entry.intensity);
			map.set(zone, {
				entries: [...(current?.entries ?? []), entry],
				maxIntensity,
				severity: intensityLevel(maxIntensity),
			});
		}
	}
	return map;
}

