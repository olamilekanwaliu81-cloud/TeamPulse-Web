import { describe, expect, it } from "vitest";
import { inviteText, nudgeText, waLink, waNumber } from "./whatsapp";

describe("waNumber", () => {
  it("turns Nigerian numbers into international digits", () => {
    expect(waNumber("0803 123 4567")).toBe("2348031234567");
    expect(waNumber("+234 803 123 4567")).toBe("2348031234567");
    expect(waNumber("2348031234567")).toBe("2348031234567");
    expect(waNumber("8031234567")).toBe("2348031234567");
    expect(waNumber("00234-803-123-4567")).toBe("2348031234567");
  });
  it("keeps other countries that start with +", () => {
    expect(waNumber("+44 7700 900123")).toBe("447700900123");
  });
  it("gives null for nothing or nonsense", () => {
    expect(waNumber("")).toBeNull();
    expect(waNumber(null)).toBeNull();
    expect(waNumber("abc")).toBeNull();
    expect(waNumber("12345")).toBeNull();
  });
});

describe("waLink and texts", () => {
  it("opens a chat with a number and a contact picker without", () => {
    expect(waLink("0803 123 4567", "hi there")).toBe("https://wa.me/2348031234567?text=hi%20there");
    expect(waLink("", "hi")).toBe("https://wa.me/?text=hi");
  });
  it("writes the nudge and the invite with the right details", () => {
    expect(nudgeText("Ada Obi", "Olamilekan Waliu", ["PPV and QPV"], "https://x.test")).toContain("Hi Ada, it's Olamilekan. Your check-in is open: PPV and QPV.");
    expect(inviteText("existing", "Lead Er", "https://x.test/join/abc")).toContain("already a distributor");
    expect(inviteText("new", "Lead Er", "https://x.test/join/abc")).toContain("first order");
  });
});
