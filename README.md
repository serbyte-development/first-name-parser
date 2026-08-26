# First Name Parser

[![CI](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/Serbyte-Development/first-name-parser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A zero-runtime-dependency TypeScript parser for extracting the most likely first name from a US website **Full Name** field.

```ts
import { getFirstName } from "first-name-parser";

getFirstName("Austin");                   // "Austin"
getFirstName("Austin P. Smith");          // "Austin"
getFirstName("Smith, Austin P.");         // "Austin"
getFirstName("Dr. Austin Smith Jr.");     // "Austin"
getFirstName("Austin Smith, Jr.");        // "Austin"
getFirstName("Mary-Jane Smith");          // "Mary-Jane"
```

## Install

Until an npm package is published, install directly from GitHub:

```sh
npm install github:Serbyte-Development/first-name-parser
```

## Why this parser exists

General-purpose person-name parsers try to identify every component of names from many cultures and input formats. That is a harder problem than many applications actually have.

First Name Parser is intentionally optimized for one narrow case: a US website asks a person for their full name and the application later needs a useful first-name value.

Its core assumptions are explicit:

- `First [Middle...] Last` is the default order for an unpunctuated US form value.
- `Last, First [Middle...]` is recognized as listing order.
- `First Last, Jr.` remains given-name-first; a suffix after a comma does not automatically flip the name order.
- A single submitted name is returned as the first name.
- Leading initials are preserved. `J. Austin Smith` returns `J.`, because assuming `Austin` is the first name can silently turn a middle name into a first name.
- Common titles, suffixes, credentials, odd whitespace, apostrophes, and hyphenated names are handled without a production name database.

## API

### `getFirstName(fullName)`

Returns the best-effort first name as a string.

```ts
getFirstName("Jordan P. Smith");
// "Jordan"
```

### `parseFirstName(fullName)`

Returns the extracted value plus parser metadata.

```ts
parseFirstName("Smith, Jordan P.");
// {
//   firstName: "Jordan",
//   confidence: "high",
//   format: "family-first"
// }
```

`confidence` is `high`, `medium`, or `low`. `format` is `empty`, `single`, `given-first`, or `family-first`.

## Behavior

| Full name | First name |
| --- | --- |
| `Austin` | `Austin` |
| `Austin Smith` | `Austin` |
| `Austin P. Smith` | `Austin` |
| `Dr. Austin P. Smith` | `Austin` |
| `Austin Smith Jr.` | `Austin` |
| `Austin Smith, Jr.` | `Austin` |
| `Smith, Austin P.` | `Austin` |
| `Smith Jr., Austin P.` | `Austin` |
| `Mary-Jane Smith` | `Mary-Jane` |
| `D'Andre Johnson` | `D'Andre` |
| `J. Austin Smith` | `J.` |

## Accuracy and benchmarks

The parser was developed against two complementary fixture sets:

- **804,225 generated US name forms** using 53,615 first names and 156,621 last names from the 2020 US Census name datasets. The current parser reaches **99.9669% exact-match accuracy** and **99.9918% population-weighted accuracy** on this generated suite.
- **2,352 labeled person-name records** extracted from the `probablepeople` project test/training corpus. The parser reaches **98.64% exact-match accuracy** on that noisier corpus.

These numbers measure the specific task of extracting the labeled first/given name. The Census benchmark is synthetic and should not be interpreted as a measured real-world error rate. See [BENCHMARKS.md](BENCHMARKS.md) for methodology and limitations.

## Limitations

Human names are not universally inferable from a single string. Without punctuation, inputs such as `Taylor Jordan` can be structurally ambiguous. This parser deliberately uses the expected US website-form order instead of guessing from first-name or surname frequency.

It is not intended for international name-order detection, authoritative legal-name decomposition, identity verification, or extracting every name component. If your application needs full title/first/middle/last/suffix parsing, use a broader person-name library.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

The library has no runtime dependencies.

## Attribution

Developed & maintained by [Serbyte Development](https://www.serbyte.net/).
