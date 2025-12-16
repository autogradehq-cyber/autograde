// src/lib/partsFitment.ts

import partsData from "../data/parts-fitment.json";

/* =========================================================
   Types
========================================================= */

export type PartCategory =
  | "tire"
  | "wheel"
  | "suspension"
  | "brake"
  | "lighting"
  | "protection"
  | "recovery"
  | "other";

export type AffiliateVendor = "amazon" | "tirerack" | "realtruck" | "other";

export interface FitmentRule {
  fromYear: number;
  toYear: number;
  make: string; // normalized (lowercase)
  model: string; // normalized (lowercase)
  trims?: string[]; // normalized trims
  maxLiftIn?: number;
  notes?: string;
}

export interface PartFitmentRecord {
  partNumber: string;
  altPartNumbers?: string[];
  brand: string;
  category: PartCategory;
  title: string;
  description: string;
  vendor: AffiliateVendor;
  affiliateUrl: string;
  rules: FitmentRule[];
}

export interface PartLookupInput {
  year: string;
  make: string;
  model: string;
  trim?: string;
  partNumber: string;
}

export type PartLookupStatus =
  | "FOUND"
  | "PART_NOT_FOUND"
  | "NO_VEHICLE_MATCH"
  | "INVALID_INPUT";

export interface PartLookupResult {
  found: boolean;
  status: PartLookupStatus;
  error?: string;

  record?: PartFitmentRecord;
  matchedRule?: FitmentRule;

  summary: string;
  affiliateUrl?: string;
  vendor?: AffiliateVendor;
}

/* =========================================================
   Helpers
========================================================= */

const parts: PartFitmentRecord[] = partsData as unknown as PartFitmentRecord[];

const normalizeText = (str: string) => (str || "").trim().toLowerCase();

/**
 * Part number canonicalization:
 * - uppercase
 * - strip ALL non-alphanumeric characters
 *
 * This avoids mismatch from spaces, hyphens, slashes, etc.
 * IMPORTANT: It does not “guess” tire-size semantics (e.g., removing an 'R').
 * Keep dataset + entry conventions consistent; add a tire-size layer later if needed.
 */
const normalizePartNumber = (str: string) =>
  (str || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Alias maps (expand over time as your dataset grows).
 * Keep conservative: only include mappings you’re confident about.
 */
const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  vw: "volkswagen",
  "mercedes-benz": "mercedes",
};

const MODEL_ALIASES: Record<string, string> = {
  "f 150": "f-150",
  f150: "f-150",
};

const canonicalMake = (makeRaw: string) => {
  const m = normalizeText(makeRaw);
  return MAKE_ALIASES[m] ?? m;
};

const canonicalModel = (modelRaw: string) => {
  const m = normalizeText(modelRaw);
  return MODEL_ALIASES[m] ?? m;
};

const canonicalTrim = (trimRaw?: string) => normalizeText(trimRaw || "");

const parseYear = (yearRaw: string | number) => {
  const y =
    typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw), 10);
  return Number.isFinite(y) ? y : NaN;
};

const buildVehicleLabel = (input: PartLookupInput) => {
  const base = `${input.year} ${input.make} ${input.model}`;
  return input.trim ? `${base} ${input.trim}` : base;
};

/* =========================================================
   Core Lookup Logic
========================================================= */

/**
 * Backward-compatible function signature:
 * - Preferred: findPartFitment({ year, make, model, trim?, partNumber })
 * - Supported: findPartFitment(partNumber, year, make, model, trim?)
 */
