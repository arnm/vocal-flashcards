"use client";
import { useEffect, useState } from "react";
import type { ChatMessage } from "~/lib/realtime/types";
import { cn } from "~/lib/utils";

interface MessageBubbleProps {
	message: ChatMessage;
}

function AnimatedDots() {
	const frames = [".  ", ".. ", "..."] as const; // fixed width 3 chars
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIdx((i) => (i + 1) % frames.length);
		}, 500);
		return () => clearInterval(interval);
	}, []);

	return <span className="inline-block w-3 tabular-nums">{frames[idx]}</span>;
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
					{message.text ||
						(isUser ? (
							<>
								Transcribing
								<AnimatedDots />
							</>
						) : (
							"(Thinking...)"
						))}
				</span>
				{message.isStreaming && (
					<span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-current align-middle" />
				)}
			</div>
		</div>
	);
}
