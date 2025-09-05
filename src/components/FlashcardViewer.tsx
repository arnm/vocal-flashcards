"use client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { RotateCcw, Eye, ArrowRight } from "lucide-react";
import { useFlashcardsStore } from "~/lib/flashcardsStore";

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
			<Card className="w-full max-w-md mx-auto">
				<CardContent className="pt-6">
					<div className="text-center text-muted-foreground">
						No flashcards available
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle className="text-center text-sm text-muted-foreground">
					Card {index + 1} of {cards.length}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="min-h-[120px] flex items-center justify-center rounded-lg border-2 border-dashed border-border p-6">
					<div className="text-center">
						<div className="text-lg font-medium">
							{showBack ? currentCard.back : currentCard.front}
						</div>
						{!showBack && (
							<div className="mt-2 text-xs text-muted-foreground">
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
					<div className="text-center text-sm text-green-600 font-medium">
						🎉 You completed all flashcards!
					</div>
				)}
			</CardContent>
		</Card>
	);
}
