import { getAudioContextCtor } from "./audio";

export interface PlayAudioOptions {
	data: Int16Array;
	sampleRate: number;
}

let sharedOutputContext: AudioContext | null = null;
let nextPlayTime = 0;

export async function playPCM16(options: PlayAudioOptions): Promise<void> {
	const { data, sampleRate } = options;

	try {
		// Initialize or reuse AudioContext
		if (!sharedOutputContext) {
			const AudioContextClass = getAudioContextCtor();
			sharedOutputContext = new AudioContextClass({ sampleRate });
		}

		const audioCtx = sharedOutputContext;
		if (!audioCtx) return;

		// Resume if suspended
		if (audioCtx.state === "suspended") {
			await audioCtx.resume();
		}

		// Convert Int16Array to AudioBuffer
		const buffer = audioCtx.createBuffer(1, data.length, sampleRate);
		const channelData = buffer.getChannelData(0);

		// Convert Int16 to Float32 for Web Audio API
		for (let i = 0; i < data.length; i++) {
			const sample = data[i] ?? 0;
			channelData[i] = sample / 0x8000;
		}

		// Create and schedule audio source
		const source = audioCtx.createBufferSource();
		source.buffer = buffer;
		source.connect(audioCtx.destination);

		// Calculate scheduling time for smooth streaming
		const currentTime = audioCtx.currentTime;

		// Reset timing if there's been a gap (more than 100ms)
		if (nextPlayTime < currentTime - 0.1) {
			nextPlayTime = currentTime;
		}

		const scheduledTime = Math.max(currentTime, nextPlayTime);
		source.start(scheduledTime);

		// Update next play time for smooth concatenation
		nextPlayTime = scheduledTime + buffer.duration;
	} catch (error) {
		console.error("Error playing audio chunk:", error);
	}
}

export function resetAudioTiming(): void {
	nextPlayTime = 0;
}

export function closeAudioContext(): void {
	if (sharedOutputContext) {
		sharedOutputContext.close().catch(() => {});
		sharedOutputContext = null;
	}
	nextPlayTime = 0;
}
