import { normalise } from "../../src/index";

describe("normalise", () => {
  it("returns an immutable result object", () => {
    const result = normalise("EC1A IAL");

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  it("uses strict mode to withhold medium-confidence corrections", () => {
    const result = normalise("S01 1AA", { correctionMode: "strict" });

    expect(result).toStrictEqual({
      input: "S01 1AA",
      normalised: null,
      isValid: false,
      isCorrected: false,
      errors: ["CONFIDENCE_BELOW_THRESHOLD"]
    });
  });

  it("uses lenient mode to allow medium-confidence corrections", () => {
    const result = normalise("B01 8TH", { correctionMode: "lenient" });

    expect(result).toStrictEqual({
      input: "B01 8TH",
      normalised: "BD1 8TH",
      isValid: true,
      isCorrected: true,
      errors: []
    });
  });

  it("disables corrections in none mode while still validating already-valid input", () => {
    expect(normalise("EC1A IAL", { correctionMode: "none" })).toStrictEqual({
      input: "EC1A IAL",
      normalised: null,
      isValid: false,
      isCorrected: false,
      errors: ["CORRECTION_DISABLED"]
    });

    expect(normalise("EC1A 1AL", { correctionMode: "none" })).toStrictEqual({
      input: "EC1A 1AL",
      normalised: "EC1A 1AL",
      isValid: true,
      isCorrected: false,
      errors: []
    });
  });

  it("throws on invalid option values at runtime boundaries", () => {
    expect(() => normalise("EC1A 1AL", null as unknown as undefined)).toThrow(TypeError);
    expect(() => normalise("EC1A 1AL", { correctionMode: "invalid" as "strict" })).toThrow(RangeError);
  });

  it("is deterministic and idempotent", () => {
    const first = normalise("B01 8TH");
    const second = normalise("B01 8TH");

    expect(second).toStrictEqual(first);

    const canonical = normalise("EC1A IAL").normalised;
    expect(canonical).toBe("EC1A 1AL");
    expect(normalise(canonical as string)).toStrictEqual({
      input: "EC1A 1AL",
      normalised: "EC1A 1AL",
      isValid: true,
      isCorrected: false,
      errors: []
    });
  });
});
