# Benchmarks

Benchmark assets live with the project so the evaluation setup survives machine restarts and does not depend on `/tmp`.

## Public

`public/` contains reproducible assets derived from public sources:

- `probablepeople-first.json`: labeled first-name rows extracted from the open-source `probablepeople` corpus.
- `census-first-names.json`: first-name vocabulary extracted from the 2020 US Census workbook.
- `census-first-name-records.json`: first-name vocabulary plus Census frequency counts used for population-weighted scoring.
- `census-last-names.json`: extracted Census last-name vocabulary used for deterministic generated-name pairing.
- `Names2020_FirstNames_Sex.xlsx` and `Names2020_LastNames.xlsx`: source Census workbooks used during collision and vocabulary analysis.
- `eval-probablepeople.ts`: candidate-parser and greeting-safe evaluation over the probablepeople fixture.
- `eval-census-vocabulary.ts`: the six-shape Census vocabulary sweep used during parser hardening.
- `eval-census-generated.ts`: reconstructed 15-shape Census benchmark with exactly 804,225 generated cases.
- `extract-census-fixtures.py`: regenerates compact first-name/count and last-name JSON fixtures from the official XLSX workbooks using only Python's standard library.
- `eval-baseline-comparison.ts`: optional comparison against a historical built parser supplied with `BASELINE_PARSER_PATH`.

Run:

```sh
npm run benchmark:public
```

The original historical 804,225-input Census generator that produced the published README figure was not present in repository history. `eval-census-generated.ts` reconstructs its 15 shape families from the original documentation and generic fixtures in commit `e6c69e9`. The reconstruction was fingerprinted against the historical parser at commit `729c145` and reproduces the published **99.9669% exact** and **99.9918% population-weighted** results when rounded to four decimals. The source is still labeled reconstructed because the original generator file itself was never recovered.

To regenerate the derived Census JSON fixtures and run the restored benchmark:

```sh
npm run benchmark:census:extract
npm run benchmark:census:generated
```

## Private

`private/` contains real client form submissions and full manual greeting ground truth. Every corpus row has an exact expected greeting string or `null`; disputed rows are blind-adjudicated and unresolved rows are marked ambiguous and excluded from accuracy. The entire directory is intentionally ignored by Git and must never be published.

Run locally:

```sh
npm run benchmark:private
```

The private benchmark verifies the corpus SHA-256 before scoring so ground truth cannot silently drift onto a different dataset. Its accuracy metric is exact `getFirstName()` output agreement against the manually reviewed labels. Coverage statistics are reported separately and are not accuracy metrics.
