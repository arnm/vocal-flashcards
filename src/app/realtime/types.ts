export interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	isStreaming?: boolean;
}

export type RealtimeProvider = "openai" | "gemini";

export interface RealtimeCapabilities {
	audioIn: boolean;
	audioOut: boolean;
	toolCalls: boolean;
	transcriptionIn: boolean;
	transcriptionOut: boolean;
}

export interface RealtimeSession {
	provider: RealtimeProvider;
	active: boolean;
	switching: boolean;
	chat: ChatMessage[];
	start(): Promise<void>;
	stop(): void;
	reset(): void;
	sendUserText(text: string): void;
	sendUserAudioChunk?(pcm16: Int16Array): void;
	error: Error | null;
	capabilities: RealtimeCapabilities;
	setProvider: (p: RealtimeProvider) => void;
}

export interface ProviderAdapterState {
	active: boolean;
	chat: ChatMessage[];
	error: Error | null;
}

export interface ProviderAdapter {
	start(): Promise<void>;
	stop(): void;
	reset(): void;
	sendUserText(text: string): void;
	sendUserAudioChunk?(pcm16: Int16Array): void;
	getState(): ProviderAdapterState;
	subscribe(listener: () => void): () => void;
	getCapabilities(): RealtimeCapabilities;
}

export interface RealtimeTool {
	name: string;
	description: string;
	parameters: { type: "object"; properties: Record<string, unknown> };
	handler: (args?: unknown) => Promise<unknown> | unknown;
}
