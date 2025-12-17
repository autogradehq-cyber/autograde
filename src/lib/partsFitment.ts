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

export type FitmentConfidence = "verified" | "conditional" | "unknown";

export interface FitmentRule {
  fromYear: number;
  toYear: number;
  make: string; // normalized (lowercase)
  model: string; // normalized (lowercase)
  trims?: string[]; // normalized trims
  maxLiftIn?: number;
  notes?: string;

  // Step 1 schema expansion (optional / backward-compatible)
  confidence?: FitmentConfidence;
  verifiedBy?: string; // e.g. "AutoGradeHQ" or shop name
  lastVerified?: string; // ISO date string e.g. "2025-12-16"
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

  // Step 1 schema expansion (optional / backward-compatible)
  updatedAt?: string; // ISO date string
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
   Data
========================================================= */

const parts: PartFitmentRecord[] = partsData as unknown as PartFitmentRecord[];

/* =========================================================
   Normalization / Validation Helpers
========================================================= */

const normalizeText = (str: string) => (str || "").trim().toLowerCase();

/**
 * Canonical part number:
 * - uppercase
 * - strip ALL non-alphanumeric characters
 */
const normalizePartNumber = (str: string) =>
  (str || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Conservative aliasing for common user inputs.
 * Only map shortcuts you are confident about.
 * (You can expand these over time.)
 */
const PART_ALIASES: Record<string, string> = {
  // Example: simple shortcuts
  KO2: "BFG2857017KO2",
  BFGKO2: "BFG2857017KO2",
};

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

/**
 * Apply part alias BEFORE hard canonicalization.
 */
const canonicalPartNumber = (raw: string) => {
  const upper = (raw || "").trim().toUpperCase();
  const aliasHit = PART_ALIASES[upper];
  return normalizePartNumber(aliasHit ?? upper);
};

const parseYear = (yearRaw: string | number) => {
  const y =
    typeof yearRaw === "number" ? yearRaw : parseInt(String(yearRaw), 10);
  return Number.isFinite(y) ? y : NaN;
};

const buildVehicleLabel = (input: PartLookupInput) => {
  const base = `${input.year} ${input.make} ${input.model}`;
  return input.trim ? `${base} ${input.trim}` : base;
};

/**
 * For consistent comparison, normalize rule-side values too.
 */
const normalizeRuleMake = (ruleMake: string) => canonicalMake(ruleMake);
const normalizeRuleModel = (ruleModel: string) => canonicalModel(ruleModel);

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
  // --- Normalize args into object form ---
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
  const partNumber = canonicalPartNumber(input.partNumber);

  const make = canonicalMake(input.make);
  const model = canonicalModel(input.model);
  const trim = canonicalTrim(input.trim);

  // --- Validation guardrails ---
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

    if (normalizeRuleMake(r.make) !== make) return false;
    if (normalizeRuleModel(r.model) !== model) return false;

    // Trim logic:
    // - If rule has trims and user provided trim, require a match.
    // - If rule has trims but user did not provide trim, allow pass-through.
    if (r.trims && r.trims.length) {
      if (!trim) return true;
      return r.trims.some((t) => canonicalTrim(t) === trim);
    }

    return true;
  });

  // --- Step 3: Human-readable summary ---
  const vehicleLabel = buildVehicleLabel(input);

  let summary = `${record.title} (${record.brand})\n\n`;

  if (matchedRule) {
    summary += `✔ This part is listed as compatible with ${vehicleLabel}.`;

    if (matchedRule.maxLiftIn) {
      summary += ` Fitment notes assume up to ~${matchedRule.maxLiftIn}" of lift.`;
    }

    // Confidence line (optional, only if present)
    if (matchedRule.confidence) {
      const label =
        matchedRule.confidence === "verified"
          ? "Verified"
          : matchedRule.confidence === "conditional"
          ? "Conditional"
          : "Unknown";
      summary += `\n\nConfidence: ${label}.`;
      if (matchedRule.lastVerified) summary += ` Last verified: ${matchedRule.lastVerified}.`;
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
    // Your API/UI can gate CTAs for NO_VEHICLE_MATCH (recommended).
    affiliateUrl: record.affiliateUrl,
    vendor: record.vendor,
  };
}
