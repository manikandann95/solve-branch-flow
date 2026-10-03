import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What is the name of your favorite teacher?",
  "What was the make of your first car?",
  "What is your mother's maiden name?",
] as const;

function hashAnswer(answer: string): string {
  return createHash("sha256").update(answer.trim().toLowerCase()).digest("hex");
}

// Public: fetch the security question for an email (never the answer).
export const getSecurityQuestion = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("security_question")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();
    if (!profile?.security_question) {
      return { question: null };
    }
    return { question: profile.security_question };
  });

// Public: verify the answer and set a new password.
export const resetPasswordWithSecurityAnswer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email().max(255),
        answer: z.string().min(1).max(200),
        newPassword: z.string().min(6).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, security_answer_hash")
      .eq("email", email)
      .maybeSingle();
    if (!profile?.security_answer_hash) {
      throw new Error("No security question is set for this account.");
    }
    if (profile.security_answer_hash !== hashAnswer(data.answer)) {
      throw new Error("Security answer is incorrect.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Authenticated: set or change your own security question.
export const setSecurityQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        question: z.string().min(5).max(200),
        answer: z.string().min(2).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        security_question: data.question.trim(),
        security_answer_hash: hashAnswer(data.answer),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Authenticated: check whether the current user has a security question set.
export const hasSecurityQuestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("security_question")
      .eq("id", context.userId)
      .maybeSingle();
    return { question: data?.security_question ?? null };
  });
