import { NextResponse } from "next/server";
import { getGeminiApiKey } from "~/server/realtime/gemini-key";

export async function POST() {
	try {
		const { apiKey } = getGeminiApiKey();
		return NextResponse.json({ apiKey });
	} catch (error) {
		console.error("Error providing Gemini API key:", error);
		return NextResponse.json(
			{ error: "Failed to get API key" },
			{ status: 500 },
		);
	}
}
