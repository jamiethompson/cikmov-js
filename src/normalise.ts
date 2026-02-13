import { analyse, type AnalysisResult } from "./internal/analyser";
import type { NormaliseOptions, NormaliseResult } from "./types";

const DEFAULT_MIN_CONFIDENCE = 85;
const STRICT_MIN_CONFIDENCE = 95;
const LENIENT_MIN_CONFIDENCE = 80;

type ErrorCode =
  | "INPUT_EMPTY"
  | "MISSING_REQUIRED_CHARACTER_CLASSES"
  | "NO_VALID_CANDIDATE"
  | "CONFIDENCE_BELOW_THRESHOLD"
  | "CORRECTION_DISABLED";

interface NormalisePolicy {
  readonly minConfidenceToApply: number;
  readonly correctionMode: "none" | "strict" | "lenient" | "default";
}

export function normalise(input: string, options?: NormaliseOptions): NormaliseResult {
  if (typeof input !== "string") {
    throw new TypeError("normalise(input, options) requires input to be a string.");
  }

  const policy = resolvePolicy(options);
  const analysis = analyse(input, policy.minConfidenceToApply);

  const shouldSuppressCorrection = policy.correctionMode === "none" && !analysis.inputWasValid;
  const appliedPostcode = shouldSuppressCorrection ? null : analysis.appliedPostcode;

  if (appliedPostcode !== null) {
    return freezeResult({
      input,
      normalised: appliedPostcode,
      isValid: true,
      isCorrected: !analysis.inputWasValid,
      errors: []
    });
  }

  return freezeResult({
    input,
    normalised: null,
    isValid: false,
    isCorrected: false,
    errors: determineErrors(analysis, policy.correctionMode)
  });
}

function determineErrors(analysis: AnalysisResult, correctionMode: NormalisePolicy["correctionMode"]): readonly ErrorCode[] {
  if (analysis.bestCandidate !== null) {
    if (correctionMode === "none") {
      return ["CORRECTION_DISABLED"];
    }

    return ["CONFIDENCE_BELOW_THRESHOLD"];
  }

  switch (analysis.rejectionReason) {
    case "input_empty":
      return ["INPUT_EMPTY"];
    case "missing_classes":
      return ["MISSING_REQUIRED_CHARACTER_CLASSES"];
    case "no_candidate":
      return ["NO_VALID_CANDIDATE"];
    case "below_threshold":
      return ["CONFIDENCE_BELOW_THRESHOLD"];
    default:
      return ["NO_VALID_CANDIDATE"];
  }
}

function resolvePolicy(options?: NormaliseOptions): NormalisePolicy {
  if (options === undefined) {
    return {
      correctionMode: "default",
      minConfidenceToApply: DEFAULT_MIN_CONFIDENCE
    };
  }

  if (typeof options !== "object" || options === null) {
    throw new TypeError("normalise(input, options) requires options to be an object when provided.");
  }

  const { correctionMode } = options;

  if (correctionMode === undefined) {
    return {
      correctionMode: "default",
      minConfidenceToApply: DEFAULT_MIN_CONFIDENCE
    };
  }

  if (correctionMode === "none") {
    return {
      correctionMode,
      minConfidenceToApply: DEFAULT_MIN_CONFIDENCE
    };
  }

  if (correctionMode === "strict") {
    return {
      correctionMode,
      minConfidenceToApply: STRICT_MIN_CONFIDENCE
    };
  }

  if (correctionMode === "lenient") {
    return {
      correctionMode,
      minConfidenceToApply: LENIENT_MIN_CONFIDENCE
    };
  }

  throw new RangeError("options.correctionMode must be one of: none, strict, lenient.");
}

function freezeResult(result: {
  input: string;
  normalised: string | null;
  isValid: boolean;
  isCorrected: boolean;
  errors: readonly ErrorCode[];
}): NormaliseResult {
  const frozenErrors = Object.freeze([...result.errors]) as readonly string[];

  return Object.freeze({
    ...result,
    errors: frozenErrors
  }) as NormaliseResult;
}
