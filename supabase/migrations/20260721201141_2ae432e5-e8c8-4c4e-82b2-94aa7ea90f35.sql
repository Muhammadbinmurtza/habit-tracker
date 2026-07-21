ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS frequency_type text NOT NULL DEFAULT 'daily'
    CHECK (frequency_type IN ('daily', 'weekdays', 'weekly_count')),
  ADD COLUMN IF NOT EXISTS frequency_days smallint[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frequency_count smallint NOT NULL DEFAULT 7
    CHECK (frequency_count BETWEEN 1 AND 7);