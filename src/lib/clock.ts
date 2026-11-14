import { cookies } from "next/headers";
import { mailboxEnabled } from "./mail";
import { ymd, type Day } from "./checkins";

/** The team lives in one time zone. Dates in TeamPulse are days in this zone. */
export const TZ = process.env.APP_TIMEZONE ?? "Africa/Lagos";

export function realToday(now: Date = new Date()): Day {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map((x) => [x.type, x.value]));
  return ymd(Number(p.year), Number(p.month) - 1, Number(p.day));
}

export const isDay = (s: unknown): s is Day => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));

/** Today. While testing (never in production) /dev/clock can move it, to see windows open and close. */
export async function today(): Promise<Day> {
  if (mailboxEnabled()) {
    const v = (await cookies()).get("tp_today")?.value;
    if (isDay(v)) return v;
  }
  return realToday();
}
