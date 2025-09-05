"use client";
import { ArrowDown, Mic, RotateCcw, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ProviderToggle } from "~/components/chat/provider-toggle";
import { FlashcardViewer } from "~/components/flashcards/flashcard-viewer";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useRealtime } from "~/hooks/use-realtime";

interface MessageForm {
	message: string;
}

export default function VoiceRealtime() {
	const {
		active,
		start,
		stop,
		chat,
		sendUserText,
		reset,
		provider,
		setProvider,
	} = useRealtime();
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

	const { register, handleSubmit, reset: resetForm } = useForm<MessageForm>();

	const toggle = async () => {
		if (active) {
			stop();
		} else {
			await start();
		}
	};

	const onSubmit = (data: MessageForm) => {
		if (data.message.trim()) {
			sendUserText(data.message.trim());
			resetForm();
		}
	};

	const scrollToBottom = useCallback(() => {
		if (scrollAreaRef.current) {
			const scrollElement = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, []);

	const enableAutoScroll = () => {
		setAutoScroll(true);
		scrollToBottom();
	};

	useEffect(() => {
		const viewport = scrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement | null;
		if (!viewport) return;

		const handleScroll = () => {
			const atBottom =
				Math.abs(
					viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
				) < 2;
			if (!atBottom && autoScroll) {
				setAutoScroll(false);
			}
		};

		viewport.addEventListener("scroll", handleScroll, { passive: true });
		return () => viewport.removeEventListener("scroll", handleScroll);
	}, [autoScroll]);

	useEffect(() => {
		if (autoScroll && chat.length > 0) {
			setTimeout(scrollToBottom, 100);
		}
	}, [chat, autoScroll, scrollToBottom]);

	return (
		<div className="flex w-full max-w-3xl flex-col gap-6">
			<div className="flex items-center justify-center">
				<ProviderToggle provider={provider} onChangeAction={setProvider} />
			</div>
			<FlashcardViewer />

			<div className="relative w-full overflow-hidden rounded-2xl border border-border/40 bg-background/50 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/30">
				<ScrollArea className="h-80 pr-3 pb-16" ref={scrollAreaRef}>
					<div className="flex flex-col gap-3 p-4">
						{chat.map(
							(message: {
								id: string;
								role: string;
								text: string;
								isStreaming?: boolean;
							}) => (
								<div
									key={message.id}
									className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
								>
									<div
										className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 transition ${
											message.role === "user"
												? "bg-primary/90 text-primary-foreground ring-primary/40"
												: "bg-background/60 ring-border/40 backdrop-blur-sm"
										} ${message.isStreaming ? "opacity-70" : "opacity-100"}`}
									>
										<span>
											{message.text ||
												(message.role === "user"
													? "(You spoke)"
													: "(Thinking...)")}
										</span>
										{message.isStreaming && (
											<span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-current align-middle" />
										)}
									</div>
								</div>
							),
						)}
						{!chat.length && (
							<div className="text-center text-muted-foreground text-sm">
								No messages yet. Use the mic or type a message.
							</div>
						)}
					</div>
				</ScrollArea>

				{!autoScroll && (
					<div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
						<Button
							variant="secondary"
							size="sm"
							onClick={enableAutoScroll}
							className="pointer-events-auto text-xs shadow-sm"
						>
							<ArrowDown className="mr-1 h-3 w-3" />
							Jump to newest
						</Button>
					</div>
				)}

				<div className="absolute inset-x-0 bottom-0 border-border/40 border-t bg-background/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={reset}
							disabled={!chat.length && !active}
							className="h-9 w-9 shrink-0"
							title="Reset conversation"
						>
							<RotateCcw className="h-4 w-4" />
							<span className="sr-only">Reset</span>
						</Button>

						<form onSubmit={handleSubmit(onSubmit)} className="relative flex-1">
							<Input
								{...register("message")}
								placeholder={
									active
										? "Type a message..."
										: "Start session to type messages"
								}
								className="pr-20"
								autoComplete="off"
								disabled={!active}
							/>
							<div className="absolute inset-y-0 right-1 flex items-center gap-1">
								<Button
									onClick={toggle}
									type="button"
									size="icon"
									className={`h-7 w-7 rounded-full ${
										active
											? "bg-red-500 text-white hover:bg-red-500/90"
											: "bg-primary text-primary-foreground hover:bg-primary/90"
									}`}
									title={active ? "Stop recording" : "Start recording"}
								>
									{active ? (
										<Square className="h-3 w-3" />
									) : (
										<Mic className="h-3 w-3" />
									)}
									<span className="sr-only">
										{active ? "Stop recording" : "Start recording"}
									</span>
								</Button>
								<Button
									type="submit"
									size="icon"
									className="h-7 w-7"
									disabled={!active}
								>
									<Send className="h-3 w-3" />
									<span className="sr-only">Send message</span>
								</Button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
