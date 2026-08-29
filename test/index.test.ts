import assert from "node:assert/strict";
import test from "node:test";

import { getFirstName, parseFirstName } from "../src/index.js";

const fixtures: Array<[string, string | undefined]> = [
  ["Austin", "Austin"],
  ["Austin Smith", "Austin"],
  ["Austin P. Smith", "Austin"],
  ["Austin Paul Smith", "Austin"],
  ["Dr. Austin P. Smith", "Austin"],
  ["Dr Austin P Smith", "Austin"],
  ["Dr. Smith", undefined],
  ["Mr Smith", undefined],
  ["Austin Smith Jr.", "Austin"],
  ["Austin Smith, Jr.", "Austin"],
  ["Austin P. Smith, Jr.", "Austin"],
  ["Austin Smith, M.D.", "Austin"],
  ["Austin Smith, Jr., M.D.", "Austin"],
  ["Austin Smith, MPH", "Austin"],
  ["Austin Smith, DPT", "Austin"],
  ["Austin Smith, APRN", "Austin"],
  ["Austin Smith, CRNA", "Austin"],
  ["Austin Smith, CFA", "Austin"],
  ["Austin Smith, CEO", "Austin"],
  ["AUSTIN SMITH, MPH", "AUSTIN"],
  ["Smith, Austin", undefined],
  ["Smith, J.R.", undefined],
  ["Smith, S.R.", undefined],
  ["Smith, Austin P.", undefined],
  ["Smith Jr., Austin P.", undefined],
  ["Smith, Jr. Austin", undefined],
  ["Smith, M.D. Austin", undefined],
  ["Smith, III Austin", undefined],
  ["Smith Jr., Junior", undefined],
  ["Smith Jr., MA", undefined],
  ["Smith, Austin, Jr.", undefined],
  ["Smith, Jr., Austin", undefined],
  ["Smith, BSN, RN, Austin", undefined],
  ["Austin P., Smith", undefined],
  ["  Austin\tP.\nSmith  ", "Austin"],
  ["Mary-Jane Smith", "Mary-Jane"],
  ["D'Andre Johnson", "D'Andre"],
  ["J. Austin Smith", undefined],
  ["Mr. and Mrs. Austin Smith", "Austin"],
  ["Mr & Mrs Austin Smith", "Austin"],
  ["State Senator Austin Smith", "Austin"],
  ["State Rep. Austin Smith", "Austin"],
  ["Doctor Austin Smith", "Austin"],
  ["Atty. Austin Smith", "Austin"],
  ["Insp. Austin Smith", "Austin"],
  ["Dr.Austin Smith", "Austin"],
  ["Smith, Dr.Austin", undefined],
  ["The Honorable Austin Smith", "Austin"],
  ["Do Smith", "Do"],
  ["Junior Smith", "Junior"],
  ["Smith, Junior", undefined],
  ["Smith, JUNIOR", undefined],
  ["Smith, Do", undefined],
  ["Smith, DO", undefined],
  ["Smith, BA", undefined],
  ["Smith, Miss", undefined],
  ["Justice Smith", undefined],
  ["Dr. Justice Smith", "Justice"],
  ["Judge Reinhold", undefined],
  ["Mister Smith", undefined],
  ["Miss Smith", undefined],
  ["John & Jane Smith", "John"],
  ["John and Jane Smith", "John"],
  ["Smith, John & Jane", undefined],
  ["John Smith, AIA", undefined],
  ["John Smith, FACP", undefined],
  ["John Smith, Trustee", undefined],
  ["De La Cruz, Juan", undefined],
  ["Mr. & Mrs. Smith", undefined],
  ["The Smith Family", undefined],
  ["Acme LLC", undefined],
  ["Example Auto Repair", undefined],
  ["Sample Motors", undefined],
  ["Example Kitchen And Bath", undefined],
  ["Gift Card 1234", undefined],
  ["Admin Example", undefined],
  ["Example Motorsports", undefined],
  ["Example Of Seattle", undefined],
  ["Example Motors Of Seattle", undefined],
  ["Example Church Of Seattle", undefined],
  ["Austin Company", "Austin"],
  ["Anonymous", undefined],
  ["R&R", undefined],
  ["USER123", undefined],
  ["Amy Smith / Jim Smith", "Amy"],
  ["john.smith@example.com", undefined],
  ["https://example.com/john-smith", undefined],
  ["12345", undefined],
  ["Ａｕｓｔｉｎ Smith", "Ａｕｓｔｉｎ"],
  ["Miss", undefined],
  ["Dr.", undefined],
  ["Jr.", undefined],
  ["MD", undefined],
  ["LLC", undefined],
  ["Family", undefined],
  ["Motors", undefined],
  ["Hi", "Hi"],
  ["AJ", "AJ"],
  ["aj", "aj"],
  ["MJ", "MJ"],
  ["ML", "ML"],
  ["jp", "jp"],
  ["CJ", "CJ"],
  ["AJ Smith", "AJ"],
  ["CJ Smith", "CJ"],
  ["LI WANG", "LI"],
  ["J", undefined],
  ["J-", undefined],
  ["J/", undefined],
  ["J!", undefined],
  ["J..", undefined],
  ["", undefined],
];

