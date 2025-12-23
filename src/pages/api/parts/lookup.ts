// src/pages/api/parts/lookup.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { findPartFitment } from "../../../lib/partsFitment";

// ---------- Confidence (single source of truth in this file) ----------
type Confidence = "VERIFIED" | "CONDITIONAL" | "UNKNOWN";

function computeConfidence(status: string, summary?: string | null): Confidence {
  if (status !== "FOUND") return "UNKNOWN";

  const s = (summary || "").toLowerCase();
  const conditionalSignals = [
    "lift",
    "trimming",
    "trim",
    "cut",
    "clearance",
    "requires",
    "may require",
    "minor modification",
    "rub",
  ];

  return conditionalSignals.some((w) => s.includes(w)) ? "CONDITIONAL" : "VERIFIED";
}

// (Optional) not currently used by API responses, but safe to keep for UI mapping later.
function confidenceLabel(c: Confidence) {
  return c === "VERIFIED" ? "Verified" : c === "CONDITIONAL" ? "Conditional" : "Unknown";
}

// ---------- Response types ----------
type SuccessStatus = "FOUND" | "NO_VEHICLE_MATCH";
type ErrorStatus = "INVALID_INPUT" | "PART_NOT_FOUND";

type SuccessResponse = {
  ok: true;
  summary: string;
  affiliateUrl: string | null;
  vendor: string | null;
  status: SuccessStatus;
  confidence: Confidence;
};

type ErrorResponse = {
  ok: false;
  error: string;
  status: ErrorStatus;
};

// ---------- Affiliate URL hardening ----------
function isPlaceholderUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.includes("your-affiliate-link-here") ||
    u.includes("example.com") ||
    u.includes("placeholder") ||
    u.includes("/asin/") // common mistake
  );
}

/**
 * Your dataset currently stores FINAL outbound affiliate links (CJ, amzn.to, etc.).
 * So the API should:
 * - validate basic URL shape
 * - block placeholders
 * - return the URL as-is
 */
function finalizeAffiliateUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (isPlaceholderUrl(url)) return null;

  // Require http(s) URL
  if (!/^https?:\/\//i.test(url)) return null;

  return url;
}

// ---------- Handler ----------
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      status: "INVALID_INPUT",
      error: "Method not allowed. Use POST.",
    });
  }

  const { year, make, model, trim, partNumber } = req.body || {};

  // Lightweight validation; deep validation in findPartFitment
  if (!year || !make || !model || !partNumber) {
    return res.status(400).json({
      ok: false,
      status: "INVALID_INPUT",
      error: "year, make, model, and partNumber are required.",
    });
  }

  const result = findPartFitment({
    year: String(year),
    make: String(make),
    model: String(model),
    trim: trim ? String(trim) : undefined,
    partNumber: String(partNumber),
  });

  if (result.status === "INVALID_INPUT") {
    return res.status(400).json({
      ok: false,
      status: "INVALID_INPUT",
      error: result.error || "Invalid input.",
    });
  }

  if (result.status === "PART_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      status: "PART_NOT_FOUND",
      error: "Part number not found in AutoGrade verified fitment dataset yet.",
    });
  }

  if (result.status === "NO_VEHICLE_MATCH") {
    // Recognized part record, but no verified rule coverage for that vehicle.
    // Keep CTA gated off for now.
    const confidence = computeConfidence(result.status, result.summary);

    return res.status(200).json({
      ok: true,
      status: "NO_VEHICLE_MATCH",
      confidence,
      summary: result.summary,
      affiliateUrl: null,
      vendor: null,
    });
  }

  // FOUND
  const confidence = computeConfidence(result.status, result.summary);

  return res.status(200).json({
    ok: true,
    status: "FOUND",
    confidence,
    summary: result.summary,
    affiliateUrl: finalizeAffiliateUrl(result.affiliateUrl),
    vendor: result.vendor || null,
  });
}
