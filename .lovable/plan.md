# Habit Tracker v1 — Auth + Persistent Data Model

Move the app off localStorage onto Lovable Cloud (Postgres + auth), and add the missing v1 primitives: full habit CRUD with emoji/color, and a proper streak counter (current + longest).

## Scope

**In scope**
- Email/password + Google sign-in via Lovable Cloud
- `habits` and `habit_logs` tables (RLS-scoped to `auth.uid()`)
- Create / edit / delete / archive habits with emoji + color
- Daily check-off writes a `habit_logs` row
- Current streak + longest streak, computed on read
- Calendar heatmap and insights page keep working, now backed by the DB
- Existing localStorage data is dropped (fresh v1 — no migration UI)

**Out of scope (v2+)**
- Quantifiable habits (value column exists but UI stays boolean)
- Reminders / push notifications
- Badges, social, sharing
- Timezone picker (v1 uses the browser's local day)

## Data Model

```text
habits
  id uuid pk
  user_id uuid → auth.users
  name text
  emoji text          -- e.g. "🧘"
  color text          -- one of a small preset palette (hex)
  sort_order int
  archived bool
  created_at timestamptz

habit_logs
  id uuid pk
  habit_id uuid → habits (cascade)
  user_id uuid → auth.users   -- denormalized for RLS speed
  log_date date               -- browser-local day, "YYYY-MM-DD"
  completed bool default true
  unique (habit_id, log_date)
```

- RLS: users see/modify only their own rows on both tables.
- One row per habit per day; toggling off deletes the row (simpler than a `completed=false` state for v1).
- Streaks are computed from `habit_logs` on read — no cached counter that can drift.

## Auth

- Enable Lovable Cloud, turn on Email/Password + Google.
- Sign-in page at `/auth` (public).
- Move the app under `_authenticated/`:
  - `/` → today view (was `src/routes/index.tsx`)
  - `/insights` → insights (was `src/routes/insights.tsx`)
  - `/habits` → manage list (create/edit/archive/delete/reorder color+emoji)
- Public landing at `/` gets replaced by a small marketing/sign-in CTA route; the signed-in home moves to `/today`.

## UI Changes

- **Today view**: same single-column layout, but each row shows the habit's emoji + colored dot. Check-off calls a server fn. Header shows current-streak pill per habit.
- **Manage habits page**: list with drag-free reorder (up/down buttons), inline edit of name/emoji/color, archive + delete. Emoji picker = simple text input with a suggested grid. Color = 6-swatch preset picker mapped to design tokens.
- **Insights**: unchanged layout; queries hit the DB instead of localStorage. "Best streak" now uses real longest-streak calc across all logs.
- **Heatmap**: unchanged, fed from `habit_logs`.

## Streak Logic

Computed in a server function per habit:
- Sort that habit's `log_date`s desc.
- **Current streak**: walk back from today (local); stop at first gap. Today missing doesn't break the streak until tomorrow (grace for "haven't done it yet today").
- **Longest streak**: single pass over the sorted dates, track longest consecutive run.

## Technical Details

- New migration creates both tables with GRANTs + RLS policies scoped to `auth.uid()`.
- `src/lib/habits.functions.ts` — `listHabits`, `createHabit`, `updateHabit`, `deleteHabit`, `toggleLog`, `getHabitStats` (all `requireSupabaseAuth`).
- `src/lib/streaks.ts` — pure functions for current/longest streak from a date list.
- Recommendations server fn now reads DB stats instead of taking client-supplied data.
- Everything under `src/routes/_authenticated/` gates via the managed auth layout.
- localStorage code removed; no migration path (fresh v1).

## File Plan

- New: migration; `src/routes/auth.tsx`; `src/routes/_authenticated/today.tsx`, `insights.tsx`, `habits.tsx`; `src/lib/habits.functions.ts`; `src/lib/streaks.ts`.
- Replace: `src/routes/index.tsx` becomes a public landing + sign-in CTA.
- Delete: current `src/routes/insights.tsx` (moves under `_authenticated/`).
- Update: `src/lib/recommendations.functions.ts` to pull stats from DB.

OK to proceed?