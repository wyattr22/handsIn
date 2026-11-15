import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/account/actions";

export default async function MedicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { count: membershipCount } = user ? await supabase.from("care_circle_memberships").select("circle_id", { count: "exact", head: true }) : { count: 0 };
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "HI";
  return <main className="app-shell"><header className="app-header"><Link className="flow-wordmark" href="/">Hands<span>In</span></Link>{user ? <form action={signOut}><button title="Sign out" aria-label="Sign out" className="profile-button">{initials}</button></form> : <Link className="account-link" href="/login">Sign in</Link>}</header><section className="medications-home"><p className="home-date">Medication cabinet</p><h1>Everything they take,<br />in one careful place.</h1>{user && !membershipCount ? <div className="connection-card"><strong>Your account is connected.</strong><p>Create the private care circle that will hold recipients, medication records, and caregiver access.</p><Link className="primary-action" href="/setup">Create care circle</Link></div> : <div className="empty-medications"><div className="bottle-icon" aria-hidden="true"><i /><span>+</span></div><h2>No confirmed medications yet</h2><p>Photograph a prescription, over-the-counter product, or supplement. You will check every detail before it is saved.</p><Link href="/medications/new/recipient" className="primary-action">Scan a medication</Link></div>}</section><nav className="bottom-nav" aria-label="Primary"><Link href="/">Today</Link><Link className="active" href="/medications">Medications</Link><span>Calendar</span><span>Care</span><span>People</span></nav></main>;
}
