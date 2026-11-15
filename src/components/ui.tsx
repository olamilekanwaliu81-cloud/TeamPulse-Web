import Link from "next/link";
import { Icon } from "./Icons";
import type { MonthStatus } from "@/lib/ranks";
import { KEY_COLOR, title, upcoming, weekDays } from "@/lib/calendar";
import { dmyDay, type Day, type Key } from "@/lib/checkins";

type IconName = Parameters<typeof Icon>[0]["name"];

export function StatCard({ icon, tone, label, value, note }: { icon: IconName; tone: "blue" | "green" | "orange" | "purple" | "red"; label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="stat">
      <span className={`bub ${tone}`}><Icon name={icon} /></span>
      <div><small>{label}</small><b>{value}</b>{note && <span className="sub2">{note}</span>}</div>
    </div>
  );
}

export function PanelTitle({ children, href, link }: { children: React.ReactNode; href?: string; link?: string }) {
  return <div className="ptitle"><h3>{children}</h3>{href && <Link href={href}>{link ?? "View all"} &rarr;</Link>}</div>;
}

/** Ring chart with the total in the middle. */
export function Donut({ parts, total, label }: { parts: { value: number; color: string; label: string }[]; total: number; label: string }) {
  const R = 56, C = 2 * Math.PI * R, sum = parts.reduce((s, p) => s + p.value, 0) || 1;
  const segs = parts.filter((p) => p.value > 0).map((p, i, arr) => ({ ...p, start: arr.slice(0, i).reduce((s, x) => s + x.value, 0) }));
  return (
    <>
      <div className="donutw">
        <svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label={`${label}: ${parts.map((p) => `${p.value} ${p.label}`).join(", ")}`}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface2)" strokeWidth="18" />
          {segs.map((p) => {
            const len = Math.max((p.value / sum) * C - 3, 0);
            return <circle key={p.label} cx="80" cy="80" r={R} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-((p.start / sum) * C)} transform="rotate(-90 80 80)" />;
          })}
          <text className="donut-n" x="80" y="82" textAnchor="middle">{total}</text>
          <text className="donut-s" x="80" y="100" textAnchor="middle">{label}</text>
        </svg>
      </div>
      <div className="legend">{parts.map((p) => <div key={p.label}><i style={{ background: p.color }} />{p.label}<b>{p.value}</b></div>)}</div>
    </>
  );
}

/** Simple column chart. */
export function ColumnChart({ data, format = (n: number) => String(n) }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const W = 320, H = 170, pad = 24, bw = 34, gap = (W - pad * 2 - bw * data.length) / Math.max(data.length - 1, 1);
  const mx = Math.max(1, ...data.map((d) => d.value));
  return (
    <svg className="colchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}>
      {[0.5, 1].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H - 28 - f * (H - 60)} y2={H - 28 - f * (H - 60)} stroke="var(--line)" strokeDasharray="3 4" />)}
      {data.map((d, i) => {
        const h = (d.value / mx) * (H - 60), x = pad + i * (bw + gap), last = i === data.length - 1;
        return (
          <g key={d.label}>
            <rect x={x} y={H - 28 - h} width={bw} height={Math.max(h, 3)} rx="8" fill={last ? "var(--accent)" : "var(--accent-soft)"} />
            <text className="cv" x={x + bw / 2} y={H - 33 - h} textAnchor="middle">{d.value ? format(d.value) : ""}</text>
            <text x={x + bw / 2} y={H - 10} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Monthly status of a member: Qualified, Title only, or no numbers yet. */
export function StatusPill({ s }: { s: MonthStatus }) {
  if (s.state === "qualified") return <span className="st q" title={s.rate ? `Bonus rate ${s.rate}%` : undefined}>Qualified</span>;
  if (s.state === "title_only") return <span className="st t" title={s.why.join(". ")}>Title only</span>;
  return <span className="st u">Not reported</span>;
}

/** This week, Monday to Sunday, with the check-in dates and what opens, is due or closes soon. */
export function WeekPanel({ today }: { today: Day }) {
  const days = weekDays(today), soon = upcoming(today, 10).slice(0, 4);
  const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <>
      <div className="week">
        {days.map((d, i) => (
          <div className="wd" key={d.day}>{NAMES[i]}
            <span className={`wn ${d.isToday ? "today" : ""}`}>{d.dom}</span>
            <span className="wdots">{d.events.filter((e) => e.kind === "date").map((e) => <b key={e.key} style={{ background: KEY_COLOR[e.key] }} />)}</span>
          </div>
        ))}
      </div>
      {soon.length === 0 ? <p className="sub">Nothing is opening or closing in the next 10 days.</p> : soon.map((x, i) => (
        <div className="evrow" key={i}>
          <i style={{ background: KEY_COLOR[x.occ.key as Key] }} />
          <div><b>{title(x.occ.key)}</b><small>{x.what === "opens" ? "Opens" : x.what === "due" ? "Date" : "Closes"} {dmyDay(x.on).replace(/ \d{4}$/, "")}</small></div>
        </div>
      ))}
    </>
  );
}

export function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
