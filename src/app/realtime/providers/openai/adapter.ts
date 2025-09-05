"use client";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { getAudioContextCtor } from "~/lib/audio";
import { FLASHCARD_TOOLS } from "../../tools";
import type {
	ChatMessage,
	ProviderAdapter,
	ProviderAdapterState,
	RealtimeCapabilities,
} from "../../types";

export class OpenAIAdapter implements ProviderAdapter {
	private client: RealtimeClient | null = null;
	private micStream: MediaStream | null = null;
	private inputAudioCtx: AudioContext | null = null;
	private outputAudioCtx: AudioContext | null = null;
	private nextPlayTime = 0;
	private state: ProviderAdapterState = {
		active: false,
		chat: [],
		error: null,
	};
	private listeners = new Set<() => void>();

	private notify() {
		for (const l of this.listeners) l();
	}

	private mapConversationToChat(): ChatMessage[] {
		if (!this.client) return [];
		const rawItems = (this.client.conversation.getItems() ?? []) as unknown[];
		const result: ChatMessage[] = [];
		for (const it of rawItems) {
			if (!it || typeof it !== "object") continue;
			const item = it as {
				id?: string;
				type?: string;
				role?: "user" | "assistant" | "system";
				status?: string;
				content?: Array<{ type: string; text?: string; transcript?: string }>;
			};
			if (item.type !== "message") continue;
			if (!(item.role === "user" || item.role === "assistant")) continue;
			let text = "";
			if (Array.isArray(item.content)) {
				for (const c of item.content) {
					if (c.type === "input_text" || c.type === "text") text = c.text ?? "";
					else if (
						(c.type === "input_audio" || c.type === "audio") &&
						c.transcript
					)
						text = c.transcript;
				}
			}
			if (typeof item.id === "string") {
				result.push({
					id: item.id,
					role: item.role ?? "assistant",
					text,
					isStreaming: item.status === "in_progress",
				});
			}
		}
		return result;
	}

	private setChatFromConversation(): void {
		this.state.chat = this.mapConversationToChat();
		this.notify();
	}

	private async playAudioChunk(audioData: Int16Array) {
		try {
			if (!this.outputAudioCtx) {
				const AudioContextClass = getAudioContextCtor();
				this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
			}
			const audioCtx = this.outputAudioCtx;
			if (!audioCtx) return;
			if (audioCtx.state === "suspended") await audioCtx.resume();
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
			source.start(when);
			this.nextPlayTime = when + buffer.duration;
		} catch (err) {
			console.error("[rt:openai] play error", err);
		}
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
		const audioCtx = new AudioContextClass({ sampleRate: 24000 });
		this.inputAudioCtx = audioCtx;
		const source = audioCtx.createMediaStreamSource(stream);
		const processor = audioCtx.createScriptProcessor(4096, 1, 1);

		let frameCount = 0;

		processor.onaudioprocess = (e: AudioProcessingEvent) => {
			const client = this.client;
			if (!client || !client.isConnected()) return;
			const input = e.inputBuffer.getChannelData(0);
			if (!input) return;

			// Calculate RMS for debugging
			let sum = 0;
			for (let i = 0; i < input.length; i++) {
				const v = input[i] ?? 0;
				sum += v * v;
			}
			const rms = Math.sqrt(sum / input.length);

			const int16 = new Int16Array(input.length);
			for (let i = 0; i < input.length; i++) {
				const s = Math.max(-1, Math.min(1, input[i] ?? 0));
				int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
			}
			client.appendInputAudio(int16);

			frameCount++;
			if (frameCount % 10 === 0) {
				console.log(
					`[rt:openai] frame ${frameCount}, RMS: ${rms.toFixed(5)}, sampleRate: ${audioCtx.sampleRate}`,
				);
			}
		};
		source.connect(processor);
		processor.connect(audioCtx.destination);
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

	async start(): Promise<void> {
		if (this.client?.isConnected()) return;
		try {
			const r = await fetch("/api/rt/ephemeral", { method: "POST" });
			if (!r.ok) throw new Error("Failed to obtain ephemeral key");
			const { ephemeralKey } = (await r.json()) as { ephemeralKey: string };
			const client = new RealtimeClient({
				apiKey: ephemeralKey,
				dangerouslyAllowAPIKeyInBrowser: true,
				debug: false,
			});
			client.updateSession({
				model: "gpt-4o-realtime-preview",
				modalities: ["text", "audio"],
				voice: "alloy",
				input_audio_format: "pcm16",
				output_audio_format: "pcm16",
				input_audio_transcription: { model: "whisper-1" },
				turn_detection: { type: "server_vad" },
				temperature: 0.8,
				instructions:
					"You are a helpful language learning assistant. Please respond only in English. Keep your responses conversational and encouraging for language learners. You have access to flashcard tools to help with practice sessions - you can get the current flashcard, flip it to show the answer, advance to the next card, or restart the deck.",
			});
			// Tools
			for (const tool of FLASHCARD_TOOLS)
				client.addTool(
					{
						name: tool.name,
						description: tool.description,
						parameters: tool.parameters,
					},
					tool.handler,
				);
			const onConvChange = (event: { delta?: { audio?: Int16Array } }) => {
				if (event.delta?.audio) this.playAudioChunk(event.delta.audio);
				this.setChatFromConversation();
			};
			const onInterrupted = () => {
				this.nextPlayTime = 0;
			};
			client.on("error", (err: unknown) => {
				console.error("[rt:openai] error", err);
				this.state.error = err as Error;
				this.notify();
			});
			client.on("conversation.updated", onConvChange);
			client.on("conversation.item.appended", onConvChange);
			client.on("conversation.item.completed", onConvChange);
			client.on("conversation.interrupted", onInterrupted);
			await client.connect();
			await client.waitForSessionCreated();
			this.client = client;
			await this.setupMic();
			this.state.active = true;
			this.setChatFromConversation();
			client.sendUserMessageContent([
				{
					type: "input_text",
					text: "Hello! Please introduce yourself and let me know how you can help me with my language learning and flashcards.",
				},
			]);
		} catch (e) {
			this.state.error = e as Error;
			this.notify();
			throw e;
		}
	}

	stop(): void {
		try {
			if (this.client) this.client.disconnect();
		} catch {}
		this.client = null;
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
		this.nextPlayTime = 0;
		this.state.active = false;
		this.state.chat = [];
		this.notify();
	}

	reset(): void {
		if (this.client) {
			const items = this.client.conversation.getItems() as unknown[];
			for (const it of items) {
				if (it && typeof it === "object" && "id" in it) {
					const id = (it as { id?: string }).id;
					if (typeof id === "string") this.client.deleteItem(id);
				}
			}
		}
		this.nextPlayTime = 0;
		this.setChatFromConversation();
	}

	sendUserText(text: string): void {
		if (!this.client?.isConnected()) return;
		this.client.sendUserMessageContent([{ type: "input_text", text }]);
	}

	sendUserAudioChunk(pcm16: Int16Array): void {
		if (!this.client?.isConnected()) return;
		this.client.appendInputAudio(pcm16);
	}

	getState(): ProviderAdapterState {
		return this.state;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
}
