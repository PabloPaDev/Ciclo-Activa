import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseBrowserClient(): SupabaseClient | null {
	if (!isSupabaseConfigured) {
		return null;
	}

	if (!supabaseInstance) {
		supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
	}

	return supabaseInstance;
}
