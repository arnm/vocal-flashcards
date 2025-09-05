import { create } from "zustand";

export interface Flashcard {
	id: string;
	front: string;
	back: string;
}

interface FlashcardsState {
	cards: Flashcard[];
	index: number;
	showBack: boolean;
	completed: boolean;
}

interface FlashcardsActions {
	flip: () => void;
	next: () => void;
	restart: () => void;
	getCurrentCard: () => Flashcard | null;
}

type FlashcardsStore = FlashcardsState & FlashcardsActions;

const demoCards: Flashcard[] = [
	{ id: "1", front: "Hola", back: "Hello" },
	{ id: "2", front: "Gracias", back: "Thank you" },
	{ id: "3", front: "¿Cómo estás?", back: "How are you?" },
	{ id: "4", front: "Adiós", back: "Goodbye" },
	{ id: "5", front: "Por favor", back: "Please" },
];

export const useFlashcardsStore = create<FlashcardsStore>((set, get) => ({
	cards: demoCards,
	index: 0,
	showBack: false,
	completed: false,

	flip: () => {
		set((state) => ({ showBack: !state.showBack }));
	},

	next: () => {
		const state = get();
		const isLastCard = state.index >= state.cards.length - 1;

		if (isLastCard) {
			set({ completed: true });
		} else {
			set({
				index: state.index + 1,
				showBack: false,
				completed: false,
			});
		}
	},

	restart: () => {
		set({
			index: 0,
			showBack: false,
			completed: false,
		});
	},

	getCurrentCard: () => {
		const state = get();
		return state.cards[state.index] || null;
	},
}));
