import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currentStreak, longestStreak, todayLocal, addDays } from "./streaks";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const getRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: habits }, { data: logs }] = await Promise.all([
      context.supabase
        .from("habits")
        .select("id, name, emoji, color, archived")
        .eq("archived", false),
      context.supabase.from("habit_logs").select("habit_id, log_date"),
    ]);

    const today = todayLocal();
    const thirtyDaysAgo = addDays(today, -30);

    const habitStats = (habits ?? []).map((h) => {
      const dates = (logs ?? [])
        .filter((l) => l.habit_id === h.id)
        .map((l) => l.log_date);
      return {
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        color: h.color,
        streak: currentStreak(dates, today),
        longest: longestStreak(dates),
        last30: dates.filter((d) => d >= thirtyDaysAgo).length,
        total: dates.length,
      };
    });

    const recs: { title: string; body: string }[] = [];

    if (habitStats.length === 0) {
      return {
        recommendations: [
          {
            title: "Start small",
            body: "Add your first habit to begin building a rhythm. Even five minutes a day makes a difference.",
          },
        ],
      };
    }

    // 1. Celebrate a strong streak if any
    const bestStreak = habitStats.reduce((max, h) => Math.max(max, h.streak), 0);
    if (bestStreak >= 7) {
      const h = habitStats.find((s) => s.streak === bestStreak)!;
      recs.push({
        title: `${h.emoji} ${h.name} on fire`,
        body: `${h.streak}-day streak on "${h.name}" — that's real momentum. Keep showing up and it becomes part of who you are.`,
      });
    } else if (bestStreak >= 3) {
      const h = habitStats.find((s) => s.streak === bestStreak)!;
      recs.push({
        title: `Nice run on ${h.name}`,
        body: `You're ${bestStreak} days deep into "${h.name}". Try linking it to an existing routine so it sticks without thinking.`,
      });
    }

    // 2. Nudge a habit with low last-30-day count
    const weakHabits = habitStats.filter((h) => h.last30 < 10 && h.total > 0);
    if (weakHabits.length > 0) {
      const h = pick(weakHabits);
      const daysSince = h.total > 0 ? Math.max(1, 30 - h.last30) : 30;
      recs.push({
        title: `Check in with ${h.name}`,
        body: `You've logged "${h.name}" only ${h.last30} times this month. Try scaling down to something so small it feels easy — even once a week builds a rhythm.`,
      });
    }

    // 3. Overall consistency insight
    const totalPossible = habitStats.length * 30;
    const totalDone = habitStats.reduce((sum, h) => sum + h.last30, 0);
    const rate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
    if (recs.length < 3) {
      if (rate >= 80) {
        recs.push({
          title: "Exceptional consistency",
          body: `${rate}% completion rate this month — you're showing up reliably. This is how habits become automatic.`,
        });
      } else if (rate >= 50) {
        recs.push({
          title: "Building momentum",
          body: `${rate}% completion this month. Pick one habit to focus on for the next week and watch the rest follow.`,
        });
      } else {
        recs.push({
          title: "Every step counts",
          body: `You checked in ${totalDone} times this month. Progress isn't about perfection — it's about returning. Try starting with your easiest habit first.`,
        });
      }
    }

    // 4. Longest streak encouragement if not covered yet
    if (recs.length < 3) {
      const bestEver = habitStats.reduce((max, h) => Math.max(max, h.longest), 0);
      if (bestEver > bestStreak) {
        const h = habitStats.find((s) => s.longest === bestEver)!;
        recs.push({
          title: `Beat your record`,
          body: `Your best streak for "${h.name}" is ${bestEver} days. You're only ${Math.max(0, bestEver - bestStreak)} days away — small daily steps add up.`,
        });
      } else if (habitStats.some((h) => h.streak > 0)) {
        recs.push({
          title: `Keep the chain alive`,
          body: `Don't break the streak today. Even a minimal version of your habit counts. Show up, do one rep, and keep going.`,
        });
      } else {
        recs.push({
          title: `Today is a fresh start`,
          body: `No active streaks right now — that means today is day one. Start with something small you can't say no to.`,
        });
      }
    }

    return { recommendations: recs.slice(0, 3) };
  });
