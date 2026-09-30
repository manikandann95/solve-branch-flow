import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Ban, CheckCircle2, Trash2, UserPlus, Shield } from "lucide-react";
import { checkIsAdmin, listUsers, adminUserAction } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — TroubleshootFlow" },
      { name: "description", content: "Manage TroubleshootFlow user accounts and sign-in problems." },
      { property: "og:title", content: "Admin Panel — TroubleshootFlow" },
      { property: "og:description", content: "Manage TroubleshootFlow user accounts and sign-in problems." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleString() : "Never";
}

function AdminPage() {
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listUsers);
  const act = useServerFn(adminUserAction);
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => list(), enabled: !!admin.data?.isAdmin });
  const [filter, setFilter] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  async function run(input: any, msg: string) {
    try {
      await act({ data: input });
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  if (admin.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!admin.data?.isAdmin)
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );

  const rows = (users.data ?? []).filter((u) => u.email.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Fix sign-in problems: reset passwords, confirm, block or remove accounts.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserPlus className="h-4 w-4" /> Create account</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run({ action: "create", email: newEmail, password: newPass }, "Account created")) {
              setNewEmail(""); setNewPass("");
            }
          }}
        >
          <Input className="max-w-xs" type="email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <Input className="max-w-xs" type="text" placeholder="Password (min 6)" value={newPass} onChange={(e) => setNewPass(e.target.value)} minLength={6} required />
          <Button type="submit">Create</Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card/60">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-sm font-semibold">Users ({users.data?.length ?? 0})</h2>
          <Input className="max-w-xs" placeholder="Filter by email" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {users.isLoading ? (
          <div className="p-6 text-muted-foreground">Loading users…</div>
        ) : users.error ? (
          <div className="p-6 text-destructive">{(users.error as Error).message}</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {u.email}
                    {u.isAdmin && <Badge>Admin</Badge>}
                    {u.isSelf && <Badge variant="outline">You</Badge>}
                    {u.banned && <Badge variant="destructive">Blocked</Badge>}
                    {!u.confirmed && <Badge variant="secondary">Unconfirmed</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">Joined {fmt(u.created_at)} · Last sign-in {fmt(u.last_sign_in_at)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const p = window.prompt(`New password for ${u.email} (min 6 characters):`);
                    if (p) run({ action: "set_password", userId: u.id, password: p }, "Password updated");
                  }}><KeyRound className="mr-1 h-3.5 w-3.5" /> Set password</Button>
                  {!u.confirmed && (
                    <Button size="sm" variant="outline" onClick={() => run({ action: "confirm", userId: u.id }, "Account confirmed")}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm
                    </Button>
                  )}
                  {!u.isSelf && (u.banned ? (
                    <Button size="sm" variant="outline" onClick={() => run({ action: "unblock", userId: u.id }, "Account unblocked")}>
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Unblock
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => run({ action: "block", userId: u.id }, "Account blocked")}>
                      <Ban className="mr-1 h-3.5 w-3.5" /> Block
                    </Button>
                  ))}
                  {!u.isSelf && (
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (window.confirm(`Delete ${u.email}? This cannot be undone.`)) run({ action: "delete", userId: u.id }, "Account deleted");
                    }}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="p-6 text-muted-foreground">No users found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
