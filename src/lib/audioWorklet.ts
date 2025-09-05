"use client";

export class AudioWorkletManager {
	private audioContext: AudioContext | null = null;
	private micStream: MediaStream | null = null;
	private audioWorkletNode: AudioWorkletNode | null = null;
	private source: MediaStreamAudioSourceNode | null = null;
	private onAudioData: ((audioData: Int16Array) => void) | null = null;

	async initialize(
		onAudioCallback: (audioData: Int16Array) => void,
		sampleRate = 16000,
	): Promise<void> {
		this.onAudioData = onAudioCallback;

		// Get microphone access
		this.micStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				channelCount: 1,
				sampleRate,
			},
		});

		// Create audio context
		this.audioContext = new AudioContext({ sampleRate });

		// Load the audio worklet processor
		const workletCode = this.generateWorkletCode();
		const blob = new Blob([workletCode], { type: "application/javascript" });
		const workletUrl = URL.createObjectURL(blob);

		await this.audioContext.audioWorklet.addModule(workletUrl);
		URL.revokeObjectURL(workletUrl);

		// Create audio worklet node
		this.audioWorkletNode = new AudioWorkletNode(
			this.audioContext,
			"audio-capture-processor",
			{
				numberOfInputs: 1,
				numberOfOutputs: 0,
				channelCount: 1,
			},
		);

		// Set up message handling from worklet
		this.audioWorkletNode.port.onmessage = (event) => {
			if (event.data.type === "audio-data" && this.onAudioData) {
				const audioData = new Int16Array(event.data.audioData);
				this.onAudioData(audioData);
			}
		};

		// Connect audio graph
		this.source = this.audioContext.createMediaStreamSource(this.micStream);
		this.source.connect(this.audioWorkletNode);
	}

	private generateWorkletCode(): string {
		return `
      class AudioCaptureProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = new Float32Array(2048);
          this.bufferIndex = 0;
        }

        process(inputs) {
          const input = inputs[0];
          if (input && input.length > 0) {
            const channel = input[0];
            
            for (let i = 0; i < channel.length; i++) {
              this.buffer[this.bufferIndex] = channel[i];
              this.bufferIndex++;
              
              if (this.bufferIndex >= this.buffer.length) {
                // Convert float32 to int16
                const int16Buffer = new Int16Array(this.buffer.length);
                for (let j = 0; j < this.buffer.length; j++) {
                  const sample = Math.max(-1, Math.min(1, this.buffer[j]));
                  int16Buffer[j] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                }
                
                // Send to main thread
                this.port.postMessage({
                  type: "audio-data",
                  audioData: int16Buffer.buffer
                }, [int16Buffer.buffer]);
                
                this.bufferIndex = 0;
              }
            }
          }
          return true;
        }
      }

      registerProcessor("audio-capture-processor", AudioCaptureProcessor);
    `;
	}

	destroy(): void {
		if (this.source) {
			this.source.disconnect();
			this.source = null;
		}

		if (this.audioWorkletNode) {
			this.audioWorkletNode.disconnect();
			this.audioWorkletNode = null;
		}

		if (this.micStream) {
			for (const track of this.micStream.getTracks()) {
				track.stop();
			}
			this.micStream = null;
		}

		if (this.audioContext) {
			this.audioContext.close().catch(() => {});
			this.audioContext = null;
		}

		this.onAudioData = null;
	}
}

export class AudioPlaybackManager {
	private audioContext: AudioContext | null = null;
	private nextPlayTime = 0;
	private audioQueue: Int16Array[] = [];
	private isPlaying = false;

	async initialize(sampleRate = 24000): Promise<void> {
		this.audioContext = new AudioContext({ sampleRate });
		this.nextPlayTime = 0;
		this.audioQueue = [];
		this.isPlaying = false;
	}

	async playAudioChunk(audioData: Int16Array): Promise<void> {
		if (!this.audioContext) return;

		this.audioQueue.push(audioData);

		if (!this.isPlaying) {
			this.processAudioQueue();
		}
	}

	private async processAudioQueue(): Promise<void> {
		if (!this.audioContext || this.isPlaying) return;

		this.isPlaying = true;

		if (this.audioContext.state === "suspended") {
			await this.audioContext.resume();
		}

		while (this.audioQueue.length > 0) {
			const audioData = this.audioQueue.shift();
			if (!audioData) continue;

			try {
				const buffer = this.audioContext.createBuffer(
					1,
					audioData.length,
					this.audioContext.sampleRate,
				);
				const channelData = buffer.getChannelData(0);

				for (let i = 0; i < audioData.length; i++) {
					const sample = audioData[i];
					if (sample !== undefined) {
						channelData[i] = sample / 0x8000;
					}
				}

				const source = this.audioContext.createBufferSource();
				source.buffer = buffer;
				source.connect(this.audioContext.destination);

				const now = this.audioContext.currentTime;
				if (this.nextPlayTime < now - 0.1) {
					this.nextPlayTime = now;
				}

				const when = Math.max(now, this.nextPlayTime);
				source.start(when);
				this.nextPlayTime = when + buffer.duration;

				// Wait for this chunk to finish before processing next
				await new Promise<void>((resolve) => {
					source.onended = () => resolve();
				});
			} catch (error) {
				console.error("Audio playback error:", error);
			}
		}

		this.isPlaying = false;
	}

	reset(): void {
		this.nextPlayTime = 0;
		this.audioQueue = [];
		this.isPlaying = false;
	}

	destroy(): void {
		this.reset();
		if (this.audioContext) {
			this.audioContext.close().catch(() => {});
			this.audioContext = null;
		}
	}
}

// Utility functions
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		if (byte !== undefined) {
			binary += String.fromCharCode(byte);
		}
	}
	return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

export function int16ArrayToBlob(int16Array: Int16Array): Blob {
	return new Blob([int16Array.buffer as ArrayBuffer], { type: "audio/pcm" });
}
