# cikmov-js

Deterministic UK postcode normalisation and correction for JavaScript/TypeScript, ported from `jamiethompson/cikmov-php`.

## Philosophy And History

`cikmov-js` is a parity-led port of [`cikmov-php`](https://github.com/jamiethompson/cikmov-php) built around strict postcode grammar rules, not fuzzy matching.

Design principles:
- deterministic outcomes for the same input/options
- pure functions and immutable results
- no network lookups or allocation datasets
- rule-backed correction only

This package validates/corrects postcode *format grammar* only.

## Installation

```bash
npm install cikmov-js
```

## Quick Start

```ts
import { normalise } from "cikmov-js";

const result = normalise("ec1a ial");

console.log(result);
// {
//   input: 'ec1a ial',
//   normalised: 'EC1A 1AL',
//   isValid: true,
//   isCorrected: true,
//   errors: []
// }
```

## API Reference

### `normalise(input, options?)`

```ts
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

export function normalise(input: string, options?: NormaliseOptions): NormaliseResult;
```

## Options Reference

`correctionMode` controls when corrections are applied:
- `undefined` (default): parity mode, equivalent to PHP default threshold (`85`)
- `strict`: applies only high-confidence corrections (`>=95`)
- `lenient`: applies broader corrections (`>=80`)
- `none`: never applies corrections to invalid input, but still validates already-valid input

## Result Contract

- `input`: original raw input
- `normalised`: canonical postcode when valid/corrected, otherwise `null`
- `isValid`: `true` when canonical output is available
- `isCorrected`: `true` only when input was invalid and corrected
- `errors`: deterministic error codes when invalid

Error codes:
- `INPUT_EMPTY`
- `MISSING_REQUIRED_CHARACTER_CLASSES`
- `NO_VALID_CANDIDATE`
- `CONFIDENCE_BELOW_THRESHOLD`
- `CORRECTION_DISABLED`

## Correction Mode Examples

```ts
import { normalise } from "cikmov-js";

normalise("S01 1AA");
// default/parity => { normalised: 'SO1 1AA', isValid: true, isCorrected: true, errors: [] }

normalise("S01 1AA", { correctionMode: "strict" });
// => { normalised: null, isValid: false, isCorrected: false, errors: ['CONFIDENCE_BELOW_THRESHOLD'] }

normalise("EC1A IAL", { correctionMode: "none" });
// => { normalised: null, isValid: false, isCorrected: false, errors: ['CORRECTION_DISABLED'] }
```

## Edge-Case Examples

```ts
normalise("!!!!");
// => { normalised: null, isValid: false, isCorrected: false, errors: ['INPUT_EMPTY'] }

normalise("ABCDE");
// => { normalised: null, isValid: false, isCorrected: false, errors: ['MISSING_REQUIRED_CHARACTER_CLASSES'] }

normalise("GIR 0AA");
// => { normalised: 'GIR 0AA', isValid: true, isCorrected: false, errors: [] }
```

## Node Usage Example

```ts
import { normalise } from "cikmov-js";

const postcode = process.argv[2] ?? "EC1A IAL";
console.log(normalise(postcode));
```

## Vue Usage Example

```ts
import { computed, ref } from "vue";
import { normalise } from "cikmov-js";

const postcode = ref("ec1a ial");
const normalised = computed(() => normalise(postcode.value));
```

## React Usage Example

```tsx
import { normalise } from "cikmov-js";

export function PostcodeLabel({ input }: { input: string }) {
  const result = normalise(input);
  return <span>{result.normalised ?? "Invalid"}</span>;
}
```

## Angular Usage Example

```ts
import { Injectable } from "@angular/core";
import { normalise } from "cikmov-js";

@Injectable({ providedIn: "root" })
export class PostcodeService {
  public normaliseInput(input: string) {
    return normalise(input);
  }
}
```

## Migration Notes From cikmov-php

API migration:
- PHP: `Cikmov::analyse(string $input, int $minConfidenceToApply = 85)`
- JS: `normalise(input, { correctionMode? })`

Result shape migration:
- PHP fields like `confidence`, `bestCandidate`, `alternatives`, and `appliedPostcode` are internalized.
- JS exposes a focused public contract: `normalised`, `isValid`, `isCorrected`, `errors`.

Threshold migration:
- default JS behavior maps to PHP default threshold (`85`) for parity
- `strict` and `lenient` are convenience threshold profiles

For design rationale and any divergence notes, see [`ADR.md`](./ADR.md).

## Versioning And Support Policy

- SemVer is used for releases.
- `0.x` is parity-hardening phase.
- `1.0.0` is targeted after parity and API stability are fully proven.
- Supported runtime baseline: Node.js `20+` and modern ES2020+ browser bundles.

## Development

```bash
npm install
npm run verify
```

`verify` runs lint, typecheck, tests, and build.
