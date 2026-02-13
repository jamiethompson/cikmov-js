import {
  AA9A_ALLOWED_FINAL_LETTERS,
  AREA_SET,
  FORBIDDEN_FIRST_OUTWARD_LETTERS,
  FORBIDDEN_INWARD_LETTERS,
  FORBIDDEN_SECOND_OUTWARD_LETTERS,
  GIR_CANONICAL,
  GIR_COMPACT,
  OUTWARD_PATTERNS_BY_LENGTH,
  OUTWARD_PATTERN_TOKENS,
  type OutwardPattern,
  type OutwardToken
} from "./constants";

function isAsciiDigit(character: string | undefined): boolean {
  return typeof character === "string" && /^[0-9]$/.test(character);
}

function isAsciiLetter(character: string | undefined): boolean {
  return typeof character === "string" && /^[A-Z]$/.test(character);
}

export function compactFromInput(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

export function displayFromCompact(compact: string): string {
  if (compact === "") {
    return "";
  }

  if (compact === GIR_COMPACT) {
    return GIR_CANONICAL;
  }

  const length = compact.length;
  if (length < 5 || length > 7) {
    return compact;
  }

  return `${compact.slice(0, length - 3)} ${compact.slice(-3)}`;
}

export function formatCompact(compact: string): string {
  if (!isValidCompact(compact)) {
    throw new RangeError("Cannot format an invalid compact postcode.");
  }

  if (compact === GIR_COMPACT) {
    return GIR_CANONICAL;
  }

  return `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
}

export function outwardPatternsForLength(outwardLength: number): readonly OutwardPattern[] {
  return OUTWARD_PATTERNS_BY_LENGTH[outwardLength] ?? [];
}

export function outwardTokens(pattern: OutwardPattern): readonly OutwardToken[] {
  return OUTWARD_PATTERN_TOKENS[pattern] ?? [];
}

export function isValidCompact(compact: string): boolean {
  if (compact === GIR_COMPACT) {
    return true;
  }

  const length = compact.length;
  if (length < 5 || length > 7) {
    return false;
  }

  const outwardLength = length - 3;
  const outward = compact.slice(0, outwardLength);
  const inward = compact.slice(-3);

  if (!isValidInward(inward)) {
    return false;
  }

  return outwardPatternsForLength(outwardLength).some((pattern) => isValidOutwardForPattern(outward, pattern));
}

export function isValidCompactForPattern(compact: string, outwardPattern: OutwardPattern): boolean {
  if (compact === GIR_COMPACT) {
    return false;
  }

  const tokens = outwardTokens(outwardPattern);
  if (tokens.length === 0) {
    return false;
  }

  if (compact.length !== tokens.length + 3) {
    return false;
  }

  const outward = compact.slice(0, tokens.length);
  const inward = compact.slice(-3);

  return isValidInward(inward) && isValidOutwardForPattern(outward, outwardPattern);
}

function isValidInward(inward: string): boolean {
  if (inward.length !== 3) {
    return false;
  }

  if (!isAsciiDigit(inward[0])) {
    return false;
  }

  if (!isAsciiLetter(inward[1]) || !isAsciiLetter(inward[2])) {
    return false;
  }

  if (FORBIDDEN_INWARD_LETTERS.includes(inward[1] ?? "")) {
    return false;
  }

  if (FORBIDDEN_INWARD_LETTERS.includes(inward[2] ?? "")) {
    return false;
  }

  return true;
}

function isValidOutwardForPattern(outward: string, pattern: OutwardPattern): boolean {
  const tokens = outwardTokens(pattern);
  if (tokens.length === 0 || outward.length !== tokens.length) {
    return false;
  }

  for (const [position, token] of tokens.entries()) {
    const character = outward[position];

    if (token === "L" && !isAsciiLetter(character)) {
      return false;
    }

    if (token === "D" && !isAsciiDigit(character)) {
      return false;
    }

    if (token === "N" && (!isAsciiDigit(character) || character === "0")) {
      return false;
    }
  }

  if (FORBIDDEN_FIRST_OUTWARD_LETTERS.includes(outward[0] ?? "")) {
    return false;
  }

  if (tokens[1] === "L" && FORBIDDEN_SECOND_OUTWARD_LETTERS.includes(outward[1] ?? "")) {
    return false;
  }

  const areaLength = pattern.startsWith("AA") ? 2 : 1;
  const area = outward.slice(0, areaLength);
  if (AREA_SET[area] !== true) {
    return false;
  }

  if (pattern === "AA9A" && !isValidAa9aOutward(outward)) {
    return false;
  }

  return true;
}

function isValidAa9aOutward(outward: string): boolean {
  const area = outward.slice(0, 2);
  const districtDigit = outward[2];
  const districtLetter = outward[3];

  if (!AA9A_ALLOWED_FINAL_LETTERS.includes(districtLetter ?? "")) {
    return false;
  }

  switch (area) {
    case "EC":
      return ["1", "2", "3", "4"].includes(districtDigit ?? "");
    case "SW":
      return districtDigit === "1";
    case "WC":
      return ["1", "2"].includes(districtDigit ?? "");
    case "NW":
      return districtDigit === "1" && districtLetter === "W";
    case "SE":
      return districtDigit === "1" && districtLetter === "P";
    default:
      return false;
  }
}
