import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listHabits, listLogs } from "@/lib/habits.functions";
import { getRecommendations } from "@/lib/recommendations.functions";
import { currentStreak, longestStreak, todayLocal, addDays, formatLocal } from "@/lib/streaks";

export const Route = createFileRoute("/_authenticated/insights")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.user_metadata?.onboarding_complete) {
      throw redirect({ to: "/onboarding" });
    }
  },
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

    // Per-habit weekly trend (last 12 weeks for sparklines)
    const habitTrends = habits.map((h) => {
      const dates = byHabit.get(h.id) ?? [];
      const points: number[] = [];
      for (let w = 11; w >= 0; w--) {
        const weekStart = addDays(today, -(w * 7 + parseLocal(today).getDay()));
        let count = 0;
        for (let d = 0; d < 7; d++) {
          if (dates.includes(addDays(weekStart, d))) count++;
        }
        points.push(count);
      }
      return { id: h.id, name: h.name, emoji: (h as any).emoji, color: (h as any).color || "var(--chart-1)", points };
    });

    // Habit comparison for bar chart (by completion rate last 30 days)
    const habitComparison = habits.map((h) => {
      const dates = byHabit.get(h.id) ?? [];
      const last30Count = dates.filter((d) => d >= addDays(today, -30)).length;
      return { id: h.id, name: h.name, emoji: (h as any).emoji, rate: Math.min(100, Math.round((last30Count / 30) * 100)) };
    }).sort((a, b) => b.rate - a.rate);

    // Rhythm Connections — day-level co-occurrence
    const connections: { habitA: typeof habits[0]; habitB: typeof habits[0]; delta: number; baselineA: number; conditional: number }[] = [];
    if (habits.length >= 2) {
      const allDates = new Set<string>();
      for (const l of logs) allDates.add(l.log_date);
      const dateList = Array.from(allDates).sort();
      for (let i = 0; i < habits.length; i++) {
        for (let j = i + 1; j < habits.length; j++) {
          const hA = habits[i];
          const hB = habits[j];
          const datesA = new Set(byHabit.get(hA.id) ?? []);
          const datesB = new Set(byHabit.get(hB.id) ?? []);
          let overlapDays = 0;
          let bothDone = 0;
          let aDone = 0;
          for (const d of dateList) {
            const aHas = datesA.has(d);
            const bHas = datesB.has(d);
            if (aHas || bHas) overlapDays++;
            if (aHas) aDone++;
            if (aHas && bHas) bothDone++;
          }
          if (overlapDays < 14) continue;
          const baselineA = aDone / Math.max(1, overlapDays);
          const conditional = bothDone / Math.max(1, aDone);
          const delta = conditional - baselineA;
          if (Math.abs(delta) < 0.08) continue;
          connections.push({ habitA: hA, habitB: hB, delta, baselineA, conditional });
        }
      }
      connections.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

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
      habitTrends,
      habitComparison,
      connections,
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

  // Seeded skeleton heatmap for empty states
  const seededHeatmap = useMemo(
    () => buildHeatmap([], today),
    [today],
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
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-mono">
            Weekly rhythm
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="flex items-end gap-2" style={{ minHeight: 140 }}>
              {stats.weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end" style={{ height: 140, marginTop: -18 }}>
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(6, Math.min(100, (w.total / (maxWeek || 1)) * 100))}%`,
                        minHeight: w.total === 0 ? 4 : 6,
                        background: w.total === 0
                          ? "color-mix(in oklab, var(--primary) 15%, transparent)"
                          : i === stats.weeks.length - 1
                            ? "var(--primary)"
                            : `color-mix(in oklab, var(--primary) ${50 + (w.total / (maxWeek || 1)) * 40}%, transparent)`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground leading-tight">{w.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Monthly bars */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-mono">
            Last 6 months
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="flex items-end gap-3 sm:gap-4" style={{ minHeight: 128 }}>
              {stats.months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end" style={{ height: 128 }}>
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(6, (m.total / (maxMonth || 1)) * 100)}%`,
                        minHeight: m.total === 0 ? 4 : 6,
                        background: m.total === 0
                          ? "color-mix(in oklab, var(--primary) 15%, transparent)"
                          : "var(--primary)",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{m.label}</span>
                  <span className="font-mono text-[11px] text-foreground">{m.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Day-of-week consistency */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-mono">
            Day consistency
          </h2>
          {noData ? (
            <p className="text-sm text-muted-foreground italic">No data yet.</p>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-3">
              {stats.dowCount.map((count, i) => {
                const isBest = i === stats.bestDow;
                const isWorst = count > 0 && i === stats.worstDow;
                const barH = Math.max(4, (count / (maxDow || 1)) * 96);
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {DAY_NAMES[i].slice(0, 2)}
                    </div>
                    <div className="w-full flex flex-col items-center gap-1" style={{ height: 96 }}>
                      <div className="flex-1 flex items-end w-full">
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${barH}px`,
                            minHeight: count === 0 ? 4 : 4,
                            background: isBest
                              ? "var(--primary)"
                              : `color-mix(in oklab, var(--primary) 15%, transparent)`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-foreground font-medium">{count}</span>
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: isBest ? "var(--primary)" : "var(--muted-foreground)",
                        borderColor: isBest ? "var(--primary)" : "var(--border)",
                        opacity: isBest || isWorst ? 1 : 0,
                      }}
                    >
                      {isBest ? "Best" : isWorst ? "Low" : "\u00A0"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-habit trend sparklines */}
        {!noData && stats.habitTrends.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Habit trends
            </h2>
            <div className="space-y-3">
              {stats.habitTrends.map((ht) => {
                const maxVal = Math.max(1, ...ht.points);
                const avg = ht.points.reduce((a, b) => a + b, 0) / ht.points.length;
                return (
                  <div
                    key={ht.id}
                    className="rounded-xl border px-4 py-3"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{ht.emoji}</span>
                      <span className="text-sm font-medium text-foreground flex-1">{ht.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{avg.toFixed(1)}/wk avg</span>
                    </div>
                    <svg width="100%" height="32" style={{ overflow: "visible" }}>
                      {/* Average reference line */}
                      <line
                        x1="0"
                        y1={32 - (avg / maxVal) * 28 - 2}
                        x2="100%"
                        y2={32 - (avg / maxVal) * 28 - 2}
                        stroke="var(--muted-foreground)"
                        strokeWidth="0.5"
                        strokeDasharray="3 2"
                        opacity="0.5"
                      />
                      {/* Area fill */}
                      <path
                        d={`M0,32 L${ht.points
                          .map(
                            (v, i) =>
                              `${(i / (ht.points.length - 1)) * 100}%,${32 - Math.max(2, (v / maxVal) * 28)}`,
                          )
                          .join(" L")} L100%,32 Z`}
                        fill="var(--chart-1)"
                        opacity="0.12"
                      />
                      {/* Line */}
                      <polyline
                        points={ht.points
                          .map(
                            (v, i) =>
                              `${(i / (ht.points.length - 1)) * 100},${32 - Math.max(2, (v / maxVal) * 28)}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Rhythm Connections */}
        {!noData && stats.connections.length > 0 && (
          <section className="mb-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Rhythm Connections
            </h2>
            <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)", padding: 0 }}>
              {stats.connections.slice(0, 5).map((c, i) => {
                const isPositive = c.delta > 0;
                return (
                  <div
                    key={`${c.habitA.id}-${c.habitB.id}`}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{
                      borderBottom: i < Math.min(4, stats.connections.length - 1) ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <span className="text-lg">{(c.habitA as any).emoji || "📌"}</span>
                    <span className="text-sm font-medium text-foreground">{(c.habitA as any).name}</span>
                    <svg width="32" height="16" style={{ flexShrink: 0 }}>
                      <line x1="0" y1="8" x2="24" y2="8" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
                      <polygon points="24,8 18,4 18,12" fill="var(--accent)" opacity="0.5" />
                    </svg>
                    <span className="text-lg">{(c.habitB as any).emoji || "📌"}</span>
                    <span className="text-sm font-medium text-foreground">{(c.habitB as any).name}</span>
                    <span
                      className="font-mono text-xs rounded-full px-2.5 py-1 ml-auto"
                      style={{
                        background: isPositive ? "color-mix(in oklab, var(--primary) 15%, transparent)" : "color-mix(in oklab, var(--accent) 15%, transparent)",
                        color: isPositive ? "var(--primary)" : "var(--accent)",
                      }}
                    >
                      {isPositive ? "+" : ""}{Math.round(c.delta * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Habit comparison bars */}
        {!noData && stats.habitComparison.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Completion ranking
            </h2>
            <div className="space-y-2">
              {stats.habitComparison.map((hc, i) => (
                <div key={hc.id} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{hc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{hc.name}</span>
                      <span className="font-mono text-xs" style={{ color: i === 0 ? "var(--chart-1)" : "var(--muted-foreground)" }}>
                        {hc.rate}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--muted)", overflow: "hidden" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(4, hc.rate)}%`,
                          background: i === 0 ? "var(--chart-1)" : "var(--muted-foreground)",
                          opacity: i === 0 ? 1 : 0.5,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full history heatmap */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Full rhythm
          </h2>
          {noData ? (
            <div className="opacity-[0.12]">
              <Heatmap grid={seededHeatmap} />
            </div>
          ) : (
            <div className="pb-2">
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
    <div className="rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="mt-2 font-mono text-[32px] text-foreground leading-none">
        {value}
        {suffix && <span className="ml-1 text-sm text-muted-foreground font-mono">{suffix}</span>}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={`font-mono text-[11px] mt-1 ${delta > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {delta > 0 ? "+" : ""}
          {delta} vs last
        </div>
      )}
    </div>
  );
}

// --- Heatmap helpers ---

function buildHeatmap(dates: string[], today: string) {
  // Use the last date with actual data as anchor, or fallback to today
  const sortedDates = [...new Set(dates)].sort();
  const anchorDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : today;
  const endDate = anchorDate < "2025-01-01" ? anchorDate : today < "2025-01-01" ? today : anchorDate;

  const set = new Set(dates);
  const weeks: { date: string; count: number }[][] = [];
  const WEEKS = 52;
  const start = addDays(endDate, -(WEEKS * 7 - 1));
  const startDate = parseLocal(start);
  const dayOfWeek = startDate.getDay();
  const alignedStart = addDays(start, -dayOfWeek);

  const totalDays = WEEKS * 7 + dayOfWeek;
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(alignedStart, i);
    cells.push({ date: d, count: set.has(d) ? 1 : 0 });
    if (d === endDate) break;
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
      <div className="flex flex-col gap-[3px] mr-1.5">
        {["M", "W", "F"].map((l) => (
          <span key={l} className="text-[8px] text-muted-foreground leading-[13px] w-3 text-right">{l}</span>
        ))}
      </div>
      {grid.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((cell) => {
            const isFuture = cell.date > today;
            const ratio = cell.count / max;
            let intensity = 0;
            if (cell.count > 0) {
              if (ratio <= 0.25) intensity = 1;
              else if (ratio <= 0.5) intensity = 2;
              else if (ratio <= 0.75) intensity = 3;
              else intensity = 4;
            }
            const bg = isFuture
              ? "transparent"
              : intensity === 0
                ? "var(--muted)"
                : `color-mix(in oklab, var(--primary) ${intensity * 20}%, var(--muted))`;
            return (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count}`}
                className="w-[13px] h-[13px] rounded-[2px]"
                style={{ background: bg, opacity: isFuture ? 0.3 : 1 }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
