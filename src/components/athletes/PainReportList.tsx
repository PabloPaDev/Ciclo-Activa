import type { MappedPainEntry, PainVisualZoneId } from "@/lib/body-map";
import { PainReportCard } from "@/components/athletes/PainReportCard";

interface PainReportListProps {
	entries: MappedPainEntry[];
	selectedZone: PainVisualZoneId | null;
	selectedPainId: string | null;
	onSelectEntry: (entry: MappedPainEntry) => void;
}

export function PainReportList({ entries, selectedZone, selectedPainId, onSelectEntry }: PainReportListProps) {
	return (
		<div className="grid gap-3 md:grid-cols-1 xl:grid-cols-2">
			{entries.map((entry) => (
				<PainReportCard
					key={entry.id}
					entry={entry}
					selected={
						selectedPainId
							? entry.id === selectedPainId
							: selectedZone
								? entry.zones.includes(selectedZone) || entry.primaryZoneId === selectedZone
								: false
					}
					onClick={() => onSelectEntry(entry)}
				/>
			))}
		</div>
	);
}
