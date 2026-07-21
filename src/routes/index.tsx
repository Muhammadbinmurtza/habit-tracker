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
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
          A quiet habit tracker
        </p>
        <h1 className="text-6xl sm:text-7xl font-serif italic leading-[1.05] tracking-tight text-foreground">
          Today's Rhythms
        </h1>
        <p className="mt-6 text-base text-muted-foreground leading-relaxed">
          A calm, single-column journal for daily rituals. Track streaks, see
          your rhythm in a heatmap, and reflect with gentle, private insight.
        </p>
        <div className="mt-10 flex gap-3 justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
