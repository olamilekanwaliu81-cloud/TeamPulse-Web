// Applies db/migrations/*.sql in order, once each. Usage: npm run db:migrate   (reads DATABASE_URL from .env.local)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set. Put it in .env.local first."); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, { max: 1, ssl: local ? false : "require", onnotice: () => {} });

const dir = join(process.cwd(), "db", "migrations");
await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) { console.log("already applied:", file); continue; }
  await sql.unsafe(readFileSync(join(dir, file), "utf8"));
  await sql`insert into schema_migrations (name) values (${file})`;
  console.log("applied:", file);
}
await sql.end();
