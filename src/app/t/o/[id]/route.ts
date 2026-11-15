import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// A 1-pixel image at the bottom of each email. Loading it counts one open. Many mail apps load images
// ahead of time or through a proxy, so opens are a guide and not an exact count.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (/^[0-9a-f-]{36}$/.test(id))
    await db()`update mail_log set open_count = open_count + 1, first_opened_at = coalesce(first_opened_at, now()) where id = ${id}`.catch(() => undefined);
  return new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" } });
}
