// src/pages/api/out.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Vendor = "amazon" | "tirerack" | "realtruck";

const safeVendor = (v: unknown): Vendor => {
  const s = String(v || "").toLowerCase();
  return s === "tirerack" || s === "realtruck" || s === "amazon" ? (s as Vendor) : "amazon";
};

const safeText = (v: unknown, fallback: string) => {
  const s = String(v || "").trim();
  return s.length ? s : fallback;
};

/**
 * Build an Amazon search URL with your affiliate tag.
 */
const buildAmazonUrl = (keywords: string) => {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`;
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
};

/**
 * Get the Tire Rack affiliate link.
 * Uses NEXT_PUBLIC_TIRERACK_URL (CJ link).
 */
const getTireRackUrl = () => {
  const home = process.env.NEXT_PUBLIC_TIRERACK_URL;
  return home && /^https?:\/\//i.test(home) ? home : "https://www.tirerack.com/";
};

const getRealTruckUrl = () => {
  const home = process.env.NEXT_PUBLIC_REALTRUCK_URL;
  return home && /^https?:\/\//i.test(home) ? home : "https://realtruck.com/";
};

// ---- GA4 Measurement Protocol (server-side) ----
// Create in GA4: Admin → Data streams → Web → Measurement Protocol API secrets
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

async function sendAffiliateClickToGA4(args: {
  clientId: string;
  vendor: Vendor;
  q: string;
}) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    GA4_MEASUREMENT_ID
  )}&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;

  const body = {
    client_id: args.clientId,
    events: [
      {
        name: "affiliate_click",
        params: {
          vendor: args.vendor,
          outbound: true,
          link_location: "api_out",
          search_query: args.q,
        },
      },
    ],
  };

  // Best-effort only; do not block redirect if GA4 fails
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // ignore
  }
}

function getOrCreateClientId(req: NextApiRequest) {
  // Try GA cookie (_ga=GA1.1.1234567890.1234567890)
  const gaCookie = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("_ga="));
  const gaVal = gaCookie?.split("=")[1];
  const gaParts = gaVal ? decodeURIComponent(gaVal).split(".") : null;

  // Usually last two parts are the cid
  const cid =
    gaParts && gaParts.length >= 4
      ? `${gaParts[2]}.${gaParts[3]}`
      : null;

  // Fallback: random-ish server-side cid (not perfect, but better than nothing)
  if (cid) return cid;
  return `${Date.now()}.${Math.floor(Math.random() * 1_000_000_000)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const vendor = safeVendor(req.query.vendor);
  const keywords = safeText(req.query.q, "auto upgrade");

  let targetUrl: string;
  switch (vendor) {
    case "tirerack":
      targetUrl = getTireRackUrl();
      break;
    case "realtruck":
      targetUrl = getRealTruckUrl();
      break;
    case "amazon":
    default:
      targetUrl = buildAmazonUrl(keywords);
      break;
  }

  // Fire server-side GA4 event (best-effort) BEFORE redirect.
  const clientId = getOrCreateClientId(req);
  await sendAffiliateClickToGA4({ clientId, vendor, q: keywords });

  // Cache control (avoid caching redirects)
  res.setHeader("Cache-Control", "no-store");

  return res.redirect(302, targetUrl);
}
