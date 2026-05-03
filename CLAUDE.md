# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Next.js on port 3000)
npm run build      # Production build
npm run lint       # ESLint via next lint
```

No test suite is configured. Type-checking is implicit via `next build`.

## Environment

Copy `.env.example` to `.env.local` and fill in Firebase credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATORS=false
```

## Demo Mode

`src/lib/demo/index.ts` exports `DEMO_MODE = true` (hardcoded). When `DEMO_MODE` is true, all data reads/writes go to `localStorage` instead of Firestore. Auth is bypassed using `DEMO_USER` / `DEMO_PROFILE` constants. **Flip `DEMO_MODE` to `false` to use real Firebase.**

## Architecture

**Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS.

### Route Groups

- `src/app/(auth)/` — login, signup, forgot-password. Wrapped in its own layout.
- `src/app/(dashboard)/` — all protected pages. Layout wraps everything in `AuthGuard` → starts the real-time Firestore subscription via `useTradesSubscription()`.
- `src/app/api/notion/` — three API routes for Notion integration (setup, sync, verify).

### Data Layer

All types are defined in `src/lib/types/index.ts`. Firestore path helpers live in `src/lib/firebase/collections.ts` — always use `col.*` helpers instead of writing paths by hand.

Hooks in `src/lib/hooks/` own the Firestore subscriptions and write operations. They dual-dispatch: if `DEMO_MODE`, they read/write `localStorage`; otherwise they use Firestore. Hooks write into Zustand stores so components only subscribe to stores.

**Zustand stores:**
- `authStore` — Firebase `User` + `UserProfile`
- `tradeStore` — flat list of `Trade[]`, active filters, loading state
- `uiStore` — sidebar open/close, command palette state

### Scoring System

`src/lib/scoring/planEngine.ts` is the core engine. Flow:
1. A `SetupPlan` defines weighted `PlanCriterion[]` (total weights = 100).
2. `verifyTrade(trade, plan, type, streak)` evaluates each criterion against a `Trade` and returns a `TradeVerification` with a `score` (0–100) and `scoreClass` (`in_plan` ≥ 80, `partial` ≥ 60, `out_of_plan` < 60).
3. `applyVerificationToPoints(current, verification, allVerifications)` updates `UserPoints` (totals, streak, rolling averages, level, badges).
4. Level thresholds: apprentice (0), confirmed (500), expert (2000), elite (5000).

Default plans are in `src/lib/scoring/defaultPlans.ts`. Criterion validator types are the string literals in `CriterionValidatorType` — add new ones in both `types/index.ts` and the `evaluateCriterion` switch in `planEngine.ts`.

### Component Conventions

Pages are split into a server component (`page.tsx`) that just renders a `*Client.tsx` file marked `'use client'`. All real logic lives in the `*Client.tsx` file. Shared UI primitives are in `src/components/ui/`. Charts use Recharts and live in `src/components/charts/`.

### Notion Integration

`src/lib/services/notionService.ts` + `src/app/api/notion/` — trades can be synced to a Notion database. Config is stored on `UserProfile.notionConfig`.
