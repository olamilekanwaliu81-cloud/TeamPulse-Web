import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { realToday } from "@/lib/clock";
import { runDailyJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Vercel calls this every morning (see vercel.json) and sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret ?? ""}`;
  const ok = !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runDailyJob(realToday())) });
}
