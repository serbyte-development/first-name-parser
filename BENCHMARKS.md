# First Name Parser Benchmarks

The benchmarks measure one output only: whether the parser returns the expected first/given name from a full-name string.

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

Current result over **804,225** generated inputs:

| Metric | Result |
| --- | ---: |
| Exact-match accuracy | **99.9669%** |
| Population-weighted accuracy | **99.9918%** |

Population weighting uses the Census frequency count of the expected first name. It reduces the influence of extremely rare vocabulary collisions while still keeping them visible in the raw exact-match metric.

### What the Census benchmark proves

It is useful for regression testing across a large real US name vocabulary and for finding collisions between legitimate first names and words that also look like titles, suffixes, or credentials.

It does **not** prove that 99.99% of real contact-form submissions will parse correctly. The combinations and formatting variants are generated, not sampled from production form submissions.

## Labeled person-name corpus

A second benchmark uses **2,352** labeled person-name records extracted from the open-source `probablepeople` corpus. These inputs are substantially noisier and include unconventional ordering, malformed punctuation, household names, credentials, and records that do not resemble ordinary website form submissions.

Current exact-match accuracy: **98.64%**.

This corpus is useful as an adversarial check. Some labeled examples intentionally conflict with this parser's US website-form assumption, such as unpunctuated family-first strings. Those failures are retained rather than adding statistical name-order guessing that reduced accuracy on ordinary given-first inputs during development.

## Design findings from benchmarking

Several parser rules came directly from benchmark failures:

1. A comma cannot always mean `Last, First`. `Austin Smith, Jr.` is a common counterexample.
2. A one-token submission must remain usable as a first name.
3. All-caps input cannot by itself prove that a token such as `DO`, `MA`, or `JUNIOR` is a credential or suffix.
4. Title vocabularies collide with real first names. `Justice` is common enough in Census data to require ambiguity handling.
5. First-name/surname frequency models can improve unusual family-first inputs but also flip valid names such as `Martin ...` or `Curtis ...`. The expected form order is a stronger default for this project's target input.

## Sources

- US Census Bureau, 2020 Census frequently occurring first and last names: <https://www.census.gov/topics/population/genealogy/data/2020_surnames.html>
- `probablepeople`: <https://github.com/datamade/probablepeople>
