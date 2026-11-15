"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Today", icon: "⌂" },
  { href: "/medications", label: "Medications", icon: "✚" },
  { href: "/health", label: "Health", icon: "▤" },
  { href: "/calendar", label: "Calendar", icon: "□" },
  { href: "/people", label: "People", icon: "◉" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  children,
  recipientName = "Dad",
  recipientInitials = "D",
  userInitials = "WR",
}: {
  children: React.ReactNode;
  recipientName?: string;
  recipientInitials?: string;
  userInitials?: string;
}) {
  const pathname = usePathname();
  return <div className="handsin-app">
    <header className="handsin-app-header">
      <Link className="handsin-app-wordmark" href="/" aria-label="HandsIn home">Hands<span>In</span></Link>
      <Link className="handsin-app-profile" href="/people" aria-label="Open people and access">{userInitials}</Link>
    </header>
    <div className="handsin-recipient-bar" aria-label="Current care recipient">
      <span className="handsin-recipient-avatar">{recipientInitials}</span>
      <span><small>Care plan for</small><strong>{recipientName}</strong></span>
      <Link href="/people">Switch</Link>
    </div>
    <div className="handsin-app-content">{children}</div>
    <nav className="handsin-app-nav" aria-label="Primary navigation">
      {navigation.map((item) => <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "active" : ""} aria-current={isActive(pathname, item.href) ? "page" : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
    </nav>
  </div>;
}
