import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext() as { user: User };
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Profile</h1>
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
    </div>
  );
}
