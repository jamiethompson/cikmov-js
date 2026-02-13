import parityFixtures from "../fixtures/parity-fixtures.json";
import { normalise, type NormaliseResult } from "../../src/index";

interface FixtureCase {
  readonly name: string;
  readonly input: string;
  readonly expected: Omit<NormaliseResult, "input">;
}

describe("parity fixtures", () => {
  const fixtures = (parityFixtures as unknown as { cases: readonly FixtureCase[] }).cases;

  it.each(fixtures)("matches PHP behavior: $name", ({ input, expected }) => {
    expect(normalise(input)).toStrictEqual({ input, ...expected });
  });
});
