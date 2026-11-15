import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCareCircle } from "./actions";

export default async function SetupPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/people/connected");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("care_circle_memberships").select("circle_id", { count: "exact", head: true });
  if (count && count > 0) redirect("/medications");
  return <main className="auth-page"><Link className="flow-wordmark" href="/">Hands<span>In</span></Link><section><p className="home-date">Create your care circle</p><h1>Start with one person you care for.</h1><p>You can invite caregivers and add more people later.</p><form action={createCareCircle} className="login-form"><label htmlFor="circleName">Care circle name</label><input id="circleName" name="circleName" placeholder="e.g. Dad’s care team" required minLength={2} /><label htmlFor="recipientName">Who are you caring for?</label><input id="recipientName" name="recipientName" placeholder="e.g. Dad" required /><button className="primary-action">Create private circle</button></form></section></main>;
}

