import type { NextRequest } from "next/server";
import { env } from "~/env";

export const runtime = "nodejs";

type GeminiPart =
	| { text: string; functionCall?: never; functionResponse?: never }
	| {
			text?: never;
			functionCall: { name: string; args?: Record<string, unknown> };
	  }
	| { text?: never; functionResponse: { name: string; response: unknown } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

interface BrowserMessage {
	type: "user_text" | "tool_response";
	// For user_text:
	text?: string;
	// For both (preferred): full conversation contents (history)
	contents?: GeminiContent[];
	// For compatibility (optional; not required if contents is provided):
	function_responses?: Array<{ name: string; id?: string; response: unknown }>;
}

const GEMINI_API_URL =
	"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export async function POST(request: NextRequest) {
	if (!env.GEMINI_API_KEY) {
		return new Response(
			JSON.stringify({
				type: "error",
				message: "Gemini API key not configured",
			}),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const message: BrowserMessage = await request.json();

		// Shared tool declarations: keep synced with client tool list
		const toolDeclarations = [
			{
				name: "get_current_flashcard",
				description:
					"Get information about the current flashcard being studied",
				parameters: { type: "object", properties: {} },
			},
			{
				name: "flip_flashcard",
				description: "Flip the current flashcard to show/hide the answer",
				parameters: { type: "object", properties: {} },
			},
			{
				name: "next_flashcard",
				description: "Advance to the next flashcard in the deck",
				parameters: { type: "object", properties: {} },
			},
			{
				name: "restart_flashcards",
				description: "Restart the flashcard deck from the beginning",
				parameters: { type: "object", properties: {} },
			},
		];

		const baseBody = {
			tools: [{ function_declarations: toolDeclarations }],
			generationConfig: { temperature: 0.8 },
			systemInstruction: {
				parts: [
					{
						text: "You are a helpful language learning assistant. Please respond only in English. Keep your responses conversational and encouraging for language learners. You have access to flashcard tools to help with practice sessions - you can get the current flashcard, flip it to show the answer, advance to the next card, or restart the deck.",
					},
				],
			},
		};

		// Helper to call Gemini
		async function callGemini(contents: GeminiContent[]) {
			const response = await fetch(
				`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...baseBody, contents }),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("[gemini-proxy] API error:", errorText);
				return new Response(
					JSON.stringify({
						type: "error",
						message: "Gemini API request failed",
					}),
					{
						status: response.status,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const data = await response.json();
			const candidate = data?.candidates?.[0];
			const parts: unknown[] = candidate?.content?.parts ?? [];
			const turnId = `turn_${Date.now()}`;

			// Normalize: collect text and function calls
			const responses: Array<
				| { type: "assistant_final"; id: string; text: string }
				| {
						type: "tool_call";
						calls: Array<{
							name: string;
							args: Record<string, unknown>;
							id: string;
						}>;
				  }
			> = [];

			// Group any functionCall parts into a single tool_call event
			const calls: Array<{
				name: string;
				args: Record<string, unknown>;
				id: string;
			}> = [];
			for (const part of parts) {
				const partObj = part as Record<string, unknown>;
				if (partObj?.text && typeof partObj.text === "string") {
					responses.push({
						type: "assistant_final",
						id: turnId,
						text: partObj.text,
					});
				} else if (
					partObj?.functionCall &&
					typeof partObj.functionCall === "object"
				) {
					const fc = partObj.functionCall as {
						name: string;
						args?: Record<string, unknown>;
					};
					calls.push({
						name: fc.name,
						args: fc.args ?? {},
						id: `call_${Date.now()}_${calls.length}`,
					});
				}
			}
			if (calls.length) responses.push({ type: "tool_call", calls });

			return new Response(
				JSON.stringify({
					type: "batch_response",
					responses,
					candidateContent: candidate?.content ?? null,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		switch (message.type) {
			case "user_text": {
				if (!message.text && !message.contents) {
					return new Response(
						JSON.stringify({
							type: "error",
							message: "Missing text or contents",
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}
				const contents: GeminiContent[] =
					message.contents && Array.isArray(message.contents)
						? message.contents
						: [{ role: "user", parts: [{ text: message.text as string }] }];
				return await callGemini(contents);
			}
			case "tool_response": {
				if (!message.contents || !Array.isArray(message.contents)) {
					return new Response(
						JSON.stringify({
							type: "error",
							message: "Missing contents for tool_response",
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}
				// The client already appended functionResponse parts to contents.
				return await callGemini(message.contents as GeminiContent[]);
			}
			default: {
				return new Response(
					JSON.stringify({
						type: "error",
						message: `Unsupported message type: ${message.type}`,
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
		}
	} catch (error) {
		console.error("[gemini-proxy] Error processing request:", error);
		return new Response(
			JSON.stringify({
				type: "error",
				message: "Internal server error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
