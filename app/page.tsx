import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { getCareRecipients } from "@/lib/care/recipients";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const [recipients, supabase] = await Promise.all([getCareRecipients(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const recipient = recipients[0];
  const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? "HI";

  return <AppShell recipientName={recipient?.name ?? "Dad"} recipientInitials={recipient?.initials ?? "D"} userInitials={userInitials}>
    <p className="app-eyebrow">Today’s care plan</p>
    <h1 className="app-title">Good morning.<br />Here’s what matters today.</h1>
    <p className="app-lede">One view for medications, appointments, health records, and the people helping with care.</p>
    {!user && <div className="app-notice"><strong>You’re viewing the connected prototype.</strong> <Link href="/login">Sign in</Link> to use your private care circle across every feature.</div>}

    <div className="app-section-heading"><h2>Care at a glance</h2><span /></div>
    <div className="app-grid">
      <Link className="app-card" href="/medications"><span className="app-card-icon">✚</span><strong>Medications</strong><p>Scan labels, confirm directions, and build reviewed schedules.</p><span className="app-card-link">Open cabinet →</span></Link>
      <Link className="app-card" href="/health"><span className="app-card-icon">▤</span><strong>Health records</strong><p>Review test results and prepare questions for the next visit.</p><span className="app-card-link">Open records →</span></Link>
      <Link className="app-card" href="/calendar"><span className="app-card-icon">□</span><strong>Calendar</strong><p>Coordinate appointments, tasks, and accepted caregiver coverage.</p><span className="app-card-link">View calendar →</span></Link>
      <Link className="app-card" href="/people"><span className="app-card-icon">◉</span><strong>Care circle</strong><p>{recipients.length ? `${recipients.length} care recipient${recipients.length === 1 ? "" : "s"} connected.` : "Create a circle and invite the people who help."}</p><span className="app-card-link">Manage people →</span></Link>
    </div>

    <div className="app-section-heading"><h2>Important boundary</h2></div>
    <div className="app-card wide"><strong>Review before saving</strong><p>Scanned medication labels and health reports are drafts until a person checks them against the original. HandsIn organizes information; it does not diagnose or replace a clinician or pharmacist.</p></div>
  </AppShell>;
}
