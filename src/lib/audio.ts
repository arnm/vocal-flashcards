export function getAudioContextCtor(): typeof AudioContext {
	const ctor =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!ctor) {
		throw new Error("Web Audio API not supported in this browser");
	}
	return ctor;
}
