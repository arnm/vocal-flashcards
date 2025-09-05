"use client";
import { ArrowRight, Eye, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useFlashcardsStore } from "~/lib/flashcards/flashcards-store";

export function FlashcardViewer() {
	const {
		getCurrentCard,
		showBack,
		completed,
		index,
		cards,
		flip,
		next,
		restart,
	} = useFlashcardsStore();

	const currentCard = getCurrentCard();
	const isLastCard = index >= cards.length - 1;

	if (!currentCard) {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardContent className="pt-6">
					<div className="text-center text-muted-foreground">
						No flashcards available
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center text-muted-foreground text-sm">
					Card {index + 1} of {cards.length}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex min-h-[120px] items-center justify-center rounded-lg border-2 border-border border-dashed p-6">
					<div className="text-center">
						<div className="font-medium text-lg">
							{showBack ? currentCard.back : currentCard.front}
						</div>
						{!showBack && (
							<div className="mt-2 text-muted-foreground text-xs">
								Click "Flip" to see the answer
							</div>
						)}
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={flip}
						className="flex-1"
						disabled={completed}
					>
						<Eye className="mr-2 h-4 w-4" />
						Flip
					</Button>
					<Button onClick={next} disabled={completed} className="flex-1">
						<ArrowRight className="mr-2 h-4 w-4" />
						{isLastCard ? "Finish" : "Next"}
					</Button>
				</div>

				{(completed || isLastCard) && (
					<Button variant="secondary" onClick={restart} className="w-full">
						<RotateCcw className="mr-2 h-4 w-4" />
						Restart
					</Button>
				)}

				{completed && (
					<div className="text-center font-medium text-green-600 text-sm">
						🎉 You completed all flashcards!
					</div>
				)}
			</CardContent>
		</Card>
	);
}
