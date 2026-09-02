# First Name Parser

[![CI](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Extract a greeting-safe first name from website **Full Name** form submissions.

First Name Parser is a zero-runtime-dependency TypeScript library for customer and lead follow-up workflows where a website visitor enters their full name and your application needs a safe first name for messaging such as `Hey Austin, thanks for reaching out...`.

```ts
import { getFirstName } from "first-name-parser";

getFirstName("Austin");                   // "Austin"
getFirstName("Austin P. Smith");          // "Austin"
getFirstName("Smith, Austin P.");         // undefined
getFirstName("Dr. Austin Smith Jr.");     // "Austin"
getFirstName("Austin Smith, Jr.");        // "Austin"
getFirstName("Austin Smith, MPH");        // "Austin"
getFirstName("Dr.Austin Smith");          // "Austin"
getFirstName("Mary-Jane Smith");          // "Mary-Jane"
getFirstName("J. Austin Smith");           // undefined
getFirstName("Dr. Smith");                 // undefined
```

## Install

```sh
npm install first-name-parser
```

## Why this parser exists

General-purpose person-name parsers try to identify every component of names from many cultures and input formats. This package solves a narrower messaging problem.

First Name Parser is intentionally optimized for a common website workflow: someone submits a `Full Name` field and the business later wants to send a natural follow-up such as `Hey Austin, thanks for reaching out...`.

The goal is to return a name only when it is safe to put directly into that greeting. If the parser cannot confidently determine a greeting name, `getFirstName()` returns `undefined` and the caller chooses its own fallback, such as omitting the name entirely.

Its core assumptions are explicit:

- `First [Middle...] Last` is the default order for an unpunctuated US form value.
- `Last, First [Middle...]` is recognized by `parseFirstName()` as a medium-confidence listing-order candidate, but `getFirstName()` abstains on that uncommon self-entered form shape.
- `First Last, Jr.` remains given-name-first; a suffix after a comma does not automatically flip the name order.
- A clear single submitted name is returned as the greeting name. A one-letter submission is treated as an initial. Ordinary two-letter alphabetic values such as `AJ`, `MJ`, `ML`, or `Li` remain usable because initials and short nicknames can be natural greeting names; capitalization alone does not lower confidence.
- Leading initials are preserved by `parseFirstName()` but withheld by `getFirstName()`. `J. Austin Smith` must not silently become `Austin`, because that can turn a middle name into the greeting name.
- Common titles, suffixes, credentials, post-nominal role acronyms, odd whitespace, apostrophes, and hyphenated names are handled without a general production name database.
- Obvious non-name values such as email addresses, URLs, placeholders, numeric/user-like submissions, and organization-shaped values are withheld.
- Multi-person submissions such as `John & Jane Smith`, `John Smith or Jane Smith`, or slash-separated names return the first listed given name. A clear selected first name remains `high` confidence; a selected initial such as `J.` remains `medium`.
- The parser never falls back to a likely surname just to produce a value. `Dr. Smith` returns `undefined` instead of producing an awkward greeting such as `Hey Smith`.

## API

### `getFirstName(fullName)`

Returns a high-confidence greeting name as `string | undefined`.

```ts
getFirstName("Jordan P. Smith");
// "Jordan"

getFirstName("J. Smith");
// undefined

const firstName = getFirstName(submission.fullName);
const message = firstName
  ? `Hey ${firstName}, thanks for reaching out...`
  : "Thanks for reaching out...";
```

### `parseFirstName(fullName)`

Returns the parser candidate plus structural metadata. Unlike `getFirstName()`, this lower-level API exposes medium- and low-confidence candidates so callers can intentionally apply a different policy.

```ts
parseFirstName("Smith, Jordan P.");
// {
//   firstName: "Jordan",
//   confidence: "medium",
//   format: "family-first"
// }
```

`confidence` is `high`, `medium`, or `low`. `format` is `empty`, `single`, `given-first`, or `family-first`.

For ordinary customer messaging, prefer `getFirstName()`. It only returns `high` confidence results. `parseFirstName()` is for callers that want to inspect or override that threshold.

Confidence describes how strongly the parser believes the candidate is safe as a greeting name. Multi-person submissions deliberately choose the first listed person, so another person in the field does not lower confidence by itself. `medium` commonly represents an initial-only candidate. `low` means the candidate is structurally ambiguous or the input does not contain a trustworthy greeting name.

## Behavior

| Full name | First name |
| --- | --- |
| `Austin` | `Austin` |
| `Austin Smith` | `Austin` |
| `Austin P. Smith` | `Austin` |
| `Dr. Austin P. Smith` | `Austin` |
| `Austin Smith Jr.` | `Austin` |
| `Austin Smith, Jr.` | `Austin` |
| `Austin Smith, MPH` | `Austin` |
| `Smith, Austin P.` | `undefined` |
| `Smith Jr., Austin P.` | `undefined` |
| `Smith, Jr. Austin` | `undefined` |
| `Dr.Austin Smith` | `Austin` |
| `Mary-Jane Smith` | `Mary-Jane` |
| `D'Andre Johnson` | `D'Andre` |
| `J. Austin Smith` | `undefined` |
| `John & Jane Smith` | `John` |
| `John Smith or Jane Smith` | `John` |
| `Dr. Smith` | `undefined` |
| `Example Auto Repair` | `undefined` |

## Accuracy and benchmarks

The parser was developed against two complementary fixture sets:

- **804,225 generated US name forms** using 53,615 first names and 156,621 last names from the 2020 US Census name datasets. The restored benchmark fingerprint-matches the historical **99.9669% exact / 99.9918% weighted** result on the historical parser. The current parser reaches **99.9745% candidate accuracy** on the same reconstructed cases; `getFirstName()` is intentionally stricter because it can abstain.
- **2,352 labeled person-name records** extracted from the `probablepeople` project test/training corpus. `parseFirstName().firstName` reaches **98.64% exact-match accuracy** on that noisier corpus.

These public corpora are useful regression checks for candidate extraction and name structure. They should not be read as `getFirstName()` greeting-safe accuracy: that helper intentionally returns `undefined` for medium/low-confidence candidates that labeled name corpora may still count as answers. The product contract is to choose a safe greeting name for real website follow-up and abstain when that name is not trustworthy. See [BENCHMARKS.md](BENCHMARKS.md) for methodology and limitations.

## Limitations

Human names are not universally inferable from a single string. Without punctuation, inputs such as `Taylor Jordan` can be structurally ambiguous. This parser deliberately uses the expected US website-form order instead of guessing from first-name or surname frequency.

This library is not trying to recover a person's complete legal given name. For greeting purposes, `Wen Kai Li -> Wen` can be a successful result even if `Wen Kai` is the person's full given name. If you must know the actual legal or complete given name, collect it explicitly.

It is not intended for international name-order detection, authoritative legal-name decomposition, identity verification, or extracting every name component. If your application needs full title/first/middle/last/suffix parsing, use a broader person-name library.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
npm run benchmark:public
```

The library has no runtime dependencies.

A private real-form benchmark can also be run with `npm run benchmark:private` when the ignored `benchmarks/private/` corpus and manually reviewed ground truth are present locally. Private client data and labels must never be committed or published.

## Attribution

Created and maintained by [Serbyte Development](https://www.serbyte.net/).
