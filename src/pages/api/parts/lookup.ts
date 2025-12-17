// src/pages/api/parts/lookup.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { findPartFitment } from "../../../lib/partsFitment";

type SuccessResponse = {
  ok: true;
  summary: string;
  affiliateUrl: string | null;
  vendor: string | null;
  status: "FOUND" | "NO_VEHICLE_MATCH";
};

type ErrorResponse = {
  ok: false;
  error: string;
  status?: "INVALID_INPUT" | "PART_NOT_FOUND";
};

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

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
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
    return res.status(200).json({
      ok: true,
      status: "NO_VEHICLE_MATCH",
      summary: result.summary,
      affiliateUrl: null,
      vendor: null,
    });
  }

  // FOUND
  return res.status(200).json({
    ok: true,
    status: "FOUND",
    summary: result.summary,
    affiliateUrl: finalizeAffiliateUrl(result.affiliateUrl),
    vendor: result.vendor || null,
  });
}
