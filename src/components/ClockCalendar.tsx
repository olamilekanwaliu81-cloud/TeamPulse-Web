"use client";

import { useEffect, useRef, useState } from "react";
import { CI, KEYS, dmyDay, monthLabel, parseDay, type Day } from "@/lib/checkins";
import { KEY_COLOR, monthGrid } from "@/lib/calendar";
import { occurrence } from "@/lib/checkins";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Today's date, the time in the team's time zone, and a month calendar with the check-in dates. Everyone sees it. */
export function ClockCalendar({ today, tz, isTest }: { today: Day; tz: string; isTest: boolean }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const start = parseDay(today);
  const [view, setView] = useState({ y: start.y, m: start.m });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 15_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);
  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, []);

  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const time = now ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now) : null;
  const label = new Date(Date.UTC(start.y, start.m, start.d, 12)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const weeks = monthGrid(view.y, view.m, today);
  const step = (n: number) => { const d = new Date(Date.UTC(view.y, view.m + n, 1)); setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); };
  const here = view.y === start.y && view.m === start.m;

  return (
    <div className="popwrap" ref={box}>
      <button className="clockpill" type="button" aria-expanded={open} aria-label={`Today is ${label}${time ? `, ${time} ${city} time` : ""}. Open calendar`} onClick={() => setOpen(!open)}>
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
        <span className="cp-d">{label}</span>
        <span className="cp-t">{time ?? ""}</span>
        {isTest && <span className="pill warn">Test date</span>}
      </button>
      {open && (
        <div className="pop calpop" role="dialog" aria-label="Calendar">
          <div className="cal-h">
            <button className="btn sm" type="button" onClick={() => step(-1)} aria-label="Previous month">&lsaquo;</button>
            <b>{monthLabel(view.y, view.m)} {view.y}</b>
            <button className="btn sm" type="button" onClick={() => step(1)} aria-label="Next month">&rsaquo;</button>
          </div>
          <div className="cal-g" role="grid">
            {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
            {weeks.flat().map((c) => (
              <span key={c.day} className={`cal-d ${c.inMonth ? "" : "out"} ${c.isToday ? "today" : ""} ${c.events.some((e) => e.kind === "window") ? "win" : ""}`} title={c.teamStart && c.inMonth ? "Team month starts" : undefined}>
                {c.dom}
                <i className="cal-dots">{c.events.filter((e) => e.kind === "date").map((e) => <b key={e.key} style={{ background: KEY_COLOR[e.key] }} />)}</i>
              </span>
            ))}
          </div>
          <p className="sub" style={{ margin: "8px 4px 6px", fontSize: ".78rem" }}>
            {city} time{time ? ` · ${time}` : ""}. The 15th starts your team&apos;s month. Shaded days have a check-in open.
          </p>
          <div className="cal-l">
            {KEYS.map((k) => { const o = occurrence(k, view.y, view.m); return (
              <div key={k} className="cal-li"><i style={{ background: KEY_COLOR[k] }} /><span><b>{parseDay(o.date).d} {new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</b> {CI[k].title}<small>Answer {dmyDay(o.open).replace(/ \d{4}$/, "")} to {dmyDay(o.close).replace(/ \d{4}$/, "")}</small></span></div>
            ); })}
          </div>
          {!here && <button className="btn sm" type="button" onClick={() => setView({ y: start.y, m: start.m })} style={{ margin: "8px 4px 2px" }}>Back to this month</button>}
        </div>
      )}
    </div>
  );
}
