import { redirect } from "next/navigation";

export default async function CoachAthletePage({ params }: { params: Promise<{ athleteId: string }> }) {
	const { athleteId } = await params;
	redirect(`/athletes/${athleteId}`);
}
