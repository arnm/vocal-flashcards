import { NextResponse } from "next/server";
import { env } from "~/env";

export async function POST() {
	try {
		const apiKey = env.GEMINI_API_KEY;

		if (!apiKey) {
			return NextResponse.json(
				{ error: "Gemini API key not configured" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ apiKey });
	} catch (error) {
		console.error("Error providing Gemini API key:", error);
		return NextResponse.json(
			{ error: "Failed to get API key" },
			{ status: 500 },
		);
	}
}
