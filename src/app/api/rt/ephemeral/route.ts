import { createEphemeralSession } from "~/server/realtime/openai-session";

export const runtime = "nodejs";

export async function POST() {
	try {
		const session = await createEphemeralSession();
		return Response.json(session);
	} catch (e: unknown) {
		const error = e as Error;
		return new Response(`Upstream error: ${error.message}`, { status: 502 });
	}
}
