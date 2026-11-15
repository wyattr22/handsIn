"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { CSSProperties } from "react";

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
  recipientPhoto = "",
  recipientColor = "#2f766d",
  userInitials = "WR",
  links = navigation,
  homeHref = "/",
  profileHref = "/people",
  onSwitchRecipient,
  wide = false,
}: {
  children: React.ReactNode;
  recipientName?: string;
  recipientInitials?: string;
  recipientPhoto?: string;
  recipientColor?: string;
  userInitials?: string;
  links?: { href: string; label: string; icon: string }[];
  homeHref?: string;
  profileHref?: string;
  onSwitchRecipient?: () => void;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const recipientStyle = { "--recipient-color": recipientColor } as CSSProperties;
  return <div className={`handsin-app${wide ? ' handsin-app-wide' : ''}`}>
    <header className="handsin-app-header">
      <Link className="handsin-app-wordmark" href={homeHref} aria-label="HandsIn home">Hands<span>In</span></Link>
      <Link className="handsin-app-profile" href={profileHref} aria-label={profileHref.startsWith('/#') ? 'Open care profiles' : 'Open people and access'}>{userInitials}</Link>
    </header>
    <div className="handsin-recipient-bar" aria-label="Current care recipient">
      <span className="handsin-recipient-avatar selected" style={recipientStyle}>{recipientPhoto ? <Image src={recipientPhoto} alt="" width={40} height={40} unoptimized /> : recipientInitials}</span>
      <span><small>Care plan for</small><strong>{recipientName}</strong></span>
      {onSwitchRecipient ? <button type="button" onClick={onSwitchRecipient}>Switch recipient</button> : <Link href="/people">Switch</Link>}
    </div>
    <div className="handsin-app-content">{children}</div>
    <nav className="handsin-app-nav" aria-label="Primary navigation">
      {links.map((item) => <Link key={item.href} href={item.href} className={(item.href === homeHref ? pathname === item.href : isActive(pathname, item.href)) ? "active" : ""} aria-current={(item.href === homeHref ? pathname === item.href : isActive(pathname, item.href)) ? "page" : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
    </nav>
  </div>;
}
