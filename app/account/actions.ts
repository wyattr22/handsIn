"use server";
import { peopleFoundationReady } from "@/src/lib/supabase/foundation";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  if (peopleFoundationReady()) await supabase.rpc("handsin_device", { p: { type: "logout" } });
  await supabase.auth.signOut();
  redirect("/");
}
