"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

export type NavItem = { href: string; label: string; icon: "dashboard" | "team" | "profile" | "checkins" | "signups"; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Sections">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-label={i.label} title={i.label} className="nav-item" aria-current={path === i.href || path.startsWith(i.href + "/") ? "page" : undefined}>
          <Icon name={i.icon} /><span>{i.label}</span>{i.badge ? <span className="pill warn">{i.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
