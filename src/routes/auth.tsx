import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Today's Rhythms" },
      {
        name: "description",
        content: "Sign in to your calm, editorial habit tracker.",
      },
      { property: "og:title", content: "Sign in — Today's Rhythms" },
      { property: "og:description", content: "Sign in to your habit journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/today", replace: true });
    });
    // Check for password recovery hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setResetMode(true);
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/today` },
        });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try signing in.");
          return;
        }
        if (!data?.session) {
          setConfirmed(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message?.includes("Invalid login") || error.message?.includes("invalid")) {
            setError("Please use a valid login.");
          } else {
            setError(error.message);
          }
          setBusy(false);
          return;
        }
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.user_metadata?.onboarding_complete) {
          navigate({ to: "/today", replace: true });
          return;
        }
      }
      navigate({ to: "/onboarding", replace: true });
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error_description ||
        err?.msg ||
        (typeof err === "string" ? err : "Something went wrong.");
      setError(msg === "{}" || !msg ? "Something went wrong. Please try again." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError(null);
    setBusy(true);
    try {
      if (window.location.hash.includes("type=recovery")) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setResetSent(true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">📧</div>
          <h1 className="text-3xl font-serif italic text-foreground mb-3">Check your email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A password reset link was sent to <strong className="text-foreground">{email}</strong>. Follow the link to choose a new password.
          </p>
          <button
            onClick={() => { setResetMode(false); setResetSent(false); setError(null); }}
            className="mt-8 text-sm text-muted-foreground underline hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">✉️</div>
          <h1 className="text-3xl font-serif italic text-foreground mb-3">Verification email sent</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Check <strong className="text-foreground">{email}</strong> and click the confirmation link to activate your account.
          </p>
          <button
            onClick={() => setConfirmed(false)}
            className="mt-8 text-sm text-muted-foreground underline hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-serif italic tracking-tight text-foreground">
            Today's Rhythms
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back. Your rituals are waiting."
              : "Start your first ritual today."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">📊 Track daily</span>
          <span className="flex items-center gap-1.5">🔥 Build streaks</span>
          <span className="flex items-center gap-1.5">📈 View heatmap</span>
          <span className="flex items-center gap-1.5">💡 Get insights</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {resetMode ? (
            <>
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-foreground">
                  {window.location.hash.includes("type=recovery")
                    ? "Set a new password"
                    : "Reset your password"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {window.location.hash.includes("type=recovery")
                    ? "Choose a new password for your account."
                    : "Enter your email and we'll send you a reset link."}
                </p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); handleReset(); }}
                className="space-y-3"
              >
                {window.location.hash.includes("type=recovery") ? (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">New password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {busy
                    ? "…"
                    : window.location.hash.includes("type=recovery")
                      ? "Update password"
                      : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(null); }}
                  className="w-full text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
          <div className="flex gap-2 mb-6 text-sm">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-md transition-colors ${
                mode === "signin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md transition-colors ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setResetMode(true); setError(null); }}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
