// FILE: src/pages/api/price-alerts.ts
// Handles "Get alerts" soft-intent signups (price alerts / notifications)

import type { NextApiRequest, NextApiResponse } from "next";

type Data = { ok: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, year, make, model, trim, upgrade } = req.body || {};

    // Basic validation – email is required
    if (!email || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    // OPTIONAL vehicle fields – not required, but nice to have
    const safeYear = year ? String(year) : "(not provided)";
    const safeMake = make ? String(make) : "(not provided)";
    const safeModel = model ? String(model) : "(not provided)";
    const safeTrim = trim ? String(trim) : "(not provided)";
    const safeUpgrade = upgrade ? String(upgrade) : "(not provided)";

    // --- SendGrid email via raw fetch (no extra library) ---

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error("Missing SENDGRID_API_KEY env var for price alerts.");
      return res.status(500).json({ error: "Email service not configured" });
    }

    const sendgridRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: "autogradehq@gmail.com" }], // where YOU receive the alert
          },
        ],
        from: {
          email: "autogradehq@gmail.com",
          name: "AutoGradeHQ Alerts",
        },
        subject: "New AutoGrade price alert interest",
        content: [
          {
            type: "text/plain",
            value: [
              "New price-alert / notification interest:",
              "",
              `Email: ${email}`,
              "",
              `Year:   ${safeYear}`,
              `Make:   ${safeMake}`,
              `Model:  ${safeModel}`,
              `Trim:   ${safeTrim}`,
              `Upgrade category: ${safeUpgrade}`,
              "",
              `Time: ${new Date().toISOString()}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!sendgridRes.ok) {
      const text = await sendgridRes.text().catch(() => "");
      console.error("SendGrid error for price alerts:", sendgridRes.status, text);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Unexpected error in /api/price-alerts:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
