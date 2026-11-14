// A throwaway Postgres on your own computer, for trying the app without Supabase. Usage: npm run db:local
// Data is kept in web/.local-db. Delete that folder to start fresh. Point DATABASE_URL at the address printed below.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const db = await PGlite.create(process.env.LOCAL_DB_MEMORY ? undefined : ".local-db");
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`Local database ready: postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
