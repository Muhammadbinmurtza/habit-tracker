import { useMemo, useState, useCallback } from "react";
import { currentStreak, todayLocal, addDays } from "@/lib/streaks";

type Habit = {
  id: string;
  name: string;
  emoji?: string;
  frequency_type?: string;
  frequency_count?: number;
};
type LogEntry = { habit_id: string; log_date: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function getWeekDates(startDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
}

function formatWeekLabel(startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const fm = d.toLocaleDateString(undefined, { month: "short" });
  const fd = d.getDate();
  const ed = end.getDate();
  const em = end.toLocaleDateString(undefined, { month: "short" });
  return fm === em ? `${fm} ${fd}–${ed}` : `${fm} ${fd} – ${em} ${ed}`;
}

function getDifficultyClass(
  freq: string | undefined,
  count: number | undefined,
): { label: string; bg: string; color: string; border: string } {
  if (freq === "daily")
    return {
      label: "Daily",
      bg: "var(--muted)",
      color: "var(--muted-foreground)",
      border: "var(--border)",
    };
  if (freq === "weekdays")
    return {
      label: "Challenging",
      bg: "color-mix(in oklab, var(--accent) 15%, transparent)",
      color: "var(--accent)",
      border: "transparent",
    };
  return {
    label: "Hard",
    bg: "color-mix(in oklab, var(--primary) 15%, transparent)",
    color: "var(--primary)",
    border: "transparent",
  };
}

function Checkbox({
  checked,
  onChange,
  isToday,
}: {
  checked: boolean;
  onChange: () => void;
  isToday: boolean;
}) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-center cursor-pointer"
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: checked ? "none" : "1.5px solid var(--border)",
        background: checked ? "var(--primary)" : "transparent",
        margin: "0 auto",
      }}
      aria-label={checked ? "Uncheck" : "Check"}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 4"
            stroke="var(--primary-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function TableView({
  habits,
  logsByHabit,
  onToggle,
  today,
}: {
  habits: Habit[];
  logsByHabit: Map<string, Set<string>>;
  onToggle: (habitId: string, date: string) => void;
  today: string;
}) {
  const weekStarts = useMemo(() => {
    const starts: string[] = [];
    const currentWeek = getWeekStart(today);
    for (let i = 3; i >= 0; i--) {
      starts.push(addDays(currentWeek, -i * 7));
    }
    return starts;
  }, [today]);

  const [selectedWeek, setSelectedWeek] = useState(weekStarts.length - 1);
  const weekStart = weekStarts[selectedWeek];
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = addDays(weekStart, 6);

  const todayCol = weekDates.indexOf(today);

  const perHabitData = useMemo(() => {
    return habits.map((h) => {
      const habitDates = logsByHabit.get(h.id) ?? new Set();
      const days = weekDates.map((d) => habitDates.has(d));
      const completed = days.filter(Boolean).length;
      const rate = Math.round((completed / 7) * 100);
      const diff = getDifficultyClass(h.frequency_type, h.frequency_count);
      return { habit: h, days, rate, diff, completed };
    });
  }, [habits, logsByHabit, weekDates]);

  const footer = useMemo(() => {
    const perDay = weekDates.map((d) => {
      const count = habits.filter((h) => logsByHabit.get(h.id)?.has(d)).length;
      return { count, rate: habits.length > 0 ? Math.round((count / habits.length) * 100) : 0 };
    });
    const avgRate = perDay.reduce((s, d) => s + d.rate, 0) / (perDay.length || 1);
    return { perDay, avgRate: Math.round(avgRate) };
  }, [habits, logsByHabit, weekDates]);

  const bestRate = useMemo(() => Math.max(...perHabitData.map((h) => h.rate), 0), [perHabitData]);

  if (habits.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed py-14 px-6 text-center"
        style={{ borderColor: "color-mix(in oklab, var(--foreground) 15%, transparent)" }}
      >
        <p className="font-serif italic text-xl text-foreground/50">Your rhythm builds here</p>
        <p className="text-sm text-muted-foreground mt-2">Add habits to see your table view.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Week selector */}
      <div className="flex gap-0 mb-4 overflow-x-auto">
        {weekStarts.map((ws, i) => {
          const active = i === selectedWeek;
          const canGoForward = i > selectedWeek && ws > weekStarts[selectedWeek];
          return (
            <button
              key={ws}
              onClick={() => setSelectedWeek(i)}
              className="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                borderBottomColor: active ? "var(--primary)" : "transparent",
                opacity: ws > today ? 0.4 : 1,
              }}
            >
              {formatWeekLabel(ws)}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-x-auto"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="flex border-b" style={{ height: 40, borderColor: "var(--border)" }}>
          <div className="flex items-end px-4 pb-1.5" style={{ minWidth: 180, flex: "1 1 auto" }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Habit
            </span>
          </div>
          <div className="flex items-end px-2 pb-1.5" style={{ minWidth: 100, width: 100 }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Difficulty
            </span>
          </div>
          {DAYS.map((day, di) => (
            <div
              key={day}
              className="flex items-end justify-center pb-1.5"
              style={{
                minWidth: 56,
                width: 56,
                background:
                  di === todayCol
                    ? "color-mix(in oklab, var(--primary) 6%, transparent)"
                    : "transparent",
              }}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                {day}
              </span>
            </div>
          ))}
          <div
            className="flex items-end justify-end px-4 pb-1.5"
            style={{ minWidth: 110, width: 110 }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Success rate
            </span>
          </div>
        </div>

        {/* Rows */}
        {perHabitData.map((hd, ri) => (
          <div
            key={hd.habit.id}
            className="flex border-b"
            style={{
              borderColor: "var(--border)",
              background:
                ri % 2 === 0 ? "transparent" : "color-mix(in oklab, var(--muted) 50%, transparent)",
            }}
          >
            {/* Habit name */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ minWidth: 180, flex: "1 1 auto" }}
            >
              <span className="text-lg">{hd.habit.emoji || "📌"}</span>
              <span className="text-sm font-medium truncate text-foreground">{hd.habit.name}</span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center px-2 py-3" style={{ minWidth: 100, width: 100 }}>
              <span
                className="font-mono text-[11px] uppercase rounded-full px-2.5 py-1"
                style={{
                  background: hd.diff.bg,
                  color: hd.diff.color,
                  border: hd.diff.border !== "transparent" ? `1px solid ${hd.diff.border}` : "none",
                }}
              >
                {hd.diff.label}
              </span>
            </div>

            {/* Day columns */}
            {DAYS.map((day, di) => (
              <div
                key={day}
                className="flex items-center justify-center py-3"
                style={{
                  minWidth: 56,
                  width: 56,
                  background:
                    di === todayCol
                      ? "color-mix(in oklab, var(--primary) 6%, transparent)"
                      : "transparent",
                }}
              >
                {weekDates[di] <= today && (
                  <Checkbox
                    checked={hd.days[di]}
                    isToday={di === todayCol}
                    onChange={() => onToggle(hd.habit.id, weekDates[di])}
                  />
                )}
              </div>
            ))}

            {/* Success rate */}
            <div
              className="flex items-center justify-end px-4 py-3"
              style={{ minWidth: 110, width: 110 }}
            >
              <span
                className="font-mono text-[13px]"
                style={{
                  color:
                    hd.rate === bestRate && hd.rate > 0 ? "var(--primary)" : "var(--foreground)",
                }}
              >
                {hd.rate}%
              </span>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="flex" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center px-4"
            style={{ minWidth: 180, flex: "1 1 auto", height: 36 }}
          >
            <span className="font-mono text-[11px] uppercase text-muted-foreground">Checked</span>
          </div>
          <div style={{ minWidth: 100, width: 100, height: 36 }} />
          {DAYS.map((day, di) => (
            <div
              key={day}
              className="flex items-center justify-center"
              style={{
                minWidth: 56,
                width: 56,
                height: 36,
                background:
                  di === todayCol
                    ? "color-mix(in oklab, var(--primary) 6%, transparent)"
                    : "transparent",
              }}
            >
              <span className="font-mono text-xs text-foreground">
                {Math.round(footer.perDay[di]?.rate ?? 0)}%
              </span>
            </div>
          ))}
          <div
            className="flex items-center justify-end px-4"
            style={{ minWidth: 110, width: 110, height: 36 }}
          >
            <span
              className="font-mono text-xs"
              style={{
                color:
                  footer.avgRate > 0 && footer.avgRate > 50
                    ? "var(--primary)"
                    : "var(--foreground)",
              }}
            >
              {footer.avgRate}% avg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
