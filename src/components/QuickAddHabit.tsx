import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createHabit } from "@/lib/habits.functions";

const EMOJI_CHOICES = [
  "✨", "🌱", "📖", "🏃", "🧘", "💧", "🌙", "☕",
  "✍️", "🎨", "🎧", "💪", "🥗", "😴", "📝", "🧠",
  "🚶", "🌿", "🕯️", "🍵", "📚", "🧺", "🌸", "🔥",
];

const COLOR_CHOICES = [
  "#e0a86b", // amber
  "#c9724a", // ember
  "#8b7355", // sand
  "#7a8c68", // sage
  "#6b8b9e", // slate blue
  "#a67b8a", // rose taupe
  "#d4b04d", // gold
  "#8a6ba0", // muted violet
];

const WEEKDAYS = [
  { i: 1, s: "M" },
  { i: 2, s: "T" },
  { i: 3, s: "W" },
  { i: 4, s: "T" },
  { i: 5, s: "F" },
  { i: 6, s: "S" },
  { i: 0, s: "S" },
];

type FreqType = "daily" | "weekdays" | "weekly_count";

export function QuickAddHabit({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createHabit);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [freqType, setFreqType] = useState<FreqType>("daily");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [count, setCount] = useState(3);
  const [reminder, setReminder] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          emoji,
          color,
          reminder_time: reminder ? reminder : null,
          frequency_type: freqType,
          frequency_days: freqType === "weekdays" ? days : [],
          frequency_count: freqType === "weekly_count" ? count : 7,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  const canSubmit = name.trim().length > 0 && !create.isPending &&
    (freqType !== "weekdays" || days.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "color-mix(in oklab, black 60%, transparent)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border max-h-[92vh] overflow-y-auto"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                New ritual
              </p>
              <h2 className="font-serif italic text-3xl text-foreground mt-1">
                Shape a habit
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-foreground/25 text-foreground hover:bg-foreground/10 transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Name */}
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Morning walk"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-lg focus:outline-none focus:border-primary"
            />
          </label>

          {/* Emoji */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Icon
            </span>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className="aspect-square rounded-lg text-xl flex items-center justify-center transition-all border"
                  style={{
                    background:
                      emoji === e
                        ? "color-mix(in oklab, var(--primary) 20%, var(--background))"
                        : "var(--background)",
                    borderColor: emoji === e ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Accent
            </span>
            <div className="flex gap-3 flex-wrap">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className="w-9 h-9 rounded-full transition-transform"
                  style={{
                    background: c,
                    boxShadow:
                      color === c
                        ? `0 0 0 2px var(--card), 0 0 0 4px ${c}`
                        : "none",
                    transform: color === c ? "scale(1.05)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Frequency
            </span>
            <div className="flex gap-2 flex-wrap">
              {(["daily", "weekdays", "weekly_count"] as FreqType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFreqType(t)}
                  className="px-4 py-2 rounded-full border text-sm transition-colors"
                  style={{
                    background:
                      freqType === t ? "var(--primary)" : "transparent",
                    color:
                      freqType === t
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    borderColor:
                      freqType === t ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {t === "daily"
                    ? "Every day"
                    : t === "weekdays"
                    ? "Specific days"
                    : "X times / week"}
                </button>
              ))}
            </div>

            {freqType === "weekdays" && (
              <div className="flex gap-2 pt-1">
                {WEEKDAYS.map((d) => {
                  const on = days.includes(d.i);
                  return (
                    <button
                      key={d.i}
                      type="button"
                      onClick={() => toggleDay(d.i)}
                      className="w-10 h-10 rounded-full border text-sm font-medium transition-colors"
                      style={{
                        background: on ? "var(--primary)" : "transparent",
                        color: on
                          ? "var(--primary-foreground)"
                          : "var(--foreground)",
                        borderColor: on ? "var(--primary)" : "var(--border)",
                      }}
                    >
                      {d.s}
                    </button>
                  );
                })}
              </div>
            )}

            {freqType === "weekly_count" && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="flex-1 accent-[var(--primary)]"
                />
                <span className="font-serif italic text-2xl text-foreground w-16 text-right">
                  {count}×
                </span>
              </div>
            )}
          </div>

          {/* Reminder */}
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Reminder (optional)
            </span>
            <input
              type="time"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary"
            />
          </label>

          {create.isError && (
            <p className="text-sm text-destructive">
              Could not save. Try again.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border-2 border-foreground/25 bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => create.mutate()}
              disabled={!canSubmit}
              className="flex-1 px-4 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {create.isPending ? "Saving…" : "Add ritual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
