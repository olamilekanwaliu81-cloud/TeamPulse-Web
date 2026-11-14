import { describe, expect, it } from "vitest";
import { recommend, systemQpv } from "./ranks";

const m = (o: Partial<Parameters<typeof recommend>[0]> = {}) => ({ role: "member", status: "active", rank: 0, ppv: 136, qpv: 600, ...o });

describe("rank recommendations", () => {
  it("recommends the highest rank the QPV reaches, with 100 PPV", () => {
    expect(recommend(m({ qpv: 500 }))).toBe(1);
    expect(recommend(m({ qpv: 1000 }))).toBe(2);
    expect(recommend(m({ qpv: 2500 }))).toBe(3);
  });
  it("needs 100 PPV", () => {
    expect(recommend(m({ ppv: 99, qpv: 2500 }))).toBeNull();
    expect(recommend(m({ ppv: 100, qpv: 2500 }))).toBe(3);
  });
  it("recommends nothing without numbers, below Manager, or for the rank already held", () => {
    expect(recommend(m({ ppv: null }))).toBeNull();
    expect(recommend(m({ qpv: null }))).toBeNull();
    expect(recommend(m({ qpv: 499 }))).toBeNull();
    expect(recommend(m({ rank: 1, qpv: 600 }))).toBeNull();
    expect(recommend(m({ rank: 3, qpv: 9000 }))).toBeNull(); // Director follows its own rules
  });
  it("only for active members", () => {
    expect(recommend(m({ status: "invited" }))).toBeNull();
    expect(recommend(m({ role: "admin" }))).toBeNull();
  });
});

describe("system QPV", () => {
  const people = [
    { id: "a", sponsorId: null, status: "active" as const, role: "admin" as const },
    { id: "b", sponsorId: "a", status: "active" as const, role: "member" as const },
    { id: "c", sponsorId: "b", status: "active" as const, role: "member" as const },
    { id: "d", sponsorId: "b", status: "active" as const, role: "member" as const },
  ];
  it("adds a person's PPV to everyone below them", () => {
    const q = systemQpv(people, new Map([["b", 136], ["c", 250], ["d", 100]]));
    expect(q.get("c")).toBe(250);
    expect(q.get("b")).toBe(486);
    expect(q.get("a")).toBe(486);
  });
  it("treats missing PPV as zero and survives a loop", () => {
    expect(systemQpv(people, new Map()).get("a")).toBe(0);
    const loop = [{ ...people[1], sponsorId: "c" }, { ...people[2], sponsorId: "b" }];
    expect(systemQpv(loop, new Map([["b", 1], ["c", 2]])).get("b")).toBe(3);
  });
});
