# ATLAS — Personal Ops Tracker

A gamified personal life tracker with a dark game-HUD aesthetic. Built for people who want to treat their habits, workouts, goals, and nutrition like a real-time strategy game.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite 5, Tailwind CSS, TanStack Query, Recharts |
| Backend | Fastify 4 on Bun runtime |
| Database | SQLite via `bun:sqlite` (stored at `server/atlas.db`) |
| Linting/Formatting | BiomeJS |

## Features

- **Habits** — Daily check-in tile grid, 28-day heatmap, streak tracking, aggregate completion chart
- **Workouts** — Session log with sets/reps/weight, automatic PR detection per rep count
- **Goals** — Milestones with progress bar, statuses: active / completed / abandoned
- **Nutrition** — Macros logging (calories, protein, carbs, fat), 7-day chart, configurable daily targets
- **Dashboard** — Ops brief summarising all modules at a glance

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0

### Install

```bash
bun install            # root deps (concurrently, biome)
cd server && bun install
cd ../client && bun install
```

### Run (dev)

```bash
# From repo root — starts both client (port 5173) and server (port 3000)
bun run dev
```

### Individual processes

```bash
cd server && bun run dev   # API server with --watch
cd client && bun run dev   # Vite dev server
```

## Code Quality

BiomeJS handles both linting and formatting (no ESLint / Prettier needed).

```bash
bun run lint      # lint check
bun run format    # auto-format
bun run check     # lint + format, auto-fix
```

## Project Structure

```
/
├── client/           React + Vite app
│   └── src/
│       ├── pages/    Dashboard, Habits, Workout, Goals, Nutrition
│       ├── components/
│       └── lib/      api.ts (fetch helpers), utils.ts
├── server/           Fastify + Bun API
│   └── src/
│       ├── db/       SQLite schema, streak & PR helpers
│       └── routes/   habits, workouts, goals, nutrition, dashboard
├── biome.json        Linter / formatter config
└── package.json      Root scripts (dev, build, lint, format)
```

## Nutrition Targets

Edit `TARGETS` in `client/src/pages/Nutrition.tsx`:

```ts
const TARGETS = { calories: 2500, protein_g: 160, carbs_g: 300, fat_g: 80 };
```
