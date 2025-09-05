# 🎤 Vocal Flashcards

> **A comprehensive reference implementation for building realtime voice applications with OpenAI and Gemini APIs**

This educational repository demonstrates how to integrate cutting-edge voice AI technologies into modern web applications. Perfect for developers looking to understand and implement realtime voice interactions in their own projects.

## 🌟 What You'll Learn

This app showcases real-world implementation of:

- **OpenAI Realtime API** - Bidirectional voice chat with streaming audio and tool calls
- **Google Gemini Live** - Advanced text interactions with tool calling capabilities
- **Unified Provider Interface** - Clean abstraction layer for switching between AI providers
- **Voice Processing** - Audio worklets, real-time streaming, and voice activity detection
- **Modern React Patterns** - State management, TypeScript, and component architecture

## 🚀 Quick Start

```bash
git clone <this-repo>
cd vocal-flashcards
bun install
cp .env.example .env  # Add your API keys
bun run dev
```

**Environment Setup:**
```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...  # Optional, for Gemini provider
```

Open [http://localhost:3000](http://localhost:3000) and start exploring!

## 🔧 Key Features to Study

- ✅ **Runtime Provider Switching** - Toggle between OpenAI and Gemini without page reload
- ✅ **Voice Activity Detection** - Smart audio processing and silence detection
- ✅ **Tool Calling** - AI agents that can interact with your application state

## 🏗️ Architecture Highlights

- **Provider Abstraction** (`src/app/realtime/providers/`) - Clean interfaces for different AI providers
- **Audio Processing** (`src/lib/audio*.ts`) - Real-time audio handling and worklets
- **State Management** (`src/lib/flashcardsStore.ts`) - Zustand for predictable state updates

## 📚 Development Guide

For detailed development information including build commands, code style guidelines, and technical specifications, see [AGENTS.md](./AGENTS.md).

## 🤝 Contributing

Found a bug or have an improvement? Contributions are welcome! This is an educational resource, so clear, well-documented code is especially appreciated.

---

*This project serves as a reference implementation and learning resource for the developer community. Feel free to use it as a starting point for your own voice-enabled applications!*
