import { describe, it, expect } from "vitest";
import { isE164, normalizePhoneInput } from "../e164";

describe("isE164", () => {
  it("accepts + followed by 7–15 digits with a non-zero lead", () => {
    expect(isE164("+61400000000")).toBe(true);
    expect(isE164("+14155551234")).toBe(true);
    expect(isE164("+1234567")).toBe(true); // 7 digits: shortest allowed
    expect(isE164("+123456789012345")).toBe(true); // 15 digits: longest allowed
  });

  it("rejects everything else", () => {
    expect(isE164("")).toBe(false);
    expect(isE164("61400000000")).toBe(false); // missing +
    expect(isE164("+0481613228")).toBe(false); // leading zero
    expect(isE164("+123456")).toBe(false); // 6 digits
    expect(isE164("+1234567890123456")).toBe(false); // 16 digits
    expect(isE164("+61 481 613 228")).toBe(false); // spaces
    expect(isE164("+61-481-613-228")).toBe(false);
    expect(isE164("+61400000000\n")).toBe(false);
    expect(isE164("(+61) 481 613 228")).toBe(false);
  });
});

describe("normalizePhoneInput", () => {
  it("strips separators and converts a 00 prefix to +", () => {
    expect(normalizePhoneInput(" +61 400-000.000 ")).toBe("+61400000000");
    expect(normalizePhoneInput("(+1) 415 555 1234")).toBe("+14155551234");
    expect(normalizePhoneInput("0061400000000")).toBe("+61400000000");
  });

  it("does not invent a country code", () => {
    expect(normalizePhoneInput("0481 613 228")).toBe("0481613228");
    expect(isE164(normalizePhoneInput("0481 613 228"))).toBe(false);
  });
});
