import {
  compactFromInput,
  displayFromCompact,
  formatCompact,
  isValidCompact,
  isValidCompactForPattern,
  outwardPatternsForLength,
  outwardTokens
} from "../rules/postcode-rules";
import type { OutwardPattern } from "../rules/constants";

const OUTWARD_SUBSTITUTION_BASE_PENALTY = 8;
const INWARD_SUBSTITUTION_BASE_PENALTY = 4;
const TIE_AMBIGUITY_PENALTY = 15;
const NEAR_AMBIGUITY_PENALTY = 6;
const ALTERNATIVE_SCORE_WINDOW = 4;
const MAX_ALTERNATIVES = 5;

const DIGIT_TO_LETTERS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  "0": { O: 0, D: 2, Q: 2, L: 3 },
  "1": { I: 0, L: 0 },
  "2": { Z: 0 },
  "3": { B: 2 },
  "4": { A: 2 },
  "5": { S: 0 },
  "6": { G: 0 },
  "7": { T: 1 },
  "8": { B: 0 },
  "9": { G: 2 }
};

const LETTER_TO_DIGITS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  B: { "8": 0, "3": 2 },
  G: { "6": 0, "9": 2 },
  I: { "1": 0 },
  L: { "1": 0 },
  O: { "0": 0 },
  S: { "5": 0 },
  Z: { "2": 0 }
};

export type RejectionReason = "none" | "input_empty" | "missing_classes" | "no_candidate" | "below_threshold";

export interface AnalysisResult {
  readonly input: string;
  readonly normalizedInput: string;
  readonly inputWasValid: boolean;
  readonly bestCandidate: string | null;
  readonly confidence: number;
  readonly appliedPostcode: string | null;
  readonly alternatives: readonly string[];
  readonly rejectionReason: RejectionReason;
}

interface CandidateOption {
  readonly char: string;
  readonly penalty: number;
}

