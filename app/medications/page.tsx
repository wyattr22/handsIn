import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { signOut } from "@/app/account/actions";
import { getCareRecipients } from "@/lib/care/recipients";
import { createClient } from "@/lib/supabase/server";

export default async function MedicationsPage() {
  const [recipients, supabase] = await Promise.all([getCareRecipients(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const { count: membershipCount } = user ? await supabase.from("care_circle_memberships").select("circle_id", { count: "exact", head: true }) : { count: 0 };
  const recipient = recipients[0];
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "HI";

  return <AppShell recipientName={recipient?.name ?? "Dad"} recipientInitials={recipient?.initials ?? "D"} userInitials={initials}>
    <p className="app-eyebrow">Medication cabinet</p>
    <h1 className="app-title">Everything they take,<br />in one careful place.</h1>
    <p className="app-lede">Add prescriptions, over-the-counter products, and supplements. Every extracted detail stays a draft until you confirm it.</p>
    <div className="app-stat-row"><div><strong>0</strong><span>confirmed medications</span></div><div><strong>0</strong><span>doses today</span></div><div><strong>0</strong><span>open findings</span></div></div>
    <div className="app-section-heading"><h2>Medication list</h2>{user ? <form action={signOut}><button className="sample-link">Sign out</button></form> : <Link href="/login">Sign in</Link>}</div>
    {user && !membershipCount ? <div className="app-empty"><h2>Your account is connected</h2><p>Create the private care circle that will hold recipients, medication records, and caregiver access.</p><Link className="app-primary" href="/setup">Create care circle</Link></div> : <div className="app-empty"><h2>No confirmed medications yet</h2><p>Photograph a bottle and review its name, strength, directions, schedule, and possible interaction findings.</p><Link className="app-primary" href="/medications/new/recipient">Scan a medication</Link></div>}
  </AppShell>;
}
