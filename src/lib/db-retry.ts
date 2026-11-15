// Retry rules for database queries. Pure: no database. Tested in db-retry.test.ts.
//
// A fresh connection to the hosted database is sometimes slow, and its first query can be cancelled by a statement
// timeout. Such a query never ran, so it is safe to run again. For lost connections we only run reads again,
// because we cannot tell whether a write got through.

const NEVER_RAN = new Set(["57014", "CONNECT_TIMEOUT"]);
const LOST = new Set(["ECONNRESET", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED", "ETIMEDOUT"]);

export const isRead = (text: string) => /^\s*(select|with)\b/i.test(text);

export function retryable(err: unknown, read: boolean): boolean {
  const code = String((err as { code?: unknown })?.code ?? "");
  return NEVER_RAN.has(code) || (read && LOST.has(code));
}

/** Runs `attempt`, and once more if it failed in a way that is safe to repeat. */
export async function withRetry<T>(attempt: () => Promise<T>, read: boolean, wait = 300): Promise<T> {
  try {
    return await attempt();
  } catch (e) {
    if (!retryable(e, read)) throw e;
    await new Promise((r) => setTimeout(r, wait));
    return attempt();
  }
}
