import OpenAI from "openai";
import { env } from "~/env";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface SessionWithExpiry {
	client_secret?: { value?: string };
	expires_at?: number;
}

export async function createEphemeralSession() {
	const session = await client.beta.realtime.sessions.create({
		model: "gpt-4o-realtime-preview",
		voice: "alloy",
		modalities: ["text", "audio"],
		input_audio_transcription: { model: "whisper-1" },
	});

	const sessionWithExpiry = session as SessionWithExpiry;

	return {
		ephemeralKey: sessionWithExpiry.client_secret?.value,
		expiresAt: sessionWithExpiry.expires_at,
	};
}
