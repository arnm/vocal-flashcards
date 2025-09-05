import { env } from "~/env";

export function getGeminiApiKey() {
	const apiKey = env.GEMINI_API_KEY;

	if (!apiKey) {
		throw new Error("Gemini API key not configured");
	}

	return { apiKey };
}
