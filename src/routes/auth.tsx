import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitBranch, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SECURITY_QUESTIONS,
  getSecurityQuestion,
  resetPasswordWithSecurityAnswer,
  setSecurityQuestion,
} from "@/lib/security.functions";

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
  const [challenge, setChallenge] = useState(randomChallenge);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [secQuestion, setSecQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [secAnswer, setSecAnswer] = useState("");

  const fetchQuestion = useServerFn(getSecurityQuestion);
  const resetWithAnswer = useServerFn(resetPasswordWithSecurityAnswer);
  const saveQuestion = useServerFn(setSecurityQuestion);

  // Reset dialog state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "answer">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [fetchedQuestion, setFetchedQuestion] = useState<string | null>(null);
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

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
    if (secAnswer.trim().length < 2) {
      return toast.error("Please enter a security answer (at least 2 characters).");
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
      if (signInError) {
        setLoading(false);
        setTab("signin");
        return toast.error("This email may already have an account. Sign in, or use “Forgot password?”.");
      }
    }
    try {
      await saveQuestion({ data: { question: secQuestion, answer: secAnswer } });
    } catch {
      // Non-fatal: account exists; question can be set later from the profile page.
    }
    setLoading(false);
    toast.success("Account created");
    nav({ to: "/dashboard", replace: true });
  }

  function openReset() {
    setResetEmail(email.trim());
    setResetStep("email");
    setFetchedQuestion(null);
    setResetAnswer("");
    setNewPassword("");
    setResetOpen(true);
  }

  async function lookupQuestion(e: React.FormEvent) {
    e.preventDefault();
    const target = resetEmail.trim();
    if (!target) return toast.error("Enter your email address first.");
    setResetBusy(true);
    try {
      const { question } = await fetchQuestion({ data: { email: target } });
      if (!question) {
        toast.error("No security question is set for this account. Ask your admin to reset the password.");
        return;
      }
      setFetchedQuestion(question);
      setResetStep("answer");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetBusy(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    try {
      await resetWithAnswer({
        data: { email: resetEmail.trim(), answer: resetAnswer, newPassword },
      });
      toast.success("Password updated. Sign in with your new password.");
      setResetOpen(false);
      setEmail(resetEmail.trim());
      setPassword("");
      setTab("signin");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetBusy(false);
    }
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
                    onClick={openReset}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
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
                <Label>Security question (used to reset your password)</Label>
                <Select value={secQuestion} onValueChange={setSecQuestion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-answer">Security answer</Label>
                <Input id="sec-answer" type="text" required minLength={2} value={secAnswer} onChange={(e) => setSecAnswer(e.target.value)} placeholder="Your answer" />
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Reset password
            </DialogTitle>
            <DialogDescription>
              {resetStep === "email"
                ? "Enter your account email to look up your security question."
                : "Answer your security question to set a new password."}
            </DialogDescription>
          </DialogHeader>

          {resetStep === "email" ? (
            <form onSubmit={lookupQuestion} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={resetBusy}>
                {resetBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                {fetchedQuestion}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-answer">Your answer</Label>
                <Input id="reset-answer" type="text" required value={resetAnswer} onChange={(e) => setResetAnswer(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input id="reset-new-password" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={resetBusy}>
                {resetBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set new password
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
