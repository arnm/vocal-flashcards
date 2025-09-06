"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "~/lib/realtime/types";

export function useAutoScroll(chat: ChatMessage[]) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

	// Minimal distance from bottom (px) before we disengage.
	// Set very low so any meaningful scroll up disables auto-scroll.
	const DISENGAGE_THRESHOLD = 4;

	const queryViewport = useCallback(
		(root: HTMLDivElement | null) =>
			(root?.querySelector(
				'[data-slot="scroll-area-viewport"]',
			) as HTMLElement | null) ?? null,
		[],
	);

	const scrollToBottom = useCallback(() => {
		const root = scrollAreaRef.current;
		if (!root) return;
		const viewport = queryViewport(root);
		if (viewport) viewport.scrollTop = viewport.scrollHeight;
	}, [queryViewport]);

	const enableAutoScroll = useCallback(() => {
		setAutoScroll(true);
		scrollToBottom();
	}, [scrollToBottom]);

	useEffect(() => {
		const viewport = queryViewport(scrollAreaRef.current);
		if (!viewport) return;

		const handleScroll = () => {
			if (!autoScroll) return; // only detect disengage
			const diff =
				viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
			if (diff > DISENGAGE_THRESHOLD) setAutoScroll(false);
		};
		const handleWheel = (e: WheelEvent) => {
			// Upward wheel (negative deltaY) while at bottom-ish should disengage immediately.
			if (!autoScroll) return;
			if (e.deltaY < 0) setAutoScroll(false);
		};

		viewport.addEventListener("scroll", handleScroll, { passive: true });
		viewport.addEventListener("wheel", handleWheel, { passive: true });
		return () => {
			viewport.removeEventListener("scroll", handleScroll);
			viewport.removeEventListener("wheel", handleWheel);
		};
	}, [autoScroll, queryViewport]);

	useEffect(() => {
		if (autoScroll && chat.length > 0) {
			const t = setTimeout(scrollToBottom, 50);
			return () => clearTimeout(t);
		}
	}, [chat, autoScroll, scrollToBottom]);

	return { scrollAreaRef, autoScroll, enableAutoScroll } as const;
}
