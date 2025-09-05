"use client";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFlashcardsStore } from "~/lib/flashcardsStore";

interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	isStreaming?: boolean;
}

export function useRealtime() {
	const clientRef = useRef<RealtimeClient | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const outputAudioCtxRef = useRef<AudioContext | null>(null);
	const nextPlayTimeRef = useRef<number>(0);
	const [active, setActive] = useState(false);
	const [chat, setChat] = useState<ChatMessage[]>([]);

	const playAudioChunk = useCallback(async (audioData: Int16Array) => {
		try {
			// Initialize AudioContext if needed with proper sample rate
			if (!outputAudioCtxRef.current) {
				const AudioContextCtor =
					window.AudioContext ||
					(window as unknown as { webkitAudioContext: typeof AudioContext })
						.webkitAudioContext;
				outputAudioCtxRef.current = new AudioContextCtor({ sampleRate: 24000 });
			}

			const audioCtx = outputAudioCtxRef.current;
			if (!audioCtx) return;

			// Resume AudioContext if suspended
			if (audioCtx.state === "suspended") {
				await audioCtx.resume();
			}

			// Convert Int16Array to AudioBuffer (OpenAI uses 24kHz PCM16)
			const buffer = audioCtx.createBuffer(1, audioData.length, 24000);
			const channelData = buffer.getChannelData(0);

			// Convert Int16 to Float32 for Web Audio API with proper normalization
			for (let i = 0; i < audioData.length; i++) {
				const sample = audioData[i];
				if (sample !== undefined) {
					channelData[i] = sample / 0x8000;
				}
			}

			// Create and schedule audio source
			const source = audioCtx.createBufferSource();
			source.buffer = buffer;
			source.connect(audioCtx.destination);

			// Calculate scheduling time for smooth streaming
			const currentTime = audioCtx.currentTime;

			// Reset timing if there's been a gap in audio (more than 100ms)
			if (nextPlayTimeRef.current < currentTime - 0.1) {
				nextPlayTimeRef.current = currentTime;
			}

			const scheduledTime = Math.max(currentTime, nextPlayTimeRef.current);
			source.start(scheduledTime);

			// Update next play time for smooth concatenation
			nextPlayTimeRef.current = scheduledTime + buffer.duration;
		} catch (error) {
			console.error("Error playing audio chunk:", error);
		}
	}, []);

	const mapConversationToChat = useCallback((): ChatMessage[] => {
		if (!clientRef.current) return [];
		const rawItems = clientRef.current.conversation.getItems();
		return rawItems
			.filter(
				(it) =>
					it.type === "message" &&
					(it.role === "user" || it.role === "assistant"),
			)
			.map((it) => {
				let text = "";
				if (Array.isArray(it.content)) {
					for (const c of it.content) {
						if (c.type === "input_text" || c.type === "text") text = c.text;
						else if (
							(c.type === "input_audio" || c.type === "audio") &&
							c.transcript
						)
							text = c.transcript;
					}
				}
				return {
					id: it.id,
					role: it.role ?? "assistant",
					text,
					isStreaming: it.status === "in_progress",
				};
			});
	}, []);

	const refreshChat = useCallback(() => {
		setChat(mapConversationToChat());
	}, [mapConversationToChat]);

	const setupMic = useCallback(async () => {
		if (micStreamRef.current) return;
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				channelCount: 1,
			},
		});
		micStreamRef.current = stream;

		// Create AudioContext with proper type handling
		const AudioContextClass =
			window.AudioContext || (window as any).webkitAudioContext;
		const audioCtx = new AudioContextClass();
		audioCtxRef.current = audioCtx;

		const source = audioCtx.createMediaStreamSource(stream);
		// Use larger buffer size for better performance
		const processor = audioCtx.createScriptProcessor(4096, 1, 1);

		// Despite being deprecated, ScriptProcessorNode is still widely supported
		// and the easiest way to access raw audio data for streaming to OpenAI
		processor.onaudioprocess = (e: AudioProcessingEvent) => {
			if (!clientRef.current?.isConnected()) return;
			const input = e.inputBuffer.getChannelData(0);
			if (!input) return;

			// Convert Float32 to Int16 for OpenAI (PCM16 format)
			const int16 = new Int16Array(input.length);
			for (let i = 0; i < input.length; i++) {
				const sample = input[i];
				if (sample !== undefined) {
					const s = Math.max(-1, Math.min(1, sample));
					int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
				}
			}
			clientRef.current.appendInputAudio(int16);
		};

		source.connect(processor);
		processor.connect(audioCtx.destination);
	}, []);

	const start = useCallback(async () => {
		if (clientRef.current?.isConnected()) return;
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

		// Add flashcard tools
		client.addTool(
			{
				name: "get_current_flashcard",
				description:
					"Get information about the current flashcard being studied",
				parameters: {
					type: "object",
					properties: {},
				},
			},
			async () => {
				const store = useFlashcardsStore.getState();
				const currentCard = store.getCurrentCard();
				return {
					card: currentCard,
					showingBack: store.showBack,
					index: store.index,
					total: store.cards.length,
					completed: store.completed,
				};
			},
		);

		client.addTool(
			{
				name: "flip_flashcard",
				description: "Flip the current flashcard to show/hide the answer",
				parameters: {
					type: "object",
					properties: {},
				},
			},
			async () => {
				const store = useFlashcardsStore.getState();
				store.flip();
				const currentCard = store.getCurrentCard();
				return {
					card: currentCard,
					showingBack: store.showBack,
					flipped: true,
				};
			},
		);

		client.addTool(
			{
				name: "next_flashcard",
				description: "Advance to the next flashcard in the deck",
				parameters: {
					type: "object",
					properties: {},
				},
			},
			async () => {
				const store = useFlashcardsStore.getState();
				store.next();
				const currentCard = store.getCurrentCard();
				return {
					card: currentCard,
					showingBack: store.showBack,
					index: store.index,
					total: store.cards.length,
					completed: store.completed,
				};
			},
		);

		client.addTool(
			{
				name: "restart_flashcards",
				description: "Restart the flashcard deck from the beginning",
				parameters: {
					type: "object",
					properties: {},
				},
			},
			async () => {
				const store = useFlashcardsStore.getState();
				store.restart();
				const currentCard = store.getCurrentCard();
				return {
					card: currentCard,
					showingBack: store.showBack,
					index: store.index,
					total: store.cards.length,
					completed: store.completed,
					restarted: true,
				};
			},
		);

		const onConversationChange = (event: {
			item?: unknown;
			delta?: { audio?: Int16Array };
		}) => {
			const { delta } = event;
			if (delta?.audio) {
				// Play audio chunk directly for real-time playback
				playAudioChunk(delta.audio);
			}
			refreshChat();
		};

		const onInterrupted = () => {
			// Reset audio timing on interruption for cleaner playback
			nextPlayTimeRef.current = 0;
		};

		client.on("error", (err: unknown) =>
			console.error("[realtime:error]", err),
		);
		client.on("conversation.updated", onConversationChange);
		client.on("conversation.item.appended", onConversationChange);
		client.on("conversation.item.completed", onConversationChange);
		client.on("conversation.interrupted", onInterrupted);

		await client.connect();
		await client.waitForSessionCreated();

		clientRef.current = client;
		await setupMic();
		setActive(true);
		refreshChat();
	}, [refreshChat, setupMic, playAudioChunk]);

	const stop = useCallback(() => {
		if (clientRef.current) {
			try {
				clientRef.current.disconnect();
			} catch {}
			clientRef.current = null;
		}
		if (micStreamRef.current) {
			for (const track of micStreamRef.current.getTracks()) track.stop();
			micStreamRef.current = null;
		}
		if (audioCtxRef.current) {
			audioCtxRef.current.close().catch(() => {});
			audioCtxRef.current = null;
		}
		if (outputAudioCtxRef.current) {
			outputAudioCtxRef.current.close().catch(() => {});
			outputAudioCtxRef.current = null;
		}
		nextPlayTimeRef.current = 0;
		setActive(false);
		setChat([]);
	}, []);

	const reset = useCallback(() => {
		if (clientRef.current) {
			const items = clientRef.current.conversation.getItems();
			for (const it of items) clientRef.current.deleteItem(it.id);
		}
		// Reset audio timing
		nextPlayTimeRef.current = 0;
		refreshChat();
	}, [refreshChat]);

	const sendUserText = useCallback((text: string) => {
		if (!clientRef.current?.isConnected()) return;
		clientRef.current.sendUserMessageContent([{ type: "input_text", text }]);
	}, []);

	useEffect(() => () => stop(), [stop]);

	return { active, start, stop, chat, sendUserText, reset };
}
