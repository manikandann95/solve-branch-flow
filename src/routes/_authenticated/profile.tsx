import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldQuestion } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@supabase/supabase-js";
import {
  SECURITY_QUESTIONS,
  hasSecurityQuestion,
  setSecurityQuestion,
} from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TroubleshootFlow" },
      { name: "description", content: "Manage your TroubleshootFlow profile and security question." },
      { property: "og:title", content: "Profile — TroubleshootFlow" },
      { property: "og:description", content: "Manage your TroubleshootFlow profile and security question." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext() as { user: User };
  const fetchHas = useServerFn(hasSecurityQuestion);
  const save = useServerFn(setSecurityQuestion);
  const current = useQuery({ queryKey: ["security-question"], queryFn: () => fetchHas() });

  const [question, setQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { question, answer } });
      toast.success("Security question saved");
      setAnswer("");
      current.refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <Card className="glass p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/20 text-lg font-bold text-primary ring-2 ring-primary/40">
            {(user.email ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{user.email}</div>
            <div className="text-xs text-muted-foreground">User ID: {user.id.slice(0, 8)}…</div>
          </div>
        </div>
      </Card>

      <Card className="glass p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldQuestion className="h-4 w-4 text-primary" /> Security question
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Used to reset your password if you forget it.{" "}
          {current.data?.question
            ? `Current question: “${current.data.question}”`
            : "You haven't set one yet."}
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Question</Label>
            <Select value={question} onValueChange={setQuestion}>
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
            <Label htmlFor="profile-sec-answer">Answer</Label>
            <Input
              id="profile-sec-answer"
              type="text"
              required
              minLength={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save security question
          </Button>
        </form>
      </Card>
    </div>
  );
}
