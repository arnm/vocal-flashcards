"use client";
import type { RefObject } from "react";
import { MessageBubble } from "~/components/chat/message-bubble";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { ChatMessage } from "~/lib/realtime/types";
import { cn } from "~/lib/utils";

interface ChatMessagesListProps {
	chat: ChatMessage[];
	scrollRef: RefObject<HTMLDivElement | null>;
	reserveBottomSpace?: boolean;
}

export function ChatMessagesList({
	chat,
	scrollRef,
	reserveBottomSpace = false,
}: ChatMessagesListProps) {
	return (
		<div ref={scrollRef} className="h-full">
			<ScrollArea
				className={cn("h-full pr-3", reserveBottomSpace ? "pb-16" : "pb-4")}
			>
				<div className="flex flex-col gap-3 p-4 pt-2">
					{chat.map((m) => (
						<MessageBubble key={m.id} message={m} />
					))}
					{!chat.length && (
						<div className="py-8 text-center text-muted-foreground text-xs">
							No messages yet.
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
