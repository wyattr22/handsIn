"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
const steps = ["recipient", "upload", "review", "report"];

export function HealthFlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const current = Math.max(0, steps.findIndex((step) => pathname.endsWith(step)));
  return <main className="health-flow"><header className="health-flow-header"><Link aria-label="Go back" href={current ? `/health/new/${steps[current - 1]}` : "/health"}>←</Link><Link className="health-wordmark" href="/">Hands<span>In</span></Link><Link href="/health">Save & exit</Link></header><div className="health-progress"><span style={{ width: `${((current + 1) / steps.length) * 100}%` }} /></div><div className="local-badge">Private prototype · files are processed on this device</div>{children}</main>;
}
