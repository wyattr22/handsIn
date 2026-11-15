import { HealthFlowProvider } from "@/components/health/HealthFlowProvider";
import { HealthFlowShell } from "@/components/health/HealthFlowShell";
import { getCareRecipients } from "@/lib/care/recipients";

export default async function HealthNewLayout({ children }: { children: React.ReactNode }) {
  const recipients = await getCareRecipients();
  return <HealthFlowProvider initialRecipients={recipients}><HealthFlowShell>{children}</HealthFlowShell></HealthFlowProvider>;
}
