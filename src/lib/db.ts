import postgres from "postgres";
import { isRead, withRetry } from "./db-retry";

// One connection pool for the whole server. DATABASE_URL is the Supabase connection string
// (Project settings > Database > Connection string > URI). Use the "Transaction pooler" one on Vercel.
declare global {
  var __teampulseSql: ReturnType<typeof postgres> | undefined;
}

type Sql = ReturnType<typeof postgres>;

/**
 * A fresh connection to the hosted database can be slow, and its first query can be cancelled by a statement timeout.
 * Plain queries (sql`...`) are run again once when that happens (see db-retry.ts). Transactions are left alone.
 */
function withRetries(sql: Sql): Sql {
  return new Proxy(sql, {
    apply(target, thisArg, args: unknown[]) {
      const first = args[0] as { raw?: unknown; [i: number]: string } | undefined;
      const isTemplate = Array.isArray(first) && "raw" in (first as object);
      if (!isTemplate) return Reflect.apply(target, thisArg, args); // sql(array), sql(object): helpers, not queries
      const read = isRead(String((first as unknown as string[])[0] ?? ""));
      const run = () => Reflect.apply(target, thisArg, args) as Promise<unknown>;
      let started: Promise<unknown> | undefined;
      const once = () => (started ??= withRetry(run, read));
      const lazy = { then: (a?: never, b?: never) => once().then(a, b), catch: (b?: never) => once().catch(b), finally: (f?: never) => once().finally(f) };
      return lazy;
    },
  });
}

export function db() {
  if (globalThis.__teampulseSql) return globalThis.__teampulseSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const local = /localhost|127\.0\.0\.1/.test(url);
  globalThis.__teampulseSql = withRetries(postgres(url, {
    prepare: false, // needed for Supabase's transaction pooler
    max: 5,
    ssl: local ? false : "require",
    onnotice: () => {},
    connect_timeout: 15,
    idle_timeout: 20, // let go of idle connections before the pooler drops them under us
    max_lifetime: 300,
    connection: local ? {} : { statement_timeout: 15000 }, // the hosted default is too short for a cold connection
  }));
  return globalThis.__teampulseSql;
}
