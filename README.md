# 🎤 Vocal Flashcards

A voice-enabled flashcard application showcasing realtime AI integration with OpenAI and Gemini APIs. Perfect for language learning and demonstrating modern voice AI implementation patterns.

## ✨ Features

- **Voice Interaction** - Practice flashcards using natural speech with OpenAI Realtime API
- **AI Provider Switching** - Toggle between OpenAI and Gemini providers seamlessly
- **Smart Audio Processing** - Voice activity detection and real-time streaming
- **Modern UI** - Built with Next.js 15, React 19, and Tailwind CSS
- **Theme Support** - Light/dark mode toggle

## 🚀 Quick Start

```bash
git clone <this-repo>
cd vocal-flashcards
bun install
cp .env.example .env  # Add your API keys
bun run dev
```

**Required Environment Variables:**
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...  # Optional, for Gemini provider
```

Open [http://localhost:3000](http://localhost:3000) to start learning!

## 🏗️ Architecture

**Key Components:**
- `src/components/chat/` - Voice interaction and provider switching
- `src/components/flashcards/` - Flashcard display and navigation
- `src/lib/realtime/` - AI provider adapters and abstractions
- `src/lib/flashcards/` - Zustand store for flashcard state
- `src/hooks/use-realtime.ts` - Custom hook for voice interactions

**Tech Stack:**
- Next.js 15 (App Router) + React 19
- TypeScript 5.8 with strict mode
- Tailwind CSS 4.0 + Radix UI
- Zustand for state management
- Biome for linting/formatting

## 📚 Development

**Commands:**
- `bun run dev` - Start development server with Turbo
- `bun run build` - Build for production
- `bun run typecheck` - TypeScript type checking
- `bun run check` - Lint and format with Biome

See [AGENTS.md](./AGENTS.md) for detailed development guidelines and code conventions.

---

*A reference implementation for building voice-enabled applications with modern web technologies.*
