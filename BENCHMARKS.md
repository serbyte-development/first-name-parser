# First Name Parser Benchmarks

The product benchmark asks whether the parser can choose a name that is safe to use in a customer follow-up greeting such as `Hey Austin, ...`, while correctly abstaining when it cannot.

Public name corpora still measure exact first/given-name extraction because that is the ground truth they provide. Those are regression tools, not the full product definition.

Synthetic `Family, Given` cases are still useful for checking `parseFirstName()` candidate extraction, but the greeting helper intentionally withholds them at `medium` confidence because that format is rare in self-entered website forms and an unknown comma tail can also be a credential, role, or other metadata. Public greeting percentages that expect those synthetic candidates to be returned therefore are not product-accuracy metrics.

## Local benchmark assets

Benchmark data and scripts live under `benchmarks/` so reruns do not depend on temporary files:

- `benchmarks/public/` contains the Census source workbooks, extracted Census first-name vocabulary, probablepeople fixture, and public evaluation scripts.
- `benchmarks/private/` contains the private real-form corpus and full manually reviewed greeting ground truth. Disputed labels receive blind adjudication, unresolved rows are excluded as ambiguous, and the whole directory is Git-ignored and must not be published.

Run the public suites with `npm run benchmark:public` and the private real-form suite with `npm run benchmark:private`.

The historical generator source that produced the published 804,225-input Census figure was never committed. `benchmarks/public/eval-census-generated.ts` restores a 15-shape benchmark with exactly 804,225 generated cases, reconstructed from the original documentation and generic fixtures in commit `e6c69e9`. Running that reconstruction against the historical parser at commit `729c145` reproduces the published **99.9669% exact-match** and **99.9918% population-weighted** figures when rounded to four decimals. This is strong behavioral evidence that the reconstruction matches the lost benchmark, while still being labeled reconstructed rather than recovered source. `benchmarks/public/eval-census-vocabulary.ts` also preserves the six-shape Census vocabulary sweep used during the current parser hardening work.

## US Census generated fixture

The generated benchmark uses the US Census Bureau's 2020 frequently occurring names datasets:

- 53,615 first names occurring at least 100 times.
- 156,621 last names occurring at least 100 times.

Each first name is paired deterministically with Census last-name and middle-name values and rendered across common US form shapes, including:

- single names;
- first + last;
- middle names and middle initials;
- titles;
- generational suffixes;
- comma-separated suffixes and credentials;
- `Last, First` listing order;
- odd spaces, tabs, and newlines.

Historical parser result over **804,225** generated inputs, reproduced by the fingerprint-matched reconstruction:

| Metric | Result |
| --- | ---: |
| Exact-match accuracy | **99.9669%** |
| Population-weighted accuracy | **99.9918%** |

Current parser result on the same reconstructed benchmark:

| Metric | Candidate parser | Greeting-safe helper |
| --- | ---: | ---: |
| Exact-match accuracy | **99.9745%** | **99.9613%** |
| Population-weighted accuracy | **99.9894%** | **99.9819%** |

The greeting-safe result is intentionally stricter because `getFirstName()` withholds medium/low-confidence candidates instead of forcing a value into customer messaging.

Population weighting uses the Census frequency count of the expected first name. It reduces the influence of extremely rare vocabulary collisions while still keeping them visible in the raw exact-match metric.

### What the Census benchmark proves

It is useful for regression testing across a large real US name vocabulary and for finding collisions between legitimate first names and words that also look like titles, suffixes, or credentials.

It does **not** prove that 99.99% of real contact-form submissions will produce a safe greeting name. The combinations and formatting variants are generated, not sampled from production form submissions.

## Labeled person-name corpus

A second benchmark uses **2,352** labeled person-name records extracted from the open-source `probablepeople` corpus. These inputs are substantially noisier and include unconventional ordering, malformed punctuation, household names, credentials, and records that do not resemble ordinary website form submissions.

Current `parseFirstName().firstName` exact-match accuracy: **98.64%**.

This corpus is useful as an adversarial candidate-extraction check. Some labeled examples intentionally conflict with this parser's US website-form assumption, such as unpunctuated family-first strings. Those failures are retained rather than adding statistical name-order guessing that reduced accuracy on ordinary given-first inputs during development.

Do not treat the 98.64% figure as `getFirstName()` accuracy. The greeting-safe helper deliberately withholds medium/low-confidence candidates, including many initials that this labeled corpus expects as exact answers. In the product use case, that abstention lets the caller send a nameless fallback instead of risking an awkward greeting.

## Design findings from benchmarking

Several parser rules came directly from benchmark failures:

1. A comma cannot always mean `Last, First`. `Austin Smith, Jr.` is a common counterexample.
2. A one-token submission must remain usable as a first name.
3. All-caps input cannot by itself prove that a token such as `DO`, `MA`, or `JUNIOR` is a credential or suffix.
4. Title vocabularies collide with real first names. `Justice` is common enough in Census data to require ambiguity handling.
5. First-name/surname frequency models can improve unusual family-first inputs but also flip valid names such as `Martin ...` or `Curtis ...`. The expected form order is a stronger default for this project's target input.
6. Unknown or uncommon post-nominals are a systematic comma hazard: `First Last, MPH` must not be interpreted as `Last, First` just because the credential follows a comma.
7. A title followed only by a surname does not contain a recoverable first name. `Dr. Smith` should not become `Smith`.
8. Punctuation shape carries information. `J.R.` can be initials even though punctuation-stripped `jr` is also a generational suffix.
9. Real website form data contains businesses, placeholders, usernames, and other non-person values. Correct abstention is part of parser accuracy; maximizing non-empty output is not.
10. The greeting-safe helper must prefer `undefined` over a questionable candidate. A wrong greeting such as `Hey Smith` is worse than letting the caller send a nameless fallback message.
11. Initial-only candidates can remain available through `parseFirstName()` for advanced callers, while `getFirstName()` withholds them unless confidence is `high`.

## Sources

- US Census Bureau, 2020 Census frequently occurring first and last names: <https://www.census.gov/topics/population/genealogy/data/2020_names.html>
- `probablepeople`: <https://github.com/datamade/probablepeople>
