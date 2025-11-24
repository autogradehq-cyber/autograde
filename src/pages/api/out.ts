// src/pages/api/out.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Vendor = "amazon" | "tirerack" | "summit" | "realtruck";

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

  const v = (vendor as string | undefined)?.toLowerCase() as Vendor | undefined;
  const keywords = (q as string | undefined) || "auto upgrade";

  let targetUrl: string;

  switch (v) {
    case "tirerack": {
      // Set this when Tire Rack approves you (CJ link)
      const tireRackBase =
        process.env.NEXT_PUBLIC_TIRERACK_URL || "https://www.tirerack.com/";
      targetUrl = tireRackBase;
      break;
    }

    case "summit": {
      // Set this when Summit approves you
      const summitBase =
        process.env.NEXT_PUBLIC_SUMMIT_URL ||
        "https://www.summitracing.com/";
      targetUrl = summitBase;
      break;
    }

    case "realtruck": {
      // When Sovrn/RealTruck is live, set NEXT_PUBLIC_REALTRUCK_URL
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

  // Basic safety fallback
  if (!targetUrl) {
    targetUrl = buildAmazonUrl(keywords);
  }

  // Temporary debug logging (shows in Vercel logs)
  // console.log("[/api/out] redirecting", { vendor: v, keywords, targetUrl });

  // 302 = temporary redirect, safer for changing links later
  res.redirect(302, targetUrl);
}
