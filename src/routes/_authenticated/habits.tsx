import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  listAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from "@/lib/habits.functions";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/useHabitReminders";

export const Route = createFileRoute("/_authenticated/habits")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.user_metadata?.onboarding_complete) {
      throw redirect({ to: "/onboarding" });
    }
  },
  head: () => ({
    meta: [
      { title: "Habits — Today's Rhythms" },
      { name: "description", content: "Manage your daily habits." },
      { property: "og:title", content: "Habits — Today's Rhythms" },
      { property: "og:description", content: "Create, edit, and archive habits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HabitsPage,
});

const COLORS = ["#8b7355", "#c9b99a", "#a4907c", "#7d8b6e", "#b08968", "#6b7a8f"];
const EMOJI_SUGGESTIONS = ["🧘", "📖", "🏃", "✍️", "💧", "🌿", "☕", "🎨", "🌙", "🔔", "🍎", "💪"];

type HabitLite = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  archived: boolean;
  reminder_time: string | null;
};

function normalizeTime(v: string | null): string | null {
  if (!v) return null;
  return v.length >= 5 ? v.slice(0, 5) : v;
}

function HabitsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllHabits);
  const createFn = useServerFn(createHabit);
  const updateFn = useServerFn(updateHabit);
  const deleteFn = useServerFn(deleteHabit);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits", "all"],
    queryFn: () => listFn() as Promise<HabitLite[]>,
  });

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [color, setColor] = useState(COLORS[0]);
  const [reminderTime, setReminderTime] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const maybePromptForPermission = (time: string) => {
    if (!time) return;
    const p = getNotificationPermission();
    setPermission(p);
    if (p === "default" || p === "denied" || p === "blocked-by-preview") {
      setShowPermissionModal(true);
    }
  };

  useEffect(() => {
    const refreshPermission = () => setPermission(getNotificationPermission());
    refreshPermission();

    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => refreshPermission();
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.addEventListener("change", handlePermissionChange);
          refreshPermission();
        })
        .catch(() => undefined);
    }

    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);

    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
      permissionStatus?.removeEventListener("change", handlePermissionChange);
    };
  }, []);

  const create = useMutation({
    mutationFn: (input: {
      name: string;
      emoji: string;
      color: string;
      reminder_time: string | null;
    }) => createFn({ data: input }),
    onSuccess: () => {
      setName("");
      setEmoji("✨");
      setColor(COLORS[0]);
      setReminderTime("");
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habits", "all"] });
    },
  });

  const update = useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      emoji?: string;
      color?: string;
      archived?: boolean;
      reminder_time?: string | null;
    }) => updateFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habits", "all"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habits", "all"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  const askPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const recheckPermission = () => setPermission(getNotificationPermission());

  return (
    <main className="min-h-screen px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Manage
            </p>
            <h1 className="text-4xl sm:text-5xl font-serif italic tracking-tight text-foreground mt-2">
              Habits
            </h1>
          </div>
          <Link
            to="/today"
            className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          >
            ← Today
          </Link>

        </header>

        {/* Notifications banner */}
        <section className="rounded-xl border border-border bg-card p-4 mb-6 flex items-start gap-4">
          <span className="text-xl" aria-hidden>🔔</span>
          <div className="flex-1 text-sm">
            <p className="text-foreground font-medium">Reminders</p>
            {permission === "unsupported" ? (
              <p className="text-muted-foreground text-xs mt-1">
                This browser doesn't support notifications.
              </p>
            ) : permission === "granted" ? (
              <p className="text-muted-foreground text-xs mt-1">
                Notifications enabled. Reminders fire while this tab is open.
              </p>
            ) : permission === "blocked-by-preview" ? (
              <p className="text-muted-foreground text-xs mt-1">
                Notifications are blocked inside this preview frame. Open the app in a full
                browser tab, allow notifications there, then reload.
              </p>
            ) : permission === "denied" ? (
              <p className="text-muted-foreground text-xs mt-1">
                Notifications blocked. Enable them in your browser's site settings.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs mt-1">
                Turn on browser notifications to get nudged at the times you set.
              </p>
            )}
          </div>
          {permission === "blocked-by-preview" ? (
            <button
              onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
              className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary hover:opacity-90"
            >
              Open tab
            </button>
          ) : permission === "denied" ? (
            <button
              onClick={recheckPermission}
              className="text-sm font-medium px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              Recheck
            </button>
          ) : permission !== "granted" && permission !== "unsupported" && (
            <button
              onClick={askPermission}
              className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary hover:opacity-90"
            >
              Enable
            </button>

          )}
        </section>

        {/* Create form */}
        <section className="rounded-xl border border-border bg-card p-5 mb-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            New habit
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              create.mutate({
                name: name.trim(),
                emoji,
                color,
                reminder_time: reminderTime || null,
              });
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Morning meditation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Emoji
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                  className="w-14 px-2 py-1.5 text-center text-lg rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-1 flex-wrap">
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className="w-8 h-8 rounded-md hover:bg-accent text-base"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition-transform"
                    style={{
                      background: c,
                      borderColor: color === c ? "var(--foreground)" : "transparent",
                      transform: color === c ? "scale(1.1)" : "scale(1)",
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Daily reminder (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => {
                    const v = e.target.value;
                    setReminderTime(v);
                    if (v && !reminderTime) maybePromptForPermission(v);
                  }}
                  className="px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {reminderTime && (
                  <button
                    type="button"
                    onClick={() => setReminderTime("")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Adding…" : "Add habit"}
            </button>
          </form>
        </section>

        {/* List */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            All habits
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {habits.map((h) => (
              <li key={h.id} className="py-4">
                {editingId === h.id ? (
                  <EditRow
                    habit={h}
                    onSave={(patch) => {
                      update.mutate({ id: h.id, ...patch });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    onReminderSet={maybePromptForPermission}
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: h.color }}
                    />
                    <span className="text-xl" aria-hidden>
                      {h.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm ${h.archived ? "text-muted-foreground line-through" : "text-foreground"}`}
                      >
                        {h.name}
                      </div>
                      {h.reminder_time && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          🔔 {normalizeTime(h.reminder_time)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs font-medium">
                      <button
                        onClick={() => setEditingId(h.id)}
                        className="px-3 py-1.5 rounded-full border border-foreground/30 bg-foreground/5 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => update.mutate({ id: h.id, archived: !h.archived })}
                        className="px-3 py-1.5 rounded-full border border-foreground/30 bg-foreground/5 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                      >
                        {h.archived ? "Restore" : "Archive"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this habit and all its logs?"))
                            del.mutate(h.id);
                        }}
                        className="px-3 py-1.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                )}
              </li>
            ))}
            {habits.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No habits yet — create one above.
              </li>
            )}
          </ul>
        </section>
      </div>

      {showPermissionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowPermissionModal(false)}
        >
          <div
            className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3" aria-hidden>🔔</div>
            <h3 className="text-2xl font-serif italic text-foreground mb-2">
              Enable reminders?
            </h3>
            {permission === "blocked-by-preview" ? (
              <p className="text-sm text-muted-foreground mb-5">
                Notifications are blocked inside this preview frame. Open the app in a
                full browser tab and allow notifications there to receive alerts at
                your chosen time.
              </p>
            ) : permission === "denied" ? (
              <p className="text-sm text-muted-foreground mb-5">
                Notifications are currently blocked. Allow them in your browser's site
                settings, then reload to receive alerts.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-5">
                To alert you at your chosen time, this app needs permission to send
                browser notifications. Reminders fire while a tab is open.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground text-sm font-medium hover:bg-foreground/20 transition-colors"
              >
                Not now
              </button>
              {permission === "blocked-by-preview" ? (
                <button
                  onClick={() => {
                    window.open(window.location.href, "_blank", "noopener,noreferrer");
                    setShowPermissionModal(false);
                  }}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary text-sm font-medium hover:opacity-90"
                >
                  Open in new tab
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const result = await requestNotificationPermission();
                    setPermission(result);
                    setShowPermissionModal(false);
                  }}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary text-sm font-medium hover:opacity-90"
                >
                  Enable notifications
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function EditRow({
  habit,
  onSave,
  onCancel,
  onReminderSet,
}: {
  habit: HabitLite;
  onSave: (patch: {
    name: string;
    emoji: string;
    color: string;
    reminder_time: string | null;
  }) => void;
  onCancel: () => void;
  onReminderSet: (time: string) => void;
}) {
  const [name, setName] = useState(habit.name);
  const [emoji, setEmoji] = useState(habit.emoji);
  const [color, setColor] = useState(habit.color);
  const [reminderTime, setReminderTime] = useState<string>(
    normalizeTime(habit.reminder_time) ?? "",
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
          className="w-14 px-2 py-1.5 text-center text-lg rounded-md border border-border bg-background"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2"
              style={{
                background: c,
                borderColor: color === c ? "var(--foreground)" : "transparent",
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => {
              const v = e.target.value;
              setReminderTime(v);
              if (v && !reminderTime) onReminderSet(v);
            }}
            className="px-2 py-1 rounded-md border border-border bg-background text-xs"
          />
          {reminderTime && (
            <button
              type="button"
              onClick={() => setReminderTime("")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2 text-sm font-medium ml-auto">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full border-2 border-foreground/25 bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim(),
                emoji,
                color,
                reminder_time: reminderTime || null,
              })
            }
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
