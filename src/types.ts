export interface NormaliseOptions {
  correctionMode?: "none" | "strict" | "lenient";
}

export interface NormaliseResult {
  readonly input: string;
  readonly normalised: string | null;
  readonly isValid: boolean;
  readonly isCorrected: boolean;
  readonly errors: readonly string[];
}
