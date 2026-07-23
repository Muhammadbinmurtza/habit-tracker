import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's Rhythms — Build Better Habits" },
      { name: "description", content: "Track daily habits with precision. Streaks, heatmaps, and data-driven insights." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [consistency, setConsistency] = useState(50);
  const [displayStreak, setDisplayStreak] = useState(12);
  const [displayPct, setDisplayPct] = useState(68);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/today", replace: true });
    });
  }, [navigate]);

  const handleSlider = useCallback((val: number) => {
    setConsistency(val);
    const streak = Math.round(val * 0.45);
    const pct = Math.round(30 + val * 0.62);
    setDisplayStreak(streak);
    setDisplayPct(Math.min(100, pct));
  }, []);

  // Generate seeded heatmap cells based on slider value
  const cells = Array.from({ length: 13 * 7 }).map((_, i) => {
    const seeded = ((i * 17 + i * 31) % 100) / 100; // deterministic seed per cell
    const threshold = 1 - consistency / 100;
    const active = seeded > threshold;
    const intensity = active ? Math.min(5, Math.ceil((seeded - threshold) / (1 - threshold) * 5)) : 0;
    return { intensity };
  });

  return (
    <main
      className="min-h-screen px-6 sm:px-10 py-10 sm:py-16"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Hero — two column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              <span className="text-foreground">Show up.</span>
              <br />
              <span
                className="font-serif italic"
                style={{
                  background: "var(--gradient-warm)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Every day.
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
              Track daily habits, build unbreakable streaks, and watch your
              consistency grow with data-driven insights — no fluff, just
              results.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center rounded-md px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Start building →
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Interactive product visual */}
          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            {/* Heatmap grid */}
            <div className="flex gap-[3px] overflow-x-auto">
              {Array.from({ length: 13 }).map((_, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, di) => {
                    const cell = cells[wi * 7 + di];
                    const bg =
                      cell.intensity === 0
                        ? "var(--muted)"
                        : cell.intensity <= 2
                          ? "color-mix(in oklab, var(--primary) 18%, var(--muted))"
                          : cell.intensity <= 3
                            ? "color-mix(in oklab, var(--primary) 40%, var(--muted))"
                            : cell.intensity <= 4
                              ? "color-mix(in oklab, var(--primary) 70%, var(--muted))"
                              : "var(--primary)";
                    return (
                      <div
                        key={di}
                        className="w-[13px] h-[13px] rounded-[2px]"
                        style={{ background: bg, transition: "background 0.3s ease" }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Slider */}
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[11px] uppercase text-muted-foreground">Consistency</span>
                <span className="font-mono text-[13px] text-foreground">{consistency}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={consistency}
                onChange={(e) => handleSlider(Number(e.target.value))}
                className="w-full"
                style={{
                  WebkitAppearance: "none",
                  height: 4,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, var(--primary) ${consistency}%, var(--border) ${consistency}%)`,
                  accentColor: "var(--primary)",
                }}
                aria-label="Adjust consistency demo"
              />
            </div>

            {/* Stat readouts */}
            <div className="flex gap-6 mt-4">
              <div>
                <p className="font-mono text-2xl font-medium" style={{ color: "var(--primary)" }}>
                  {displayStreak}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">day streak</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-medium" style={{ color: "var(--accent)" }}>
                  {displayPct}%
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features — compact spec sheet */}
        <div
          className="mt-20 sm:mt-28 rounded-2xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {[
            { label: "Daily check-in", desc: "One tap marks a habit complete. Progress ring fills in real time.", stat: "1 tap" },
            { label: "Streak tracking", desc: "Current and longest streaks per habit. Flame icons mark momentum.", stat: "365 days" },
            { label: "Rhythm heatmap", desc: "GitHub-style contribution graph showing your consistency over time.", stat: "17 weeks" },
            { label: "Trend charts", desc: "Weekly completion rates with gradient bars and trend insights.", stat: "Ember + Signal" },
            { label: "Personalized insights", desc: "Local recommendations based on your patterns. No keys needed.", stat: "Zero API" },
            { label: "Data export", desc: "Export your habit data anytime. You own your consistency.", stat: "CSV/JSON" },
          ].map((f, i) => (
            <div
              key={f.label}
              className="grid grid-cols-[1fr_2fr_auto] sm:grid-cols-[1fr_3fr_auto] gap-4 sm:gap-8 px-5 sm:px-6 py-4 items-center"
              style={{
                borderBottom: i < 5 ? "1px solid" : "none",
                borderColor: "var(--border)",
                background: i % 2 === 1 ? "var(--card)" : "transparent",
              }}
            >
              <span className="text-sm font-semibold text-foreground">{f.label}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{f.desc}</span>
              <span className="font-mono text-xs sm:text-sm font-medium" style={{ color: "var(--primary)" }}>
                {f.stat}
              </span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="mt-20 text-center">
          <p className="font-serif italic text-lg sm:text-xl text-foreground/70 max-w-md mx-auto leading-relaxed">
            "Small daily rituals, repeated consistently, create a rhythm that carries you."
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t text-center" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{new Date().getFullYear()}</span>
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--border)" }} />
            <span>Today's Rhythms</span>
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--border)" }} />
            <span className="font-mono">built for momentum</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
