
// src/pages/api/out.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Vendor = "amazon" | "tirerack" | "realtruck";

/**
 * Build an Amazon search URL with your affiliate tag.
 */
const buildAmazonUrl = (keywords: string) => {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}`;
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { vendor, q } = req.query;

  const v = (vendor as string | undefined)?.toLowerCase() as
    | Vendor
    | undefined;
  const keywords = (q as string | undefined) || "auto upgrade";

  let targetUrl: string;

  switch (v) {
    case "tirerack": {
      // When Tire Rack approves, set NEXT_PUBLIC_TIRERACK_URL to your CJ affiliate link
      const tireRackBase =
        process.env.NEXT_PUBLIC_TIRERACK_URL || "https://www.tirerack.com/";
      targetUrl = tireRackBase;
      break;
    }

    case "realtruck": {
      // When Sovrn/RealTruck approves, set NEXT_PUBLIC_REALTRUCK_URL
      const realTruckBase =
        process.env.NEXT_PUBLIC_REALTRUCK_URL || "https://realtruck.com/";
      targetUrl = realTruckBase;
      break;
    }

    case "amazon":
    default: {
      targetUrl = buildAmazonUrl(keywords);
      break;
    }
  }

  if (!targetUrl) {
    targetUrl = buildAmazonUrl(keywords);
  }

  // Optional debug:
  // console.log("[/api/out] redirecting", { vendor: v, keywords, targetUrl });

  res.redirect(302, targetUrl);
}
