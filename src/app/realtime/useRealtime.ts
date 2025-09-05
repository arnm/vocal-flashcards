"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeminiAdapter } from "./providers/gemini/adapter";
import { OpenAIAdapter } from "./providers/openai/adapter";
import type {
	ProviderAdapter,
	RealtimeProvider,
	RealtimeSession,
} from "./types";

function makeAdapter(provider: RealtimeProvider): ProviderAdapter {
	if (provider === "openai") return new OpenAIAdapter();
	return new GeminiAdapter();
}

export function useRealtime(): RealtimeSession {
	const [provider, setProvider] = useState<RealtimeProvider>("openai");
	const adapterRef = useRef<ProviderAdapter | null>(null);
	const unsubRef = useRef<null | (() => void)>(null);
	const [active, setActive] = useState(false);
	const [chat, setChat] = useState(
		[] as ReturnType<ProviderAdapter["getState"]>["chat"],
	);
	const [error, setError] = useState<Error | null>(null);
	const [switching, setSwitching] = useState(false);

	const ensureAdapter = useCallback(() => {
		if (!adapterRef.current) {
			const adapter = makeAdapter(provider);
			adapterRef.current = adapter;
			if (unsubRef.current) unsubRef.current();
			unsubRef.current = adapter.subscribe(() => {
				const s = adapter.getState();
				setActive(s.active);
				setChat(s.chat);
				setError(s.error);
			});
		}
	}, [provider]);

	useEffect(() => {
		return () => {
			if (unsubRef.current) unsubRef.current();
			adapterRef.current?.stop();
			adapterRef.current = null;
		};
	}, []);

	const start = useCallback(async () => {
		ensureAdapter();
		const adapter = adapterRef.current;
		if (!adapter) throw new Error("Adapter not initialized");
		await adapter.start();
	}, [ensureAdapter]);

	const stop = useCallback(() => {
		adapterRef.current?.stop();
	}, []);

	const reset = useCallback(() => {
		adapterRef.current?.reset();
	}, []);

	const sendUserText = useCallback((text: string) => {
		adapterRef.current?.sendUserText(text);
	}, []);

	const sendUserAudioChunk = useCallback((pcm16: Int16Array) => {
		adapterRef.current?.sendUserAudioChunk?.(pcm16);
	}, []);

	const capabilities = useMemo(() => {
		ensureAdapter();
		const adapter = adapterRef.current;
		return adapter
			? adapter.getCapabilities()
			: {
					audioIn: false,
					audioOut: false,
					toolCalls: false,
					transcriptionIn: false,
					transcriptionOut: false,
				};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ensureAdapter]);

	const changeProvider = useCallback(
		(p: RealtimeProvider) => {
			if (p === provider) return;
			setSwitching(true);
			try {
				adapterRef.current?.stop();
			} finally {
				adapterRef.current = null;
				if (unsubRef.current) unsubRef.current();
				unsubRef.current = null;
				setActive(false);
				setChat([]);
				setError(null);
				setProvider(p);
				setSwitching(false);
			}
		},
		[provider],
	);

	return {
		provider,
		active,
		switching,
		chat,
		start,
		stop,
		reset,
		sendUserText,
		sendUserAudioChunk,
		error,
		capabilities,
		setProvider: changeProvider,
	};
}
