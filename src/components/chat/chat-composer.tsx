"use client";
import { Mic, Square } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface ChatComposerProps {
	active: boolean;
	onToggle: () => void;
	onSend: (text: string) => void;
	showMic?: boolean; // show start button when no messages & not active
	micOnly?: boolean; // hide input & other UI, mic centered
}

interface MessageForm {
	message: string;
}

export function ChatComposer({
	active,
	onToggle,
	onSend,
	showMic,
	micOnly,
}: ChatComposerProps) {
	const { register, handleSubmit, reset } = useForm<MessageForm>();

	const submit = (data: MessageForm) => {
		const trimmed = data.message?.trim();
		if (trimmed) {
			onSend(trimmed);
			reset();
		}
	};

	// Mic-only minimal state
	if (micOnly) {
		return (
			<div className="flex w-full justify-center px-4 pt-4 pb-6">
				<Button
					onClick={onToggle}
					type="button"
					size="icon"
					className={cn(
						"h-14 w-14 rounded-full shadow-sm transition",
						active
							? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
							: "bg-primary text-primary-foreground hover:bg-primary/90",
					)}
					title={active ? "Stop session" : "Start session"}
				>
					{active ? (
						<Square className="h-6 w-6" />
					) : (
						<Mic className="h-6 w-6" />
					)}
					<span className="sr-only">
						{active ? "Stop recording" : "Start recording"}
					</span>
				</Button>
			</div>
		);
	}

	return (
		<div className="w-full px-4 pt-3 pb-4">
			<form onSubmit={handleSubmit(submit)} className="flex items-center gap-2">
				<div className="relative flex flex-1 items-center">
					{/* Using shadcn Input component */}
					{/* @ts-expect-error react-hook-form register spread */}
					<Input
						{...register("message")}
						placeholder={active ? "Type a message..." : "Press mic to start"}
						disabled={!active}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSubmit(submit)();
							}
						}}
						className="h-11"
					/>
				</div>
				{(showMic || active) && (
					<Button
						onClick={onToggle}
						type="button"
						size="icon"
						className={cn(
							"h-11 w-11 rounded-full shadow-sm transition",
							active
								? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
								: "bg-primary text-primary-foreground hover:bg-primary/90",
						)}
						title={active ? "Stop session" : "Start session"}
					>
						{active ? (
							<Square className="h-5 w-5" />
						) : (
							<Mic className="h-5 w-5" />
						)}
						<span className="sr-only">
							{active ? "Stop recording" : "Start recording"}
						</span>
					</Button>
				)}
			</form>
		</div>
	);
}
