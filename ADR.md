# ADR: cikmov-js Porting Decisions

Date: 2026-02-13
Status: Accepted

## Context

The goal is to port `jamiethompson/cikmov-php` to a framework-agnostic JS/TS package while preserving behavior and determinism.

## Decision 1: Port Rule Engine With Structural Parity

- Port `PostcodeRules` and `Analyser` semantics directly.
- Preserve:
  - compact/display normalization rules
  - outward/inward grammar
  - embedded area whitelist
  - AA9A special restrictions
  - candidate generation and penalty scoring
  - ambiguity penalty and alternative capping behavior

Rationale:
- minimizes heuristic drift
- keeps parity fixtures meaningful

## Decision 2: Public API Is Minimal And Typed

Expose one function:
- `normalise(input, options?)`

Output contract:
- `input`, `normalised`, `isValid`, `isCorrected`, `errors`

Rationale:
- aligns with requested API
- stable, framework-agnostic surface

## Decision 3: Result Immutability

- Returned result object is frozen with `Object.freeze`.
- `errors` array is independently frozen.

Rationale:
- runtime immutability complements TS readonly typing
- removes accidental post-processing mutation risk

## Decision 4: Packaging For Node + Browser Bundlers

- Build output includes ESM, CJS, and `.d.ts`.
- `exports` map is explicit.
- `sideEffects: false` is set.
- Runtime code has no Node-only dependencies.

Rationale:
- supports Node and frontend frameworks (Vue/React/Angular)
- predictable import behavior

## Decision 5: CorrectionMode Mapping

`cikmov-php` exposes numeric threshold (`minConfidenceToApply`, default `85`).

`cikmov-js` maps user-facing modes to thresholds:
- default (no mode): `85` (parity)
- `strict`: `95`
- `lenient`: `80`
- `none`: do not apply invalid-input corrections

Rationale:
- keeps default parity behavior
- offers minimal, non-speculative mode ergonomics

## Behavioral Delta Notes

Intentional, documented deltas from PHP public shape:
- PHP confidence/bestCandidate/alternatives are not part of public JS API.
- JS returns deterministic error codes for invalid outcomes.

No rule-engine divergence was introduced in this port.
