// Calendar maths for the month view and the week strip. Pure, so it runs on the server and in the browser.
import { CI, KEYS, addDays, occurrence, parseDay, ymd, type Day, type Key, type Occ } from "./checkins";

export type DayEvent = { key: Key; kind: "date" | "window" };
export type DayCell = { day: Day; dom: number; inMonth: boolean; isToday: boolean; events: DayEvent[]; teamStart: boolean };

/** Monday = 0 ... Sunday = 6 */
const weekdayMon0 = (d: Day) => { const { y, m, d: dd } = parseDay(d); return (new Date(Date.UTC(y, m, dd, 12)).getUTCDay() + 6) % 7; };

function occsAround(year: number, month: number): Occ[] {
  const out: Occ[] = [];
  for (const k of KEYS) for (const o of [-1, 0, 1]) out.push(occurrence(k, year, month + o));
  return out;
}

function eventsOn(day: Day, occs: Occ[]): DayEvent[] {
  const ev: DayEvent[] = [];
  for (const o of occs) {
    if (o.date === day) ev.push({ key: o.key, kind: "date" });
    else if (o.open <= day && day <= o.close) ev.push({ key: o.key, kind: "window" });
  }
  return ev;
}

/** Weeks (Monday first) covering the month, each day with its check-in dates and open windows. */
export function monthGrid(year: number, month: number, today: Day): DayCell[][] {
  const first = ymd(year, month, 1);
  const start = addDays(first, -weekdayMon0(first));
  const occs = occsAround(year, month);
  const weeks: DayCell[][] = [];
  let cur = start;
  for (let w = 0; w < 6; w++) {
    const row: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const p = parseDay(cur);
      row.push({ day: cur, dom: p.d, inMonth: p.m === ((month % 12) + 12) % 12, isToday: cur === today, events: eventsOn(cur, occs), teamStart: p.d === 15 });
      cur = addDays(cur, 1);
    }
    weeks.push(row);
    if (parseDay(cur).m !== ((month % 12) + 12) % 12 && w >= 3) break; // stop once the month is finished
  }
  return weeks;
}

/** The seven days (Monday to Sunday) of the week that holds `today`. */
export function weekDays(today: Day): DayCell[] {
  const start = addDays(today, -weekdayMon0(today));
  const { y, m } = parseDay(today);
  const occs = occsAround(y, m);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i), p = parseDay(day);
    return { day, dom: p.d, inMonth: true, isToday: day === today, events: eventsOn(day, occs), teamStart: p.d === 15 };
  });
}

/** Check-in questions that open, are due, or close in the next `days` days, soonest first. */
export function upcoming(today: Day, days = 14): { occ: Occ; what: "opens" | "due" | "closes"; on: Day }[] {
  const { y, m } = parseDay(today), end = addDays(today, days);
  const out: { occ: Occ; what: "opens" | "due" | "closes"; on: Day }[] = [];
  for (const o of occsAround(y, m)) {
    if (o.open >= today && o.open <= end) out.push({ occ: o, what: "opens", on: o.open });
    if (o.date >= today && o.date <= end) out.push({ occ: o, what: "due", on: o.date });
    if (o.close >= today && o.close <= end) out.push({ occ: o, what: "closes", on: o.close });
  }
  return out.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));
}

export const KEY_COLOR: Record<Key, string> = { earn: "var(--green)", ppv: "var(--accent)", plan: "var(--purple)", signup: "var(--orange)", paid: "var(--red)", ppvdone: "var(--accent-deep)", qpvdone: "var(--teal)" };
export const title = (k: Key) => CI[k].title;
