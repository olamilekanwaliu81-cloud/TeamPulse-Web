import { describe, expect, it } from "vitest";
import { addDays, confirmCopy, monthOccs, occurrence, openToday, progress, stateOf } from "./checkins";

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
  it("lists the seven questions of the month and the ones open today", () => {
    expect(monthOccs("2026-11-12").map((o) => o.date)).toEqual(["2026-11-10", "2026-11-14", "2026-11-15", "2026-11-25", "2026-11-28", "2026-11-28", "2026-11-28"]);
    expect(openToday("2026-11-13").map((o) => o.key)).toEqual(["earn", "ppv", "plan"]);
  });
  it("asks to confirm the PPV and the QPV on the 28th, never past the month end", () => {
    const p = occurrence("ppvdone", 2026, 10), q = occurrence("qpvdone", 2026, 10);
    expect([p.open, p.date, p.close]).toEqual(["2026-11-28", "2026-11-28", "2026-11-30"]);
    expect([q.open, q.date, q.close]).toEqual(["2026-11-28", "2026-11-28", "2026-11-30"]);
    expect(stateOf("ppvdone", "2026-11-27").state).toBe("locked");
    expect(stateOf("qpvdone", "2026-11-27").state).toBe("locked");
    expect(stateOf("qpvdone", "2026-11-28").state).toBe("open");
    expect(stateOf("ppvdone", "2026-12-01").state).toBe("locked"); // the next month never inherits it
  });
  it("keeps the question inside a short February", () => {
    expect(occurrence("qpvdone", 2027, 1).date).toBe("2027-02-28");
    expect(occurrence("qpvdone", 2028, 1).date).toBe("2028-02-28");
    expect(occurrence("qpvdone", 2028, 1).close).toBe("2028-02-29");
    expect(occurrence("qpvdone", 2027, 1).month).toBe("2027-02-01");
  });
  it("repeats the planned number back to the member", () => {
    expect(confirmCopy("ppvdone", 250).subject).toBe("Have you done the 250 PPV you planned?");
    expect(confirmCopy("qpvdone", 1500).subject).toBe("Has your team reached the 1,500 QPV you planned?");
    expect(confirmCopy("ppvdone", null).subject).toBe("How much PPV did you do this month?");
  });
});
