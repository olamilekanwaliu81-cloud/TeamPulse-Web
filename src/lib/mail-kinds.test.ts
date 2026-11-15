import { describe, expect, it } from "vitest";
import { kindOf, pct, summarize } from "./mail-kinds";

describe("mail kinds", () => {
  it("recognises each email by its subject", () => {
    expect(kindOf("Welcome to the family, Ada! Your TeamPulse ID is 06OW111")).toBe("Welcome");
    expect(kindOf("Welcome to TeamPulse, Ada! Your TeamPulse ID is 06OW111")).toBe("Welcome");
    expect(kindOf("Have you done the 250 PPV you planned?")).toBe("Check-in reminders");
    expect(kindOf("Reminder: Have you done the 136 PPV you planned?")).toBe("Check-in reminders");
    expect(kindOf("Reset your TeamPulse password")).toBe("Password reset");
    expect(kindOf("Confirm your email for TeamPulse")).toBe("Email confirmation");
    expect(kindOf("PPV and QPV: your check-in is open")).toBe("Check-in reminders");
    expect(kindOf("Last day: Sign-ups and step-ups")).toBe("Check-in reminders");
    expect(kindOf("Reminder: Earnings and orders")).toBe("Check-in reminders");
    expect(kindOf("Olamilekan invites you to join the team")).toBe("Invites");
    expect(kindOf("Your team leader needs your new sign-up's details")).toBe("Sign-up requests");
    expect(kindOf("Something else")).toBe("Other");
  });
  it("counts only delivered emails, and a click also counts as an open", () => {
    const t = summarize([
      { subject: "Reminder: x", delivered: true, opens: 2, clicks: 0 },
      { subject: "Reminder: y", delivered: true, opens: 0, clicks: 1 },
      { subject: "Reminder: z", delivered: true, opens: 0, clicks: 0 },
      { subject: "Reminder: w", delivered: false, opens: 0, clicks: 0 },
      { subject: "Welcome to TeamPulse", delivered: true, opens: 1, clicks: 1 },
    ]);
    expect(t[0]).toEqual({ kind: "All emails", sent: 4, opened: 3, clicked: 2 });
    expect(t.find((x) => x.kind === "Check-in reminders")).toEqual({ kind: "Check-in reminders", sent: 3, opened: 2, clicked: 1 });
    expect(t.find((x) => x.kind === "Welcome")?.sent).toBe(1);
    expect(t.find((x) => x.kind === "Invites")).toBeUndefined();
  });
  it("shows a dash when nothing was sent", () => {
    expect(pct(1, 4)).toBe("25%");
    expect(pct(0, 0)).toBe("—");
  });
});