export function analyse(input: string, minConfidenceToApply: number): AnalysisResult {
  if (!Number.isInteger(minConfidenceToApply) || minConfidenceToApply < 0 || minConfidenceToApply > 100) {
    throw new RangeError("minConfidenceToApply must be between 0 and 100.");
  }

  const compact = compactFromInput(input);
  const normalizedInput = displayFromCompact(compact);

  if (compact === "") {
    return {
      input,
      normalizedInput,
      inputWasValid: false,
      bestCandidate: null,
      confidence: 0,
      appliedPostcode: null,
      alternatives: [],
      rejectionReason: "input_empty"
    };
  }

  if (isValidCompact(compact)) {
    const canonical = formatCompact(compact);

    return {
      input,
      normalizedInput: canonical,
      inputWasValid: true,
      bestCandidate: canonical,
      confidence: 100,
      appliedPostcode: canonical,
      alternatives: [],
      rejectionReason: "none"
    };
  }

  if (!/[A-Z]/.test(compact) || !/[0-9]/.test(compact)) {
    return {
      input,
      normalizedInput,
      inputWasValid: false,
      bestCandidate: null,
      confidence: 0,
      appliedPostcode: null,
      alternatives: [],
      rejectionReason: "missing_classes"
    };
  }

  const candidates = generateCandidates(compact);
  if (candidates.size === 0) {
    return {
      input,
      normalizedInput,
      inputWasValid: false,
      bestCandidate: null,
      confidence: 0,
      appliedPostcode: null,
      alternatives: [],
      rejectionReason: "no_candidate"
    };
  }

  const ranked = [...candidates.entries()]
    .map(([compactCandidate, score]) => ({
      compact: compactCandidate,
      canonical: formatCompact(compactCandidate),
      score
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.canonical.localeCompare(right.canonical);
    });

  if (ranked.length === 0) {
    return {
      input,
      normalizedInput,
      inputWasValid: false,
      bestCandidate: null,
      confidence: 0,
      appliedPostcode: null,
      alternatives: [],
      rejectionReason: "no_candidate"
    };
  }

  const best = ranked[0]!;
  const topScore = best.score;
  const alternatives: string[] = [];
  let hasTopTie = false;
  let hasNearAmbiguity = false;

  for (let index = 1; index < ranked.length; index += 1) {
    const candidate = ranked[index];
    if (candidate === undefined) {
      continue;
    }

    const scoreDelta = topScore - candidate.score;

    if (scoreDelta === 0) {
      hasTopTie = true;
      alternatives.push(candidate.canonical);
      continue;
    }

    if (scoreDelta <= ALTERNATIVE_SCORE_WINDOW) {
      hasNearAmbiguity = true;
      alternatives.push(candidate.canonical);
    }
  }

  const uniqueAlternatives = [...new Set(alternatives)].slice(0, MAX_ALTERNATIVES);

  let confidence = topScore;
  if (hasTopTie) {
    confidence -= TIE_AMBIGUITY_PENALTY;
  } else if (hasNearAmbiguity) {
    confidence -= NEAR_AMBIGUITY_PENALTY;
  }

  confidence = Math.max(0, Math.min(100, confidence));
  const appliedPostcode = confidence >= minConfidenceToApply ? best.canonical : null;

  return {
    input,
    normalizedInput,
    inputWasValid: false,
    bestCandidate: best.canonical,
    confidence,
    appliedPostcode,
    alternatives: uniqueAlternatives,
    rejectionReason: appliedPostcode === null ? "below_threshold" : "none"
  };
}

function generateCandidates(compact: string): Map<string, number> {
  const length = compact.length;
  if (length < 5 || length > 7) {
    return new Map();
  }

  const outwardLength = length - 3;
  const outwardInput = compact.slice(0, outwardLength);
  const inwardInput = compact.slice(-3);

  let patterns = outwardPatternsForLength(outwardLength);
  if (patterns.length === 0) {
    return new Map();
  }

  const classCompatiblePatterns = patterns.filter((pattern) => isClassCompatibleOutward(outwardInput, pattern));
  if (classCompatiblePatterns.length > 0) {
    patterns = classCompatiblePatterns;
  }

  const scoresByCandidate = new Map<string, number>();

  for (const pattern of patterns) {
    const outwardPatternTokens = outwardTokens(pattern);
    if (outwardPatternTokens.length === 0) {
      continue;
    }

    const optionsByPosition: CandidateOption[][] = [];
    let isPatternViable = true;

    for (const [position, token] of outwardPatternTokens.entries()) {
      const character = outwardInput[position];
      const options = optionsForCharacter(character, token, true);
      if (options.length === 0) {
        isPatternViable = false;
        break;
      }

      optionsByPosition.push(options);
    }

    if (!isPatternViable) {
      continue;
    }

    const inwardTokens: readonly ["D", "L", "L"] = ["D", "L", "L"];
    for (const [position, token] of inwardTokens.entries()) {
      const character = inwardInput[position];
      const options = optionsForCharacter(character, token, false);
      if (options.length === 0) {
        isPatternViable = false;
        break;
      }

      optionsByPosition.push(options);
    }

    if (!isPatternViable) {
      continue;
    }

    walkCandidateOptions(optionsByPosition, 0, "", 0, (candidate, penalty) => {
      if (!isValidCompactForPattern(candidate, pattern)) {
        return;
      }

      const score = Math.max(0, 100 - penalty);
      const existing = scoresByCandidate.get(candidate);
      if (existing === undefined || score > existing) {
        scoresByCandidate.set(candidate, score);
      }
    });
  }

  return scoresByCandidate;
}

function isClassCompatibleOutward(outward: string, pattern: OutwardPattern): boolean {
  const tokens = outwardTokens(pattern);
  if (tokens.length === 0 || outward.length !== tokens.length) {
    return false;
  }

  for (const [position, token] of tokens.entries()) {
    const character = outward[position];

    if (token === "L" && !/^[A-Z]$/.test(character ?? "")) {
      return false;
    }

    if (token === "D" && !/^[0-9]$/.test(character ?? "")) {
      return false;
    }

    if (token === "N" && (!/^[0-9]$/.test(character ?? "") || character === "0")) {
      return false;
    }
  }

  return true;
}

function walkCandidateOptions(
  optionsByPosition: readonly CandidateOption[][],
  position: number,
  partialCandidate: string,
  totalPenalty: number,
  onCandidate: (candidate: string, penalty: number) => void
): void {
  if (position === optionsByPosition.length) {
    onCandidate(partialCandidate, totalPenalty);
    return;
  }

  const optionsAtPosition = optionsByPosition[position];
  if (optionsAtPosition === undefined) {
    return;
  }

  for (const option of optionsAtPosition) {
    if (option === undefined) {
      continue;
    }

    walkCandidateOptions(
      optionsByPosition,
      position + 1,
      partialCandidate + option.char,
      totalPenalty + option.penalty,
      onCandidate
    );
  }
}

function optionsForCharacter(character: string | undefined, expectedToken: "L" | "D" | "N", outward: boolean): CandidateOption[] {
  if (character === undefined) {
    return [];
  }

  const basePenalty = outward ? OUTWARD_SUBSTITUTION_BASE_PENALTY : INWARD_SUBSTITUTION_BASE_PENALTY;
  const options: CandidateOption[] = [];

  if (expectedToken === "L") {
    if (/^[A-Z]$/.test(character)) {
      options.push({ char: character, penalty: 0 });
    }

    if (/^[0-9]$/.test(character)) {
      const mappedLetters = DIGIT_TO_LETTERS[character] ?? {};
      for (const [replacement, extraPenalty] of Object.entries(mappedLetters)) {
        options.push({ char: replacement, penalty: basePenalty + extraPenalty });
      }
    }
  } else {
    if (/^[0-9]$/.test(character) && (expectedToken !== "N" || character !== "0")) {
      options.push({ char: character, penalty: 0 });
    }

    if (/^[A-Z]$/.test(character)) {
      const mappedDigits = LETTER_TO_DIGITS[character] ?? {};
      for (const [replacement, extraPenalty] of Object.entries(mappedDigits)) {
        if (expectedToken === "N" && replacement === "0") {
          continue;
        }

        options.push({ char: replacement, penalty: basePenalty + extraPenalty });
      }
    }
  }

  const deduplicated = new Map<string, number>();
  for (const option of options) {
    const existing = deduplicated.get(option.char);
    if (existing === undefined || option.penalty < existing) {
      deduplicated.set(option.char, option.penalty);
    }
  }

  return [...deduplicated.entries()]
    .map(([candidateCharacter, candidatePenalty]) => ({ char: candidateCharacter, penalty: candidatePenalty }))
    .sort((left, right) => {
      if (left.penalty !== right.penalty) {
        return left.penalty - right.penalty;
      }

      return left.char.localeCompare(right.char);
    });
}
