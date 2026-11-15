"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { Avatar } from "./Avatar";
import { signOut } from "@/app/actions/auth";
import { ClockCalendar } from "./ClockCalendar";

export type Notice = { kind: string; title: string; sub: string; href: string };
type Person = { id: string; name: string; photo: string | null; tpId: string; subtitle: string; role: string };

const GLYPH: Record<string, string> = { invite: "✉", signup: "+", rank: "★", checkin: "✓" };

/** Bell and account menu. Each opens a small panel under its button, and closes on a click elsewhere or Escape. */
export function TopBar({ person, notices, clock }: { person: Person; notices: Notice[]; clock: { today: string; tz: string; isTest: boolean } }) {
  const [open, setOpen] = useState<"bell" | "me" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, []);

  const n = notices.length;
  return (
    <div className="top-right" ref={box}>
      <ClockCalendar today={clock.today} tz={clock.tz} isTest={clock.isTest} />
      <div className="popwrap">
        <button className="iconbtn" type="button" aria-label={`Notifications${n ? ` (${n})` : ""}`} aria-expanded={open === "bell"} onClick={() => setOpen(open === "bell" ? null : "bell")}>
          <Icon name="bell" />{n ? <i /> : null}
        </button>
        {open === "bell" && (
          <div className="pop" role="dialog" aria-label="Notifications">
            <div className="pop-h"><b>Notifications</b><span className="sub">{n ? `${n} need you` : "All caught up"}</span></div>
            {n ? (
              <div className="pop-list">
                {notices.map((x, i) => (
                  <Link key={i} className="pop-item" href={x.href} onClick={() => setOpen(null)}>
                    <span className={`pop-ic k-${x.kind}`}>{GLYPH[x.kind] ?? "!"}</span>
                    <span className="pop-t"><b>{x.title}</b><small>{x.sub}</small></span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="pop-empty">Nothing needs you right now. Reports, rank-ups and check-ins show up here.</p>
            )}
          </div>
        )}
      </div>
      <div className="popwrap">
        <button className="me" type="button" aria-label="Your account menu" aria-expanded={open === "me"} onClick={() => setOpen(open === "me" ? null : "me")}>
          <Avatar user={person} />
          <div><div className="me-n">{person.name}</div><div className="sub">{person.subtitle}</div></div>
        </button>
        {open === "me" && (
          <div className="pop pop-me" role="menu" aria-label="Your account">
            <div className="pop-id"><Avatar user={person} size="lg" /><div><b>{person.name}</b>
              <div className="sub">TeamPulse ID <span className="mono">{person.tpId}</span></div><div className="sub">{person.role}</div></div></div>
            <Link className="pop-link" role="menuitem" href="/profile" onClick={() => setOpen(null)}><Icon name="profile" /><span>Profile and settings</span></Link>
            <form action={signOut}><button className="pop-link out" type="submit" role="menuitem"><span>Sign out</span></button></form>
          </div>
        )}
      </div>
      <form action={signOut}><button className="btn sm" type="submit">Sign out</button></form>
    </div>
  );
}
