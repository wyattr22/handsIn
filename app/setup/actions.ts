"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const setupSchema = z.object({
  circleName: z.string().trim().min(2).max(60),
  recipientName: z.string().trim().min(1).max(80),
});

export async function createCareCircle(formData: FormData) {
  const parsed = setupSchema.safeParse({ circleName: formData.get("circleName"), recipientName: formData.get("recipientName") });
  if (!parsed.success) redirect("/setup?error=invalid");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_care_circle", {
    circle_name: parsed.data.circleName,
    recipient_name: parsed.data.recipientName,
  });
  if (error) redirect("/setup?error=create");
  redirect("/medications");
}
