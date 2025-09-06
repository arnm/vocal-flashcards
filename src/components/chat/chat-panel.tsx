"use client";
import { MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "~/components/chat/chat-composer";
import { ChatMessagesList } from "~/components/chat/chat-messages-list";
import { ProviderToggle } from "~/components/chat/provider-toggle";
import { useAutoScroll } from "~/components/chat/use-auto-scroll";
import { FlashcardViewer } from "~/components/flashcards/flashcard-viewer";
import { Button } from "~/components/ui/button";
import { useRealtime } from "~/hooks/use-realtime";
import { cn } from "~/lib/utils";

// 50/50 vertical split layout:
// - Top half: flashcards (centered)
// - Bottom half: chat area (header controls + optional messages panel + composer)
// - Keeps collapse/unread logic; removes dynamic overlay height calculations
export default function VoiceRealtime() {
	const { active, start, stop, chat, sendUserText, provider, setProvider } =
		useRealtime();
	const { scrollAreaRef, enableAutoScroll } = useAutoScroll(chat);

	const [open, setOpen] = useState(false); // collapsed by default
	const [unread, setUnread] = useState(0);
	const lastCountRef = useRef<number>(0);

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

	// Auto-close if chat emptied
	useEffect(() => {
		if (chat.length === 0 && open) setOpen(false);
	}, [chat.length, open]);

	const toggleSession = async () => {
		if (active) stop();
		else await start();
	};

	return (
		<div className="flex h-dvh flex-col">
			{/* Flashcards section (top half) */}
			<div className="flex min-h-0 flex-1 items-end justify-center px-4 pb-2">
				<div className="flex w-full max-w-3xl justify-center">
					<FlashcardViewer />
				</div>
			</div>

			{/* Chat section (bottom half) */}
			<div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
				<div
					className={cn(
						"mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-end",
					)}
				>
					{/* Messages panel (fills available space when open) */}
					{open && (
						<div className="mb-2 flex min-h-0 flex-1 flex-col">
							<div className="flex min-h-0 flex-1 flex-col justify-end">
								<div
									id="chat-messages"
									aria-label="Chat messages"
									className="flex max-h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background/60 shadow-lg ring-1 ring-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-background/30 dark:ring-white/10"
								>
									<ChatMessagesList chat={chat} scrollRef={scrollAreaRef} />
								</div>
							</div>
						</div>
					)}

					{/* Header row */}
					<div className="flex w-full items-center justify-center gap-2 py-1">
						<ProviderToggle provider={provider} onChangeAction={setProvider} />
						{chat.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setOpen((o) => !o)}
								aria-expanded={open}
								aria-controls={open ? "chat-messages" : undefined}
								className="group h-7 gap-1 font-medium text-xs"
							>
								<MessageSquare className="h-3 w-3 opacity-70 transition group-hover:opacity-100" />
								<span className="sr-only">Messages panel ({chat.length})</span>
								<span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 font-medium text-[10px] text-muted-foreground">
									{chat.length}
								</span>
								{!open && unread > 0 && (
									<span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/80 px-1 font-semibold text-[10px] text-primary-foreground">
										{unread > 99 ? "99+" : unread}
									</span>
								)}
							</Button>
						)}
					</div>

					{/* Composer (always at bottom of the bottom half) */}
					<div>
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
		</div>
	);
}
