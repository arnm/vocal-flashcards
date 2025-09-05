"use client";

import {
	type FunctionResponse,
	GoogleGenAI,
	type LiveServerMessage,
	type LiveServerToolCall,
	Modality,
	type Session,
} from "@google/genai";
import { getAudioContextCtor } from "~/lib/audio";
import { FLASHCARD_TOOLS } from "../../tools";
import type {
	ProviderAdapter,
	ProviderAdapterState,
	RealtimeCapabilities,
} from "../../types";

export class GeminiAdapter implements ProviderAdapter {
	private ai: GoogleGenAI | null = null;
	private session: Session | null = null;
	private micStream: MediaStream | null = null;
	private inputAudioCtx: AudioContext | null = null;
	private outputAudioCtx: AudioContext | null = null;
	private nextPlayTime = 0;
	private flushTimer: number | null = null;
	private lastFrameTime = 0;

	private state: ProviderAdapterState = {
		active: false,
		chat: [],
		error: null,
	};
	private listeners = new Set<() => void>();

	private notify(): void {
		for (const l of this.listeners) l();
	}

	getCapabilities(): RealtimeCapabilities {
		return {
			audioIn: true,
			audioOut: true,
			toolCalls: true,
			transcriptionIn: true,
			transcriptionOut: true,
		};
	}

