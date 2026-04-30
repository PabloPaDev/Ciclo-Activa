interface StatusBadgeProps {
	label: string;
	variant?: "green" | "yellow" | "red" | "neutral";
}

const variantClasses: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
	green: "bg-[#D7EFE7]/80 text-[#0F5C63] border-[#4E9B6E]/35",
	yellow: "bg-[#D9A441]/12 text-[#7A5A12] border-[#D9A441]/40",
	red: "bg-[#C96B5C]/10 text-[#8B3F35] border-[#C96B5C]/35",
	neutral: "bg-[#FCFBF8] text-[#5F6B6D] border-[#D9DDD8]",
};

const dotClasses: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
	green: "bg-[#4E9B6E]",
	yellow: "bg-[#D9A441]",
	red: "bg-[#C96B5C]",
	neutral: "bg-[#5F6B6D]",
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${variantClasses[variant]}`}
		>
			<span className={`h-2 w-2 shrink-0 rounded-full ${dotClasses[variant]}`} aria-hidden />
			{label}
		</span>
	);
}
