import { describe, expect, it } from "vitest";
import { monthStatus, recommend, statusText, svbRate, systemQpv } from "./ranks";

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

describe("monthly status", () => {
  it("is qualified with 100 PPV and the QPV of the title", () => {
    expect(monthStatus({ role: "member", rank: 1, ppv: 120, qpv: 500 })).toEqual({ state: "qualified", rate: 5 });
    expect(monthStatus({ role: "member", rank: 2, ppv: 100, qpv: 1500 })).toEqual({ state: "qualified", rate: 10 });
  });
  it("keeps the title but is title only when the month falls short", () => {
    const low = monthStatus({ role: "member", rank: 1, ppv: 120, qpv: 400 });
    expect(low.state).toBe("title_only");
    expect(low.state === "title_only" && low.why[0]).toMatch(/QPV 400 is under the 500/);
    const noPpv = monthStatus({ role: "member", rank: 2, ppv: 80, qpv: 1500 });
    expect(noPpv.state === "title_only" && noPpv.rate).toBeNull(); // no bonus at all without 100 PPV
  });
  it("only needs 100 PPV for a Distributor", () => {
    expect(monthStatus({ role: "member", rank: 0, ppv: 100, qpv: 0 }).state).toBe("qualified");
    expect(monthStatus({ role: "member", rank: 0, ppv: 99, qpv: 900 }).state).toBe("title_only");
  });
  it("says unreported when no PPV was given", () => {
    expect(monthStatus({ role: "member", rank: 1, ppv: null, qpv: null })).toEqual({ state: "unreported" });
  });
  it("follows the bonus chart: 250 gives 3%, 4,000 gives 25%, and nothing below 250 or under 100 PPV", () => {
    expect(svbRate(100, 249)).toBeNull();
    expect(svbRate(100, 250)).toBe(3);
    expect(svbRate(100, 999)).toBe(5);
    expect(svbRate(100, 4000)).toBe(25);
    expect(svbRate(99, 4000)).toBeNull();
  });
});

describe("status in plain words", () => {
  it("a Senior Manager with 800 QPV keeps the title, loses the status, and earns 5%", () => {
    const s = monthStatus({ role: "member", rank: 2, ppv: 120, qpv: 800 });
    expect(s.state === "title_only" && s.noPpv).toBe(false);
    expect(s.state === "title_only" && s.rate).toBe(5);
    const t = statusText({ rank: 2, ppv: 120, qpv: 800 }, s);
    expect(t.headline).toBe("Title only this month");
    expect(t.detail).toMatch(/5% bonus level/);
    expect(t.detail).toMatch(/instead of 10%/);
  });
  it("without 100 PPV there is no bonus and no status, but the title stays", () => {
    const s = monthStatus({ role: "member", rank: 2, ppv: 60, qpv: 3000 });
    expect(s.state === "title_only" && s.noPpv).toBe(true);
    expect(s.state === "title_only" && s.rate).toBeNull();
    const t = statusText({ rank: 2, ppv: 60, qpv: 3000 }, s);
    expect(t.headline).toBe("No bonus this month");
    expect(t.detail).toMatch(/keep your Senior Manager title/);
  });
  it("no PPV reported means they do not qualify as a Distributor and earn nothing", () => {
    const t = statusText({ rank: 0, ppv: null, qpv: null }, monthStatus({ role: "member", rank: 0, ppv: null, qpv: null }));
    expect(t.detail).toMatch(/do not qualify as a Distributor and earn nothing/);
  });
  it("under 250 QPV there is no bonus even with the status short", () => {
    const s = monthStatus({ role: "member", rank: 1, ppv: 100, qpv: 200 });
    expect(statusText({ rank: 1, ppv: 100, qpv: 200 }, s).detail).toMatch(/under 250/);
  });
});
