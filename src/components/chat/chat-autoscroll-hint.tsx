"use client";
import { ArrowDown } from "lucide-react";
import { Button } from "~/components/ui/button";

interface ChatAutoScrollHintProps {
	visible: boolean;
	onClick: () => void;
}

export function ChatAutoScrollHint({
	visible,
	onClick,
}: ChatAutoScrollHintProps) {
	if (!visible) return null;
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
			<Button
				variant="secondary"
				size="sm"
				onClick={onClick}
				className="pointer-events-auto text-xs shadow-sm"
			>
				<ArrowDown className="mr-1 h-3 w-3" />
				Jump to newest
			</Button>
		</div>
	);
}
