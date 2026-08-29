export type FirstNameConfidence = "high" | "medium" | "low";

export type FirstNameFormat =
  | "empty"
  | "single"
  | "given-first"
  | "family-first";

export interface FirstNameParseResult {
  /** Raw parser candidate. Check confidence before using it directly. */
  firstName: string;
  /** Structural confidence that firstName is safe as a greeting name. */
  confidence: FirstNameConfidence;
  format: FirstNameFormat;
}

/**
 * Extracts a greeting-safe first name from a US website "Full Name" field.
 *
 * Assumptions are intentionally narrow:
 * - no comma: Given [Middle...] Family
 * - comma listing form: Family, Given [Middle...]
 * - trailing comma segments made only of suffixes/credentials do not flip order
 * - a one-token name is itself the first name
 * - leading initials are preserved in parseFirstName() rather than silently
 *   replaced by a middle name
 *
 * This parser does not use a first-name/surname dictionary in production. For a
 * US website form, the field's expected order is stronger evidence than a
 * population-frequency guess, especially for names such as Jordan Taylor.
 *
 * getFirstName() only returns high-confidence results. parseFirstName() exposes
 * lower-confidence candidates for callers that intentionally want a different
 * fallback policy.
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
  ["state", "rep"],
  ["the", "honorable"],
] as const;

// Some honorific-looking words are also established US given names. Treating
// them as titles without punctuation causes avoidable false positives. Justice
// is especially common in Census first-name data.
const AMBIGUOUS_TITLE_WORDS = new Set(["judge", "justice"]);

// These title-looking words also occur as US first names in the 2020 Census.
// In a bare two-token value there is not enough structure to safely discard
// the first token and promote the second token to given name.
const TITLE_WORDS_ATTESTED_AS_GIVEN = new Set([
  "mister",
  "miss",
  "doctor",
  "rev",
  "pastor",
  "imam",
  "judge",
  "justice",
  "hon",
  "sir",
  "dame",
  "governor",
  "mayor",
  "captain",
  "col",
  "colonel",
  "gen",
  "general",
  "lieutenant",
]);

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
  "mph",
  "dpt",
  "aprn",
  "crna",
  "lpc",
  "lmhc",
  "rph",
  "pharmd",
  "cfa",
  "cfp",
  "otr",
  "otrl",
  "pt",
  "lpn",
  "lvn",
  "cna",
  "rd",
  "rdn",
  "mpa",
  "mpp",
  "mfa",
  "pmp",
  "cissp",
]);

// Common role acronyms sometimes get pasted after a name as comma-separated
// metadata. Keeping this list narrow avoids treating arbitrary uppercase names
// as credentials.
const POST_NOMINAL_ROLES = new Set([
  "ceo",
  "cfo",
  "coo",
  "cto",
  "cio",
  "cmo",
  "vp",
  "svp",
  "evp",
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
  "ba",
]);

const CONJUNCTIONS = new Set(["and", "&"]);

const HOUSEHOLD_TAIL_WORDS = new Set(["family", "household"]);

const ORGANIZATION_TAIL_WORDS = new Set([
  "llc",
  "pllc",
  "llp",
  "lp",
  "inc",
  "corporation",
  "ltd",
]);

// Strong organization indicators observed in messy website form submissions.
// Keep this vocabulary conservative: each term was checked against the 2020
// Census first/last-name vocabularies used by this project and is absent from
// both. This avoids broad words such as "company", "service", or "police"
// that can also be real surnames.
const ORGANIZATION_WORDS = new Set([
  "auto",
  "automotive",
  "autobody",
  "autoglass",
  "motors",
  "motorsports",
  "collision",
  "electric",
  "electrical",
  "contracting",
  "repair",
  "supply",
  "services",
  "systems",
  "gmc",
  "roofing",
  "plumbing",
  "hvac",
  "realty",
  "dental",
  "clinic",
  "spa",
  "construction",
  "builders",
  "landscaping",
  "landscape",
  "tire",
  "tires",
  "garage",
  "fabrication",
  "machine",
  "restaurant",
  "studio",
  "properties",
  "management",
  "solutions",
  "enterprises",
  "associates",
  "shop",
  "detail",
  "pros",
]);

const PLACEHOLDER_VALUES = new Set(["anonymous"]);

const NON_PERSON_LEADING_WORDS = new Set(["admin"]);

const GLUED_TITLE =
  /\b(mr|mrs|ms|mx|dr|prof|rev|fr|hon|capt|col|gen|lt|sgt|sen|rep|gov|atty)\.(?=\p{L})/giu;

export function getFirstName(fullName: string): string | undefined {
  const parsed = parseFirstName(fullName);

  return parsed.confidence === "high" && parsed.firstName
    ? parsed.firstName
    : undefined;
}

export function parseFirstName(fullName: string): FirstNameParseResult {
  const normalized = normalizeFullName(fullName);

  if (!normalized) {
    return result("", "low", "empty");
  }

  if (isClearlyNonNameValue(normalized)) {
    return result("", "low", "given-first");
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

  if (!rawTokens.length) {
    return result("", "low", "given-first");
  }

  // A required full-name field still sometimes receives a mononym. Preserve it,
  // even if the token happens to look like a title or suffix. Any token containing
  // only one letter is structurally indistinguishable from an initial, even when
  // malformed punctuation is attached, so do not mark it high.
  if (rawTokens.length === 1) {
    const token = rawTokens[0];
    const key = tokenKey(token);
    const letterCount = [...token.matchAll(/\p{L}/gu)].length;
    const unsafeSingleToken =
      TITLE_WORDS.has(key) ||
      isTailToken(token) ||
      HOUSEHOLD_TAIL_WORDS.has(key) ||
      ORGANIZATION_TAIL_WORDS.has(key) ||
      ORGANIZATION_WORDS.has(key);

    return result(
      token,
      unsafeSingleToken ? "low" : letterCount === 1 ? "medium" : "high",
      "single",
    );
  }

  if (
    rawTokens.length === 2 &&
    TITLE_WORDS_ATTESTED_AS_GIVEN.has(tokenKey(rawTokens[0])) &&
    !rawTokens[0].includes(".")
  ) {
    return result(rawTokens[0], "low", "given-first");
  }

  if (isHouseholdLabel(rawTokens) || isOrganizationName(rawTokens)) {
    return result("", "low", "given-first");
  }

  const stripped = stripLeadingTitles(rawTokens);
  const tokens = [...stripped.tokens];

  while (tokens.length > 1 && isTailToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  if (!tokens.length) {
    return result("", "low", "given-first");
  }

  if (stripped.removedTitle && tokens.length === 1) {
    return result("", "low", "given-first");
  }

  if (stripped.household && tokens.length === 1) {
    return result("", "low", "given-first");
  }

  const firstName = tokens[0];
  const confidence: FirstNameConfidence = isInitial(firstName)
    ? "medium"
    : "high";

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
    if (
      segmentTokens.length === 1 &&
      TITLE_WORDS_ATTESTED_AS_GIVEN.has(tokenKey(segmentTokens[0])) &&
      !segmentTokens[0].includes(".")
    ) {
      return result(segmentTokens[0], "low", "family-first");
    }

    const leadingTailStripped = [...segmentTokens];

    while (
      leadingTailStripped.length > 0 &&
      isStrongTailToken(leadingTailStripped[0])
    ) {
      leadingTailStripped.shift();
    }

    const stripped = stripLeadingTitles(leadingTailStripped);
    const tokens = [...stripped.tokens];

    while (tokens.length > 0 && isStrongTailToken(tokens[0])) {
      tokens.shift();
    }

    if (!tokens.length || tokens.every(isStrongTailToken)) {
      continue;
    }

    const firstName = tokens[0];
    const confidence: FirstNameConfidence = isInitial(firstName)
      ? "medium"
      : "high";

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
  removedTitle: boolean;
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

    if (isTitleToken(output[0]) || isStructuralAbbreviatedTitle(output[0])) {
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

  return { tokens: output, household, removedTitle };
}

function normalizeFullName(value: string): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(GLUED_TITLE, "$1. ")
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
    .normalize("NFKC")
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

function isStructuralAbbreviatedTitle(token: string): boolean {
  // Unknown leading abbreviations such as "Insp." and "Atty." are strong
  // title signals. Single initials and dotted initial groups stay names.
  return /^\p{L}{3,12}\.$/u.test(token);
}

function isConjunction(token: string): boolean {
  return token === "&" || CONJUNCTIONS.has(tokenKey(token));
}

function isSuffixToken(token: string): boolean {
  const key = tokenKey(token);

  if (!SUFFIXES.has(key)) {
    return false;
  }

  // "J.R." and "S.R." are much more plausibly initials than Jr./Sr. suffixes.
  if (/^(?:\p{L}\.){2,}$/u.test(token)) {
    return false;
  }

  return true;
}

function isCredentialToken(token: string): boolean {
  return CREDENTIALS.has(tokenKey(token));
}

function isRoleTailToken(token: string): boolean {
  return POST_NOMINAL_ROLES.has(tokenKey(token));
}

function isTailToken(token: string): boolean {
  return isSuffixToken(token) || isCredentialToken(token) || isRoleTailToken(token);
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

function isClearlyNonNameValue(value: string): boolean {
  if (!/\p{L}/u.test(value)) {
    return true;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    return true;
  }

  const rawTokens = value.split(/\s+/u).filter(Boolean);
  const firstToken = rawTokens[0] ?? "";

  if (/\d/u.test(firstToken)) {
    return true;
  }

  if (rawTokens.length === 1 && firstToken.includes("&")) {
    return true;
  }

  if (PLACEHOLDER_VALUES.has(tokenKey(value))) {
    return true;
  }

  if (NON_PERSON_LEADING_WORDS.has(tokenKey(firstToken))) {
    return true;
  }

  return /^(?:https?:\/\/|www\.)/iu.test(value);
}

function isHouseholdLabel(tokens: string[]): boolean {
  return (
    tokens.length > 1 &&
    HOUSEHOLD_TAIL_WORDS.has(tokenKey(tokens[tokens.length - 1]))
  );
}

function isOrganizationName(tokens: string[]): boolean {
  if (tokens.length <= 1) {
    return false;
  }

  if (ORGANIZATION_TAIL_WORDS.has(tokenKey(tokens[tokens.length - 1]))) {
    return true;
  }

  if (tokens.some((token) => ORGANIZATION_WORDS.has(tokenKey(token)))) {
    return true;
  }

  const keys = tokens.map(tokenKey);
  const ofIndex = keys.indexOf("of");
  return (
    keys.includes("gift") && keys.includes("card") ||
    keys.includes("kitchen") && keys.includes("bath") ||
    ofIndex >= 1 && ofIndex <= 2 ||
    keys.some((key, index) => key === "church" && keys[index + 1] === "of")
  );
}

function result(
  firstName: string,
  confidence: FirstNameConfidence,
  format: FirstNameFormat,
): FirstNameParseResult {
  return { firstName, confidence, format };
}
