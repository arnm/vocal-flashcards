"use client";
import type { ChatMessage } from "~/lib/realtime/types";
import { cn } from "~/lib/utils";

interface MessageBubbleProps {
	message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";
	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm transition",
					isUser
						? "bg-primary/90 text-primary-foreground"
						: "bg-background/40 backdrop-blur-sm",
					message.isStreaming ? "opacity-70" : "opacity-100",
				)}
			>
				<span>
					{message.text || (isUser ? "(You spoke)" : "(Thinking...)")}
				</span>
				{message.isStreaming && (
					<span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-current align-middle" />
				)}
			</div>
		</div>
	);
}
