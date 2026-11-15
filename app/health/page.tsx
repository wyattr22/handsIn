import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { getCareRecipients } from "@/lib/care/recipients";
import { createClient } from "@/lib/supabase/server";

export default async function HealthPage() {
  const [recipients, supabase] = await Promise.all([getCareRecipients(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const recipient = recipients[0];
  return <AppShell recipientName={recipient?.name ?? "Dad"} recipientInitials={recipient?.initials ?? "D"} userInitials={user?.email?.slice(0, 2).toUpperCase() ?? "HI"}>
    <p className="app-eyebrow">Health records</p>
    <h1 className="app-title">Turn scattered results into a visit-ready record.</h1>
    <p className="app-lede">Upload a blood or urine report, check every extracted value, and carry useful questions into the next appointment.</p>
    <div className="app-stat-row"><div><strong>0</strong><span>reports reviewed</span></div><div><strong>0</strong><span>trends tracked</span></div><div><strong>0</strong><span>questions prepared</span></div></div>
    <div className="app-section-heading"><h2>Reports</h2><Link href="/health/new/recipient">Add report</Link></div>
    <div className="app-empty"><h2>Add the first report</h2><p>Photograph or upload a report. Confirm every value against the source before it joins the family record.</p><Link className="app-primary" href="/health/new/recipient">Scan a health record</Link></div>
    <div className="app-notice"><strong>Informational only.</strong> HandsIn can identify values outside the range printed by the lab, but it does not diagnose or determine whether a result is safe.</div>
  </AppShell>;
}
