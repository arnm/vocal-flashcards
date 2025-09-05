import { useFlashcardsStore } from "~/lib/flashcardsStore";
import type { RealtimeTool } from "./types";

export const FLASHCARD_TOOLS: RealtimeTool[] = [
	{
		name: "get_current_flashcard",
		description: "Get information about the current flashcard being studied",
		parameters: { type: "object", properties: {} },
		handler: () => {
			const store = useFlashcardsStore.getState();
			const currentCard = store.getCurrentCard();
			return {
				card: currentCard,
				showingBack: store.showBack,
				index: store.index,
				total: store.cards.length,
				completed: store.completed,
			};
		},
	},
	{
		name: "flip_flashcard",
		description: "Flip the current flashcard to show/hide the answer",
		parameters: { type: "object", properties: {} },
		handler: () => {
			const store = useFlashcardsStore.getState();
			store.flip();
			const currentCard = store.getCurrentCard();
			return {
				card: currentCard,
				showingBack: store.showBack,
				flipped: true,
			};
		},
	},
	{
		name: "next_flashcard",
		description: "Advance to the next flashcard in the deck",
		parameters: { type: "object", properties: {} },
		handler: () => {
			const store = useFlashcardsStore.getState();
			store.next();
			const currentCard = store.getCurrentCard();
			return {
				card: currentCard,
				showingBack: store.showBack,
				index: store.index,
				total: store.cards.length,
				completed: store.completed,
			};
		},
	},
	{
		name: "restart_flashcards",
		description: "Restart the flashcard deck from the beginning",
		parameters: { type: "object", properties: {} },
		handler: () => {
			const store = useFlashcardsStore.getState();
			store.restart();
			const currentCard = store.getCurrentCard();
			return {
				card: currentCard,
				showingBack: store.showBack,
				index: store.index,
				total: store.cards.length,
				completed: store.completed,
				restarted: true,
			};
		},
	},
];

export function toOpenAITools(tools: RealtimeTool[]) {
	return tools.map((t) => ({
		name: t.name,
		description: t.description,
		parameters: t.parameters,
	}));
}
