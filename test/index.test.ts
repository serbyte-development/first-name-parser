import assert from "node:assert/strict";
import test from "node:test";

import { getFirstName, parseFirstName } from "../src/index.js";

const fixtures: Array<[string, string]> = [
  ["Austin", "Austin"],
  ["Austin Smith", "Austin"],
  ["Austin P. Smith", "Austin"],
  ["Austin Paul Smith", "Austin"],
  ["Dr. Austin P. Smith", "Austin"],
  ["Dr Austin P Smith", "Austin"],
  ["Austin Smith Jr.", "Austin"],
  ["Austin Smith, Jr.", "Austin"],
  ["Austin P. Smith, Jr.", "Austin"],
  ["Austin Smith, M.D.", "Austin"],
  ["Austin Smith, Jr., M.D.", "Austin"],
  ["Smith, Austin", "Austin"],
  ["Smith, Austin P.", "Austin"],
  ["Smith Jr., Austin P.", "Austin"],
  ["Smith Jr., Junior", "Junior"],
  ["Smith Jr., MA", "MA"],
  ["Smith, Austin, Jr.", "Austin"],
  ["Smith, Jr., Austin", "Austin"],
  ["Smith, BSN, RN, Austin", "Austin"],
  ["Austin P., Smith", "Austin"],
  ["  Austin\tP.\nSmith  ", "Austin"],
  ["Mary-Jane Smith", "Mary-Jane"],
  ["D'Andre Johnson", "D'Andre"],
  ["J. Austin Smith", "J."],
  ["Mr. and Mrs. Austin Smith", "Austin"],
  ["Mr & Mrs Austin Smith", "Austin"],
  ["State Senator Austin Smith", "Austin"],
  ["Doctor Austin Smith", "Austin"],
  ["Do Smith", "Do"],
  ["Junior Smith", "Junior"],
  ["Smith, Junior", "Junior"],
  ["Smith, JUNIOR", "JUNIOR"],
  ["Smith, Do", "Do"],
  ["Smith, DO", "DO"],
  ["Justice Smith", "Justice"],
  ["Dr. Justice Smith", "Justice"],
  ["Miss", "Miss"],
  ["", ""],
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

test("leading initial is preserved and marked medium confidence", () => {
  assert.deepEqual(parseFirstName("J. Austin Smith"), {
    firstName: "J.",
    confidence: "medium",
    format: "given-first",
  });
});

test("comma listing form is recognized", () => {
  assert.deepEqual(parseFirstName("Smith, Austin P."), {
    firstName: "Austin",
    confidence: "high",
    format: "family-first",
  });
});
