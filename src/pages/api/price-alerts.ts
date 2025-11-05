// src/pages/api/price-alerts.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { email, vehicle, category } = (req.body ?? {}) as {
      email?: string;
      vehicle?: string;
      category?: string;
    };

    if (!email || typeof email !== "string") {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    // Optional: forward to provider (Mailchimp/ConvertKit/Google Apps Script)
    const webhook = process.env.PRICE_ALERT_WEBHOOK;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vehicle, category, source: "autogradehq" }),
      }).catch((e) => {
        // Log but don't fail the user
        console.error("Webhook forward failed:", e?.message || e);
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("API error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}

