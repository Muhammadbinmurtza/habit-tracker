import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listHabits, listLogs } from "@/lib/habits.functions";
import { getRecommendations } from "@/lib/recommendations.functions";
import { currentStreak, longestStreak, todayLocal, addDays, formatLocal } from "@/lib/streaks";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Today's Rhythms" },
      { name: "description", content: "Monthly totals, streak leaders, and gentle guidance." },
      { property: "og:title", content: "Insights — Today's Rhythms" },
      { property: "og:description", content: "Reflect on your rhythm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function InsightsPage() {
  const habitsFn = useServerFn(listHabits);
  const logsFn = useServerFn(listLogs);
  const recFn = useServerFn(getRecommendations);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => habitsFn(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsFn(),
  });

  const today = todayLocal();

  const stats = useMemo(() => {
    const byHabit = new Map<string, string[]>();
    for (const l of logs) {
      if (!byHabit.has(l.habit_id)) byHabit.set(l.habit_id, []);
      byHabit.get(l.habit_id)!.push(l.log_date);
    }

    const perHabit = habits.map((h) => {
      const dates = byHabit.get(h.id) ?? [];
      return {
        habit: h,
        streak: currentStreak(dates, today),
        longest: longestStreak(dates),
        total: dates.length,
        last30: dates.filter((d) => d >= addDays(today, -30)).length,
      };
    });

    // Monthly buckets — last 6 months
    const months: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short" }),
        total: 0,
      });
    }
    for (const l of logs) {
      const key = l.log_date.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.total++;
    }

    const thisMonth = months[months.length - 1]?.total ?? 0;
    const lastMonth = months[months.length - 2]?.total ?? 0;
    const bestStreak = Math.max(0, ...perHabit.map((p) => p.longest));

    // Weekly data — last 12 weeks
    const weeks: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = parseLocal(addDays(today, -(i * 7 + ((parseLocal(today).getDay() + 6) % 7))));
      const start = formatLocal(d);
      const end = addDays(start, 6);
      const weekDates = new Set<string>();
      let cur = start;
      while (cur <= end) {
        weekDates.add(cur);
        cur = addDays(cur, 1);
      }
      const total = logs.filter((l) => weekDates.has(l.log_date)).length;
      weeks.push({
        label: start.slice(5),
        total,
      });
    }

    // Day-of-week analysis
    const dowCount = [0, 0, 0, 0, 0, 0, 0];
    for (const l of logs) {
      const d = parseLocal(l.log_date);
      dowCount[d.getDay()]++;
    }
    const bestDow = dowCount.indexOf(Math.max(...dowCount));
    const worstDow = dowCount.indexOf(Math.min(...dowCount.filter((c) => c > 0)));

    // Streak leaderboard
    const streakBoard = perHabit
      .slice()
      .filter((p) => p.streak > 0)
      .sort((a, b) => b.streak - a.streak);

    return {
      perHabit,
      months,
      thisMonth,
      lastMonth,
      bestStreak,
      total: logs.length,
      weeks,
      dowCount,
      bestDow,
      worstDow,
      streakBoard,
    };
  }, [habits, logs, today]);

  // Full history heatmap (52 weeks)
  const heatmap = useMemo(
    () =>
      buildHeatmap(
        logs.map((l) => l.log_date),
        today,
      ),
    [logs, today],
  );

  const rec = useMutation({
    mutationFn: () => recFn(),
  });

  const maxMonth = Math.max(1, ...stats.months.map((m) => m.total));
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.total));
  const maxDow = Math.max(1, ...stats.dowCount);

  const noData = stats.total === 0;

  return (
    <main className="min-h-screen px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reflect</p>
            <h1 className="text-4xl sm:text-5xl font-serif italic tracking-tight text-foreground mt-2">
              Insights
            </h1>
          </div>
          <Link
            to="/today"
            className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          >
            ← Today
          </Link>
        </header>

        {/* Headline stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <Stat
            label="This month"
            value={stats.thisMonth}
            delta={stats.thisMonth - stats.lastMonth}
          />
          <Stat label="Total" value={stats.total} />
          <Stat label="Best streak" value={stats.bestStreak} suffix="d" />
        </section>

        {/* Weekly completion chart */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Weekly rhythm
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {stats.weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(4, (w.total / maxWeek) * 100)}%`,
                        background:
                          i === stats.weeks.length - 1
                            ? "var(--primary)"
                            : "color-mix(in oklab, var(--foreground) 30%, transparent)",
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground leading-tight">{w.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground tracking-wide mt-2">
            Check-ins per week &middot; current week highlighted
          </p>
        </section>

        {/* Monthly bars */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Last 6 months
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="flex items-end gap-3 h-32">
              {stats.months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${(m.total / maxMonth) * 100}%`, minHeight: "2px" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  <span className="text-[11px] text-foreground">{m.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Day-of-week consistency */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Day consistency
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {stats.dowCount.map((count, i) => {
                const isBest = i === stats.bestDow;
                const isWorst = count > 0 && i === stats.worstDow;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {DAY_NAMES[i].slice(0, 2)}
                    </div>
                    <div className="w-full flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded"
                        style={{
                          height: `${Math.max(4, (count / maxDow) * 64)}px`,
                          background: isBest
                            ? "var(--primary)"
                            : isWorst
                              ? "color-mix(in oklab, var(--destructive) 50%, transparent)"
                              : "color-mix(in oklab, var(--foreground) 25%, transparent)",
                        }}
                      />
                      <span className="text-[11px] text-foreground font-medium">{count}</span>
                    </div>
                    {isBest && (
                      <span className="text-[9px] text-primary tracking-wide font-medium">
                        Best
                      </span>
                    )}
                    {isWorst && (
                      <span className="text-[9px] text-destructive tracking-wide font-medium">
                        Low
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Full history heatmap */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Full rhythm
          </h2>
          {noData ? (
            <div
              className="rounded-2xl border border-dashed py-10 px-6 text-center"
              style={{ borderColor: "color-mix(in oklab, var(--foreground) 15%, transparent)" }}
            >
              <p className="font-serif italic text-lg text-foreground/50">
                Your full rhythm appears here as you build consistency.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <Heatmap grid={heatmap} />
            </div>
          )}
        </section>

        {/* Streak leaderboard */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
            <span>🔥</span> Active streaks
          </h2>
          {stats.streakBoard.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {noData
                ? "Start checking off habits to build a streak."
                : "No active streaks. Keep showing up!"}
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.streakBoard.map((p) => (
                <li key={p.habit.id}>
                  <div
                    className="flex items-center gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="text-lg">{p.habit.emoji}</span>
                    <span className="flex-1 text-sm text-foreground">{p.habit.name}</span>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border"
                      style={{
                        borderColor: `color-mix(in oklab, ${p.habit.color} 35%, transparent)`,
                        color: p.habit.color,
                        background: `color-mix(in oklab, ${p.habit.color} 8%, transparent)`,
                      }}
                    >
                      🔥 {p.streak} {p.streak === 1 ? "day" : "days"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Habit leaderboard */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Habit overview
          </h2>
          <ul className="space-y-3">
            {stats.perHabit
              .slice()
              .sort((a, b) => b.last30 - a.last30)
              .map((p) => (
                <li key={p.habit.id} className="flex items-center gap-3">
                  <span className="text-lg">{p.habit.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{p.habit.name}</span>
                      <span className="text-muted-foreground">
                        {p.last30} &middot; streak {p.streak}d &middot; best {p.longest}d
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (p.last30 / 30) * 100)}%`,
                          background: p.habit.color,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            {stats.perHabit.length === 0 && (
              <li className="text-sm text-muted-foreground">No habits yet.</li>
            )}
          </ul>
        </section>

        {/* Recommendations */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Personalized guidance
            </h2>
            <button
              onClick={() => rec.mutate()}
              disabled={rec.isPending || stats.total === 0}
              className="text-sm font-medium px-4 py-2 rounded-full border-2 border-primary bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {rec.isPending ? "Thinking…" : rec.data ? "Refresh" : "Generate"}
            </button>
          </div>
          {noData && (
            <p className="text-sm text-muted-foreground italic">
              Complete a few habits, then come back for tailored suggestions.
            </p>
          )}
          {rec.isPending && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {rec.error && (
            <p className="text-sm text-destructive">
              {rec.error instanceof Error ? rec.error.message : "Couldn't load guidance right now."}
            </p>
          )}
          {rec.data && (
            <ul className="space-y-3">
              {rec.data.recommendations.map((r, i) => (
                <li key={i} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium text-foreground mb-1">{r.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
  delta,
}: {
  label: string;
  value: number;
  suffix?: string;
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-serif italic text-foreground">
        {value}
        {suffix && <span className="text-lg">{suffix}</span>}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div
          className={`text-[11px] mt-1 ${delta > 0 ? "text-foreground" : "text-muted-foreground"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta} vs last
        </div>
      )}
    </div>
  );
}

// --- Heatmap helpers ---

function buildHeatmap(dates: string[], today: string) {
  const set = new Set(dates);
  const weeks: { date: string; count: number }[][] = [];
  const WEEKS = 52;
  const start = addDays(today, -(WEEKS * 7 - 1));
  const startDate = parseLocal(start);
  const dayOfWeek = startDate.getDay();
  const alignedStart = addDays(start, -dayOfWeek);

  const totalDays = WEEKS * 7 + dayOfWeek;
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(alignedStart, i);
    cells.push({ date: d, count: set.has(d) ? 1 : 0 });
    if (d === today) break;
  }
  const countByDate = new Map<string, number>();
  for (const d of dates) countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
  for (const c of cells) c.count = countByDate.get(c.date) ?? 0;

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function Heatmap({ grid }: { grid: { date: string; count: number }[][] }) {
  const max = Math.max(1, ...grid.flat().map((c) => c.count));
  const today = todayLocal();
  return (
    <div className="flex gap-[3px]">
      {grid.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((cell) => {
            const isFuture = cell.date > today;
            const intensity = cell.count === 0 ? 0 : Math.min(4, Math.ceil((cell.count / max) * 4));
            const bg = isFuture
              ? "transparent"
              : intensity === 0
                ? "var(--muted)"
                : `color-mix(in oklab, var(--primary) ${intensity * 22}%, var(--muted))`;
            return (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count}`}
                className="w-[11px] h-[11px] rounded-[2px]"
                style={{ background: bg, opacity: isFuture ? 0.3 : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
