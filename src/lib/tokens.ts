import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { TOKEN_DAYS, addDays } from "./rules";

export type TokenType = "verify" | "setpw" | "reset";
type TokenRow = { token_hash: string; type: TokenType; user_id: string | null; data: Record<string, unknown>; expires_at: Date; used_at: Date | null };

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Makes a one-time link token. The raw value goes in the email. Only its hash is stored. */
export async function createToken(type: TokenType, userId: string | null, data: Record<string, unknown> = {}) {
  const raw = randomBytes(32).toString("base64url");
  const expires = addDays(new Date(), TOKEN_DAYS);
  await db()`insert into tokens (token_hash, type, user_id, data, expires_at)
             values (${hash(raw)}, ${type}, ${userId}, ${db().json(data as never)}, ${expires})`;
  return raw;
}

/** Looks a token up without using it. Returns null if it is unknown, used or expired. */
export async function peekToken(raw: string): Promise<{ type: TokenType; userId: string | null; data: Record<string, unknown> } | { why: "unknown" | "used" | "expired" }> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(raw)) return { why: "unknown" };
  const rows = await db()<TokenRow[]>`select * from tokens where token_hash = ${hash(raw)}`;
  const t = rows[0];
  if (!t) return { why: "unknown" };
  if (t.used_at) return { why: "used" };
  if (t.expires_at.getTime() < Date.now()) return { why: "expired" };
  return { type: t.type, userId: t.user_id, data: t.data };
}

/** Marks a token used. Returns false if somebody else used it first, so a link works once. */
export async function consumeToken(raw: string): Promise<boolean> {
  const rows = await db()`update tokens set used_at = now() where token_hash = ${hash(raw)} and used_at is null and expires_at > now() returning token_hash`;
  return rows.length === 1;
}

export const whyText = (why: "unknown" | "used" | "expired") =>
  why === "used" ? "This link was already used." : why === "expired" ? "This link has expired." : "This link is not valid.";
