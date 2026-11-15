import { describe, expect, it } from "vitest";
import { monthGrid, upcoming, weekDays } from "./calendar";

describe("calendar", () => {
  it("lays November 2026 out Monday first, with 1 Nov on a Sunday", () => {
    const g = monthGrid(2026, 10, "2026-11-15");
    expect(g[0].map((c) => c.day)[0]).toBe("2026-10-26");
    expect(g[0][6].day).toBe("2026-11-01");
    expect(g.flat().filter((c) => c.inMonth).length).toBe(30);
  });
  it("marks today, the check-in dates, and the open windows", () => {
    const cells = monthGrid(2026, 10, "2026-11-13").flat();
    expect(cells.find((c) => c.isToday)?.day).toBe("2026-11-13");
    expect(cells.find((c) => c.day === "2026-11-10")?.events.some((e) => e.key === "earn" && e.kind === "date")).toBe(true);
    expect(cells.find((c) => c.day === "2026-11-12")?.events.some((e) => e.key === "earn" && e.kind === "window")).toBe(true); // 8th to 13th
    expect(cells.find((c) => c.day === "2026-11-15")?.teamStart).toBe(true);
  });
  it("gives the seven days of this week, Monday to Sunday", () => {
    const w = weekDays("2026-11-15"); // a Sunday
    expect(w[0].day).toBe("2026-11-09");
    expect(w[6].day).toBe("2026-11-15");
    expect(w[6].isToday).toBe(true);
  });
  it("lists what opens, is due and closes soon", () => {
    const u = upcoming("2026-11-13", 3);
    expect(u[0]).toMatchObject({ what: "closes", on: "2026-11-13" });
    expect(u.some((x) => x.occ.key === "plan" && x.what === "due" && x.on === "2026-11-15")).toBe(true);
  });
});
