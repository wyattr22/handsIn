import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { getCareRecipients } from "@/lib/care/recipients";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyPeople() {
  const [recipients, supabase] = await Promise.all([getCareRecipients(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const recipient = recipients[0];
  return <AppShell recipientName={recipient?.name ?? "Dad"} recipientInitials={recipient?.initials ?? "D"} userInitials={user?.email?.slice(0, 2).toUpperCase() ?? "HI"}>
    <p className="app-eyebrow">People and access</p>
    <h1 className="app-title">The right people,<br />in the right circle.</h1>
    <p className="app-lede">Care recipients and caregivers are shared across medications, health records, and the calendar.</p>
    <div className="app-notice"><strong>New People & roles experience.</strong> <Link href="/people/preview">Open the fictional design preview</Link>. Connected access management is enabled after the shared schema review.</div>
    <div className="app-section-heading"><h2>Care recipients</h2></div>
    {recipients.length ? <div className="app-grid">{recipients.map((person) => <div className="app-card" key={person.id}><span className="handsin-recipient-avatar">{person.initials}</span><strong>{person.name}</strong><p>{person.relationship}</p></div>)}</div> : <div className="app-empty"><h2>{user ? "Create your first recipient" : "Sign in to see your care circle"}</h2><p>One recipient record will be used throughout every HandsIn feature.</p><Link className="app-primary" href={user ? "/setup" : "/login"}>{user ? "Create care circle" : "Sign in"}</Link></div>}
    <div className="app-section-heading"><h2>Team access</h2></div>
    <div className="app-card wide"><strong>Supabase controls app access</strong><p>GitHub access lets teammates change code. HandsIn membership and row-level security determine which family records an authenticated person can view or update.</p></div>
  </AppShell>;
}
