import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currentStreak, longestStreak, todayLocal, addDays } from "./streaks";

export const getRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const [{ data: habits }, { data: logs }] = await Promise.all([
      context.supabase
        .from("habits")
        .select("id, name, emoji, color, archived")
        .eq("archived", false),
      context.supabase.from("habit_logs").select("habit_id, log_date"),
    ]);

    const today = todayLocal();
    const thirtyDaysAgo = addDays(today, -30);
    const totalCheckIns = logs?.length ?? 0;
    const last30 = (logs ?? []).filter((l) => l.log_date >= thirtyDaysAgo).length;

    const habitStats = (habits ?? []).map((h) => {
      const dates = (logs ?? [])
        .filter((l) => l.habit_id === h.id)
        .map((l) => l.log_date);
      return {
        name: h.name,
        emoji: h.emoji,
        streak: currentStreak(dates, today),
        longest: longestStreak(dates),
        last30: dates.filter((d) => d >= thirtyDaysAgo).length,
        total: dates.length,
      };
    });

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are a warm, editorial habit coach for a minimalist habit tracker called "Today's Rhythms."
Return exactly 3 short, personalized recommendations for the user based on their data.
Each recommendation should be 1-2 sentences, concrete, and gentle in tone (never scolding).
Focus on: momentum to build on, small nudges for weak habits, and one specific ritual suggestion.

Return ONLY a JSON array of 3 objects with this exact shape (no markdown, no prose):
[{"title":"short 2-4 word title","body":"1-2 sentence recommendation"}]`;

    const user = `User stats:
- Total check-ins all time: ${totalCheckIns}
- Last 30 days: ${last30}
- Active habits: ${habitStats.length}

Habits:
${habitStats
  .map(
    (h) =>
      `- "${h.name}" ${h.emoji} — current streak ${h.streak}, longest ${h.longest}, ${h.last30} in last 30d, ${h.total} total`,
  )
  .join("\n") || "(none yet)"}`;

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system,
      prompt: user,
    });

    const match = text.match(/\[[\s\S]*\]/);
    const raw = match ? match[0] : text;
    let parsed: Array<{ title: string; body: string }>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [{ title: "Keep going", body: text.slice(0, 240) }];
    }

    return {
      recommendations: parsed
        .filter((r) => r && typeof r.title === "string" && typeof r.body === "string")
        .slice(0, 3),
    };
  });
