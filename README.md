# Today's Rhythms

A bold, data-driven habit tracker built with TanStack Start, Supabase, and Docker. Track daily habits, build streaks, and monitor your consistency with heatmaps, trend charts, and local personalized insights.

**Live:** [https://habit-tracker-iota-henna-45.vercel.app](https://habit-tracker-iota-henna-45.vercel.app)

## Tech Stack

- **Framework** — TanStack Start (React 19 + SSR)
- **Routing** — TanStack Router (file-based)
- **Data Fetching** — TanStack Query v5
- **Database** — Supabase (PostgreSQL with RLS)
- **Auth** — Supabase Auth (email/password)
- **Styling** — Tailwind CSS v4 + shadcn/ui
- **Fonts** — Instrument Serif (display), Work Sans (body), IBM Plex Mono (data/stats)

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── components/         # Shared UI components
│   ├── QuickAddHabit.tsx
│   ├── FreezeDialog.tsx
│   └── TableView.tsx
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client, auth, types
├── lib/                # Utilities and server functions
│   ├── habits.functions.ts
│   ├── streaks.ts
│   ├── recommendations.functions.ts
│   ├── useStreakFreeze.ts
│   └── useHabitReminders.ts
├── routes/             # File-based routing
│   ├── __root.tsx
│   ├── index.tsx
│   ├── auth.tsx
│   └── _authenticated/
│       ├── route.tsx
│       ├── today.tsx
│       ├── habits.tsx
│       ├── insights.tsx
│       └── onboarding.tsx
└── styles.css          # Global styles and theme
```

## Features

- **Board & Table views** — horizontal cards for few habits, dense table for many habits, toggle persisted
- **Onboarding flow** — name entry and first habit setup for new users
- **Streak tracking** — current and longest streaks per habit with flame icons
- **Streak Freeze** — 2 freezes per 30 days to protect streaks from missed days
- **Rhythm heatmap** — GitHub-style contribution graph, 52-week and 17-week views
- **Monthly calendar** — completion at a glance with per-day heatmap intensity
- **Weekly trend chart** — 8-week completion rate bars with gradient highlights
- **Insights** — per-habit trend sparklines, habit comparison rankings, day-of-week analysis
- **Rhythm Connections** — correlation insights showing which habits reinforce each other
- **Table view** — spreadsheet-style weekly tracking with custom checkboxes and aggregates
- **Frequency scheduling** — daily, weekdays, or X times per week per habit
- **Audible reminders** — alarm sound + browser notifications at set times
- **Password reset** — email-based recovery flow
- **Local recommendations** — personalized insights from habit data, no API keys needed
- **Confetti celebration** — visual reward when all daily habits are complete
- **Daily quotes** — rotating motivational quotes on the dashboard
- **Tests** — 13 unit tests for streak and date utilities

## Docker

```bash
docker compose up --build
```

Opens at `http://localhost:3000`.
