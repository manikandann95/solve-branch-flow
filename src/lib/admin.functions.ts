import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at,
      banned: !!(u as any).banned_until && new Date((u as any).banned_until) > new Date(),
      isAdmin: admins.has(u.id),
      isSelf: u.id === context.userId,
    }));
  });

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_password"), userId: z.string().uuid(), password: z.string().min(6).max(128) }),
  z.object({ action: z.literal("confirm"), userId: z.string().uuid() }),
  z.object({ action: z.literal("block"), userId: z.string().uuid() }),
  z.object({ action: z.literal("unblock"), userId: z.string().uuid() }),
  z.object({ action: z.literal("delete"), userId: z.string().uuid() }),
  z.object({ action: z.literal("create"), email: z.string().email().max(255), password: z.string().min(6).max(128) }),
]);

export const adminUserAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => actionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const a = supabaseAdmin.auth.admin;
    if ("userId" in data && data.userId === context.userId && (data.action === "delete" || data.action === "block")) {
      throw new Error("You can't block or delete your own account");
    }
    let res: { error: { message: string } | null };
    switch (data.action) {
      case "set_password": res = await a.updateUserById(data.userId, { password: data.password }); break;
      case "confirm": res = await a.updateUserById(data.userId, { email_confirm: true }); break;
      case "block": res = await a.updateUserById(data.userId, { ban_duration: "876000h" }); break;
      case "unblock": res = await a.updateUserById(data.userId, { ban_duration: "none" }); break;
      case "delete": res = await a.deleteUser(data.userId); break;
      case "create": res = await a.createUser({ email: data.email, password: data.password, email_confirm: true }); break;
    }
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
