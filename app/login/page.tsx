import { peopleFoundationReady } from "@/src/lib/supabase/foundation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (peopleFoundationReady()) redirect("/auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/medications");
  return <main className="auth-page"><Link className="flow-wordmark" href="/">Hands<span>In</span></Link><section><p className="home-date">Private care circle</p><h1>Come back to the people who count on you.</h1><p>No password to remember. We will send a one-time sign-in link to your email.</p><LoginForm /></section></main>;
}
