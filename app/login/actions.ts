"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string; ok: boolean };
const emailSchema = z.string().trim().email();

export async function requestMagicLink(_state: LoginState, formData: FormData): Promise<LoginState> {
  const result = emailSchema.safeParse(formData.get("email"));
  if (!result.success) return { ok: false, message: "Enter a valid email address." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email: result.data, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return { ok: false, message: "The sign-in email could not be sent. Try again in a moment." };
  return { ok: true, message: "Check your email for a secure sign-in link." };
}
