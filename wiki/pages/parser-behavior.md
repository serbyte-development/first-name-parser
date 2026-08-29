---
summary: "How normalization, token classification, comma handling, title stripping, ambiguity guards, confidence, and format detection work."
paths:
  - src/index.ts
  - test/index.test.ts
read_more:
  - pages/benchmark-strategy.md
  - pages/build-test-package.md
---

# Parser Behavior

## Entry flow

`getFirstName()` delegates to `parseFirstName()` and returns the candidate only when confidence is `high`. Otherwise it returns `undefined`. This is the recommended API for customer messaging.

`parseFirstName()`:
1. NFC-normalizes returned text, splits glued known dotted titles such as `Dr.Austin`, trims/collapses whitespace, and normalizes spaces around commas. `tokenKey()` uses NFKC only as a comparison shadow so compatibility normalization does not rewrite returned names.
2. Returns `{ firstName: "", confidence: "low", format: "empty" }` for empty input.
3. Rejects obvious non-name values such as email/URL input, digit-bearing first tokens, placeholders, and single-token ampersand values at low confidence.
4. Splits non-empty comma segments. Multiple segments route to `parseCommaName()`; otherwise route to `parseGivenFirst()`.

## Given-first path

`parseGivenFirst()` tokenizes and cleans surrounding punctuation.

- One token is preserved as a `single` candidate. A one-letter token is `medium` because it is structurally indistinguishable from an initial. Ordinary two-letter alphabetic values remain `high` because short nicknames and initial-style preferred names can be natural greetings; casing alone does not lower confidence. Title, suffix/credential, household, and strong organization-only tokens are `low`; other longer mononyms remain `high`.
- Leading title words/phrases are stripped. Unknown leading abbreviations ending in one period, such as `Insp.`, are treated structurally as titles; initials and dotted initial groups are excluded.
- If stripping a real title leaves only one token, do not promote that likely surname to first name: `Dr. Smith` returns empty/low.
- Two-token title-word collisions attested as US given names remain possible first names at low confidence instead of silently disappearing.
- After a stripped title, `and` / `&` can mark household-style input and lowers confidence.
- Multi-person `and` / `&` / `or` / slash-separated values keep the first listed given-name candidate. The separator does not lower confidence by itself: a clear first name stays `high`, while an initial stays `medium`.
- Household labels (`... Family`, `... Household`) return empty/low.
- Organization detection uses legal suffixes plus a conservative vocabulary of strong business-only terms checked against the Census first/last-name vocabularies. It also catches strong shapes such as `Gift Card`, `Kitchen ... Bath`, early `of` organization phrases, and `Church Of`.
- Do not broaden organization vocabulary just to catch a private brand or location string. Some business-looking words are also real surnames; prefer a known residual false positive over silently rejecting people.
- Tail suffixes, credentials, and common role acronyms are removed while at least one other token remains.
- Remaining first token is returned. A leading initial gives `medium`; a clear name stays `high`, including household/multi-person forms where the first-listed greeting candidate is structurally clear.

## Comma path

`parseCommaName()` distinguishes trailing metadata from listing order.

The product context matters here: this parser is for people typing their own name into a website form. `Family, Given` is common in directories and stored/displayed records, but is not treated as a normal self-entry pattern. The parser preserves such a candidate for lower-level callers while the greeting helper abstains.

- If every right-side segment consists of tail tokens, treat multi-token left side as given-first: `Austin Smith, Jr.`.
- A one-token left side followed only by strong tail tokens is treated as mononym + suffix with `medium` confidence.
- Ambiguous tail words such as `Junior`, `Do`, and `MA` block some suffix shortcuts unless punctuation gives stronger evidence.
- Bare `BA` is also guarded because Census data contains `BA` as a first name.
- `Austin P., Smith` is a targeted malformed-form recovery: left side ends in an initial, so use given-first with `medium` confidence.
- Otherwise scan right-side segments as listing form, stripping leading strong suffix/credential tokens inside mixed segments. This preserves a candidate for `parseFirstName()`, but the listing-form candidate is `medium` confidence and is withheld by `getFirstName()`.
- Dotted initial groups such as `J.R.` are not collapsed into the `Jr.` suffix meaning.
- First surviving token becomes the family-first candidate with `medium` confidence. Unknown comma tails therefore cannot become greeting-safe solely because they appear after a comma.
- If nothing usable survives on the right, parse the left side and force `low` confidence.

## Vocabulary and ambiguity guards

`TITLE_WORDS`, `SUFFIXES`, `CREDENTIALS`, and `POST_NOMINAL_ROLES` are lexical heuristics. Changes can create collisions with legitimate given names.

Important guards:
- `Justice` and `Judge` are ambiguous titles. Treat as titles only when punctuated like `Justice.` / `Judge.`.
- A separate Census-attested collision set protects title-looking words in structurally underdetermined two-token inputs.
- `AMBIGUOUS_TAIL_WORDS` contains terms valid as suffixes/credentials and attested as given names.
- `isStrongTailToken()` requires punctuation for ambiguous tail words. Case alone is not evidence because all-caps submissions are common.
- Credential expansion is explicit rather than inferred from uppercase shape; all-caps real names must remain possible.
- Organization words are collision-checked before inclusion. Avoid broad terms such as `company`, `service`, or `police` that occur as Census surnames.
- `tokenKey()` compatibility-normalizes, removes punctuation, and lowercases using `en-US`; original NFC token spelling is returned to callers.

## Public metadata

`format`: `empty`, `single`, `given-first`, `family-first`.

`confidence`: `high`, `medium`, `low`. This describes confidence that the candidate is safe to use as a greeting name, not whether the parser selected the preferred person from a multi-person submission. Multi-person input follows a deterministic first-listed-person policy. This is structural parser confidence, not a probability score.

`getFirstName()` is deliberately stricter than `parseFirstName()`: only `high` confidence crosses the greeting-safe boundary. Medium initial candidates and low-confidence lexical collisions stay available in the detailed parse result but become `undefined` through the convenience helper.

When changing behavior, add focused fixtures in `test/index.test.ts` and check benchmark implications before broadening lexical rules.
