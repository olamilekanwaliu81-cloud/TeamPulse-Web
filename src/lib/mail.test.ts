import { afterEach, describe, expect, it, vi } from "vitest";
import { mailProblem, notDelivered } from "./mail";

afterEach(() => vi.unstubAllEnvs());

describe("email problems", () => {
  it("counts a failed email as not delivered everywhere", () => {
    expect(notDelivered("failed")).toBe(true);
    expect(notDelivered("sent")).toBe(false);
    expect(notDelivered(undefined)).toBe(false);
  });
  it("counts a merely logged email as not delivered on a live site, but fine while testing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MAILBOX_ENABLED", "");
    expect(notDelivered("logged")).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(notDelivered("logged")).toBe(false);
  });
  it("explains the usual Resend failures in plain words", () => {
    expect(mailProblem("failed", "You can only send testing emails to your own email address")).toMatch(/domain is not verified/);
    expect(mailProblem("failed", "API key is invalid")).toMatch(/key was refused/);
    expect(mailProblem("failed", "Too many requests, rate limit")).toMatch(/limit/);
    expect(mailProblem("failed", "something odd")).toMatch(/could not send/);
    expect(mailProblem("logged")).toMatch(/not connected/);
  });
});
