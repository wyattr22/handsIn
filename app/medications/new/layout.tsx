import { FlowShell } from "@/components/medication-scanner/FlowShell";
import { MedicationFlowProvider } from "@/components/medication-scanner/MedicationFlowProvider";

export default function NewMedicationLayout({ children }: { children: React.ReactNode }) {
  return <MedicationFlowProvider><FlowShell>{children}</FlowShell></MedicationFlowProvider>;
}
