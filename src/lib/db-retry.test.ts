import { describe, expect, it } from "vitest";
import { isRead, retryable, withRetry } from "./db-retry";

const err = (code: string) => Object.assign(new Error(code), { code });

describe("database retry", () => {
  it("knows reads from writes", () => {
    expect(isRead("  select * from users")).toBe(true);
    expect(isRead("with a as (select 1) select * from a")).toBe(true);
    expect(isRead("insert into users")).toBe(false);
    expect(isRead("update users set a = 1")).toBe(false);
  });
  it("repeats a cancelled query and a connect timeout, read or write", () => {
    expect(retryable(err("57014"), false)).toBe(true);
    expect(retryable(err("CONNECT_TIMEOUT"), false)).toBe(true);
  });
  it("repeats a lost connection only for reads", () => {
    expect(retryable(err("ECONNRESET"), true)).toBe(true);
    expect(retryable(err("ECONNRESET"), false)).toBe(false);
  });
  it("does not repeat real errors", () => {
    expect(retryable(err("23505"), true)).toBe(false);
    expect(retryable(new Error("x"), true)).toBe(false);
  });
  it("runs again once, then gives up", async () => {
    let n = 0;
    expect(await withRetry(async () => { if (++n === 1) throw err("57014"); return "ok"; }, false, 0)).toBe("ok");
    n = 0;
    await expect(withRetry(async () => { n++; throw err("57014"); }, false, 0)).rejects.toThrow();
    expect(n).toBe(2);
    n = 0;
    await expect(withRetry(async () => { n++; throw err("23505"); }, true, 0)).rejects.toThrow();
    expect(n).toBe(1);
  });
});
