import { describe, expect, it } from "vitest";
import { addDays, monthOccs, occurrence, openToday, progress, stateOf } from "./checkins";

describe("check-in windows", () => {
  it("opens 2 days before the date and closes 3 days after", () => {
    const o = occurrence("earn", 2026, 10); // 10 Nov 2026
    expect(o.date).toBe("2026-11-10");
    expect(o.open).toBe("2026-11-08");
    expect(o.close).toBe("2026-11-13");
    expect(o.id).toBe("earn@2026-11-10");
  });
  it("is closed the day before it opens, open on the first and last day, closed again after", () => {
    expect(stateOf("earn", "2026-11-07").state).toBe("locked");
    expect(stateOf("earn", "2026-11-08").state).toBe("open");
    expect(stateOf("earn", "2026-11-13").state).toBe("open");
    expect(stateOf("earn", "2026-11-14").state).toBe("locked");
  });
  it("reports the next and the last occurrence while locked", () => {
    const s = stateOf("earn", "2026-11-20");
    expect(s.state).toBe("locked");
    if (s.state === "locked") { expect(s.next.date).toBe("2026-12-10"); expect(s.last?.date).toBe("2026-11-10"); }
  });
  it("works across the new year", () => {
    expect(occurrence("plan", 2026, 12).date).toBe("2027-01-15");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(stateOf("paid", "2026-12-31").state).toBe("open"); // the 28 Dec question closes on 31 Dec
    expect(stateOf("paid", "2027-01-01").state).toBe("locked");
  });
  it("counts what is due, done and missed this month", () => {
    const answered = new Set(["earn@2026-11-10", "ppv@2026-11-14"]);
    expect(progress(answered, "2026-11-16")).toEqual({ due: 3, done: 2, missed: 0 }); // plan opened 13th, closes 18th
    expect(progress(answered, "2026-11-19")).toEqual({ due: 3, done: 2, missed: 1 });
    expect(progress(answered, "2026-11-01")).toEqual({ due: 0, done: 0, missed: 0 });
  });
  it("does not count questions that closed before the person joined", () => {
    expect(progress(new Set(), "2026-11-16", "2026-11-14")).toEqual({ due: 2, done: 0, missed: 0 }); // ppv and plan only
    expect(progress(new Set(), "2026-11-19", "2026-11-14")).toEqual({ due: 2, done: 0, missed: 2 });
  });
  it("lists the five questions of the month and the ones open today", () => {
    expect(monthOccs("2026-11-12").map((o) => o.date)).toEqual(["2026-11-10", "2026-11-14", "2026-11-15", "2026-11-25", "2026-11-28"]);
    expect(openToday("2026-11-13").map((o) => o.key)).toEqual(["earn", "ppv", "plan"]);
  });
});