	private async setupMic() {
		if (this.micStream) return;
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				channelCount: 1,
			},
		});
		this.micStream = stream;
		const AudioContextClass = getAudioContextCtor();
		// Don't force 16kHz - let browser use native rate
		const audioCtx = new AudioContextClass();
		this.inputAudioCtx = audioCtx;

		// Ensure audio context is resumed
		if (audioCtx.state === "suspended") {
			try {
				await audioCtx.resume();
				console.log("[gemini-live] inputAudioCtx resumed");
			} catch (e) {
				console.warn("[gemini-live] resume failed", e);
			}
		}

		const source = audioCtx.createMediaStreamSource(stream);
		const processor = audioCtx.createScriptProcessor(1024, 1, 1);

		let flushed = false;

		let frameCount = 0;

		processor.onaudioprocess = (e: AudioProcessingEvent) => {
			if (!this.session || !this.state.active) return;
			const input = e.inputBuffer.getChannelData(0);
			if (!input) return;

			// Calculate RMS for debugging
			let sum = 0;
			for (let i = 0; i < input.length; i++) {
				const v = input[i] ?? 0;
				sum += v * v;
			}
			const rms = Math.sqrt(sum / input.length);

			// Convert Float32Array to Int16Array for PCM
			const int16 = new Int16Array(input.length);
			for (let i = 0; i < input.length; i++) {
				const s = Math.max(-1, Math.min(1, input[i] ?? 0));
				int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
			}

			this.sendAudioFrame(int16);
			this.lastFrameTime = performance.now();
			flushed = false;

			frameCount++;
			if (frameCount % 10 === 0) {
				console.log(
					`[gemini-live] frame ${frameCount}, RMS: ${rms.toFixed(5)}, sampleRate: ${audioCtx.sampleRate}`,
				);
			}
		};

		// Silence flush timer
		this.flushTimer = window.setInterval(() => {
			if (!this.session || !this.state.active) return;
			const now = performance.now();
			if (!flushed && now - this.lastFrameTime > 1200) {
				try {
					this.session.sendRealtimeInput({ audioStreamEnd: true });
					console.log("[gemini-live] auto audioStreamEnd");
					flushed = true;
				} catch (e) {
					console.warn("[gemini-live] audioStreamEnd error", e);
				}
			}
		}, 400);

		source.connect(processor);
		processor.connect(audioCtx.destination);
	}

	private sendAudioFrame(int16: Int16Array): void {
		if (!this.session) return;

		try {
			const buffer = new ArrayBuffer(int16.byteLength);
			const view = new DataView(buffer);
			for (let i = 0; i < int16.length; i++)
				view.setInt16(i * 2, int16[i] ?? 0, true);

			let binary = "";
			const bytes = new Uint8Array(buffer);
			for (let i = 0; i < bytes.length; i++)
				binary += String.fromCharCode(bytes[i] ?? 0);
			const base64Audio = btoa(binary);

			// Use sendRealtimeInput with automatic VAD
			const rate = this.inputAudioCtx?.sampleRate || 16000;
			console.log(
				`[gemini-live] sending audio: ${base64Audio.length} base64 chars, rate: ${rate}, bytes: ${int16.length * 2}`,
			);
			this.session.sendRealtimeInput({
				audio: {
					data: base64Audio,
					mimeType: `audio/pcm;rate=${Math.round(rate)}`,
				},
			});
		} catch (error) {
			console.error("[gemini-live] Error sending audio frame:", error);
		}
	}

	private async playAudioChunk(audioData: Int16Array) {
		try {
			console.log(
				"[gemini-live] Playing audio chunk, samples:",
				audioData.length,
			);
			if (!this.outputAudioCtx) {
				const AudioContextClass = getAudioContextCtor();
				this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
				console.log(
					"[gemini-live] Created output audio context, sample rate:",
					this.outputAudioCtx.sampleRate,
				);
			}
			const audioCtx = this.outputAudioCtx;
			if (!audioCtx) return;
			if (audioCtx.state === "suspended") {
				console.log("[gemini-live] Resuming suspended audio context");
				await audioCtx.resume();
			}
			console.log("[gemini-live] Audio context state:", audioCtx.state);
			const buffer = audioCtx.createBuffer(1, audioData.length, 24000);
			const channelData = buffer.getChannelData(0);
			for (let i = 0; i < audioData.length; i++) {
				const sample = audioData[i] ?? 0;
				channelData[i] = sample / 0x8000;
			}
			const source = audioCtx.createBufferSource();
			source.buffer = buffer;
			source.connect(audioCtx.destination);
			const now = audioCtx.currentTime;
			if (this.nextPlayTime < now - 0.1) this.nextPlayTime = now;
			const when = Math.max(now, this.nextPlayTime);
			console.log(
				"[gemini-live] Starting audio playback at:",
				when,
				"duration:",
				buffer.duration,
			);
			source.start(when);
			this.nextPlayTime = when + buffer.duration;
		} catch (err) {
			console.error("[gemini-live] play error", err);
		}
	}

	private handleMessage(message: LiveServerMessage): void {
		try {
			console.log(
				"[gemini-live] Message received:",
				JSON.stringify(message, null, 2),
			);

			// Log transcriptions for debugging
			if (message.serverContent?.inputTranscription) {
				console.log(
					"[gemini-live] Input transcription:",
					message.serverContent.inputTranscription.text,
				);
			}
			if (message.serverContent?.outputTranscription) {
				console.log(
					"[gemini-live] Output transcription:",
					message.serverContent.outputTranscription.text,
				);
			}

			let hasAudioResponse = false;

			// Handle audio data
			if (message.serverContent?.modelTurn?.parts) {
				for (const part of message.serverContent.modelTurn.parts) {
					if (
						part.inlineData?.data &&
						part.inlineData?.mimeType?.startsWith("audio/")
					) {
						try {
							console.log(
								"[gemini-live] Playing audio response, data length:",
								part.inlineData.data.length,
							);
							const audioData = this.base64ToInt16Array(part.inlineData.data);
							this.playAudioChunk(audioData);
							hasAudioResponse = true;
						} catch (error) {
							console.error("[gemini-live] Error playing audio:", error);
						}
					}
				}
			}

			// Add placeholder message for audio-only responses
			if (hasAudioResponse && message.serverContent?.turnComplete) {
				const messageId = `assistant_${Date.now()}_${Math.random()}`;
				this.state.chat.push({
					id: messageId,
					role: "assistant",
					text: "🎵 [Audio response]",
					isStreaming: false,
				});
				this.notify();
			}

			// Handle tool calls (note: native audio model has limited tool support)
			if (message.toolCall?.functionCalls) {
				this.handleToolCall(message.toolCall);
			}
		} catch (error) {
			console.error("[gemini-live] Error handling message:", error);
		}
	}

	private async handleToolCall(toolCall: LiveServerToolCall): Promise<void> {
		if (!toolCall.functionCalls || !this.session) return;

		const responses: FunctionResponse[] = [];

		for (const call of toolCall.functionCalls) {
			if (!call.name || !call.id) continue;

			// Find the corresponding tool handler
			const tool = FLASHCARD_TOOLS.find((t) => t.name === call.name);
			if (!tool) {
				console.error(`[gemini-live] Unknown tool: ${call.name}`);
				responses.push({
					id: call.id,
					name: call.name,
					response: { error: `Unknown tool: ${call.name}` },
				} as FunctionResponse);
				continue;
			}

			try {
				// Execute the tool
				const result = await tool.handler(call.args || {});
				responses.push({
					id: call.id,
					name: call.name,
					response: { output: result },
				} as FunctionResponse);
			} catch (error) {
				console.error(
					`[gemini-live] Tool execution error for ${call.name}:`,
					error,
				);
				responses.push({
					id: call.id,
					name: call.name,
					response: { error: String(error) },
				} as FunctionResponse);
			}
		}

		// Send tool responses back to the session
		if (responses.length > 0) {
			try {
				this.session.sendToolResponse({ functionResponses: responses });
			} catch (error) {
				console.error("[gemini-live] Error sending tool response:", error);
			}
		}
	}

	private base64ToInt16Array(base64: string): Int16Array {
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		const length = bytes.length / 2;
		const int16Array = new Int16Array(length);
		for (let i = 0; i < length; i++) {
			const byte1 = bytes[i * 2] ?? 0;
			const byte2 = bytes[i * 2 + 1] ?? 0;
			const sample = byte1 | (byte2 << 8);
			const normalizedSample = sample >= 32768 ? sample - 65536 : sample;
			int16Array[i] = normalizedSample;
		}

		return int16Array;
	}

	async start(): Promise<void> {
		if (this.state.active) return;

		try {
			// Get API key
			const response = await fetch("/api/gemini/key", { method: "POST" });
			if (!response.ok) throw new Error("Failed to obtain Gemini API key");
			const { apiKey } = (await response.json()) as { apiKey: string };

			if (!apiKey) {
				throw new Error("No Gemini API key provided");
			}

			console.log("[gemini-live] API key received, length:", apiKey.length);

			// Initialize Google GenAI with API key
			this.ai = new GoogleGenAI({ apiKey });

			this.session = await this.ai.live.connect({
				model: "gemini-2.5-flash-preview-native-audio-dialog",
				config: {
					responseModalities: [Modality.AUDIO],
					// Enable transcriptions for debugging / UX (can display later)
					inputAudioTranscription: {},
					outputAudioTranscription: {},
					realtimeInputConfig: {
						automaticActivityDetection: {
							// Keep automatic detection but rely on our manual gating to reduce noise
							// We still send audioStreamEnd explicitly; model VAD remains a fallback.
							disabled: false,
						},
					},
					systemInstruction:
						"You are a helpful language learning assistant. You can help users practice with flashcards and answer questions about language learning. You have access to flashcard tools to help with practice sessions - you can get the current flashcard, flip it to show the answer, advance to the next card, or restart the deck. Respond concisely in speech.",
					tools: [
						{
							functionDeclarations: FLASHCARD_TOOLS.map((tool) => ({
								name: tool.name,
								description: tool.description,
								// Convert to parametersJsonSchema since parameters are empty/simple
								parametersJsonSchema: tool.parameters,
							})),
						},
					],
				},
				callbacks: {
					onopen: () => {
						console.log("[gemini-live] Connected to Gemini Live");
						this.state.active = true;
						this.state.error = null;
						this.notify();
					},
					onmessage: (message: LiveServerMessage) => {
						this.handleMessage(message);
					},
					onerror: (error: ErrorEvent) => {
						console.error("[gemini-live] Error:", error);
						this.state.error = new Error(error.message || "Connection error");
						this.state.active = false;
						this.notify();
					},
					onclose: (event: CloseEvent) => {
						console.log(
							"[gemini-live] Disconnected. Code:",
							event?.code,
							"Reason:",
							event?.reason,
						);
						this.state.active = false;
						this.notify();
					},
				},
			});

			// Setup microphone
			await this.setupMic();

			// Session is ready for audio-only interaction
			console.log("[gemini-live] Audio-only session ready");
		} catch (error) {
			console.error("[gemini-live] Start error:", error);
			this.state.error = error as Error;
			this.notify();
			throw error;
		}
	}

	stop(): void {
		try {
			if (this.flushTimer) {
				clearInterval(this.flushTimer);
				this.flushTimer = null;
			}

			if (this.session) {
				this.session.close();
				this.session = null;
			}

			if (this.micStream) {
				for (const t of this.micStream.getTracks()) t.stop();
				this.micStream = null;
			}

			if (this.inputAudioCtx) {
				this.inputAudioCtx.close().catch(() => {});
				this.inputAudioCtx = null;
			}

			if (this.outputAudioCtx) {
				this.outputAudioCtx.close().catch(() => {});
				this.outputAudioCtx = null;
			}

			this.ai = null;
		} catch (error) {
			console.error("[gemini-live] Stop error:", error);
		}

		this.nextPlayTime = 0;
		this.lastFrameTime = 0;
		this.state.active = false;
		this.state.chat = [];
		this.state.error = null;
		this.notify();
	}

	reset(): void {
		this.state.chat = [];
		this.nextPlayTime = 0;
		this.notify();
	}

	sendUserText(text: string): void {
		if (!this.session || !this.state.active || !text.trim()) return;

		const userMsgId = `user_${Date.now()}`;
		this.state.chat.push({
			id: userMsgId,
			role: "user",
			text: text.trim(),
			isStreaming: false,
		});
		this.notify();

		this.session.sendClientContent({
			turns: [
				{
					role: "user",
					parts: [
						{
							text: text.trim(),
						},
					],
				},
			],
			turnComplete: true,
		});
	}

	sendUserAudioChunk(pcm16: Int16Array): void {
		if (this.session && this.state.active && pcm16 && pcm16.length > 0) {
			this.sendAudioFrame(pcm16);
		}
	}

	getState(): ProviderAdapterState {
		return this.state;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
}
