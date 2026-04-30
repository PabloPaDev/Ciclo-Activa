"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const run = async () => {
			const supabase = getSupabaseBrowserClient();
			if (!supabase) return;

			const { data } = await supabase.auth.getSession();
			if (data.session) {
				router.replace("/dashboard");
			}
		};

		void run();
	}, [router]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);
		setIsLoading(true);

		const supabase = getSupabaseBrowserClient();
		if (!supabase) {
			setErrorMessage("Faltan variables de entorno de Supabase.");
			setIsLoading(false);
			return;
		}

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		setIsLoading(false);

		if (error) {
			setErrorMessage("No se pudo iniciar sesion. Verifica tus credenciales.");
			return;
		}

		router.replace("/dashboard");
	};

	return (
		<main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-20">
			<div className="w-full rounded-[1.125rem] border border-[#D9DDD8] bg-[#FCFBF8] p-8 shadow-[0_4px_24px_rgba(15,45,47,0.06)] md:p-10">
				<h1 className="text-2xl font-bold tracking-tight text-[#0F2D2F]">Iniciar sesion</h1>
				<p className="mt-2 text-sm leading-relaxed text-[#5F6B6D]">Accede al panel de entrenadora o entrenador.</p>

				{!isSupabaseConfigured && (
					<p className="mt-5 rounded-xl border border-[#D9A441]/35 bg-[#D9A441]/10 px-3 py-2 text-sm text-[#7A5A12]">
						Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para habilitar el login.
					</p>
				)}

				<form className="mt-8 space-y-5" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#0F2D2F]">
							Email
						</label>
						<input
							id="email"
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2.5 text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/50 focus:ring-2 focus:ring-[#0F5C63]/15"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#0F2D2F]">
							Contrasena
						</label>
						<input
							id="password"
							type="password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="w-full rounded-xl border border-[#D9DDD8] bg-white px-3 py-2.5 text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/50 focus:ring-2 focus:ring-[#0F5C63]/15"
						/>
					</div>

					{errorMessage && <p className="text-sm text-[#C96B5C]">{errorMessage}</p>}

					<button
						type="submit"
						disabled={isLoading || !isSupabaseConfigured}
						className="inline-flex w-full items-center justify-center rounded-xl bg-[#0F5C63] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
					>
						{isLoading ? "Entrando..." : "Entrar"}
					</button>
				</form>
			</div>
		</main>
	);
}
