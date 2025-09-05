"use client";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useRealtime } from "./useRealtime";
import { Mic, Square, RotateCcw } from "lucide-react";

export default function VoiceRealtime() {
	const { active, start, stop, chat, reset } = useRealtime();

	const toggle = async () => {
		if (active) {
			stop();
		} else {
			await start();
		}
	};

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<div className="flex items-center gap-4">
				<div className="flex flex-col items-center gap-2">
					<Button
						variant={active ? "destructive" : "default"}
						onClick={toggle}
						className={`relative h-20 w-20 rounded-full p-0 text-white shadow-md transition hover:shadow-lg ${
							active ? "" : "bg-primary"
						}`}
					>
						{active && (
							<span
								className="absolute inset-0 -z-10 animate-ping rounded-full bg-red-500/40"
								aria-hidden="true"
							/>
						)}
						{active ? (
							<Square className="h-8 w-8" />
						) : (
							<Mic className="h-8 w-8" />
						)}
						<span className="sr-only">
							{active ? "Stop recording" : "Start recording"}
						</span>
					</Button>
					<div className="text-xs font-medium text-muted-foreground">
						{active ? "Listening..." : "Idle"}
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={reset}
					disabled={!chat.length && !active}
					className="hover:text-foreground text-muted-foreground"
				>
					<RotateCcw className="mr-1 h-4 w-4" /> Reset
				</Button>
			</div>
			<div className="w-full overflow-hidden rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/40">
				<ScrollArea className="h-80 pr-4">
					<div className="flex flex-col gap-3">
						{chat.map((m) => (
							<div
								key={m.id}
								className={`flex ${
									m.role === "user" ? "justify-end" : "justify-start"
								}`}
							>
								<div
									className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 ring-border/40 ${
										m.role === "user"
											? "bg-primary text-primary-foreground"
											: "bg-muted text-foreground"
									} ${m.isStreaming ? "opacity-70" : ""}`}
								>
									<span>
										{m.text ||
											(m.role === "user" ? "(You spoke)" : "(Thinking...)")}
									</span>
									{m.isStreaming && (
										<span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-current align-middle" />
									)}
								</div>
							</div>
						))}
						{!chat.length && (
							<div className="text-center text-sm text-muted-foreground">
								No messages yet. Press the mic to start.
							</div>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
