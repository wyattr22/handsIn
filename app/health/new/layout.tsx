import { HealthFlowProvider } from "@/components/health/HealthFlowProvider";
import { HealthFlowShell } from "@/components/health/HealthFlowShell";

export default function HealthNewLayout({ children }: { children: React.ReactNode }) { return <HealthFlowProvider><HealthFlowShell>{children}</HealthFlowShell></HealthFlowProvider>; }
