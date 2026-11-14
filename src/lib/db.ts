import postgres from "postgres";

// One connection pool for the whole server. DATABASE_URL is the Supabase connection string
// (Project settings > Database > Connection string > URI). Use the "Transaction pooler" one on Vercel.
declare global {
  var __teampulseSql: ReturnType<typeof postgres> | undefined;
}

export function db() {
  if (globalThis.__teampulseSql) return globalThis.__teampulseSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const local = /localhost|127\.0\.0\.1/.test(url);
  globalThis.__teampulseSql = postgres(url, {
    prepare: false, // needed for Supabase's transaction pooler
    max: 5,
    ssl: local ? false : "require",
    onnotice: () => {},
  });
  return globalThis.__teampulseSql;
}