for (const [fullName, expected] of fixtures) {
  test(`${JSON.stringify(fullName)} -> ${JSON.stringify(expected)}`, () => {
    assert.equal(getFirstName(fullName), expected);
  });
}

test("single name is high confidence", () => {
  assert.deepEqual(parseFirstName("Austin"), {
    firstName: "Austin",
    confidence: "high",
    format: "single",
  });
});

test("single initial is withheld from greeting-safe helper", () => {
  assert.deepEqual(parseFirstName("J"), {
    firstName: "J",
    confidence: "medium",
    format: "single",
  });

  assert.equal(getFirstName("J"), undefined);
});

test("malformed one-letter mononyms stay below the greeting-safe threshold", () => {
  for (const value of ["J-", "J/", "J!", "J.."] as const) {
    assert.equal(parseFirstName(value).confidence, "medium");
    assert.equal(getFirstName(value), undefined);
  }
});

test("leading initial is preserved and marked medium confidence", () => {
  assert.deepEqual(parseFirstName("J. Austin Smith"), {
    firstName: "J.",
    confidence: "medium",
    format: "given-first",
  });

  assert.equal(getFirstName("J. Austin Smith"), undefined);
});

test("comma listing form is recognized", () => {
  assert.deepEqual(parseFirstName("Smith, Austin P."), {
    firstName: "Austin",
    confidence: "medium",
    format: "family-first",
  });

  assert.equal(getFirstName("Smith, Austin P."), undefined);
});

test("unrecognized comma tails never become greeting-safe", () => {
  for (const value of [
    "John Smith, AIA",
    "John Smith, FACP",
    "John Smith, Trustee",
  ] as const) {
    assert.equal(parseFirstName(value).confidence, "medium");
    assert.equal(getFirstName(value), undefined);
  }

  assert.equal(getFirstName("John Smith, Jr."), "John");
  assert.equal(getFirstName("John Smith, MD"), "John");
});

test("household-only input is low confidence", () => {
  assert.deepEqual(parseFirstName("Mr. & Mrs. Smith"), {
    firstName: "",
    confidence: "low",
    format: "given-first",
  });
});

test("title plus surname does not promote surname to first name", () => {
  assert.deepEqual(parseFirstName("Dr. Smith"), {
    firstName: "",
    confidence: "low",
    format: "given-first",
  });
});

test("title-looking given-name collision stays possible", () => {
  assert.deepEqual(parseFirstName("Mister Smith"), {
    firstName: "Mister",
    confidence: "low",
    format: "given-first",
  });

  assert.deepEqual(parseFirstName("Smith, Miss"), {
    firstName: "Miss",
    confidence: "low",
    format: "family-first",
  });
});

test("multi-person input confidently keeps the first listed given name", () => {
  assert.deepEqual(parseFirstName("John & Jane Smith"), {
    firstName: "John",
    confidence: "high",
    format: "given-first",
  });

  assert.deepEqual(parseFirstName("Smith, John & Jane"), {
    firstName: "John",
    confidence: "medium",
    format: "family-first",
  });

  assert.deepEqual(parseFirstName("Amy Smith / Jim Smith"), {
    firstName: "Amy",
    confidence: "high",
    format: "given-first",
  });

  assert.deepEqual(parseFirstName("John Smith or Jane Smith"), {
    firstName: "John",
    confidence: "high",
    format: "given-first",
  });

  assert.deepEqual(parseFirstName("J. Smith & Jane Smith"), {
    firstName: "J.",
    confidence: "medium",
    format: "given-first",
  });

  assert.equal(getFirstName("J. Smith & Jane Smith"), undefined);
});

test("non-person form junk is low confidence", () => {
  assert.deepEqual(parseFirstName("john.smith@example.com"), {
    firstName: "",
    confidence: "low",
    format: "given-first",
  });
});
