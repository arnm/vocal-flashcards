"use client";
import { useState } from "react";
import { useRealtime } from "./useRealtime";

export default function VoiceRealtime() {
	const { active, start, stop, chat, sendUserText } = useRealtime();
	const [input, setInput] = useState("");

	console.log("Current chat state:", chat);

	const toggle = async () => {
		if (active) {
			stop();
		} else {
			await start();
		}
	};
	const send = () => {
		if (!input.trim()) return;
		sendUserText(input.trim());
		setInput("");
	};

	return (
		<div
			style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "1rem auto" }}
		>
			<button
				onClick={toggle}
				style={{
					width: 70,
					height: 70,
					borderRadius: "50%",
					border: "none",
					background: active ? "#e74c3c" : "#2ecc71",
					color: "#fff",
					fontSize: 16,
				}}
			>
				{active ? "Stop" : "Mic"}
			</button>
			<div style={{ marginTop: 12, display: "flex", gap: 6 }}>
				<input
					style={{ flex: 1, padding: "6px 8px" }}
					disabled={!active}
					value={input}
					placeholder="Type message"
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") send();
					}}
				/>
				<button disabled={!active || !input.trim()} onClick={send}>
					Send
				</button>
			</div>
			<div
				style={{
					marginTop: 20,
					border: "1px solid #ddd",
					padding: 10,
					borderRadius: 6,
					maxHeight: 360,
					overflowY: "auto",
					background: "#fafafa",
					fontSize: 14,
				}}
			>
				{chat.map((m) => (
					<div
						key={m.id}
						style={{ marginBottom: 6, opacity: m.pending ? 0.6 : 1 }}
					>
						<strong>{m.role === "user" ? "You" : "Assistant"}:</strong> {m.text}
					</div>
				))}
				{chat.length === 0 && (
					<div style={{ color: "#888" }}>No messages yet.</div>
				)}
			</div>
		</div>
	);
}
