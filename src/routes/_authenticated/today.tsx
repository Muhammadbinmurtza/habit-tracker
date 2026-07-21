import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listHabits, listLogs, toggleLog } from "@/lib/habits.functions";
import { currentStreak, todayLocal, addDays, formatLocal } from "@/lib/streaks";
import { QuickAddHabit } from "@/components/QuickAddHabit";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Today's Rhythms" },
      { name: "description", content: "Check off today's habits and see your rhythm." },
      { property: "og:title", content: "Today — Today's Rhythms" },
      { property: "og:description", content: "Your daily habit check-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const habitsFn = useServerFn(listHabits);
  const logsFn = useServerFn(listLogs);
  const toggleFn = useServerFn(toggleLog);
  const today = todayLocal();
  const [showAdd, setShowAdd] = useState(false);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => habitsFn(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsFn(),
  });

  const logsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of logs) {
      if (!map.has(l.habit_id)) map.set(l.habit_id, new Set());
      map.get(l.habit_id)!.add(l.log_date);
    }
    return map;
  }, [logs]);

  const toggle = useMutation({
    mutationFn: (habitId: string) => toggleFn({ data: { habitId, date: today } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });

  const completedToday = habits.filter((h) => logsByHabit.get(h.id)?.has(today)).length;
  const total = habits.length;
  const pct = total === 0 ? 0 : Math.round((completedToday / total) * 100);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Build heatmap: last 17 weeks × 7 days
  const heatmap = useMemo(
    () =>
      buildHeatmap(
        logs.map((l) => l.log_date),
        today,
      ),
    [logs, today],
  );

  const displayDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const RING = 192;
  const R = 88;
  const CIRC = 2 * Math.PI * R;

  return (
    <main className="min-h-screen px-6 py-10 sm:py-16" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-xl space-y-16">
        {/* Header */}
        <header>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground">
                {displayDate}
              </p>
              <h1 className="font-serif italic text-5xl sm:text-6xl leading-tight tracking-tight text-foreground">
                Today's rhythms
              </h1>
            </div>
            <nav className="flex gap-2 sm:gap-2.5 text-sm font-medium tracking-wide mb-2">
              <Link
                to="/habits"
                className="inline-flex items-center justify-center text-center min-w-[88px] px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              >
                Habits
              </Link>

              <Link
                to="/insights"
                className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors flex items-center gap-1"
              >
                Insights <span className="text-base leading-none">→</span>
              </Link>
              <button
                onClick={signOut}
                className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
              >
                Sign out
              </button>
            </nav>
          </div>
        </header>

        {/* Progress ring — sculptural centerpiece */}
        <section className="flex flex-col items-center justify-center py-4">
          <div className="relative" style={{ width: RING, height: RING }}>
            <svg width={RING} height={RING} className="-rotate-90">
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                fill="transparent"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                fill="transparent"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - (pct / 100) * CIRC}
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif italic text-4xl text-foreground">{pct}%</span>
            </div>
          </div>
          <p className="mt-8 text-sm tracking-tight text-muted-foreground">
            {total === 0 ? (
              <>
                No habits yet.{" "}
                <Link to="/habits" className="underline text-foreground">
                  Add your first
                </Link>
                .
              </>
            ) : (
              <>
                {completedToday} of {total} done today
                {pct === 100 && ". All rituals complete."}
              </>
            )}
          </p>
        </section>

        {/* Rhythm heatmap */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
              Rhythm
            </h2>
            <div className="h-px flex-1 bg-border opacity-60" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {logs.length} check-ins
            </span>
          </div>
          {logs.length > 4 ? (
            <Heatmap grid={heatmap} />
          ) : (
            <div
              className="rounded-2xl border border-dashed py-14 px-6 text-center"
              style={{ borderColor: "color-mix(in oklab, var(--foreground) 15%, transparent)" }}
            >
              <div className="text-3xl mb-3 opacity-40">🌱</div>
              <p className="font-serif italic text-xl text-foreground/50">
                Your rhythm builds here
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                Each day you check off a ritual adds a mark to your rhythm. Consistent small steps
                create something beautiful.
              </p>
              <div className="flex justify-center gap-[3px] mt-6 opacity-30">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div
                        key={j}
                        className="w-[11px] h-[11px] rounded-[2px]"
                        style={{
                          background:
                            i === 3 && j === 3
                              ? "var(--primary)"
                              : "color-mix(in oklab, var(--foreground) 8%, transparent)",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Monthly Calendar */}
        {total > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Calendar
              </h2>
              <div className="h-px flex-1 bg-border opacity-60" />
            </div>
            <CalendarView habits={habits} logsByHabit={logsByHabit} today={today} />
          </section>
        )}

        {/* Weekly Trend Chart */}
        {total > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Trend
              </h2>
              <div className="h-px flex-1 bg-border opacity-60" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Weekly completion
              </span>
            </div>
            <TrendChart habits={habits} logs={logs} today={today} />
          </section>
        )}

        {/* Rituals list */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
              Rituals
            </h2>
            <div className="h-px flex-1 bg-border opacity-60" />
            <button
              onClick={() => setShowAdd(true)}
              aria-label="Add ritual"
              className="w-8 h-8 rounded-full border border-foreground/25 bg-foreground/5 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors flex items-center justify-center text-lg leading-none"
            >
              +
            </button>
          </div>

          <ul className="space-y-3">
            {habits.map((h) => {
              const done = logsByHabit.get(h.id)?.has(today) ?? false;
              const streak = currentStreak(logsByHabit.get(h.id) ?? [], today);
              return (
                <li key={h.id} className="group">
                  <div
                    className="flex items-center gap-5 p-6 rounded-2xl border transition-all duration-500 hover:-translate-y-0.5"
                    style={{
                      background: done
                        ? "color-mix(in oklab, var(--primary) 10%, var(--card))"
                        : "var(--card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <button
                      onClick={() => toggle.mutate(h.id)}
                      disabled={toggle.isPending}
                      className="relative flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90"
                      style={{
                        borderColor: done ? h.color : "var(--primary)",
                        background: done ? h.color : "transparent",
                      }}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                    >
                      {done ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="animate-[scale-check_0.3s_ease-out]"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 4"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full scale-0 group-hover:scale-50 transition-transform duration-300"
                          style={{ background: h.color }}
                        />
                      )}
                    </button>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-xl"
                        style={{
                          background: "color-mix(in oklab, var(--primary) 12%, var(--muted))",
                        }}
                        aria-hidden
                      >
                        {h.emoji}
                      </div>
                      <FrequencyDots habit={h} />
                    </div>

                    {done ? (
                      <span
                        className="flex-1 min-w-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium tracking-tight"
                        style={{
                          background: `color-mix(in oklab, ${h.color} 15%, transparent)`,
                          color: h.color,
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="shrink-0"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {h.name}
                      </span>
                    ) : (
                      <span className="flex-1 min-w-0 text-lg font-light tracking-tight text-foreground">
                        {h.name}
                      </span>
                    )}

                    {streak > 0 && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-tight px-3 py-1.5 rounded-full border shrink-0"
                        style={{
                          borderColor: `color-mix(in oklab, ${h.color} 35%, transparent)`,
                          color: h.color,
                          background: `color-mix(in oklab, ${h.color} 8%, transparent)`,
                        }}
                      >
                        <span className="text-sm leading-none">🔥</span>
                        {streak} {streak === 1 ? "day" : "days"}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {habits.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                Start with a small ritual.{" "}
                <Link to="/habits" className="underline text-foreground">
                  Add a habit
                </Link>
                .
              </li>
            )}
          </ul>
        </section>

        {/* Flourish */}
        <footer className="pt-4 text-center">
          <span className="inline-block w-1 h-1 rounded-full bg-border mx-1" />
          <span className="inline-block w-1 h-1 rounded-full bg-border mx-1" />
          <span className="inline-block w-1 h-1 rounded-full bg-border mx-1" />
        </footer>
      </div>
      {showAdd && <QuickAddHabit onClose={() => setShowAdd(false)} />}
    </main>
  );
}

const WEEKDAYS = [
  { i: 1, s: "M" },
  { i: 2, s: "T" },
  { i: 3, s: "W" },
  { i: 4, s: "T" },
  { i: 5, s: "F" },
  { i: 6, s: "S" },
  { i: 0, s: "S" },
];

function getActiveDays(habit: {
  frequency_type: string;
  frequency_days: number[];
  frequency_count: number;
}): Set<number> {
  if (habit.frequency_type === "daily") return new Set([0, 1, 2, 3, 4, 5, 6]);
  if (habit.frequency_type === "weekdays") return new Set(habit.frequency_days);
  // weekly_count: show all dimmed since any days could be chosen
  return new Set();
}

function FrequencyDots({
  habit,
}: {
  habit: {
    frequency_type: string;
    frequency_days: number[];
    frequency_count: number;
  };
}) {
  const active = getActiveDays(habit);
  const isCount = habit.frequency_type === "weekly_count";
  return (
    <div className="flex gap-[2.5px]" title={isCount ? `${habit.frequency_count}x / week` : ""}>
      {WEEKDAYS.map((d) => {
        const on = active.has(d.i);
        return (
          <div
            key={d.i}
            className="w-[5px] h-[5px] rounded-full"
            style={{
              background: isCount
                ? "color-mix(in oklab, var(--foreground) 15%, transparent)"
                : on
                  ? "var(--foreground)"
                  : "color-mix(in oklab, var(--foreground) 12%, transparent)",
            }}
          />
        );
      })}
    </div>
  );
}

function CalendarView({
  habits,
  logsByHabit,
  today,
}: {
  habits: { id: string }[];
  logsByHabit: Map<string, Set<string>>;
  today: string;
}) {
  const now = parseLocal(today);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const totalHabits = habits.length;

  const days: { day: number; ratio: number; date: string; isToday: boolean; isFuture: boolean }[] =
    [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = formatLocal(new Date(year, month, d));
    const isFuture = date > today;
    const isToday = date === today;
    let completed = 0;
    for (const h of habits) {
      if (logsByHabit.get(h.id)?.has(date)) completed++;
    }
    days.push({
      day: d,
      ratio: totalHabits > 0 ? completed / totalHabits : 0,
      date,
      isToday,
      isFuture,
    });
  }

  const monthLabel = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="text-xs font-serif italic text-foreground mb-1.5">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-[2px]">
        {dayLabels.map((l) => (
          <div
            key={l}
            className="text-[10px] uppercase tracking-wider text-muted-foreground text-center pb-0.5"
          >
            {l}
          </div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => {
          const fill = d.isFuture ? 0 : d.ratio;
          const bg =
            d.isFuture || (d.ratio === 0 && !d.isToday)
              ? "color-mix(in oklab, var(--foreground) 6%, transparent)"
              : d.ratio >= 1
                ? "var(--primary)"
                : `color-mix(in oklab, var(--primary) ${Math.max(15, fill * 60)}%, var(--muted))`;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${Math.round(d.ratio * 100)}%`}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors"
              style={{
                background: bg,
                color:
                  d.ratio >= 1
                    ? "var(--primary-foreground)"
                    : d.isToday
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                outline: d.isToday ? `1.5px solid var(--primary)` : "none",
                outlineOffset: d.isToday ? "-1.5px" : "0",
              }}
            >
              {d.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({
  habits,
  logs,
  today,
}: {
  habits: { id: string }[];
  logs: { habit_id: string; log_date: string }[];
  today: string;
}) {
  const weeks = useMemo(() => {
    const totalHabits = habits.length;
    if (totalHabits === 0) return [];

    const start = addDays(today, -(8 * 7 - 1));
    const result: { label: string; rate: number; count: number; total: number }[] = [];

    for (let w = 0; w < 8; w++) {
      const weekStart = addDays(start, w * 7);
      const weekEnd = addDays(weekStart, 6);
      const dates: string[] = [];
      let cur = weekStart;
      while (cur <= weekEnd) {
        dates.push(cur);
        cur = addDays(cur, 1);
      }

      const maxPossible = totalHabits * 7;
      let completed = 0;
      const logSet = new Set(logs.map((l) => l.habit_id + "|" + l.log_date));
      for (const d of dates) {
        for (const h of habits) {
          if (logSet.has(h.id + "|" + d)) completed++;
        }
      }

      const weekNum = getWeekNumber(parseLocal(weekStart));
      const monthLabel = parseLocal(weekStart).toLocaleDateString(undefined, { month: "short" });
      result.push({
        label: `${monthLabel} w${weekNum}`,
        rate: maxPossible > 0 ? completed / maxPossible : 0,
        count: completed,
        total: maxPossible,
      });
    }
    return result;
  }, [habits, logs, today]);

  const maxRate = Math.max(0.01, ...weeks.map((w) => w.rate));

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-end gap-2 h-40">
        {weeks.map((w, i) => {
          const pct = Math.round(w.rate * 100);
          const barH = Math.max(4, (w.rate / maxRate) * 100);
          const isLatest = i === weeks.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
              <span className="text-[10px] text-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {pct}%
              </span>
              <div className="w-full flex-1 flex items-end relative">
                <div
                  className="w-full rounded-t transition-all duration-500 group-hover:opacity-80"
                  style={{
                    height: `${barH}%`,
                    background: isLatest
                      ? "var(--primary)"
                      : `color-mix(in oklab, var(--primary) ${Math.max(30, pct)}%, var(--muted))`,
                    minHeight: pct > 0 ? "4px" : "1px",
                  }}
                />
                {pct > 0 && pct < 100 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t"
                    style={{
                      height: `${(1 - w.rate / maxRate) * 100}%`,
                      background: "var(--card)",
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground leading-tight text-center">
                {w.label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className="flex items-center justify-between mt-3 pt-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-block w-3 h-3 rounded" style={{ background: "var(--primary)" }} />
          Completion rate
        </div>
        <span className="text-[10px] text-muted-foreground">
          {weeks.filter((w) => w.rate >= 1).length}/{weeks.length} weeks perfect
        </span>
      </div>
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(
    (Math.floor((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7,
  );
}

function buildHeatmap(dates: string[], today: string) {
  const set = new Set(dates);
  const weeks: { date: string; count: number }[][] = [];
  const WEEKS = 17;
  // Anchor: latest column ends on today's weekday
  const start = addDays(today, -(WEEKS * 7 - 1));
  const startDate = parseLocal(start);
  // Align to Sunday start
  const dayOfWeek = startDate.getDay();
  const alignedStart = addDays(start, -dayOfWeek);

  const totalDays = WEEKS * 7 + dayOfWeek;
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(alignedStart, i);
    cells.push({ date: d, count: set.has(d) ? 1 : 0 });
    if (d === today) break;
  }
  // Aggregate: since we track one row per (habit,date), count = habits done that day
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
    <div className="flex gap-[3px] overflow-x-auto">
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
