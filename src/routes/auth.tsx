import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | TroubleshootFlow" },
      { name: "description", content: "Sign in or create your TroubleshootFlow account." },
      { property: "og:title", content: "Sign in | TroubleshootFlow" },
      { property: "og:description", content: "Access your IT troubleshooting decision trees and templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function randomChallenge() {
  return { a: 2 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) };
}

function AuthPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [challenge, setChallenge] = useState(randomChallenge);
  const [challengeAnswer, setChallengeAnswer] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/dashboard", replace: true });
    });
  }, [nav]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      const message = error.message.toLowerCase().includes("invalid login credentials")
        ? "Email or password is incorrect. Use “Forgot password?” to set a new one."
        : error.message;
      return toast.error(message);
    }
    toast.success("Welcome back");
    nav({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (Number(challengeAnswer) !== challenge.a + challenge.b) {
      setChallenge(randomChallenge());
      setChallengeAnswer("");
      return toast.error("Verification answer is incorrect. Please try again.");
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setChallenge(randomChallenge());
      setChallengeAnswer("");
      if (error.message.toLowerCase().includes("already registered")) {
        setTab("signin");
        return toast.error("This email already has an account. Sign in instead, or use “Forgot password?”.");
      }
      return toast.error(error.message);
    }
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (signInError) {
        setTab("signin");
        return toast.error("This email may already have an account. Sign in, or use “Forgot password?”.");
      }
    } else {
      setLoading(false);
    }
    toast.success("Account created");
    nav({ to: "/dashboard", replace: true });
  }

  async function forgotPassword() {
    const target = email.trim();
    if (!target) return toast.error("Enter your email address first.");
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent. Check your inbox and spam folder.");
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="glass relative w-full max-w-md rounded-2xl p-8">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary">
            <GitBranch className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">TroubleshootFlow</span>
        </Link>
        <h1 className="sr-only">Access TroubleshootFlow</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="engineer@company.com" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={forgotPassword}
                    disabled={resetting}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-60"
                  >
                    {resetting && <Loader2 className="h-3 w-3 animate-spin" />}
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">Password</Label>
                <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="challenge">
                  Human check: what is {challenge.a} + {challenge.b}?
                </Label>
                <Input
                  id="challenge"
                  type="text"
                  inputMode="numeric"
                  required
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  placeholder="Your answer"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
              <p className="text-center text-xs text-muted-foreground">No email confirmation needed — you're signed in right away.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
