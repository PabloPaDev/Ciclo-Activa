import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPublicTableColumns(supabase: SupabaseClient, tableName: string): Promise<Set<string> | null> {
	const { data, error } = await supabase
		.from("information_schema.columns")
		.select("column_name")
		.eq("table_schema", "public")
		.eq("table_name", tableName);

	if (error || !data) {
		return null;
	}

	const columns = new Set<string>();
	for (const row of data as { column_name?: string | null }[]) {
		const columnName = row.column_name?.trim();
		if (columnName) {
			columns.add(columnName);
		}
	}

	return columns;
}

export function filterByColumns<T extends Record<string, unknown>>(input: T, columns: Set<string> | null): Partial<T> {
	if (!columns) return input;

	const output: Partial<T> = {};
	for (const [key, value] of Object.entries(input)) {
		if (columns.has(key)) {
			output[key as keyof T] = value as T[keyof T];
		}
	}
	return output;
}
