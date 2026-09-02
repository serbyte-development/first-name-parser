# First Name Parser

[![CI](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Extract a greeting-safe **first name from a full name** submitted through a website form.

`first-name-parser` is a zero-runtime-dependency JavaScript and TypeScript library built for contact forms, lead forms, CRM submissions, and customer follow-up. It returns a first name when the input is structurally safe enough for a real message, and returns `undefined` when guessing would be risky.

```sh
npm install first-name-parser
```

```ts
import { getFirstName } from "first-name-parser";

getFirstName("Austin P. Smith");      // "Austin"
getFirstName("Dr. Austin Smith Jr."); // "Austin"
getFirstName("Mary-Jane Smith");     // "Mary-Jane"
getFirstName("Smith, Austin P.");     // undefined
getFirstName("J. Austin Smith");      // undefined
getFirstName("Dr. Smith");            // undefined
```

## Why use it?

- Built specifically for website `Full Name` fields and customer messaging.
- Avoids turning ambiguous input into awkward greetings.
- Zero runtime dependencies.
- TypeScript declarations included.
- Supports ESM and CommonJS.
- Handles titles, suffixes, credentials, initials, odd whitespace, apostrophes, hyphenated names, and common multi-person submissions.
- Rejects obvious non-name values such as emails, URLs, placeholders, and organization-shaped input.
- Benchmarked against large public name datasets.

If the parser cannot confidently determine a greeting name, `getFirstName()` returns `undefined` so your application can fall back naturally:

```ts
const firstName = getFirstName(submission.fullName);

const message = firstName
  ? `Hey ${firstName}, thanks for reaching out...`
  : "Thanks for reaching out...";
```

## API

### `getFirstName(fullName)`

Returns a high-confidence greeting name as `string | undefined`.

```ts
import { getFirstName } from "first-name-parser";

getFirstName("Jordan P. Smith"); // "Jordan"
getFirstName("J. Smith");        // undefined
```

### `parseFirstName(fullName)`

Returns the parser candidate plus confidence and detected format. Use this lower-level API when you want to inspect medium- or low-confidence results yourself.

```ts
import { parseFirstName } from "first-name-parser";

parseFirstName("Smith, Jordan P.");
// {
//   firstName: "Jordan",
//   confidence: "medium",
//   format: "family-first"
// }
```

`confidence` is `high`, `medium`, or `low`. `format` is `empty`, `single`, `given-first`, or `family-first`.

For normal customer messaging, prefer `getFirstName()`.

## What it handles

| Full name input | `getFirstName()` |
| --- | --- |
| `Austin Smith` | `Austin` |
| `Austin P. Smith` | `Austin` |
| `Dr. Austin Smith Jr.` | `Austin` |
| `Austin Smith, MPH` | `Austin` |
| `Mary-Jane Smith` | `Mary-Jane` |
| `D'Andre Johnson` | `D'Andre` |
| `John & Jane Smith` | `John` |
| `Smith, Austin P.` | `undefined` |
| `J. Austin Smith` | `undefined` |
| `Dr. Smith` | `undefined` |
| `Example Auto Repair` | `undefined` |

## Accuracy and benchmarks

The parser is tested against two complementary public fixture sets:

- **804,225 generated US name forms** using 53,615 first names and 156,621 last names from US Census name datasets. The current parser reaches **99.9745% candidate accuracy** on the reconstructed benchmark suite.
- **2,352 labeled person-name records** from the `probablepeople` test/training corpus. `parseFirstName().firstName` reaches **98.64% exact-match accuracy**.

These measure candidate extraction, not guaranteed greeting accuracy. `getFirstName()` is intentionally stricter and may return `undefined` for cases that a benchmark still considers parseable. See [BENCHMARKS.md](BENCHMARKS.md) for methodology and limitations.

## Scope and limitations

This parser is optimized for expected US website-form input where unpunctuated names usually follow `First [Middle...] Last` order. It does not use first-name or surname frequency databases to guess ambiguous names.

It is intended for practical first-name extraction and personalized customer messaging. It is not intended for universal international name-order detection, legal-name decomposition, identity verification, or extracting every possible name component.

If you need title, first, middle, last, suffix, and other components from arbitrary human names, use a broader full-name parser.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
npm run benchmark:public
```

The library has no runtime dependencies.

## Attribution

Created and maintained by [Serbyte Development](https://www.serbyte.net/).
