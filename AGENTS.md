# Agent Guidelines for vocal-flashcards

## Build/Test/Lint Commands
- **Dev**: `bun run dev` (Next.js with Turbo)
- **Build**: `bun run build`
- **Type check**: `bun run typecheck`
- **Lint/Format**: `bun run check` (Biome linter/formatter)
- **Auto-fix**: `bun run check:write` (safe fixes) or `bun run check:unsafe` (all fixes)
- **No test framework configured** - verify changes manually

## Code Style & Conventions
- **Formatting**: Biome handles all formatting/linting (configured in biome.jsonc)
- **Imports**: Use `~` alias for src/ imports (e.g., `~/components/ui/button`)
- **Components**: Export as named functions, use PascalCase
- **Files**: Use camelCase for files, kebab-case for UI components
- **Tailwind**: Use `cn()` utility from `~/lib/utils` for conditional classes
- **TypeScript**: Strict mode enabled, use `type` imports when possible
- **React**: Uses React 19 with "use client" directive for client components
- **UI**: Radix UI + Tailwind CSS, follow existing shadcn/ui patterns
- **State**: Zustand for global state (see flashcardsStore.ts)
- **API Routes**: Use Next.js App Router API routes in app/api/

## Key Dependencies
- Next.js 15 (App Router), React 19, TypeScript 5.8
- Tailwind CSS 4.0, Radix UI, Lucide icons
- Zustand (state), Zod (validation), OpenAI/Gemini APIs