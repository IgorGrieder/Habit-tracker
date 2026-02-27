# ATLAS — Personal Ops Tracker

A gamified personal life tracker with a game-HUD aesthetic for habits, workouts, goals, nutrition, and weekly recaps.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + NestJS + Mongoose |
| Database | MongoDB Atlas |
| Linting/Formatting | BiomeJS |

## Features

- **Habits** — Daily check-ins, streak tracking, calendar heatmap, schedule-aware completion
- **Workouts** — Sessions with sets/reps/weight and automatic PR detection
- **Goals** — Milestones, progress tracking, status management
- **Nutrition** — Daily macro logging plus 7-day trend
- **Dashboard** — Unified daily snapshot across modules
- **Achievements & Recap** — Milestones, streak rewards, and weekly trend insights

## Getting Started

### Prerequisites

- Node.js 20+
- Bun 1.0+ (used for frontend + root scripts)
- MongoDB connection string in `server/.env`

### Install

```bash
bun install
npm install --prefix server
bun install --cwd client
```

### Run (dev)

```bash
bun run dev
```

This starts:
- API server on `http://localhost:3000`
- Client on `http://localhost:5173`

### Run services individually

```bash
npm run --prefix server dev
bun run --cwd client dev
```

## Project Structure

```
/
├── client/           React + Vite app
├── server/           NestJS API + Mongoose models/controllers
├── biome.json        Linter / formatter config
└── package.json      Root scripts
```
