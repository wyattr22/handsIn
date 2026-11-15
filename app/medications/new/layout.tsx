import { FlowShell } from "@/components/medication-scanner/FlowShell";
import { MedicationFlowProvider } from "@/components/medication-scanner/MedicationFlowProvider";
import { getCareRecipients } from "@/lib/care/recipients";

export default async function NewMedicationLayout({ children }: { children: React.ReactNode }) {
  const recipients = await getCareRecipients();
  return <MedicationFlowProvider initialRecipients={recipients}><FlowShell>{children}</FlowShell></MedicationFlowProvider>;
}
