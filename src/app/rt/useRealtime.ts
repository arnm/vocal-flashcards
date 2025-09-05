"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface ChatItem {
	id: string;
	role: "user" | "assistant";
	text: string;
	pending?: boolean;
}

interface RealtimeEvent {
	type: string;
	[key: string]: any;
}

export function useRealtime() {
	const pcRef = useRef<RTCPeerConnection | null>(null);
	const dataRef = useRef<RTCDataChannel | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [active, setActive] = useState(false);
	const [chat, setChat] = useState<ChatItem[]>([]);

	// Per-item buffers
	const assistantBuffersRef = useRef<Record<string, string>>({});
	const userBuffersRef = useRef<Record<string, string>>({});
	const streamingAssistantIdRef = useRef<string | null>(null);
	const transcriptionModels = [
		"gpt-4o-mini-transcribe",
		"gpt-4o-transcribe",
		"whisper-1",
		"", // final attempt: omit model, let server default
	];
	const transcriptionAttemptRef = useRef(0);

	const sendTranscriptionUpdate = useCallback(() => {
		if (!dataRef.current) return;
		const model = transcriptionModels[transcriptionAttemptRef.current];
		const payload: any = {
			type: "session.update",
			session: {
				input_audio_transcription: {
					enabled: true,
				},
			},
		};
		if (model) {
			payload.session.input_audio_transcription.model = model;
		}
		console.log("Sending transcription enable payload:", payload);
		dataRef.current.send(JSON.stringify(payload));
	}, []);

	const handleEvent = useCallback(
		(e: RealtimeEvent) => {
			console.log("Received event:", e.type, e);

			if (e.type === "session.updated") {
				const cfg = e.session?.input_audio_transcription;
				console.log("Session updated - transcription config:", cfg);
				if (
					(!cfg || cfg.enabled !== true) &&
					transcriptionAttemptRef.current < transcriptionModels.length - 1
				) {
					transcriptionAttemptRef.current += 1;
					// Will retry with next model when connection is ready
					if (dataRef.current && dataRef.current.readyState === "open") {
						sendTranscriptionUpdate();
					}
				}
			} else if (e.type === "conversation.item.created") {
				// Handle server-side conversation item creation (both user and assistant messages)
				const item = e.item;
				console.log("conversation.item.created:", item);

				if (
					item.type === "message" &&
					item.content &&
					item.content.length > 0
				) {
					const content = item.content[0];
					let text = "";

					if (content.type === "input_text") {
						text = content.text;
					} else if (content.type === "text") {
						text = content.text;
					} else if (content.type === "input_audio") {
						if (content.transcript) {
							text = content.transcript;
						} else {
							text = "(User spoke - transcription pending...)";
						}
					}

					console.log("Extracted text:", text, "from content:", content);

					if (text) {
						setChat((c) => {
							// Avoid duplicates by checking if item already exists
							const exists = c.find((msg) => msg.id === item.id);
							if (exists) {
								console.log("Message already exists, skipping");
								return c;
							}

							const newMessage = {
								id: item.id,
								role: item.role as "user" | "assistant",
								text: text,
							};
							console.log("Adding new message:", newMessage);
							return [...c, newMessage];
						});
					}
				}
			} else if (
				e.type === "conversation.item.input_audio_transcription.delta"
			) {
				// User incremental transcription
				const { item_id, delta } = e;
				if (!item_id || !delta) return;
				userBuffersRef.current[item_id] = (
					userBuffersRef.current[item_id] || ""
				).concat(delta);
				setChat((c) =>
					c.map((m) =>
						m.id === item_id
							? { ...m, text: userBuffersRef.current[item_id] || "" }
							: m,
					),
				);
			} else if (
				e.type === "conversation.item.input_audio_transcription.completed"
			) {
				const { item_id, transcript } = e;
				if (!item_id) return;
				userBuffersRef.current[item_id] =
					transcript || userBuffersRef.current[item_id] || "";
				setChat((c) =>
					c.map((m) =>
						m.id === item_id
							? { ...m, text: userBuffersRef.current[item_id] || "" }
							: m,
					),
				);
			} else if (
				e.type === "conversation.item.input_audio_transcription.failed"
			) {
				const { item_id, error } = e;
				console.warn("User transcription failed:", error);
				if (item_id) {
					setChat((c) =>
						c.map((m) =>
							m.id === item_id
								? { ...m, text: "(User audio – transcription failed)" }
								: m,
						),
					);
				}
			} else if (e.type === "response.audio_transcript.delta") {
				// Assistant streaming
				const { item_id, delta } = e;
				if (!item_id || !delta) return;
				const prev = assistantBuffersRef.current[item_id] || "";
				// Dedup guard: avoid naive double concatenation
				if (prev.endsWith(delta)) {
					return;
				}
				// If delta is a refinement (entirely overlaps) skip; if delta contained inside prev, ignore
				if (prev.includes(delta)) {
					return;
				}
				assistantBuffersRef.current[item_id] = prev + delta;
				setChat((c) => {
					if (streamingAssistantIdRef.current) {
						return c.map((m) =>
							m.id === streamingAssistantIdRef.current
								? { ...m, text: assistantBuffersRef.current[item_id] || "" }
								: m,
						);
					}
					streamingAssistantIdRef.current = "assistant-stream";
					return [
						...c,
						{
							id: "assistant-stream",
							role: "assistant",
							text: assistantBuffersRef.current[item_id] || "",
							pending: true,
						},
					];
				});
			} else if (e.type === "response.audio_transcript.done") {
				const { item_id } = e;
				if (!item_id) return;
				const finalText = assistantBuffersRef.current[item_id] || "";
				setChat((c) => {
					const withoutStream = c.filter(
						(m) => m.id !== streamingAssistantIdRef.current,
					);
					streamingAssistantIdRef.current = null;
					return [
						...withoutStream,
						{ id: item_id, role: "assistant", text: finalText },
					];
				});
			}
		},
		[sendTranscriptionUpdate],
	);

	const sendUserText = (text: string) => {
		if (!dataRef.current || dataRef.current.readyState !== "open") return;

		// Immediately add user message to UI (fallback in case server doesn't send conversation.item.created)
		const userMessage = {
			id: crypto.randomUUID(),
			role: "user" as const,
			text: text,
		};
		setChat((c) => [...c, userMessage]);

		// Send message to server
		const message = {
			event_id: crypto.randomUUID(),
			type: "conversation.item.create",
			item: {
				id: userMessage.id, // Use same ID so server event won't duplicate
				type: "message",
				role: "user",
				content: [{ type: "input_text", text }],
			},
		};
		console.log("Sending user message:", message);
		dataRef.current.send(JSON.stringify(message));
		dataRef.current.send(JSON.stringify({ type: "response.create" }));
	};

	const start = useCallback(async () => {
		if (pcRef.current) return;
		const r = await fetch("/api/rt/ephemeral", { method: "POST" });
		if (!r.ok) throw new Error("ephemeral key failed");
		const { ephemeralKey } = await r.json();

		const pc = new RTCPeerConnection();
		pcRef.current = pc;

		const mic = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				channelCount: 1,
			},
		});
		mic.getAudioTracks().forEach((t) => pc.addTrack(t, mic));

		pc.ontrack = (e) => {
			if (!audioRef.current) {
				audioRef.current = new Audio();
				audioRef.current.autoplay = true;
			}
			audioRef.current.srcObject = e.streams[0];
		};

		dataRef.current = pc.createDataChannel("oai-events");
		dataRef.current.onmessage = (m) => {
			try {
				handleEvent(JSON.parse(m.data));
			} catch {}
		};
		dataRef.current.onopen = () => {
			sendTranscriptionUpdate();
			setActive(true);
		};
		pc.ondatachannel = (ev) => {
			ev.channel.onmessage = (m) => {
				try {
					handleEvent(JSON.parse(m.data));
				} catch {}
			};
		};

		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);

		const sdpResp = await fetch(
			"https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${ephemeralKey}`,
					"Content-Type": "application/sdp",
				},
				body: offer.sdp,
			},
		);
		if (!sdpResp.ok) throw new Error("SDP exchange failed");
		await pc.setRemoteDescription({
			type: "answer",
			sdp: await sdpResp.text(),
		});
	}, [handleEvent, sendTranscriptionUpdate]);

	const stop = useCallback(() => {
		setActive(false);
		dataRef.current?.close();
		pcRef.current?.getSenders().forEach((s) => s.track?.stop());
		pcRef.current?.close();
		pcRef.current = null;
	}, []);

	useEffect(() => () => stop(), [stop]);

	return { active, start, stop, chat, sendUserText };
}
