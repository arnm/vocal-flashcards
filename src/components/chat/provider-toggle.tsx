"use client";
import { Button } from "~/components/ui/button";
import type { RealtimeProvider } from "~/lib/realtime/types";

export function ProviderToggle(props: {
	provider: RealtimeProvider;
	onChangeAction: (p: RealtimeProvider) => void;
	className?: string;
}) {
	const { provider, onChangeAction: onChange, className } = props;
	const isOpenAI = provider === "openai";
	return (
		<div className={className}>
			<div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 text-xs">
				<Button
					variant={isOpenAI ? "default" : "ghost"}
					size="sm"
					onClick={() => onChange("openai")}
					className="h-7 rounded-full px-3"
				>
					OpenAI
				</Button>
				<Button
					variant={!isOpenAI ? "default" : "ghost"}
					size="sm"
					onClick={() => onChange("gemini")}
					className="h-7 rounded-full px-3"
				>
					Gemini
				</Button>
			</div>
		</div>
	);
}
