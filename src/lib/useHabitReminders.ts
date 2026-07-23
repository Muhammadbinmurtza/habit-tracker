import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHabits } from "@/lib/habits.functions";

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported"
  | "blocked-by-preview";

type HabitRow = {
  id: string;
  name: string;
  emoji: string;
  reminder_time: string | null;
};

const STORAGE_KEY = "habit-reminders-fired";

function notificationsAllowedByPagePolicy() {
  if (typeof document === "undefined") return true;
  const policyDocument = document as Document & {
    featurePolicy?: { allowsFeature?: (feature: string) => boolean };
    permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
  };
  const policy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
  if (!policy?.allowsFeature) return true;
  try {
    return policy.allowsFeature("notifications");
  } catch {
    return true;
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadFired(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };
    if (parsed.date !== todayKey()) return {};
    const map: Record<string, string> = {};
    parsed.ids.forEach((id) => (map[id] = parsed.date));
    return map;
  } catch {
    return {};
  }
}

function saveFired(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  const date = todayKey();
  const ids = Object.keys(map).filter((k) => map[k] === date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, ids }));
}

export function useHabitReminders() {
  const listFn = useServerFn(listHabits);
  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => listFn() as Promise<HabitRow[]>,
  });

  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      audioCtx.current = new AudioContext();
    } catch {
      // Audio not supported
    }

    let fired = loadFired();

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const current = `${hh}:${mm}`;
      const today = todayKey();

      const anyStale = Object.values(fired).some((d) => d !== today);
      if (anyStale) {
        fired = {};
      }

      for (const h of habits) {
        if (!h.reminder_time) continue;
        const t = h.reminder_time.slice(0, 5);
        if (t > current) continue;
        if (fired[h.id] === today) continue;

        // Always fire — alarm plays regardless of notification permission
        fired[h.id] = today;

        // Play audible alarm
        if (audioCtx.current) {
          try {
            const notes = [880, 660, 880, 660, 880, 660, 880, 1100];
            const noteLength = 0.12;
            const gap = 0.08;
            notes.forEach((freq, i) => {
              const osc = audioCtx.current!.createOscillator();
              const gain = audioCtx.current!.createGain();
              osc.type = "triangle";
              osc.frequency.value = freq;
              const startTime = audioCtx.current!.currentTime + i * (noteLength + gap);
              gain.gain.setValueAtTime(0.3, startTime);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);
              osc.connect(gain);
              gain.connect(audioCtx.current!.destination);
              osc.start(startTime);
              osc.stop(startTime + noteLength);
            });
          } catch {
            // ignore audio errors
          }
        }

        // Also show browser notification
        if (notificationsAllowedByPagePolicy() && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`${h.emoji} ${h.name}`, {
              body: "Time for your habit — a small rhythm keeps the streak alive.",
              tag: `habit-${h.id}-${today}`,
            });
          } catch {
            // notification failed
          }
        }
      }

      saveFired(fired);
    };

    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, [habits]);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (!notificationsAllowedByPagePolicy()) {
    return "blocked-by-preview";
  }
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!notificationsAllowedByPagePolicy()) return "blocked-by-preview";
  return Notification.permission;
}
