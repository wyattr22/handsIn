"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = ["recipient", "capture", "review", "schedule", "interactions", "confirm"];

export function FlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = Math.max(0, steps.findIndex((step) => pathname.endsWith(step)));
  return <main className="medication-flow">
    <header className="flow-header">
      <Link href={current > 0 ? `/medications/new/${steps[current - 1]}` : "/medications"} className="back-link" aria-label="Go back">←</Link>
      <Link className="flow-wordmark" href="/">Hands<span>In</span></Link>
      <Link href="/medications" className="exit-link">Save & exit</Link>
    </header>
    <div className="flow-progress" aria-label={`Step ${current + 1} of ${steps.length}`}>
      <span style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
    </div>
    <div className="demo-ribbon">Prototype mode · data stays on this device</div>
    {children}
  </main>;
}
