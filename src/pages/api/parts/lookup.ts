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
    u.includes("placeholder")
  );
}

/**
 * Build a final affiliate URL from a vendor + destination URL.
 * - For Tire Rack: wraps destination URL in your affiliate redirect template from .env.local
 * - For other vendors: pass-through the destination URL
 */
function buildAffiliateUrl(
  vendor: string | null,
  destinationUrl: string | null
): string | null {
  if (!vendor || !destinationUrl) return null;

  // Never ship placeholders
  if (isPlaceholderUrl(destinationUrl)) return null;

  // Guard against missing protocol (optional but recommended)
  if (!/^https?:\/\//i.test(destinationUrl)) {
    return null;
  }

  if (vendor !== "tirerack") {
    return destinationUrl;
  }

  const base = process.env.TIRERACK_AFFILIATE_BASE_URL;
  const param = process.env.TIRERACK_AFFILIATE_DEST_PARAM || "url";

  // If env is not configured yet, fall back to direct Tire Rack destination URL
  if (!base) return destinationUrl;

  try {
    const u = new URL(base);
    u.searchParams.set(param, destinationUrl);
    return u.toString();
  } catch {
    // If base URL is malformed, fall back to destination
    return destinationUrl;
  }
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

  // Keep this lightweight; deeper validation happens in findPartFitment
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

  // --- Status-aware mapping ---
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
    // Treat as a successful lookup of the part record; no rule coverage yet.
    // UI can show the message and (optionally) gate the affiliate CTA based on status.
    return res.status(200).json({
      ok: true,
      status: "NO_VEHICLE_MATCH",
      summary: result.summary,
      affiliateUrl: null, // recommended: no CTA when not verified
      vendor: null,
    });
  }

  // FOUND
  const vendor = result.vendor || null;
  const finalAffiliateUrl = buildAffiliateUrl(vendor, result.affiliateUrl || null);

  return res.status(200).json({
    ok: true,
    status: "FOUND",
    summary: result.summary,
    affiliateUrl: finalAffiliateUrl,
    vendor,
  });
}
