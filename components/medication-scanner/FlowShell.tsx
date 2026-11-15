"use client";
import { BrandLogo } from "@/components/brand/BrandLogo";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMedicationFlow } from "./MedicationFlowProvider";

const steps = ["recipient", "capture", "review", "schedule", "interactions", "confirm"];

export function FlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDemoMode } = useMedicationFlow();
  const current = Math.max(0, steps.findIndex((step) => pathname.endsWith(step)));
  return <main className="medication-flow">
    <header className="flow-header">
      <Link href={current > 0 ? `/demo/medications/new/${steps[current - 1]}` : "/medications/demo"} className="back-link" aria-label="Go back">←</Link>
      <Link className="flow-wordmark" href="/demo"><BrandLogo /></Link>
      <Link href="/medications/demo" className="exit-link">Keep draft & exit</Link>
    </header>
    <div className="flow-progress" aria-label={`Step ${current + 1} of ${steps.length}`}>
      <span style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
    </div>
    <div className="demo-ribbon">{isDemoMode ? "Fictional shared workspace · changes reset on reload" : "Connected to your private care circle"}</div>
    {children}
  </main>;
}