export function findPartFitment(input: PartLookupInput): PartLookupResult;
export function findPartFitment(
  partNumber: string,
  year: string,
  make: string,
  model: string,
  trim?: string
): PartLookupResult;
export function findPartFitment(
  a: PartLookupInput | string,
  b?: string,
  c?: string,
  d?: string,
  e?: string
): PartLookupResult {
  // --- Normalize arguments into the object form ---
  const input: PartLookupInput =
    typeof a === "string"
      ? {
          partNumber: a,
          year: b || "",
          make: c || "",
          model: d || "",
          trim: e,
        }
      : a;

  // --- Parse + normalize input (single source of truth) ---
  const year = parseYear(input.year);
  const partNumber = normalizePartNumber(input.partNumber);

  const make = canonicalMake(input.make);
  const model = canonicalModel(input.model);
  const trim = canonicalTrim(input.trim);

  // --- Mechanic-grade validation guardrails ---
  if (!partNumber) {
    return {
      found: false,
      status: "INVALID_INPUT",
      error: "Missing part number.",
      summary: "Invalid input: missing part number.",
    };
  }

  if (!Number.isFinite(year)) {
    return {
      found: false,
      status: "INVALID_INPUT",
      error: "Invalid year.",
      summary: "Invalid input: year must be a valid number.",
    };
  }

  const maxYear = new Date().getFullYear() + 1;
  if (year < 1980 || year > maxYear) {
    return {
      found: false,
      status: "INVALID_INPUT",
      error: "Year out of supported range.",
      summary: `Invalid input: year must be between 1980 and ${maxYear}.`,
    };
  }

  if (!make) {
    return {
      found: false,
      status: "INVALID_INPUT",
      error: "Missing make.",
      summary: "Invalid input: missing make.",
    };
  }

  if (!model) {
    return {
      found: false,
      status: "INVALID_INPUT",
      error: "Missing model.",
      summary: "Invalid input: missing model.",
    };
  }

  // --- Step 1: Find part by number or alt numbers (normalized) ---
  const record = parts.find((p) => {
    if (normalizePartNumber(p.partNumber) === partNumber) return true;
    return p.altPartNumbers?.some(
      (alt) => normalizePartNumber(alt) === partNumber
    );
  });

  if (!record) {
    return {
      found: false,
      status: "PART_NOT_FOUND",
      summary: "Part number not found in AutoGrade fitment database yet.",
    };
  }

  // --- Step 2: Match vehicle rule (normalized make/model/trim + year range) ---
  const matchedRule = record.rules.find((r) => {
    const fromYear = Number(r.fromYear);
    const toYear = Number(r.toYear);
    if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) return false;

    if (year < fromYear || year > toYear) return false;
    if (canonicalMake(r.make) !== make) return false;
    if (canonicalModel(r.model) !== model) return false;

    // Trim logic:
    // - If rule has trims and user provided trim, require a match.
    // - If rule has trims but user did not provide trim, allow pass-through (mechanic-friendly).
    if (r.trims && r.trims.length) {
      if (!trim) return true;
      return r.trims.some((t) => canonicalTrim(t) === trim);
    }

    return true;
  });

  // --- Step 3: Human-readable summary (preserve your current style) ---
  const vehicleLabel = buildVehicleLabel(input);

  let summary = `${record.title} (${record.brand})\n\n`;

  if (matchedRule) {
    summary += `✔ This part is listed as compatible with ${vehicleLabel}.`;

    if (matchedRule.maxLiftIn) {
      summary += ` Fitment notes assume up to ~${matchedRule.maxLiftIn}" of lift.`;
    }

    if (matchedRule.notes) {
      summary += `\n\nNotes: ${matchedRule.notes}`;
    }

    return {
      found: true,
      status: "FOUND",
      record,
      matchedRule,
      summary,
      affiliateUrl: record.affiliateUrl,
      vendor: record.vendor,
    };
  }

  summary +=
    `⚠ We recognize this part number, but do not yet have a verified fitment rule for ${vehicleLabel}. ` +
    `Use manufacturer documentation and standard fitment checks before ordering.`;

  return {
    found: true,
    status: "NO_VEHICLE_MATCH",
    record,
    matchedRule: undefined,
    summary,
    // IMPORTANT: returning affiliateUrl/vendor is okay, but many teams prefer gating CTA at the UI for NO_VEHICLE_MATCH
    affiliateUrl: record.affiliateUrl,
    vendor: record.vendor,
  };
}
