import OpenAI from "openai";
import { env } from "~/env";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface SessionWithExpiry {
	client_secret?: { value?: string };
	expires_at?: number;
}

export async function POST() {
	try {
		const session = await client.beta.realtime.sessions.create({
			model: "gpt-4o-realtime-preview",
			voice: "alloy",
			modalities: ["text", "audio"],
			input_audio_transcription: { model: "whisper-1" },
		});

		const sessionWithExpiry = session as SessionWithExpiry;

		return Response.json({
			ephemeralKey: sessionWithExpiry.client_secret?.value,
			expiresAt: sessionWithExpiry.expires_at,
		});
	} catch (e: unknown) {
		const error = e as Error;
		return new Response(`Upstream error: ${error.message}`, { status: 502 });
	}
}
