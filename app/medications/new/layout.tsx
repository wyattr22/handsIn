import { FlowShell } from "@/components/medication-scanner/FlowShell";
import { MedicationFlowProvider } from "@/components/medication-scanner/MedicationFlowProvider";
import { createClient } from "@/lib/supabase/server";
import type { Recipient } from "@/lib/medications/types";

export default async function NewMedicationLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let recipients: Recipient[] = [];
  if (user) {
    const { data: memberships } = await supabase.from("care_circle_memberships").select("circle_id");
    const circleIds = memberships?.map((membership) => membership.circle_id) ?? [];
    if (circleIds.length) {
      const { data } = await supabase.from("care_recipients").select("id, display_name, routine").in("circle_id", circleIds).order("created_at");
      recipients = (data ?? []).map((recipient) => {
        const routine = recipient.routine as Recipient["routine"];
        return { id: recipient.id, name: recipient.display_name, relationship: "Care recipient", initials: recipient.display_name.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(), routine };
      });
    }
  }
  return <MedicationFlowProvider initialRecipients={recipients}><FlowShell>{children}</FlowShell></MedicationFlowProvider>;
}
