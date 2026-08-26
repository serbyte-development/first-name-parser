export type FirstNameConfidence = "high" | "medium" | "low";

export type FirstNameFormat =
  | "empty"
  | "single"
  | "given-first"
  | "family-first";

export interface FirstNameParseResult {
  firstName: string;
  confidence: FirstNameConfidence;
  format: FirstNameFormat;
}

/**
 * Extracts the likely given/first name from a US website "Full Name" field.
 *
 * Assumptions are intentionally narrow:
 * - no comma: Given [Middle...] Family
 * - comma listing form: Family, Given [Middle...]
 * - trailing comma segments made only of suffixes/credentials do not flip order
 * - a one-token name is itself the first name
 * - leading initials are preserved rather than silently replaced by a middle name
 *
 * This parser does not use a first-name/surname dictionary in production. For a
 * US website form, the field's expected order is stronger evidence than a
 * population-frequency guess, especially for names such as Jordan Taylor.
 */

const TITLE_WORDS = new Set([
  "mr",
  "mister",
  "mrs",
  "ms",
  "miss",
  "mx",
  "dr",
  "doctor",
  "prof",
  "professor",
  "rev",
  "reverend",
  "fr",
  "father",
  "pastor",
  "rabbi",
  "imam",
  "judge",
  "justice",
  "hon",
  "honorable",
  "sir",
  "dame",
  "senator",
  "representative",
  "congressman",
  "congresswoman",
  "governor",
  "mayor",
  "president",
  "capt",
  "captain",
  "col",
  "colonel",
  "gen",
  "general",
  "lt",
  "lieutenant",
  "sgt",
  "sergeant",
]);

const TITLE_PHRASES = [
  ["state", "representative"],
  ["state", "senator"],
] as const;

// Some honorific-looking words are also established US given names. Treating
// them as titles without punctuation causes avoidable false positives. Justice
// is especially common in Census first-name data.
const AMBIGUOUS_TITLE_WORDS = new Set(["justice"]);

const SUFFIXES = new Set([
  "jr",
  "junior",
  "sr",
  "senior",
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "2nd",
  "3rd",
  "4th",
  "5th",
]);

const CREDENTIALS = new Set([
  "md",
  "do",
  "phd",
  "psyd",
  "edd",
  "jd",
  "esq",
  "esquire",
  "dds",
  "dmd",
  "rn",
  "np",
  "pa",
  "pac",
  "cpa",
  "pe",
  "mba",
  "ma",
  "ms",
  "bs",
  "ba",
  "bsn",
  "msn",
  "msw",
  "lcsw",
  "lmft",
  "lncc",
  "dvm",
  "od",
  "dc",
]);

// These are valid tail terms but are also attested US first names. When the
// comma structure is otherwise ambiguous, avoid assuming they are suffixes or
// credentials solely from the word itself.
const AMBIGUOUS_TAIL_WORDS = new Set([
  "junior",
  "do",
  "pa",
  "pe",
  "od",
  "edd",
  "ma",
]);

const CONJUNCTIONS = new Set(["and", "&"]);

export function getFirstName(fullName: string): string {
  return parseFirstName(fullName).firstName;
}

export function parseFirstName(fullName: string): FirstNameParseResult {
  const normalized = normalizeFullName(fullName);

  if (!normalized) {
    return result("", "low", "empty");
  }

  const commaSegments = normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (commaSegments.length > 1) {
    return parseCommaName(commaSegments);
  }

  return parseGivenFirst(normalized);
}

