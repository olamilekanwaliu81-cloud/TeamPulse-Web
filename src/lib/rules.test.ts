import { describe, expect, it } from "vitest";
import { makeTpId, normalizeTpId, parseEmails, strongPassword, validEmail, validNeoId, validTpId, initials, rankName } from "./rules";

describe("rules", () => {
  it("accepts NeoLife IDs like 063-9262173 only", () => {
    expect(validNeoId("063-9262173")).toBe(true);
    expect(validNeoId("0639262173")).toBe(false);
    expect(validNeoId("063-926217")).toBe(false);
  });
  it("needs a letter and a number in passwords, at least 8 characters", () => {
    expect(strongPassword("abcdefg1")).toBe(true);
    expect(strongPassword("abcdefgh")).toBe(false);
    expect(strongPassword("12345678")).toBe(false);
    expect(strongPassword("a1")).toBe(false);
  });
  it("makes TeamPulse IDs in the 0 + year digit + OW + 3 digits shape", () => {
    expect(makeTpId(2026, () => 0.674)).toBe("06OW674");
    expect(makeTpId(2027, () => 0.005)).toBe("07OW005");
    expect(validTpId(makeTpId(2026))).toBe(true);
  });
  it("accepts a zero typed instead of the letter O", () => {
    expect(normalizeTpId(" 060w674 ".toUpperCase())).toBe("06OW674");
    expect(normalizeTpId("06ow674")).toBe("06OW674");
  });
  it("checks emails, initials and ranks", () => {
    expect(validEmail("a@b.co")).toBe(true);
    expect(validEmail("a@b")).toBe(false);
    expect(initials("Abdul Malik Ajao")).toBe("AM");
    expect(rankName(2)).toBe("Senior Manager");
  });
});

describe("parseEmails", () => {
  it("splits on lines, commas and semicolons, lowercases and drops duplicates", () => {
    const r = parseEmails("A@x.com, b@x.com;\nC@X.com  a@x.com");
    expect(r.emails).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
    expect(r.bad).toEqual([]);
  });
  it("keeps what is not an email apart, and reads <name@x.com>", () => {
    const r = parseEmails("bob, <ok@x.com>, nope@");
    expect(r.emails).toEqual(["ok@x.com"]);
    expect(r.bad).toEqual(["bob", "nope@"]);
  });
  it("is empty for an empty box", () => {
    expect(parseEmails("  \n ")).toEqual({ emails: [], bad: [] });
  });
});
