export function PainLegend() {
	return (
		<div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
			<span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
				<span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
				Leve
			</span>
			<span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
				<span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
				Moderada
			</span>
			<span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
				<span className="h-2.5 w-2.5 rounded-full bg-red-600" />
				Alta
			</span>
		</div>
	);
}
