import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getFirstName as currentGetFirstName } from "../../src/index.js";

interface Row {
  i: number;
  input: string;
  expected: string;
}

const baselinePath = process.env.BASELINE_PARSER_PATH;

if (!baselinePath) {
  throw new Error(
    "Set BASELINE_PARSER_PATH to a built historical parser module before running this comparison.",
  );
}

const baselineModule = await import(
  pathToFileURL(path.resolve(baselinePath)).href
);

if (typeof baselineModule.getFirstName !== "function") {
  throw new Error("Baseline module must export getFirstName().");
}

const rows = JSON.parse(
  fs.readFileSync(new URL("./probablepeople-first.json", import.meta.url), "utf8"),
) as Row[];

let baselineCorrect = 0;
let currentCorrect = 0;
const improved: Row[] = [];
const regressed: Row[] = [];

for (const row of rows) {
  const baseline = baselineModule.getFirstName(row.input);
  const current = currentGetFirstName(row.input);
  const baselineMatches = baseline === row.expected;
  const currentMatches = current === row.expected;

  baselineCorrect += Number(baselineMatches);
  currentCorrect += Number(currentMatches);

  if (!baselineMatches && currentMatches) improved.push(row);
  if (baselineMatches && !currentMatches) regressed.push(row);
}

const pct = (value: number) => Number(((100 * value) / rows.length).toFixed(4));

console.log(
  JSON.stringify(
    {
      total: rows.length,
      baselineCorrect,
      baselinePct: pct(baselineCorrect),
      currentCorrect,
      currentPct: pct(currentCorrect),
      improved: improved.length,
      regressed: regressed.length,
    },
    null,
    2,
  ),
);
