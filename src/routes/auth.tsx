import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, GitBranch, Loader2, Mail } from "lucide-react";
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

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/dashboard", replace: true });
    });
  }, [nav]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const message = error.message.toLowerCase().includes("email not confirmed")
        ? "Confirm your email using the link we sent before signing in."
        : error.message.toLowerCase().includes("invalid login credentials")
          ? "Email or password is incorrect. If you just signed up, confirm your email first."
          : error.message;
      return toast.error(message);
    }
    toast.success("Welcome back");
    nav({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      setConfirmationEmail(email);
      setResent(false);
      return;
    }
    toast.success("Account created");
    nav({ to: "/dashboard", replace: true });
  }

  async function resendConfirmation(targetEmail?: string) {
    const emailToConfirm = targetEmail ?? confirmationEmail;
    if (!emailToConfirm) {
      toast.error("Enter your email address first.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailToConfirm,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) return toast.error(error.message);
    setResent(true);
    toast.success("Confirmation email sent");
  }

  if (confirmationEmail) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="glass relative w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary">
            {resent ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
          </div>
          <h1 className="mt-5 text-2xl font-bold">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{confirmationEmail}</span>.
            Open it to activate your account, then sign in.
          </p>
          <div className="mt-6 space-y-3">
            <Button className="w-full" onClick={() => resendConfirmation()} disabled={resending || resent}>
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              {resent ? "Confirmation email sent" : "Resend confirmation email"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setConfirmationEmail(null);
                setPassword("");
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
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

        <Tabs defaultValue="signin">
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
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto w-full py-1"
                disabled={resending}
                onClick={() => resendConfirmation(email)}
              >
                {resending && <Loader2 className="h-4 w-4 animate-spin" />}
                Resend confirmation email
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
