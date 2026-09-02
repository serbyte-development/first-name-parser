---
summary: "Orientation to the first-name-parser library, its customer follow-up greeting goal, public API, and project boundaries."
paths:
  - README.md
  - src/index.ts
  - package.json
---

# Project Overview

## What this is

Small zero-runtime-dependency TypeScript library for choosing a greeting-safe first name from a website `Full Name` field. The primary use case is customer/lead follow-up such as `Hey Austin, thanks for reaching out...`.

`getFirstName(fullName)` is the safe messaging API: it returns only `high`-confidence names and otherwise returns `undefined`. `parseFirstName(fullName)` exposes lower-confidence candidates and format metadata for callers that intentionally want a different policy.

Implementation lives in `src/index.ts`. Tests live in `test/index.test.ts`. Published package surface is generated into `dist/` by `tsup`.

## Project-wide boundaries

- Optimize for expected US website form input, not universal human-name decomposition.
- The primary evidence source is how people actually type their own names into website forms. Directory/database listing formats are secondary compatibility cases.
- Unpunctuated input defaults to `Given [Middle...] Family`.
- Commas can indicate `Family, Given`, but that listing form is only a `medium`-confidence candidate for self-entered website data. `getFirstName()` only stays high-confidence when comma structure is explained by recognized trailing metadata such as a suffix or credential.
- Preserve leading initials instead of guessing that the next token is the given name.
- Do not expose initials or low-confidence candidates through `getFirstName()`.
- Never promote a likely surname merely to avoid returning `undefined`; callers own fallback messaging.
- Production parsing deliberately avoids first-name/surname frequency databases.
- `dist/` is generated output. Change `src/index.ts`, then rebuild.

Open [Parser Behavior](parser-behavior.md) before changing extraction rules. Open [Benchmark Strategy](benchmark-strategy.md) before adding heuristics motivated by rare name shapes.
