import fs from "node:fs";

import { getFirstName, parseFirstName } from "../../src/index.js";

const names = (JSON.parse(
  fs.readFileSync(new URL("./census-first-names.json", import.meta.url), "utf8"),
) as string[]).filter((name) => name !== "ALL OTHER NAMES");

const shapes = [
  ["given-first", (name: string) => `${name} Smith`],
  ["family-first", (name: string) => `Smith, ${name}`],
  ["post-nominal", (name: string) => `${name} Smith, MPH`],
  ["mixed-comma-suffix", (name: string) => `Smith, Jr. ${name}`],
  ["unknown-dotted-title", (name: string) => `Insp. ${name} Smith`],
  ["glued-title", (name: string) => `Dr.${name} Smith`],
] as const;

const results = shapes.map(([shape, render]) => {
  let candidateCorrect = 0;
  let greetingCorrect = 0;
  let greetingWithheld = 0;

  for (const expected of names) {
    const input = render(expected);
    const candidate = parseFirstName(input).firstName;
    const greeting = getFirstName(input);

    candidateCorrect += Number(candidate === expected);
    greetingCorrect += Number(greeting === expected);
    greetingWithheld += Number(greeting === undefined);
  }

  const pct = (value: number) =>
    Number(((100 * value) / names.length).toFixed(4));

  return {
    shape,
    total: names.length,
    candidateCorrect,
    candidatePct: pct(candidateCorrect),
    greetingCorrect,
    greetingPct: pct(greetingCorrect),
    greetingWithheld,
  };
});

console.log(JSON.stringify({ censusFirstNames: names.length, results }, null, 2));
