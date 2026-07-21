# Today's Rhythms

A warm, editorial-style habit tracker built with TanStack Start and Supabase.

## Tech Stack

- **Framework** — TanStack Start (React 19 + SSR)
- **Routing** — TanStack Router (file-based)
- **Data Fetching** — TanStack Query v5
- **Database** — Supabase (PostgreSQL with RLS)
- **Auth** — Supabase Auth (email/password + Google OAuth)
- **Styling** — Tailwind CSS v4 + shadcn/ui
- **Fonts** — Instrument Serif (headings), Work Sans (body)

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

## Project Structure

```
src/
├── components/        # Shared UI components
│   └── QuickAddHabit.tsx
├── hooks/             # Custom React hooks
├── integrations/      # Third-party integrations
│   └── supabase/      # Supabase client, auth, types
├── lib/               # Utilities and server functions
│   ├── habits.functions.ts
│   ├── streaks.ts
│   └── recommendations.functions.ts
├── routes/            # File-based routing
│   ├── __root.tsx
│   ├── index.tsx
│   ├── auth.tsx
│   └── _authenticated/
│       ├── route.tsx
│       ├── today.tsx
│       ├── habits.tsx
│       └── insights.tsx
└── styles.css         # Global styles and theme
```

## Features

- **Daily check-in** — mark habits complete with one tap
- **Streak tracking** — current and longest streaks per habit
- **Rhythm heatmap** — contribution-graph style activity view
- **Monthly calendar** — see completion at a glance
- **Weekly trend chart** — completion rate over the last 8 weeks
- **Insights** — per-habit stats, monthly charts, AI recommendations
- **Frequency scheduling** — daily, weekdays, or X times per week
- **Reminders** — browser notifications at set times
- **Authentication** — email/password or Google sign-in
