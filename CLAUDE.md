# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack (localhost:3000)
npm run dev:daemon     # Start dev server in background, logs to logs.txt
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest (jsdom environment)
npx vitest run src/lib/__tests__/foo.test.ts  # Run a single test file
npm run db:reset       # Reset database (destructive)
npx prisma migrate dev # Run pending migrations
npx prisma generate    # Regenerate Prisma client after schema changes
```

All Next.js commands require `NODE_OPTIONS='--require ./node-compat.cjs'` (already configured in package.json scripts).

## Architecture

This is an AI-powered React component generator. Users describe components in a chat, Claude generates code via tool calls, and a live preview renders the result in an iframe.

### Core Flow

1. User sends a message → `POST /api/chat` with chat history + serialized virtual file system
2. AI (Claude Haiku 4.5 via Vercel AI SDK) responds with tool calls (`str_replace_editor`, `file_manager`) that operate on an in-memory `VirtualFileSystem`
3. Tool results update `FileSystemContext` → `PreviewFrame` transforms JSX via Babel in the browser and renders in an iframe using esm.sh for npm imports
4. On stream completion, project (messages + file system) is saved to the database as JSON

### Key Abstractions

- **VirtualFileSystem** ([file-system.ts](src/lib/file-system.ts)): In-memory file tree with serialize/deserialize. All AI file operations go through this — no files written to disk.
- **AI Tools** ([tools/](src/lib/tools/)): `str_replace_editor` (view/create/edit files) and `file_manager` (rename/delete). These are Vercel AI SDK tool definitions that operate on the VFS.
- **Provider** ([provider.ts](src/lib/provider.ts)): Returns Claude Haiku 4.5 if `ANTHROPIC_API_KEY` is set, otherwise a mock `LanguageModelV1` that simulates multi-step generation.
- **JSX Transformer** ([transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts)): Browser-side Babel transform that builds import maps (local files → blob URLs, npm packages → esm.sh CDN).
- **System Prompt** ([prompts/generation.tsx](src/lib/prompts/generation.tsx)): Instructs AI to use `/App.jsx` as entry point, Tailwind for styling, `@/` import alias.

### State Management

Two React contexts wrap the app:

- **FileSystemContext** ([contexts/file-system-context.tsx](src/lib/contexts/file-system-context.tsx)): Owns the VFS state, handles AI tool call results, tracks selected file for editor.
- **ChatContext** ([contexts/chat-context.tsx](src/lib/contexts/chat-context.tsx)): Wraps `useChat` from `@ai-sdk/react`, passes file system state to `/api/chat` on each request.

### Layout

Three-panel resizable layout in [main-content.tsx](src/app/main-content.tsx):
- Left (35%): Chat interface
- Right (65%): Tabs for Preview (iframe) and Code (file tree + Monaco editor)

### Auth & Data

- JWT sessions (jose, 7-day expiry, HTTP-only cookies) in [auth.ts](src/lib/auth.ts)
- Server actions in [actions/](src/actions/) for auth (signUp/signIn/signOut) and project CRUD
- Anonymous users can work without auth; work migrates to a project on sign-in via [anon-work-tracker.ts](src/lib/anon-work-tracker.ts)
- SQLite via Prisma. Schema: `User` (email, bcrypt password) → `Project` (name, messages JSON, data JSON)
- Middleware protects `/api/projects` and `/api/filesystem` routes

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json). Shadcn UI components live at `@/components/ui/`.
