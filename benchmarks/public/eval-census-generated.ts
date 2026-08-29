import fs from "node:fs";
import { pathToFileURL } from "node:url";

type FirstNameRecord = {
  name: string;
  count: number;
};

type ParserModule = {
  getFirstName(fullName: string): string | undefined;
  parseFirstName(fullName: string): { firstName: string };
};

const firstNames = JSON.parse(
  fs.readFileSync(
    new URL("./census-first-name-records.json", import.meta.url),
    "utf8",
  ),
) as FirstNameRecord[];

const lastNames = JSON.parse(
  fs.readFileSync(new URL("./census-last-names.json", import.meta.url), "utf8"),
) as string[];

if (firstNames.length !== 53_615 || lastNames.length !== 156_621) {
  throw new Error(
    `Unexpected Census fixture size: ${firstNames.length} first names, ${lastNames.length} last names`,
  );
}

const parserPath =
  process.env.PARSER_PATH ?? new URL("../../src/index.ts", import.meta.url).pathname;
const parser = (await import(pathToFileURL(parserPath).href)) as ParserModule;

type ShapeContext = {
  first: string;
  middle: string;
  middleInitial: string;
  last: string;
};

// The original 804,225-case generator was never committed. These 15 shapes are
// reconstructed from the original README/BENCHMARKS descriptions and the
// generic fixtures in commit e6c69e9. The reconstruction was fingerprinted
// against the historical parser at commit 729c145 and reproduces the published
// 99.9669% exact / 99.9918% population-weighted results when rounded to four
// decimals. Keep this list and pairing stable so the benchmark remains
// comparable over time.
const shapes = [
  ["single", ({ first }: ShapeContext) => first],
  ["first-last", ({ first, last }: ShapeContext) => `${first} ${last}`],
  [
    "middle-initial",
    ({ first, middleInitial, last }: ShapeContext) =>
      `${first} ${middleInitial}. ${last}`,
  ],
  [
    "middle-name",
    ({ first, middle, last }: ShapeContext) => `${first} ${middle} ${last}`,
  ],
  [
    "dotted-title",
    ({ first, middleInitial, last }: ShapeContext) =>
      `Dr. ${first} ${middleInitial}. ${last}`,
  ],
  [
    "bare-title",
    ({ first, middleInitial, last }: ShapeContext) =>
      `Dr ${first} ${middleInitial} ${last}`,
  ],
  [
    "state-senator-title",
    ({ first, last }: ShapeContext) => `State Senator ${first} ${last}`,
  ],
  ["doctor-title", ({ first, last }: ShapeContext) => `Doctor ${first} ${last}`],
  ["suffix", ({ first, last }: ShapeContext) => `${first} ${last} Jr.`],
  ["comma-suffix", ({ first, last }: ShapeContext) => `${first} ${last}, Jr.`],
  [
    "credential",
    ({ first, last }: ShapeContext) => `${first} ${last}, M.D.`,
  ],
  ["family-first", ({ first, last }: ShapeContext) => `${last}, ${first}`],
  [
    "family-first-middle",
    ({ first, middleInitial, last }: ShapeContext) =>
      `${last}, ${first} ${middleInitial}.`,
  ],
  [
    "family-suffix-first",
    ({ first, middleInitial, last }: ShapeContext) =>
      `${last} Jr., ${first} ${middleInitial}.`,
  ],
  [
    "odd-whitespace",
    ({ first, middleInitial, last }: ShapeContext) =>
      `  ${first}\t${middleInitial}.\n${last}  `,
  ],
] as const;

if (shapes.length !== 15) {
  throw new Error(`Expected exactly 15 reconstructed shapes, got ${shapes.length}`);
}

let total = 0;
let candidateCorrect = 0;
let greetingCorrect = 0;
let weightedTotal = 0;
let weightedCandidateCorrect = 0;
let weightedGreetingCorrect = 0;

const byShape = shapes.map(([shape]) => ({
  shape,
  total: 0,
  candidateCorrect: 0,
  greetingCorrect: 0,
}));

for (let index = 0; index < firstNames.length; index += 1) {
  const record = firstNames[index];
  const middle = record.name;
  const context: ShapeContext = {
    first: record.name,
    middle,
    middleInitial: middle[0],
    last: lastNames[index % lastNames.length],
  };

  for (let shapeIndex = 0; shapeIndex < shapes.length; shapeIndex += 1) {
    const [, render] = shapes[shapeIndex];
    const input = render(context);
    const candidate = parser.parseFirstName(input).firstName;
    const greeting = parser.getFirstName(input);
    const candidateMatches = candidate === record.name;
    const greetingMatches = greeting === record.name;

    total += 1;
    weightedTotal += record.count;
    candidateCorrect += Number(candidateMatches);
    greetingCorrect += Number(greetingMatches);
    weightedCandidateCorrect += candidateMatches ? record.count : 0;
    weightedGreetingCorrect += greetingMatches ? record.count : 0;

    byShape[shapeIndex].total += 1;
    byShape[shapeIndex].candidateCorrect += Number(candidateMatches);
    byShape[shapeIndex].greetingCorrect += Number(greetingMatches);
  }
}

const expectedCases = 53_615 * 15;
if (total !== expectedCases || total !== 804_225) {
  throw new Error(`Expected 804,225 generated cases, got ${total.toLocaleString()}`);
}

const pct = (value: number, denominator: number) =>
  Number(((100 * value) / denominator).toFixed(4));

console.log(
  JSON.stringify(
    {
      provenance: {
        status: "fingerprint-matched reconstruction",
        basis:
          "Original docs plus generic fixtures from repository commit e6c69e9; original generator source was never committed.",
        deterministicPairing:
          "First name i uses Census last name i and the same-ranked Census first name as its synthetic middle-name fixture.",
        historicalVerification:
          "Against parser commit 729c145, this reconstruction rounds to the published 99.9669% exact and 99.9918% population-weighted candidate accuracy.",
      },
      firstNames: firstNames.length,
      lastNames: lastNames.length,
      shapes: shapes.length,
      total,
      candidate: {
        correct: candidateCorrect,
        exactPct: pct(candidateCorrect, total),
        populationWeightedPct: pct(weightedCandidateCorrect, weightedTotal),
      },
      greetingSafe: {
        correct: greetingCorrect,
        exactPct: pct(greetingCorrect, total),
        populationWeightedPct: pct(weightedGreetingCorrect, weightedTotal),
      },
      historicalCandidateReference: {
        exactPct: 99.9669,
        populationWeightedPct: 99.9918,
      },
      byShape: byShape.map((row) => ({
        ...row,
        candidatePct: pct(row.candidateCorrect, row.total),
        greetingPct: pct(row.greetingCorrect, row.total),
      })),
    },
    null,
    2,
  ),
);