function parseGivenFirst(value: string): FirstNameParseResult {
  const rawTokens = tokenize(value);

  // A required full-name field still sometimes receives a mononym. Preserve it,
  // even if the token happens to look like a title or suffix.
  if (rawTokens.length === 1) {
    return result(rawTokens[0], "high", "single");
  }

  const stripped = stripLeadingTitles(rawTokens);
  const tokens = [...stripped.tokens];

  while (tokens.length > 1 && isTailToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  if (!tokens.length) {
    return result("", "low", "given-first");
  }

  const firstName = tokens[0];
  const confidence: FirstNameConfidence =
    isInitial(firstName) || stripped.household ? "medium" : "high";

  return result(firstName, confidence, "given-first");
}

function parseCommaName(segments: string[]): FirstNameParseResult {
  const leftTokens = tokenize(segments[0]);
  const rightSegments = segments.slice(1).map(tokenize);

  const everyRightSegmentIsTail = rightSegments.every(
    (tokens) => tokens.length > 0 && tokens.every(isTailToken),
  );

  const leftEndsWithSuffix =
    leftTokens.length > 1 && isSuffixToken(leftTokens[leftTokens.length - 1]);
  const rightStartsWithAmbiguousTail =
    rightSegments[0]?.[0] !== undefined &&
    AMBIGUOUS_TAIL_WORDS.has(tokenKey(rightSegments[0][0]));

  if (
    everyRightSegmentIsTail &&
    !(leftEndsWithSuffix && rightStartsWithAmbiguousTail)
  ) {
    // Austin Smith, Jr.
    // Austin P. Smith, Jr., M.D.
    if (leftTokens.length > 1) {
      return parseGivenFirst(segments[0]);
    }

    // Austin, Jr. is much more plausibly a mononym + suffix than a family name
    // followed by a given name of "Jr.". For ambiguous spelled-out words such
    // as "Junior" or "Do", however, preserve the possibility that the right
    // side is an actual given name: Smith, Junior / Smith, Do.
    const flattenedRight = rightSegments.flat();
    if (
      flattenedRight.length > 0 &&
      flattenedRight.every(isStrongTailToken)
    ) {
      const parsed = parseGivenFirst(segments[0]);
      return {
        ...parsed,
        confidence: "medium",
      };
    }
  }

  // A common malformed-form typo is "Austin P., Smith". A two-token left side
  // ending in an initial is stronger evidence for Given Middle, Family than for
  // a multiword family name followed by a given name.
  if (
    segments.length === 2 &&
    leftTokens.length >= 2 &&
    isInitial(leftTokens[leftTokens.length - 1]) &&
    rightSegments[0]?.length === 1 &&
    !isTailToken(rightSegments[0][0])
  ) {
    const parsed = parseGivenFirst(segments[0]);
    return {
      ...parsed,
      confidence: "medium",
    };
  }

  // Listing form. Skip standalone suffix/credential segments so inputs such as
  // "Smith, Jr., Austin" and "Smith, BSN, RN, Austin" can still recover Austin.
  for (const segmentTokens of rightSegments) {
    const stripped = stripLeadingTitles(segmentTokens);
    const tokens = stripped.tokens;

    if (!tokens.length || tokens.every(isStrongTailToken)) {
      continue;
    }

    const firstName = tokens[0];
    const confidence: FirstNameConfidence =
      isInitial(firstName) || stripped.household ? "medium" : "high";

    return result(firstName, confidence, "family-first");
  }

  // Nothing clearly name-like survived on the right. Returning the left-side
  // token is safer for a contact-form greeting than returning "Jr." or "M.D.".
  const fallback = parseGivenFirst(segments[0]);
  return {
    ...fallback,
    confidence: "low",
  };
}

function stripLeadingTitles(tokens: string[]): {
  tokens: string[];
  household: boolean;
} {
  const output = [...tokens];
  let removedTitle = false;
  let household = false;

  while (output.length) {
    let removed = false;

    for (const phrase of TITLE_PHRASES) {
      if (
        output.length >= phrase.length &&
        phrase.every((word, index) => tokenKey(output[index]) === word)
      ) {
        output.splice(0, phrase.length);
        removedTitle = true;
        removed = true;
        break;
      }
    }

    if (removed) {
      continue;
    }

    if (isTitleToken(output[0])) {
      output.shift();
      removedTitle = true;
      continue;
    }

    // Mr. and Mrs. Austin Smith
    // Mr. & Mrs. Austin Smith
    // Mr. and Austin Smith
    if (removedTitle && isConjunction(output[0])) {
      output.shift();
      household = true;
      continue;
    }

    break;
  }

  return { tokens: output, household };
}

function normalizeFullName(value: string): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\s*,\s*/gu, ", ");
}

function tokenize(value: string): string[] {
  return value
    .trim()
    .split(/\s+/u)
    .map(cleanToken)
    .filter(Boolean);
}

function cleanToken(token: string): string {
  return token
    .trim()
    .replace(/^[()[\]{}"'“”‘’]+/u, "")
    .replace(/[()[\]{}"'“”‘’]+$/u, "")
    .replace(/,+$/u, "");
}

function tokenKey(token: string): string {
  return token
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function isTitleToken(token: string): boolean {
  const key = tokenKey(token);

  if (!TITLE_WORDS.has(key)) {
    return false;
  }

  if (AMBIGUOUS_TITLE_WORDS.has(key)) {
    return token.includes(".");
  }

  return true;
}

function isConjunction(token: string): boolean {
  return token === "&" || CONJUNCTIONS.has(tokenKey(token));
}

function isSuffixToken(token: string): boolean {
  return SUFFIXES.has(tokenKey(token));
}

function isCredentialToken(token: string): boolean {
  return CREDENTIALS.has(tokenKey(token));
}

function isTailToken(token: string): boolean {
  return isSuffixToken(token) || isCredentialToken(token);
}

function isStrongTailToken(token: string): boolean {
  const key = tokenKey(token);

  if (!isTailToken(token)) {
    return false;
  }

  if (!AMBIGUOUS_TAIL_WORDS.has(key)) {
    return true;
  }

  // Periods are stronger credential evidence. Case is deliberately ignored:
  // users often submit whole names in all caps, so "DO" or "JUNIOR" must not
  // become a credential/suffix solely because of capitalization.
  return token.includes(".");
}

function isInitial(token: string): boolean {
  return /^\p{L}\.?$/u.test(token);
}

function result(
  firstName: string,
  confidence: FirstNameConfidence,
  format: FirstNameFormat,
): FirstNameParseResult {
  return { firstName, confidence, format };
}
