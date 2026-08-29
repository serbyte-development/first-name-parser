import fs from "node:fs";

import { getFirstName, parseFirstName } from "../../src/index.js";

interface Row {
  i: number;
  input: string;
  expected: string;
}

const rows = JSON.parse(
  fs.readFileSync(new URL("./probablepeople-first.json", import.meta.url), "utf8"),
) as Row[];

let candidateCorrect = 0;
let greetingCorrect = 0;
let greetingWithheld = 0;

for (const row of rows) {
  const candidate = parseFirstName(row.input).firstName;
  const greeting = getFirstName(row.input);

  if (candidate === row.expected) {
    candidateCorrect += 1;
  }

  if (greeting === row.expected) {
    greetingCorrect += 1;
  }

  if (greeting === undefined) {
    greetingWithheld += 1;
  }
}

const pct = (value: number) => Number(((100 * value) / rows.length).toFixed(4));

console.log(
  JSON.stringify(
    {
      total: rows.length,
      candidateCorrect,
      candidatePct: pct(candidateCorrect),
      greetingCorrect,
      greetingPct: pct(greetingCorrect),
      greetingWithheld,
    },
    null,
    2,
  ),
);
