---
summary: "Why benchmarks constrain parser heuristics, what the two benchmark corpora measure, and which design findings came from failures."
paths:
  - BENCHMARKS.md
  - README.md
  - src/index.ts
read_more:
  - pages/parser-behavior.md
  - pages/build-test-package.md
---

# Benchmark Strategy

## Purpose

The product target is a safe customer-follow-up greeting name. Public labeled corpora measure exact first/given-name extraction because that is the label they provide, while the private real-form corpus is used to evaluate greeting usefulness and correct abstention.

## Corpus roles

`BENCHMARKS.md` documents two public candidate-extraction suites:

- Generated US Census forms: 804,225 inputs from 2020 Census first/last-name vocabularies rendered into 15 common US form shapes. The lost generator was reconstructed and fingerprint-matched against historical parser commit `729c145`, reproducing the published 99.9669% exact / 99.9918% weighted figures when rounded. Useful for large-vocabulary regression and collision detection.
- `probablepeople` labeled corpus: 2,352 noisier records with unconventional order, punctuation, households, and credentials. Useful as an adversarial check.

Durable public benchmark assets live under `benchmarks/public/`. Run `npm run benchmark:public` for probablepeople, the saved six-shape Census vocabulary sweep, and the fingerprint-matched reconstructed 804,225-case Census generator. The original generator source file is still unavailable, so preserve the reconstruction provenance instead of presenting it as the recovered original.

Published benchmark figures in README/BENCHMARKS describe `parseFirstName().firstName` candidate extraction, not the stricter `getFirstName()` greeting-safe helper. They are separate from `npm test`; rerun the relevant benchmark command before updating them.

The reconstructed Census generator now makes the 804,225-case suite locally rerunnable. The current parser scores 99.9745% candidate exact-match accuracy on that suite. Historical 99.9669% / 99.9918% figures remain as the fingerprint used to validate the reconstruction against commit `729c145`.

For heuristic changes, compare against the 2,352-record `probablepeople` extraction corpus before accepting new edge-case rules. The 2026-08-28 messy-form hardening pass preserved the existing 2,320/2,352 exact matches while adding targeted local regressions for failure shapes absent from that corpus.

## Private real-form corpus

A private corpus of real website form submissions is the highest-priority product regression source when it conflicts with synthetic edge cases. Its question is practical: can the output be placed after `Hey` in a follow-up without sounding obviously wrong? Keep its raw contents outside Git and never copy client names into tests, docs, logs, or wiki pages.

The local ignored `benchmarks/private/` directory stores the corpus, corpus hash, exact manually reviewed greeting labels, adjudication metadata, and benchmark code. Every row is labeled with the exact expected greeting or `null`; disputed labels receive additional blind review and unresolved rows are excluded as ambiguous. `npm run benchmark:private` scores exact `getFirstName()` output against that ground truth. Coverage remains a separate diagnostic, not an accuracy metric.

## Durable design findings

- A comma alone cannot mean family-first because `First Last, Jr.` is common.
- Single-token submissions stay usable as first names.
- All-caps spelling cannot establish credential/suffix status.
- Title and credential vocabularies overlap legitimate given names.
- Census vocabulary is useful for finding lexical collisions even when no Census name-frequency model ships in production.
- Unknown post-nominals after commas and suffix/credential tokens mixed into the same comma segment are distinct failure classes from ordinary `Last, First` parsing.
- Statistical first-name/surname order guessing harmed expected US form-order behavior, so production uses structural form assumptions instead.
- Real form corpora contain non-person values. Count correct abstention separately from first-name recovery so invalid input does not pressure the parser into confident garbage output.
- `getFirstName()` should abstain on medium/low confidence and let callers choose fallback messaging. Returning `undefined` is a successful product outcome when the alternative is a questionable greeting name.

Before adding a title, suffix, credential, or order heuristic, look for vocabulary collision risk and preserve targeted ambiguity handling when needed.
