import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's Rhythms — A Quiet Habit Tracker" },
      {
        name: "description",
        content:
          "A calm, editorial habit tracker. Track daily rituals, streaks, and rhythm at a glance.",
      },
      { property: "og:title", content: "Today's Rhythms — A Quiet Habit Tracker" },
      {
        property: "og:description",
        content:
          "A warm, single-column habit journal. Streaks, heatmaps, and gentle insight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/today", replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            A quiet habit tracker
          </p>
          <h1 className="text-5xl sm:text-7xl font-serif italic leading-[1.05] tracking-tight text-foreground">
            Today's Rhythms
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            A calm, single-column journal for daily rituals. Track streaks, see
            your rhythm in a heatmap, and reflect with gentle, private insight.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get started free
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 sm:mt-28 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:text-left">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Daily check-in</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mark habits complete with one tap. Your progress ring fills as the day goes.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:text-left">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Streak tracking</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Current and longest streaks per habit. Fire icons celebrate your momentum.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:text-left">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Rhythm heatmap</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A contribution-graph style view of your consistency over the year.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:text-left">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Monthly calendar</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              See at a glance which days you completed all your habits.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:text-left">
            <div className="text-3xl mb-3">💡</div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Personalized insights</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Smart nudges based on your patterns. No AI keys needed — everything runs locally.
            </p>
          </div>
        </div>

        {/* Testimonial / tagline */}
        <div className="mt-20 text-center">
          <p className="font-serif italic text-lg sm:text-xl text-foreground/70 max-w-md mx-auto leading-relaxed">
            "Small daily rituals, repeated consistently, create a rhythm that carries you."
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-1 h-1 rounded-full bg-border" />
            <span>Today's Rhythms</span>
            <span className="inline-block w-1 h-1 rounded-full bg-border" />
            <span>{new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
