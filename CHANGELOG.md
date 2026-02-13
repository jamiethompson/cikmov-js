# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.1.0] - 2026-02-13

### Added
- Initial `cikmov-js` release with TypeScript-first API:
  - `normalise(input, options?)`
  - immutable `NormaliseResult`
- Deterministic UK postcode rule engine ported from `cikmov-php`:
  - compact/display normalization
  - grammar validation (outward/inward)
  - embedded area whitelist
  - AA9A special-case rules
  - candidate generation and scoring parity behavior
- Correction mode support:
  - default parity behavior (threshold `85`)
  - `strict`, `lenient`, `none`
- Build outputs:
  - ESM
  - CJS
  - `.d.ts`
- Test coverage:
  - fixture-driven parity tests
  - rule/unit tests
  - edge cases
  - Vue/React/Angular smoke tests
- CI quality gate workflow (lint, typecheck, test, build)
- Documentation:
  - README
  - ADR
  - changelog
