import { AREA_SET } from "../../src/rules/constants";
import {
  compactFromInput,
  displayFromCompact,
  formatCompact,
  isValidCompact
} from "../../src/rules/postcode-rules";

describe("postcode rules", () => {
  it("validates all embedded areas", () => {
    for (const area of Object.keys(AREA_SET)) {
      expect(isValidCompact(`${area}11AA`)).toBe(true);
    }
  });

  it("rejects unknown single-letter areas", () => {
    const allowedSingles = Object.keys(AREA_SET).filter((area) => area.length === 1);

    for (const codePoint of Array.from({ length: 26 }, (_, index) => 65 + index)) {
      const firstLetter = String.fromCharCode(codePoint);
      if (allowedSingles.includes(firstLetter)) {
        continue;
      }

      expect(isValidCompact(`${firstLetter}11AA`)).toBe(false);
    }
  });

  it("rejects unknown two-letter areas", () => {
    for (const first of Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))) {
      for (const second of Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))) {
        const area = `${first}${second}`;
        if (AREA_SET[area] === true) {
          continue;
        }

        expect(isValidCompact(`${area}11AA`)).toBe(false);
      }
    }
  });

  it("formats GIR and rejects invalid compact inputs", () => {
    expect(formatCompact("GIR0AA")).toBe("GIR 0AA");
    expect(() => formatCompact("ABCDE")).toThrow(RangeError);
  });

  it("strips noise and applies display spacing rules", () => {
    expect(compactFromInput("  wc2h-7lt\t")).toBe("WC2H7LT");

    expect(displayFromCompact("")).toBe("");
    expect(displayFromCompact("AB12")).toBe("AB12");
    expect(displayFromCompact("EC1A1AL")).toBe("EC1A 1AL");
    expect(displayFromCompact("GIR0AA")).toBe("GIR 0AA");
    expect(displayFromCompact("ABCDEFGHI")).toBe("ABCDEFGHI");
  });
});
