import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { getCareRecipients } from "@/lib/care/recipients";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Calendar & delegation — HandsIn" };

export default async function CalendarPage() {
  const [recipients, supabase] = await Promise.all([getCareRecipients(), createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const recipient = recipients[0];
  return <AppShell recipientName={recipient?.name ?? "Dad"} recipientInitials={recipient?.initials ?? "D"} userInitials={user?.email?.slice(0, 2).toUpperCase() ?? "HI"}>
    <p className="app-eyebrow">Family calendar</p>
    <h1 className="app-title">A little clarity.<br />A lot more care.</h1>
    <p className="app-lede">Plan appointments, share responsibilities, and distinguish requested help from accepted coverage.</p>
    <div className="app-section-heading"><h2>Upcoming</h2><Link href="/calendar/demo">Open calendar preview</Link></div>
    <div className="app-empty"><h2>Shared saving comes next</h2><p>The complete calendar and delegation workflow is built and tested with fictional data. Its Supabase persistence adapter still needs to be connected before real family events are stored.</p><Link className="app-primary" href="/calendar/demo">Explore the calendar</Link></div>
    <div className="app-notice"><strong>Preview boundary.</strong> Changes in the calendar preview reset when the page reloads and do not notify caregivers.</div>
  </AppShell>;
}
