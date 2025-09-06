"use client";
import type { PropsWithChildren } from "react";
import { cn } from "~/lib/utils";

interface ChatContainerProps extends PropsWithChildren {
	className?: string;
}

export function ChatContainer({ children, className }: ChatContainerProps) {
	return (
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-2xl border border-border/40 bg-background/50 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/30",
				className,
			)}
		>
			{children}
		</div>
	);
}
