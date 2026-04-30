"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CoachNoteRow } from "@/types/coach-note";

type CoachNotesSectionProps = {
	athleteId: string;
};

const textareaClass =
	"w-full rounded-lg border border-[#D9DDD8] bg-white px-2.5 py-2 text-xs text-[#0F2D2F] outline-none transition focus:border-[#0F5C63]/45 focus:ring-2 focus:ring-[#0F5C63]/12";

const shellClass =
	"rounded-xl border border-[#D9DDD8] bg-[#FCFBF8] p-4 shadow-[0_2px_16px_rgba(15,45,47,0.05)] md:p-5";

function formatNoteDateShort(iso: string): string {
	try {
		return new Date(iso).toLocaleString("es-ES", {
			day: "2-digit",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}

export function CoachNotesSection({ athleteId }: CoachNotesSectionProps) {
	const [coachId, setCoachId] = useState<string | null>(null);
	const [notes, setNotes] = useState<CoachNoteRow[]>([]);
	const [draft, setDraft] = useState("");
	const [pinNew, setPinNew] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState("");
	const [editPin, setEditPin] = useState(false);
	const [mutatingId, setMutatingId] = useState<string | null>(null);

	const fetchNotes = useCallback(
		async (cid: string) => {
			const supabase = getSupabaseBrowserClient();
			if (!supabase) return;
			const { data, error: qError } = await supabase
				.from("coach_notes")
				.select("id, athlete_id, coach_id, note, is_pinned, visibility, created_at, updated_at")
				.eq("athlete_id", athleteId)
				.eq("coach_id", cid)
				.order("is_pinned", { ascending: false })
				.order("created_at", { ascending: false });

			if (qError) {
				if (process.env.NODE_ENV === "development") {
					console.error("coach_notes fetch", qError);
				}
				setError(
					qError.code === "42P01" || qError.message?.includes("does not exist")
						? "La tabla de notas aún no está disponible. Aplica la migración SQL en Supabase."
						: qError.code === "42501"
							? "Sin permiso para acceder a las notas. Ejecuta los GRANT de supabase/coach_notes.sql en el proyecto."
							: "No se pudieron cargar las notas.",
				);
				setNotes([]);
				return;
			}
			setNotes((data ?? []) as CoachNoteRow[]);
			setError(null);
		},
		[athleteId],
	);

	useEffect(() => {
		const run = async () => {
			if (!isSupabaseConfigured) {
				setLoading(false);
				setError("Supabase no está configurado.");
				return;
			}
			const supabase = getSupabaseBrowserClient();
			if (!supabase) {
				setLoading(false);
				setError("No se pudo inicializar el cliente.");
				return;
			}
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setLoading(false);
				return;
			}
			const { data: coachData } = await supabase.from("coaches").select("id").eq("user_id", sessionData.session.user.id).maybeSingle();
			if (!coachData?.id) {
				setCoachId(null);
				setLoading(false);
				return;
			}
			setCoachId(coachData.id as string);
			await fetchNotes(coachData.id as string);
			setLoading(false);
		};
		void run();
	}, [athleteId, fetchNotes]);

	const handleSubmitNew = async (event: FormEvent) => {
		event.preventDefault();
		const text = draft.trim();
		if (!text || !coachId) return;
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		setSaving(true);
		setError(null);
		const { error: insError } = await supabase.from("coach_notes").insert({
			athlete_id: athleteId,
			coach_id: coachId,
			note: text,
			is_pinned: pinNew,
			visibility: "private",
		});
		setSaving(false);
		if (insError) {
			if (process.env.NODE_ENV === "development") {
				console.error("coach_notes insert", insError);
			}
			setError("No se pudo guardar la nota. ¿Está creada la tabla coach_notes y las políticas RLS?");
			return;
		}
		setDraft("");
		setPinNew(false);
		await fetchNotes(coachId);
	};

	const startEdit = (note: CoachNoteRow) => {
		setEditingId(note.id);
		setEditDraft(note.note);
		setEditPin(note.is_pinned);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditDraft("");
		setEditPin(false);
	};

	const saveEdit = async (noteId: string) => {
		const text = editDraft.trim();
		if (!text || !coachId) return;
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		setMutatingId(noteId);
		setError(null);
		const { error: upError } = await supabase
			.from("coach_notes")
			.update({ note: text, is_pinned: editPin, visibility: "private" })
			.eq("id", noteId);
		setMutatingId(null);
		if (upError) {
			if (process.env.NODE_ENV === "development") {
				console.error("coach_notes update", upError);
			}
			setError("No se pudo actualizar la nota.");
			return;
		}
		cancelEdit();
		await fetchNotes(coachId);
	};

	const removeNote = async (noteId: string) => {
		if (typeof window !== "undefined" && !window.confirm("¿Eliminar esta nota? Esta acción no se puede deshacer.")) {
			return;
		}
		if (!coachId) return;
		const supabase = getSupabaseBrowserClient();
		if (!supabase) return;
		setMutatingId(noteId);
		setError(null);
		const { error: delError } = await supabase.from("coach_notes").delete().eq("id", noteId);
		setMutatingId(null);
		if (delError) {
			if (process.env.NODE_ENV === "development") {
				console.error("coach_notes delete", delError);
			}
			setError("No se pudo eliminar la nota.");
			return;
		}
		if (editingId === noteId) cancelEdit();
		await fetchNotes(coachId);
	};

	if (loading) {
		return (
			<section className={shellClass}>
				<h3 className="text-sm font-bold tracking-tight text-[#0F2D2F]">Notas del entrenador</h3>
				<p className="mt-1 text-xs text-[#5F6B6D]">Cargando…</p>
			</section>
		);
	}

	if (!coachId) {
		return null;
	}

	return (
		<section className={shellClass}>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-sm font-bold tracking-tight text-[#0F2D2F]">Notas del entrenador</h3>
				<span className="text-[10px] font-medium uppercase tracking-wide text-[#7C4DFF]/90">Interno</span>
			</div>
			<p className="mt-1 text-xs leading-snug text-[#5F6B6D]">Privadas; la atleta no las ve.</p>

			{error && (
				<p className="mt-2 rounded-lg border border-[#C96B5C]/35 bg-[#C96B5C]/10 px-3 py-1.5 text-xs text-[#8B3F35]">{error}</p>
			)}

			<form className="mt-3 space-y-2" onSubmit={handleSubmitNew}>
				<label className="block text-xs font-medium text-[#0F2D2F]">
					<span className="mb-1 block text-[11px] text-[#5F6B6D]">Nueva nota</span>
					<textarea
						rows={2}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder="Observaciones breves…"
						className={textareaClass}
					/>
				</label>
				<div className="flex flex-wrap items-center gap-3">
					<label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#0F2D2F]">
						<input
							type="checkbox"
							checked={pinNew}
							onChange={(e) => setPinNew(e.target.checked)}
							className="h-3.5 w-3.5 rounded border-[#D9DDD8] text-[#7C4DFF] accent-[#7C4DFF]"
						/>
						Importante
					</label>
					<button
						type="submit"
						disabled={saving || !draft.trim()}
						className="inline-flex items-center rounded-lg bg-[#0F5C63] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8] disabled:text-[#5F6B6D]"
					>
						{saving ? "Guardando…" : "Guardar"}
					</button>
				</div>
			</form>

			<div className="mt-4 border-t border-[#D9DDD8]/70 pt-3">
				<p className="text-[10px] font-semibold uppercase tracking-wide text-[#5F6B6D]">Recientes</p>
				{notes.length === 0 ? (
					<p className="mt-2 text-xs text-[#5F6B6D]">Sin notas aún.</p>
				) : (
					<ul className="mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-1">
						{notes.map((n) => (
							<li key={n.id} className="rounded-lg border border-[#D9DDD8] bg-white p-2.5 shadow-sm">
								<div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#5F6B6D]">
									<span className="tabular-nums">{formatNoteDateShort(n.created_at)}</span>
									{n.is_pinned ? (
										<span className="inline-flex items-center rounded-full border border-[#7C4DFF]/35 bg-[#7C4DFF]/10 px-1.5 py-px font-semibold text-[#5B21B6]">
											★
										</span>
									) : null}
								</div>
								{editingId === n.id ? (
									<div className="mt-2 space-y-2">
										<textarea rows={3} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} className={textareaClass} />
										<label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#0F2D2F]">
											<input
												type="checkbox"
												checked={editPin}
												onChange={(e) => setEditPin(e.target.checked)}
												className="h-3.5 w-3.5 rounded border-[#D9DDD8] text-[#7C4DFF] accent-[#7C4DFF]"
											/>
											Importante
										</label>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												disabled={mutatingId === n.id || !editDraft.trim()}
												onClick={() => saveEdit(n.id)}
												className="inline-flex items-center rounded-lg bg-[#0F5C63] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#0d4e54] disabled:cursor-not-allowed disabled:bg-[#D9DDD8]"
											>
												{mutatingId === n.id ? "Guardando…" : "Guardar"}
											</button>
											<button
												type="button"
												disabled={mutatingId === n.id}
												onClick={cancelEdit}
												className="inline-flex items-center rounded-lg border border-[#D9DDD8] bg-white px-3 py-1 text-xs font-semibold text-[#0F2D2F] transition hover:bg-[#FCFBF8]"
											>
												Cancelar
											</button>
										</div>
									</div>
								) : (
									<>
										<p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#0F2D2F]/95">{n.note}</p>
										<div className="mt-2 flex flex-wrap gap-3">
											<button
												type="button"
												disabled={mutatingId !== null}
												onClick={() => startEdit(n)}
												className="text-xs font-semibold text-[#0F5C63] underline-offset-2 hover:underline"
											>
												Editar
											</button>
											<button
												type="button"
												disabled={mutatingId !== null}
												onClick={() => removeNote(n.id)}
												className="text-xs font-semibold text-[#8B3F35] underline-offset-2 hover:underline"
											>
												Eliminar
											</button>
										</div>
									</>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
