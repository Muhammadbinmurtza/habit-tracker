import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createHabit } from "@/lib/habits.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (data.user.user_metadata?.onboarding_complete) {
      throw redirect({ to: "/today" });
    }
  },
  head: () => ({
    meta: [
      { title: "Welcome — Today's Rhythms" },
      { name: "description", content: "Set up your habit tracker." },
    ],
  }),
  component: OnboardingPage,
});

const SUGGESTED_HABITS = [
  { emoji: "📖", name: "Read for 15 minutes", color: "#8b5cf6" },
  { emoji: "💧", name: "Drink 8 glasses of water", color: "#3b82f6" },
  { emoji: "🧘", name: "Meditate", color: "#10b981" },
  { emoji: "🏃", name: "Go for a walk", color: "#f59e0b" },
  { emoji: "✍️", name: "Journal", color: "#ec4899" },
  { emoji: "☕", name: "Morning coffee mindfully", color: "#8b7355" },
];

const EMOJIS = ["📖", "💧", "🧘", "🏃", "✍️", "☕", "🌱", "🎨", "💪", "🌙"];

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createHabitFn = useServerFn(createHabit);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [skipHabit, setSkipHabit] = useState(false);
  const [habitEmoji, setHabitEmoji] = useState("📖");
  const [habitName, setHabitName] = useState("");
  const [habitColor, setHabitColor] = useState("#8b5cf6");
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: "Welcome to Today's Rhythms",
      subtitle: "Let's get you set up in two quick steps.",
    },
    {
      title: "What should we call you?",
      subtitle: "Your name will be used to personalize your experience.",
    },
    {
      title: "Add your first ritual",
      subtitle: "Pick a habit to start tracking. You can always add more later.",
    },
    {
      title: "You're all set!",
      subtitle: "Your rhythm starts today.",
    },
  ];

  async function handleNext() {
    if (step === 0) { setStep(1); return; }
    if (step === 1) {
      if (!name.trim()) { setStep(2); return; }
      setSaving(true);
      await supabase.auth.updateUser({
        data: { display_name: name.trim() },
      });
      setSaving(false);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (skipHabit || !habitName.trim()) { setStep(3); return; }
      await createHabitFn({
        data: {
          name: habitName.trim(),
          emoji: habitEmoji,
          color: habitColor,
          frequency_type: "daily",
          frequency_days: [],
          frequency_count: 7,
        },
      });
      qc.invalidateQueries({ queryKey: ["habits"] });
      setStep(3);
      return;
    }
    if (step === 3) {
      setSaving(true);
      await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["habits"] });
      navigate({ to: "/today", replace: true });
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        {/* Steps indicator */}
        <div className="flex gap-1.5 justify-center mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === step ? 24 : 8,
                background:
                  i <= step
                    ? "var(--primary)"
                    : "color-mix(in oklab, var(--foreground) 15%, transparent)",
              }}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="text-6xl mb-6">🌱</div>
            <h1 className="text-3xl sm:text-4xl font-serif italic text-foreground mb-3">
              {steps[0].title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {steps[0].subtitle}
            </p>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-serif italic text-foreground mb-6">
              {steps[1].title}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">{steps[1].subtitle}</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-lg text-center focus:outline-none focus:border-primary transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
            />
          </div>
        )}

        {/* Step 2: First habit */}
        {step === 2 && (
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-serif italic text-foreground mb-6">
              {steps[2].title}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{steps[2].subtitle}</p>

            {/* Suggested habits */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {SUGGESTED_HABITS.map((h) => (
                <button
                  key={h.name}
                  onClick={() => {
                    setHabitEmoji(h.emoji);
                    setHabitName(h.name);
                    setHabitColor(h.color);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all"
                  style={{
                    borderColor:
                      habitName === h.name ? h.color : "var(--border)",
                    background:
                      habitName === h.name
                        ? `color-mix(in oklab, ${h.color} 12%, var(--card))`
                        : "var(--card)",
                  }}
                >
                  <span className="text-lg">{h.emoji}</span>
                  <span className="text-foreground text-xs">{h.name}</span>
                </button>
              ))}
            </div>

            {/* Custom habit input */}
            <div className="flex gap-2">
              <select
                value={habitEmoji}
                onChange={(e) => setHabitEmoji(e.target.value)}
                className="px-2 rounded-xl bg-card border border-border text-lg"
              >
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <input
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="Or type a custom habit..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
            </div>

            <button
              onClick={() => { setSkipHabit(true); handleNext(); }}
              className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
            >
              Skip — I'll add habits later
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-serif italic text-foreground mb-3">
              {steps[3].title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {name
                ? `Great to have you here, ${name}.`
                : "Your rhythm starts today."}
            </p>
            <p className="text-xs text-muted-foreground">
              Check in daily, build streaks, and watch your consistency grow.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex gap-3 justify-center">
          {step > 0 && step < 3 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-full border border-foreground/25 bg-foreground/5 text-foreground text-sm hover:bg-foreground/10 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : step === 3 ? "Start tracking →" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
