import { db } from "@/lib/db";
import { appUrl } from "@/lib/mail";

export const dynamic = "force-dynamic";

// The email's button points here. We count the click and send the person on to the real link saved with the email.
// The destination comes from our own database, never from the address, so this cannot send anyone to another site.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = appUrl();
  let dest: string | null = null;
  if (/^[0-9a-f-]{36}$/.test(id)) {
    const row = (await db()<{ cta_url: string | null }[]>`select cta_url from mail_log where id = ${id}`.catch(() => []))[0];
    if (row?.cta_url?.startsWith(`${base}/`)) {
      dest = row.cta_url;
      await db()`update mail_log set click_count = click_count + 1, first_clicked_at = coalesce(first_clicked_at, now()) where id = ${id}`.catch(() => undefined);
    }
  }
  return new Response(null, { status: 302, headers: { location: dest ?? base, "cache-control": "no-store" } });
}
