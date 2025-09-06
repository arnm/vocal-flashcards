"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "~/components/chat/chat-composer";
import { ChatMessagesList } from "~/components/chat/chat-messages-list";
import { ProviderToggle } from "~/components/chat/provider-toggle";
import { useAutoScroll } from "~/components/chat/use-auto-scroll";
import { FlashcardViewer } from "~/components/flashcards/flashcard-viewer";
import { Button } from "~/components/ui/button";
import { useRealtime } from "~/hooks/use-realtime";
import { cn } from "~/lib/utils";

// Hybrid layout:
// - Toggle row sits in normal flow just above the composer (always visible & centered)
// - Messages panel is absolutely positioned relative to the toggle row container and expands upward
// - No panel (and no border) when collapsed => true compact idle state
// - Flashcards never reflow/shift when panel opens (overlay)
export default function VoiceRealtime() {
	const { active, start, stop, chat, sendUserText, provider, setProvider } =
		useRealtime();
	const { scrollAreaRef, autoScroll, enableAutoScroll } = useAutoScroll(chat);

	const [open, setOpen] = useState(false);
	const [unread, setUnread] = useState(0);
	const lastCountRef = useRef<number>(0);
	const composerRef = useRef<HTMLDivElement | null>(null);
	const toggleRowRef = useRef<HTMLDivElement | null>(null);

	const [composerHeight, setComposerHeight] = useState(96);
	const [toggleHeight, setToggleHeight] = useState(40);
	const [viewportHeight, setViewportHeight] = useState<number>(
		typeof window !== "undefined" ? window.innerHeight : 0,
	);

	// Viewport resize tracking
	useEffect(() => {
		const onResize = () => setViewportHeight(window.innerHeight);
		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	// Composer height observer (multiline growth safety)
	useEffect(() => {
		if (!composerRef.current) return;
		const el = composerRef.current;
		const ro = new ResizeObserver(() =>
			setComposerHeight(el.getBoundingClientRect().height),
		);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Toggle row height observer (future-proof if more controls added)
	useEffect(() => {
		if (!toggleRowRef.current) return;
		const el = toggleRowRef.current;
		const ro = new ResizeObserver(() =>
			setToggleHeight(el.getBoundingClientRect().height),
		);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Unread tracking while closed
	useEffect(() => {
		if (!open && chat.length > lastCountRef.current) {
			setUnread((u) => u + (chat.length - lastCountRef.current));
		}
		lastCountRef.current = chat.length;
	}, [chat.length, open]);

	// Clear unread on open
	useEffect(() => {
		if (open && unread) setUnread(0);
	}, [open, unread]);

	// Scroll to bottom when opening
	useEffect(() => {
		if (open) enableAutoScroll();
	}, [open, enableAutoScroll]);

	// Force close if chat becomes empty
	useEffect(() => {
		if (chat.length === 0 && open) setOpen(false);
	}, [chat.length, open]);

	const toggleSession = async () => {
		if (active) stop();
		else await start();
	};

	// Compute available vertical space above toggle row (leave a top margin)
	const availableAboveToggle = Math.max(
		0,
		viewportHeight - composerHeight - toggleHeight - 56 /* top safety margin */,
	);
	const maxPeekHeight = Math.min(300, Math.round(viewportHeight * 0.45));
	const panelHeight = Math.min(availableAboveToggle, maxPeekHeight);
	const panelId = "chat-panel";

	return (
		<div className="flex h-dvh flex-col">
			{/* Flashcards central area */}
			<div className="relative flex flex-1 items-center justify-center px-4">
				<div className="flex w-full max-w-3xl justify-center">
					<FlashcardViewer />
				</div>
			</div>

			{/* Toggle + upward expanding overlay panel (absolute) */}
			<div className="px-4">
				<div
					ref={toggleRowRef}
					className="relative mx-auto flex w-full max-w-3xl flex-col items-center"
				>
					{open && (
						<div
							id={panelId}
							role="region"
							aria-label="Chat messages"
							className={cn(
								"absolute bottom-full z-10 mb-1 w-full overflow-hidden rounded-md border bg-background/90 shadow-sm backdrop-blur transition-[height] duration-150 ease-out",
							)}
							style={{ height: panelHeight }}
						>
							<div className="relative flex h-full flex-col">
								<ChatMessagesList chat={chat} scrollRef={scrollAreaRef} />
							</div>
						</div>
					)}

					{/* Centered controls row */}
					<div className="flex items-center gap-2 py-1">
						<ProviderToggle provider={provider} onChangeAction={setProvider} />
						{chat.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setOpen((o) => !o)}
								aria-expanded={open}
								aria-controls={open ? panelId : undefined}
								className="group h-7 gap-1 font-medium text-xs"
							>
								{open ? (
									<ChevronDown className="h-3 w-3 opacity-70 transition group-hover:opacity-100" />
								) : (
									<ChevronUp className="h-3 w-3 opacity-70 transition group-hover:opacity-100" />
								)}
								<span className="opacity-70 group-hover:opacity-100">
									Chat ({chat.length})
								</span>
								{!open && unread > 0 && (
									<span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/80 px-1 font-semibold text-[10px] text-primary-foreground">
										{unread > 99 ? "99+" : unread}
									</span>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Composer */}
			<div ref={composerRef} className="px-4 pb-2">
				<div className="mx-auto w-full max-w-3xl">
					<ChatComposer
						active={active}
						onToggle={async () => void toggleSession()}
						onSend={sendUserText}
						showMic={!active && chat.length === 0}
						micOnly={!active && chat.length === 0}
					/>
				</div>
			</div>
		</div>
	);
}
