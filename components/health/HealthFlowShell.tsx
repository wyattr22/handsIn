"use client";
import { BrandLogo } from "@/components/brand/BrandLogo";

import Link from "next/link";
import { usePathname } from "next/navigation";
const steps = ["recipient", "upload", "review", "report"];

export function HealthFlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const current = Math.max(0, steps.findIndex((step) => pathname.endsWith(step)));
  return <main className="health-flow"><header className="health-flow-header"><Link aria-label="Go back" href={current ? `/demo/health/new/${steps[current - 1]}` : "/health/demo"}>←</Link><Link className="health-wordmark" href="/demo"><BrandLogo /></Link><Link href="/health/demo">Keep draft & exit</Link></header><div className="health-progress"><span style={{ width: `${((current + 1) / steps.length) * 100}%` }} /></div><div className="local-badge">Fictional shared workspace · changes reset on reload</div>{children}</main>;
}




