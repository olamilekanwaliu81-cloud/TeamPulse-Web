import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { userById, type User } from "./users";

/** The signed-in person, or null. Only Active accounts count. Cached for one request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const id = await readSession();
  if (!id) return null;
  const u = await userById(id);
  return u && u.status === "active" ? u : null;
});

export const homePath = (u: User) => (u.role === "admin" ? "/dashboard" : "/home");

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/signin");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/home");
  return u;
}
